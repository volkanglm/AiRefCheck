/**
 * AiRefCheck - Springer Metadata API Client
 * 5M+ documents: journals, books, chapters across science, technology, medicine.
 * Requires API key: SPRINGER_API_KEY env variable.
 * Rate limit: 100 requests/min, 3 concurrent.
 */

import Redis from "ioredis";
import { BaseApiClient, IntegrationResult, ParsedRef } from "./base-client";
import { logger } from "../lib/logger";

interface SpringerRecord {
  doi?: string;
  title?: string[];
  "creator"?: string;
  creators?: { creator: string }[];
  "publicationDate"?: string;
  "journal"?: string;
  "journalId"?: string;
  "url"?: { value?: string }[];
  "isbn"?: string;
  "volume"?: string;
  "number"?: string;
  "startingPage"?: string;
  "endingPage"?: string;
  "contentType"?: string;
}

interface SpringerResponse {
  result?: {
    total?: string;
  };
  records?: SpringerRecord[];
}

export class SpringerClient extends BaseApiClient {
  readonly sourceName = "springer";
  readonly baseUrl = "https://api.springer.com/metadata/json";
  readonly rateLimit = { rpm: 100, concurrent: 3 };

  private apiKey: string | undefined;

  constructor(redis: Redis) {
    super(redis, "springer", "https://api.springer.com/metadata/json", 15000);
    this.apiKey = process.env.SPRINGER_API_KEY;
  }

  async validateReference(ref: ParsedRef): Promise<IntegrationResult> {
    const start = Date.now();

    // Gracefully handle missing API key
    if (!this.apiKey) {
      return this.errorResult(ref, "SPRINGER_API_KEY not configured", Date.now() - start);
    }

    try {
      // 1. DOI varsa direkt sorgula
      if (ref.doi) {
        const cached = await this.getCached<IntegrationResult>(`doi:${ref.doi}`);
        if (cached) return { ...cached, fromCache: true };

        const record = await this.searchByDoi(ref.doi);
        if (record) {
          const ir = this.buildResult(ref, record, start);
          await this.setCache(`doi:${ref.doi}`, ir);
          return ir;
        }
      }

      // 2. Başlık ile arama
      const searchTitle = ref.title || this.extractTitleFromRaw(ref.rawText);

      if (searchTitle && searchTitle.length > 5) {
        const titleHash = searchTitle.toLowerCase().replace(/\s+/g, "_").substring(0, 100);
        const cached = await this.getCached<IntegrationResult>(`title:${titleHash}`);
        if (cached) return { ...cached, fromCache: true };

        const results = await this.searchByTitle(searchTitle, ref.authors?.map((a) => a.last_name).join(" "));
        if (results.length > 0) {
          const best = this.findBestMatch(ref, results);
          if (best) {
            const ir = this.buildResult(ref, best, start);
            await this.setCache(`title:${titleHash}`, ir);
            return ir;
          }
        }
      }

      // 3. rawText ile arama (fallback)
      if (ref.rawText && ref.rawText.length > 20) {
        const rawHash = ref.rawText.substring(0, 100).toLowerCase().replace(/\s+/g, "_");
        const cached = await this.getCached<IntegrationResult>(`raw:${rawHash}`);
        if (cached) return { ...cached, fromCache: true };

        const results = await this.searchByTitle(ref.rawText.substring(0, 200));
        if (results.length > 0) {
          const best = this.findBestMatch(ref, results);
          if (best) {
            const ir = this.buildResult(ref, best, start);
            await this.setCache(`raw:${rawHash}`, ir);
            return ir;
          }
        }
      }

      return this.notFound(ref, Date.now() - start);
    } catch (error: any) {
      logger.error(`Springer error: ${error.message}`);
      return this.errorResult(ref, error.message, Date.now() - start);
    }
  }

  /**
   * Search Springer by DOI.
   */
  private async searchByDoi(doi: string): Promise<SpringerRecord | null> {
    try {
      const response = await this.get<SpringerResponse>("", {
        q: `doi:"${doi}"`,
        api_key: this.apiKey!,
        p: "1",
      });
      return response.records?.[0] || null;
    } catch {
      return null;
    }
  }

