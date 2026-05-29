/**
 * AiRefCheck - arXiv API Client
 * Preprint repository: physics, mathematics, computer science,
 * quantitative biology, quantitative finance, statistics,
 * electrical engineering and systems science.
 * No API key required. Atom XML responses parsed via regex/string matching.
 */

import Redis from "ioredis";
import { BaseApiClient, IntegrationResult, ParsedRef } from "./base-client";
import { logger } from "../lib/logger";

interface ArxivEntry {
  id: string;
  title: string;
  authors: { last_name: string; first_name: string | null }[];
  year: number | null;
  doi: string | null;
  arxivId: string;
  url: string;
  summary: string;
  categories: string[];
}

export class ArxivClient extends BaseApiClient {
  readonly sourceName = "arxiv";
  readonly baseUrl = "http://export.arxiv.org/api/query";
  readonly rateLimit = { rpm: 30, concurrent: 1 };

  constructor(redis: Redis) {
    super(redis, "arxiv", "http://export.arxiv.org/api/query", 15000);
  }

  async validateReference(ref: ParsedRef): Promise<IntegrationResult> {
    const start = Date.now();

    try {
      // 1. DOI varsa direkt sorgula
      if (ref.doi) {
        const cached = await this.getCached<IntegrationResult>(`doi:${ref.doi}`);
        if (cached) return { ...cached, fromCache: true };

        const entry = await this.searchByDoi(ref.doi);
        if (entry) {
          const ir = this.buildResult(ref, entry, start);
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

        const entries = await this.searchByTitle(searchTitle, ref.authors);
        if (entries.length > 0) {
          const best = this.findBestMatch(ref, entries);
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

        const entries = await this.searchByTitle(ref.rawText.substring(0, 200));
        if (entries.length > 0) {
          const best = this.findBestMatch(ref, entries);
          if (best) {
            const ir = this.buildResult(ref, best, start);
            await this.setCache(`raw:${rawHash}`, ir);
            return ir;
          }
        }
      }

      return this.notFound(ref, Date.now() - start);
    } catch (error: any) {
      logger.error(`arXiv error: ${error.message}`);
      return this.errorResult(ref, error.message, Date.now() - start);
    }
  }

  /**
   * Search arXiv by DOI using query parameter.
   */
  private async searchByDoi(doi: string): Promise<ArxivEntry | null> {
    try {
      const xml = await this.get<string>("", { search_query: `doi:"${doi}"`, max_results: "1" });
      const entries = this.parseAtomXml(xml);
      return entries[0] || null;
    } catch {
      return null;
    }
  }

  /**
   * Search arXiv by title, optionally filtering by author last name.
   */
  private async searchByTitle(
    title: string,
    authors?: { last_name: string; first_name: string | null }[] | null,
  ): Promise<ArxivEntry[]> {
    try {
      // Build search query: ti:"title words" with optional author filter
      const titleQuery = `ti:"${title.substring(0, 150)}"`;
      const authorLast = authors?.[0]?.last_name;
      const searchQuery = authorLast
        ? `${titleQuery} AND au:"${authorLast}"`
        : titleQuery;

      const xml = await this.get<string>("", {
        search_query: searchQuery,
        start: "0",
        max_results: "5",
        sortBy: "relevance",
        sortOrder: "descending",
      });

      return this.parseAtomXml(xml);
    } catch {
      return [];
    }
  }

  /**
   * Parse Atom XML response from arXiv API.
   * Uses regex/string matching instead of an XML parser to avoid dependencies.
   */
  private parseAtomXml(xml: string): ArxivEntry[] {
    const entries: ArxivEntry[] = [];

    if (typeof xml !== "string" || xml.length === 0) {
      return entries;
    }

    // Split by <entry> tags
    const entryBlocks = xml.split(/<entry>/).slice(1);

    for (const block of entryBlocks) {
      try {
        const entry = this.parseEntryBlock(block);
        if (entry) entries.push(entry);
      } catch {
        // Skip malformed entries
      }
    }

    return entries;
  }

  private parseEntryBlock(block: string): ArxivEntry | null {
    // Extract ID (full URL like http://arxiv.org/abs/2101.00001v1)
    const idMatch = block.match(/<id>\s*(http:\/\/arxiv\.org\/abs\/([^\s<]+?))\s*<\/id>/);
    if (!idMatch || !idMatch[1] || !idMatch[2]) return null;

    const url: string = idMatch[1];
    const arxivId: string = idMatch[2].replace(/v\d+$/, ""); // Remove version suffix

    // Extract title
    const titleMatch = block.match(/<title>\s*([\s\S]*?)\s*<\/title>/);
    const title = titleMatch && titleMatch[1]
      ? titleMatch[1].replace(/\n/g, " ").replace(/\s+/g, " ").trim()
      : "";

    if (!title) return null;

    // Extract authors
    const authors: { last_name: string; first_name: string | null }[] = [];
    const authorPattern = /<author>[\s\S]*?<name>\s*([\s\S]*?)\s*<\/name>[\s\S]*?<\/author>/g;
    let authorMatch: RegExpExecArray | null;
    while ((authorMatch = authorPattern.exec(block)) !== null) {
      const rawName = authorMatch[1];
      if (!rawName) continue;
      const nameParts = rawName.trim().split(/\s+/);
      if (nameParts.length >= 2) {
        const lastName = nameParts[nameParts.length - 1];
        if (lastName) {
          authors.push({
            last_name: lastName,
            first_name: nameParts.slice(0, -1).join(" "),
          });
        }
      } else if (nameParts.length === 1 && nameParts[0]) {
        authors.push({ last_name: nameParts[0], first_name: null });
      }
    }

    // Extract year from <published> or <updated>
    const publishedMatch = block.match(/<published>\s*(\d{4})/);
    const updatedMatch = block.match(/<updated>\s*(\d{4})/);
    const year = publishedMatch && publishedMatch[1]
      ? parseInt(publishedMatch[1], 10)
      : updatedMatch && updatedMatch[1]
        ? parseInt(updatedMatch[1], 10)
        : null;

    // Extract DOI
    const doiMatch = block.match(/<arxiv:doi[^>]*>\s*([\s\S]*?)\s*<\/arxiv:doi>/);
    const doi = doiMatch && doiMatch[1] ? doiMatch[1].trim() : null;

    // Extract categories
    const categories: string[] = [];
    const catPattern = /<category\s+term="([^"]+)"/g;
    let catMatch: RegExpExecArray | null;
    while ((catMatch = catPattern.exec(block)) !== null) {
      if (catMatch[1]) categories.push(catMatch[1]);
    }

    // Extract summary
    const summaryMatch = block.match(/<summary>\s*([\s\S]*?)\s*<\/summary>/);
    const summary = summaryMatch && summaryMatch[1]
      ? summaryMatch[1].replace(/\n/g, " ").replace(/\s+/g, " ").trim()
      : "";

    return { id: url, title, authors, year, doi, arxivId, url, summary, categories };
  }

