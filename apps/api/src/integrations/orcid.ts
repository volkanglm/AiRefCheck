/**
 * AiRefCheck - ORCID Public API Client
 * Verify author identity and cross-reference their publications.
 * Public API v3.0 — no API key required.
 * Rate limit: 24 requests/min, 1 concurrent.
 */

import Redis from "ioredis";
import { BaseApiClient, IntegrationResult, ParsedRef } from "./base-client";
import { logger } from "../lib/logger";

interface OrcidWorkSummary {
  title?: string;
  "external-ids"?: {
    "external-id"?: {
      "external-id-type"?: string;
      "external-id-value"?: string;
      "external-id-url"?: { value?: string };
    }[];
  };
  "publication-date"?: {
    year?: { value?: string };
    month?: { value?: string };
    day?: { value?: string };
  };
  url?: { value?: string };
  "journal-title"?: { value?: string };
}

interface OrcidPerson {
  name?: {
    "given-names"?: { value?: string };
    "family-name"?: { value?: string };
  };
}

interface OrcidSearchResponse {
  "num-results"?: number;
  result?: {
    "orcid-identifier"?: {
      uri?: string;
      path?: string;
    };
    "person"?: OrcidPerson;
  }[];
}

interface OrcidWorkResponse {
  group?: {
    "work-summary"?: OrcidWorkSummary[];
  }[];
}

interface OrcidParsedAuthor {
  orcidId: string;
  name: string;
  publications: {
    title: string;
    year: number | null;
    doi: string | null;
    url: string | null;
    journal: string | null;
  }[];
}

export class OrcidClient extends BaseApiClient {
  readonly sourceName = "orcid";
  readonly baseUrl = "https://pub.orcid.org/v3.0";
  readonly rateLimit = { rpm: 24, concurrent: 1 };

  constructor(redis: Redis) {
    super(redis, "orcid", "https://pub.orcid.org/v3.0", 15000);
    // ORCID requires Accept header for JSON
    this.client.defaults.headers.common["Accept"] = "application/json";
  }

  async validateReference(ref: ParsedRef): Promise<IntegrationResult> {
    const start = Date.now();

    try {
      // ORCID's primary value is author verification.
      // We need at least one author name to search.
      if (!ref.authors?.length) {
        return this.notFound(ref, Date.now() - start);
      }

      const author = ref.authors[0];
      if (!author || !author.last_name || author.last_name.length < 2) {
        return this.notFound(ref, Date.now() - start);
      }

      // 1. Search by author name + title
      const searchTitle = ref.title || this.extractTitleFromRaw(ref.rawText);

      if (searchTitle && searchTitle.length > 5) {
        const titleHash = searchTitle.toLowerCase().replace(/\s+/g, "_").substring(0, 100);
        const authorKey = `${author.last_name}:${titleHash}`;
        const cached = await this.getCached<IntegrationResult>(`auth:${authorKey}`);
        if (cached) return { ...cached, fromCache: true };

        const result = await this.searchAuthorAndWork(author, searchTitle);
        if (result) {
          const ir = this.buildResult(ref, result, start);
          await this.setCache(`auth:${authorKey}`, ir);
          return ir;
        }
      }

      // 2. Fallback: search by author name only, check their publications
      const authorHash = `${author.last_name}:${author.first_name || ""}`.toLowerCase();
      const cached = await this.getCached<IntegrationResult>(`author:${authorHash}`);
      if (cached) return { ...cached, fromCache: true };

      const result = await this.searchAuthorOnly(author, ref);
      if (result) {
        const ir = this.buildResult(ref, result, start);
        await this.setCache(`author:${authorHash}`, ir);
        return ir;
      }

      // 3. Try second author if available
      if (ref.authors.length > 1) {
        const secondAuthor = ref.authors[1];
        if (secondAuthor && secondAuthor.last_name && secondAuthor.last_name.length >= 2) {
          const secondResult = await this.searchAuthorAndWork(secondAuthor, searchTitle || "");
          if (secondResult) {
            const ir = this.buildResult(ref, secondResult, start);
            return ir;
          }
        }
      }

      return this.notFound(ref, Date.now() - start);
    } catch (error: any) {
      logger.error(`ORCID error: ${error.message}`);
      return this.errorResult(ref, error.message, Date.now() - start);
    }
  }