  /**
   * Search Springer by title, optionally with author hint.
   */
  private async searchByTitle(title: string, authorHint?: string): Promise<SpringerRecord[]> {
    try {
      let query = `ti:"${title.substring(0, 150)}"`;
      if (authorHint) {
        query += ` AND au:"${authorHint}"`;
      }

      const response = await this.get<SpringerResponse>("", {
        q: query,
        api_key: this.apiKey!,
        p: "5",
        s: "0",
      });

      return response.records || [];
    } catch {
      return [];
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

  private findBestMatch(ref: ParsedRef, records: SpringerRecord[]): SpringerRecord | null {
    let best: SpringerRecord | null = null;
    let bestScore = 0;

    for (const record of records) {
      const score = this.calculateConfidence(ref, record);
      if (score > bestScore) {
        bestScore = score;
        best = record;
      }
    }

    return bestScore >= 30 ? best : null;
  }

  private calculateConfidence(ref: ParsedRef, record: SpringerRecord): number {
    let score = 0;

    // Title similarity (40% weight)
    const recordTitle = record.title?.[0] || "";
    const titleSim = this.titleSimilarity(ref.title || "", recordTitle);
    score += titleSim * 40;

    // Year match (15%)
    const recordYear = this.getYear(record);
    if (ref.year && recordYear) {
      score += ref.year === recordYear ? 15 : (Math.abs(ref.year - recordYear) <= 2 ? 8 : 0);
    }

    // DOI match (25%)
    if (ref.doi && record.doi && ref.doi.toLowerCase() === record.doi.toLowerCase()) {
      score += 25;
    }

    // Author match (15%)
    if (ref.authors?.length) {
      const recordAuthors = this.parseAuthors(record);
      if (recordAuthors.length > 0) {
        const refLastNames = ref.authors.map((a) => a.last_name.toLowerCase());
        const recordLastNames = recordAuthors.map((a) => a.last_name.toLowerCase());
        const matches = refLastNames.filter((n) =>
          recordLastNames.some((w) => w.includes(n) || n.includes(w)),
        );
        score += (matches.length / refLastNames.length) * 15;
      }
    }

    // Journal/book match (5%)
    const journalTitle = record.journal || "";
    if (ref.journal && journalTitle) {
      score += this.titleSimilarity(ref.journal, journalTitle) * 5;
    }

    return Math.min(score, 100);
  }

  private buildResult(ref: ParsedRef, record: SpringerRecord, start: number): IntegrationResult {
    const confidence = this.calculateConfidence(ref, record);
    const recordUrl = record.url?.[0]?.value || (record.doi ? `https://doi.org/${record.doi}` : null);

    return {
      source: this.sourceName,
      status: confidence >= 70 ? "found" : confidence >= 40 ? "partial_match" : "not_found",
      confidenceScore: confidence,
      sourceUrl: recordUrl,
      sourceId: record.doi || null,
      matchedTitle: record.title?.[0] || null,
      matchedAuthors: this.parseAuthors(record),
      matchedYear: this.getYear(record),
      matchedDoi: record.doi || null,
      metadata: {
        journal: record.journal || null,
        contentType: record.contentType || null,
        volume: record.volume || null,
        issue: record.number || null,
        pages: record.startingPage
          ? `${record.startingPage}${record.endingPage ? `-${record.endingPage}` : ""}`
          : null,
        isbn: record.isbn || null,
      },
      responseTimeMs: Date.now() - start,
      fromCache: false,
    };
  }

  /**
   * Parse authors from Springer record.
   * Springer can return authors as a flat "creator" string or as "creators" array.
   */
  private parseAuthors(record: SpringerRecord): { last_name: string; first_name: string | null }[] {
    const authors: { last_name: string; first_name: string | null }[] = [];

    // Try structured creators array first
    if (record.creators?.length) {
      for (const c of record.creators) {
        const parsed = this.parseAuthorName(c.creator);
        if (parsed) authors.push(parsed);
      }
    }

    // Fallback to flat creator string
    if (authors.length === 0 && record.creator) {
      const names = record.creator.split(/;\s*/);
      for (const name of names) {
        const parsed = this.parseAuthorName(name.trim());
        if (parsed) authors.push(parsed);
      }
    }

    return authors;
  }

  private parseAuthorName(name: string): { last_name: string; first_name: string | null } | null {
    if (!name) return null;

    // Handle "Last, First" format
    const commaParts = name.split(",", 2);
    if (commaParts.length === 2 && commaParts[0] && commaParts[1]) {
      return {
        last_name: commaParts[0].trim(),
        first_name: commaParts[1].trim() || null,
      };
    }

    // Handle "First Last" format
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      const lastName = parts[parts.length - 1];
      if (!lastName) return null;
      return {
        last_name: lastName,
        first_name: parts.slice(0, -1).join(" "),
      };
    }

    const single = parts[0];
    if (parts.length === 1 && single && single.length > 0) {
      return { last_name: single, first_name: null };
    }

    return null;
  }

  private getYear(record: SpringerRecord): number | null {
    if (!record.publicationDate) return null;
    const yearMatch = record.publicationDate.match(/^(\d{4})/);
    return yearMatch && yearMatch[1] ? parseInt(yearMatch[1], 10) : null;
  }
}