  /**
   * Extract title from raw reference text.
   * Looks for text after year pattern and before the next period or journal name.
   */
  private extractTitleFromRaw(raw: string): string | null {
    const match = raw.match(/\(\d{4}\)\s*\.?\s*(.+?)(?:\.\s|\.(?=\s*[A-Z])|$)/);
    if (match && match[1] && match[1].length > 10) {
      return match[1].trim();
    }
    return null;
  }

  private findBestMatch(ref: ParsedRef, entries: ArxivEntry[]): ArxivEntry | null {
    let best: ArxivEntry | null = null;
    let bestScore = 0;

    for (const entry of entries) {
      const score = this.calculateConfidence(ref, entry);
      if (score > bestScore) {
        bestScore = score;
        best = entry;
      }
    }

    return bestScore >= 30 ? best : null;
  }

  private calculateConfidence(ref: ParsedRef, entry: ArxivEntry): number {
    let score = 0;

    // Title similarity (40% weight)
    const titleSim = this.titleSimilarity(ref.title || "", entry.title);
    score += titleSim * 40;

    // Year match (15%)
    if (ref.year && entry.year) {
      score += ref.year === entry.year ? 15 : (Math.abs(ref.year - entry.year) <= 2 ? 8 : 0);
    }

    // DOI match (25%)
    if (ref.doi && entry.doi && ref.doi.toLowerCase() === entry.doi.toLowerCase()) {
      score += 25;
    }

    // Author match (15%)
    if (ref.authors?.length && entry.authors.length) {
      const refLastNames = ref.authors.map((a) => a.last_name.toLowerCase());
      const entryLastNames = entry.authors.map((a) => a.last_name.toLowerCase());
      const matches = refLastNames.filter((n) =>
        entryLastNames.some((w) => w.includes(n) || n.includes(w)),
      );
      score += (matches.length / refLastNames.length) * 15;
    }

    // Category relevance bonus (5%)
    if (ref.rawText && entry.categories.length > 0) {
      const rawLower = ref.rawText.toLowerCase();
      const relevantCategories = entry.categories.filter((c) =>
        rawLower.includes(c.replace(".", " ")),
      );
      if (relevantCategories.length > 0) {
        score += 5;
      }
    }

    return Math.min(score, 100);
  }

  private buildResult(ref: ParsedRef, entry: ArxivEntry, start: number): IntegrationResult {
    const confidence = this.calculateConfidence(ref, entry);
    return {
      source: this.sourceName,
      status: confidence >= 70 ? "found" : confidence >= 40 ? "partial_match" : "not_found",
      confidenceScore: confidence,
      sourceUrl: entry.url,
      sourceId: entry.arxivId,
      matchedTitle: entry.title,
      matchedAuthors: entry.authors,
      matchedYear: entry.year,
      matchedDoi: entry.doi,
      metadata: {
        arxivId: entry.arxivId,
        categories: entry.categories,
        summary: entry.summary.substring(0, 300),
      },
      responseTimeMs: Date.now() - start,
      fromCache: false,
    };
  }
}