  /**
   * Search for an author and verify they have a publication matching the title.
   */
  private async searchAuthorAndWork(
    author: { last_name: string; first_name: string | null },
    title: string,
  ): Promise<OrcidParsedAuthor | null> {
    try {
      // Build ORCID search query
      const givenName = author.first_name?.split(/\s+/)[0] || "";
      const familyName = author.last_name;
      let query = `family-name:${familyName}`;
      if (givenName) {
        query += `+AND+given-names:${givenName}`;
      }
      if (title && title.length > 3) {
        // Add title keywords to narrow results
        const titleWords = title
          .replace(/[^a-zA-Z0-9\sğüşıöçĞÜŞİÖÇ]/g, "")
          .split(/\s+/)
          .filter((w) => w.length > 3)
          .slice(0, 5)
          .join("+");
        if (titleWords) {
          query += `+AND+${titleWords}`;
        }
      }

      const searchResponse = await this.get<OrcidSearchResponse>(
        `/search/?q=${query}`,
        { rows: "3" },
      );

      const results = searchResponse.result || [];
      if (results.length === 0) return null;

      // Check each matched author's publications for the title
      for (const result of results) {
        const orcidPath = result["orcid-identifier"]?.path;
        if (!orcidPath) continue;

        const authorInfo = await this.getAuthorWithWorks(orcidPath, title);
        if (authorInfo) return authorInfo;
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Search author without title, check if any publication matches our reference.
   */
  private async searchAuthorOnly(
    author: { last_name: string; first_name: string | null },
    ref: ParsedRef,
  ): Promise<OrcidParsedAuthor | null> {
    try {
      const givenName = author.first_name?.split(/\s+/)[0] || "";
      const familyName = author.last_name;
      let query = `family-name:${familyName}`;
      if (givenName) {
        query += `+AND+given-names:${givenName}`;
      }

      const searchResponse = await this.get<OrcidSearchResponse>(
        `/search/?q=${query}`,
        { rows: "2" },
      );

      const results = searchResponse.result || [];
      if (results.length === 0) return null;

      const searchTitle = ref.title || "";
      for (const result of results) {
        const orcidPath = result["orcid-identifier"]?.path;
        if (!orcidPath) continue;

        const authorInfo = await this.getAuthorWithWorks(orcidPath, searchTitle);
        if (authorInfo) return authorInfo;
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Fetch an ORCID profile and check their works for a matching title.
   */
  private async getAuthorWithWorks(
    orcidPath: string,
    titleHint: string,
  ): Promise<OrcidParsedAuthor | null> {
    try {
      // Fetch works summary
      const worksResponse = await this.get<OrcidWorkResponse>(
        `/${orcidPath}/works`,
      );

      const groups = worksResponse.group || [];
      const publications: OrcidParsedAuthor["publications"] = [];

      let titleMatchFound = false;

      for (const group of groups) {
        const summaries = group["work-summary"] || [];
        if (summaries.length === 0) continue;

        // Use the first summary (most complete)
        const summary = summaries[0];
        if (!summary) continue;

        const workTitle = summary.title || "";
        const year = summary["publication-date"]?.year?.value
          ? parseInt(summary["publication-date"].year.value, 10)
          : null;

        // Extract DOI from external IDs
        let doi: string | null = null;
        const externalIds = summary["external-ids"]?.["external-id"] || [];
        for (const eid of externalIds) {
          if (eid && eid["external-id-type"] === "doi") {
            doi = eid["external-id-value"] || null;
            break;
          }
        }

        const url = summary.url?.value || null;
        const journal = summary["journal-title"]?.value || null;

        publications.push({ title: workTitle, year, doi, url, journal });

        // Check title match
        if (titleHint && titleHint.length > 3) {
          const sim = this.titleSimilarity(titleHint, workTitle);
          if (sim >= 0.6) {
            titleMatchFound = true;
          }
        }
      }

      if (publications.length === 0) return null;

      // Return result if we found a matching publication, or if we have publications
      // (author verification alone is valuable)
      if (titleMatchFound || !titleHint) {
        // Get author name
        const name = await this.getAuthorName(orcidPath);

        return {
          orcidId: orcidPath,
          name: name || `ORCID: ${orcidPath}`,
          publications,
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Fetch author's display name from their ORCID profile.
   */
  private async getAuthorName(orcidPath: string): Promise<string | null> {
    try {
      const person = await this.get<OrcidPerson>(
        `/${orcidPath}/person`,
      );
      const given = person.name?.["given-names"]?.value || "";
      const family = person.name?.["family-name"]?.value || "";
      if (given || family) {
        return `${given} ${family}`.trim();
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Extract title from raw reference text.
   */
  private extractTitleFromRaw(raw: string): string | null {
    const match = raw.match(/\(\d{4}\)\s*\.?\s*(.+?)(?:\.\s|\.(?=\s*[A-Z])|$)/);
    if (match && match[1] && match[1].length > 10) {
      return match[1].trim();
    }
    return null;
  }

  private buildResult(ref: ParsedRef, author: OrcidParsedAuthor, start: number): IntegrationResult {
    const confidence = this.calculateConfidence(ref, author);
    const bestPublication = this.findMatchingPublication(ref, author);

    return {
      source: this.sourceName,
      status: confidence >= 60 ? "found" : confidence >= 30 ? "partial_match" : "not_found",
      confidenceScore: confidence,
      sourceUrl: `https://orcid.org/${author.orcidId}`,
      sourceId: author.orcidId,
      matchedTitle: bestPublication?.title || null,
      matchedAuthors: ref.authors || null,
      matchedYear: bestPublication?.year || null,
      matchedDoi: bestPublication?.doi || null,
      metadata: {
        orcidId: author.orcidId,
        authorName: author.name,
        totalPublications: author.publications.length,
        matchingPublication: bestPublication,
      },
      responseTimeMs: Date.now() - start,
      fromCache: false,
    };
  }

  private findMatchingPublication(
    ref: ParsedRef,
    author: OrcidParsedAuthor,
  ): OrcidParsedAuthor["publications"][0] | null {
    const searchTitle = ref.title || "";
    let best: OrcidParsedAuthor["publications"][0] | null = null;
    let bestSim = 0;

    for (const pub of author.publications) {
      if (!pub.title) continue;

      const sim = this.titleSimilarity(searchTitle, pub.title);

      // Also check DOI match
      if (ref.doi && pub.doi && ref.doi.toLowerCase() === pub.doi.toLowerCase()) {
        return pub; // DOI match is definitive
      }

      // Check year match as tiebreaker
      let adjustedSim = sim;
      if (ref.year && pub.year && ref.year === pub.year) {
        adjustedSim += 0.1;
      }

      if (adjustedSim > bestSim) {
        bestSim = adjustedSim;
        best = pub;
      }
    }

    return bestSim >= 0.5 ? best : null;
  }

  private calculateConfidence(ref: ParsedRef, author: OrcidParsedAuthor): number {
    let score = 0;

    // Author verified on ORCID (base 20 points)
    score += 20;

    // Publication match
    const match = this.findMatchingPublication(ref, author);
    if (match) {
      // Title similarity (30%)
      const titleSim = this.titleSimilarity(ref.title || "", match.title || "");
      score += titleSim * 30;

      // Year match (15%)
      if (ref.year && match.year) {
        score += ref.year === match.year ? 15 : (Math.abs(ref.year - match.year) <= 2 ? 8 : 0);
      }

      // DOI match (25%)
      if (ref.doi && match.doi && ref.doi.toLowerCase() === match.doi.toLowerCase()) {
        score += 25;
      }
    }

    // Author name similarity (10%)
    if (ref.authors?.length) {
      const firstAuthor = ref.authors[0];
      if (firstAuthor) {
        const refName = `${firstAuthor.first_name || ""} ${firstAuthor.last_name}`.toLowerCase().trim();
        const orcidName = author.name.toLowerCase();
        if (refName && orcidName) {
          const nameSim = this.titleSimilarity(refName, orcidName);
          score += nameSim * 10;
        }
      }
    }

    return Math.min(Math.round(score), 100);
  }
}
