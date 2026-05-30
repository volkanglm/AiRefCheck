/**
 * AiRefCheck - OpenLibrary API Client
 * Free, no API key needed. 50M+ books.
 * Perfect for validating book references that journal-focused DBs miss.
 */

import Redis from "ioredis";
import { BaseApiClient, IntegrationResult, ParsedRef } from "./base-client";
import { logger } from "../lib/logger";

interface OpenLibraryDoc {
  key: string;             // "/works/OL15532952W"
  title: string;
  author_name?: string[];
  author_key?: string[];
  first_publish_year?: number;
  edition_count?: number;
  isbn?: string[];
  publisher?: string[];
  language?: string[];
  subject?: string[];
  cover_i?: number;
}

interface OpenLibrarySearchResponse {
  numFound: number;
  docs: OpenLibraryDoc[];
}

export class OpenLibraryClient extends BaseApiClient {
  readonly sourceName = "openlibrary";
  readonly baseUrl = "https://openlibrary.org";
  readonly rateLimit = { rpm: 60, concurrent: 2 };

  constructor(redis: Redis) {
    super(redis, "openlibrary", "https://openlibrary.org", 10000);
  }

  async validateReference(ref: ParsedRef): Promise<IntegrationResult> {
    const start = Date.now();

    try {
      // Skip journal articles — OpenLibrary is for books
      if (this.isLikelyJournalArticle(ref)) {
        return this.notFound(ref, Date.now() - start);
      }

      // Strategy 1: Title + Author search
      const searchTitle = ref.title || this.extractTitleFromRaw(ref.rawText);
      if (searchTitle && searchTitle.length > 3) {
        const cacheKey = `title:${searchTitle.substring(0, 80).toLowerCase().replace(/\s+/g, "_")}`;
        const cached = await this.getCached<IntegrationResult>(cacheKey);
        if (cached) return { ...cached, fromCache: true };

        // Search with title + first author
        let query = `title:${this.sanitizeQuery(searchTitle)}`;
        if (ref.authors?.length) {
          const authorName = ref.authors[0].last_name;
          if (authorName) {
            query += `&author=${this.sanitizeQuery(authorName)}`;
          }
        }

        const docs = await this.search(query);
        if (docs.length > 0) {
          const best = this.findBestMatch(ref, docs);
          if (best) {
            const ir = this.buildResult(ref, best, start);
            await this.setCache(cacheKey, ir);
            return ir;
          }
        }

        // Strategy 2: Title-only search
        const titleDocs = await this.search(`title:${this.sanitizeQuery(searchTitle)}`);
        if (titleDocs.length > 0) {
          const best = this.findBestMatch(ref, titleDocs);
          if (best) {
            const ir = this.buildResult(ref, best, start);
            await this.setCache(cacheKey, ir);
            return ir;
          }
        }
      }

      // Strategy 3: Raw text search
      if (ref.rawText && ref.rawText.length > 20) {
        const rawQuery = ref.rawText.substring(0, 120);
        const rawHash = `raw:${rawQuery.substring(0, 60).toLowerCase().replace(/\s+/g, "_")}`;
        const cached = await this.getCached<IntegrationResult>(rawHash);
        if (cached) return { ...cached, fromCache: true };

        const docs = await this.search(this.sanitizeQuery(rawQuery));
        if (docs.length > 0) {
          const best = this.findBestMatch(ref, docs);
          if (best) {
            const ir = this.buildResult(ref, best, start);
            await this.setCache(rawHash, ir);
            return ir;
          }
        }
      }

      return this.notFound(ref, Date.now() - start);
    } catch (error: any) {
      logger.error(`OpenLibrary error: ${error.message}`);
      return this.errorResult(ref, error.message, Date.now() - start);
    }
  }

  protected async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(path, this.baseUrl);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
      }
    }

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "AiRefCheck/0.1.0 (mailto:admin@qualityopen.com)",
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`OpenLibrary API ${response.status}: ${response.statusText}`);
    }

    return response.json() as T;
  }

  /**
   * Determine if this reference is likely a journal article, not a book.
   */
  private isLikelyJournalArticle(ref: ParsedRef): boolean {
    if (ref.journal && ref.journal.length > 3) {
      const raw = ref.rawText || "";
      const hasVolume = /,\s*\d+/i.test(raw) || /volume\s+\d+/i.test(raw);
      const hasPages = /\d+\s*[-–]\s*\d+/.test(raw);
      return hasVolume || hasPages;
    }
    return false;
  }

  private async search(query: string): Promise<OpenLibraryDoc[]> {
    try {
      const response = await this.get<OpenLibrarySearchResponse>(
        "/search.json",
        { q: query.substring(0, 300), limit: "5", fields: "key,title,author_name,first_publish_year,isbn,publisher,edition_count,subject,cover_i" }
      );
      return response.docs || [];
    } catch {
      return [];
    }
  }

  private findBestMatch(ref: ParsedRef, docs: OpenLibraryDoc[]): OpenLibraryDoc | null {
    let best: OpenLibraryDoc | null = null;
    let bestScore = 0;

    for (const doc of docs) {
      const score = this.calcConfidence(ref, doc);
      if (score > bestScore) {
        bestScore = score;
        best = doc;
      }
    }

    return bestScore >= 30 ? best : null;
  }

  private calcConfidence(ref: ParsedRef, doc: OpenLibraryDoc): number {
    let score = 0;

    // Title match (50% weight)
    const refTitle = ref.title || this.extractTitleFromRaw(ref.rawText) || "";
    const titleSim = this.titleSimilarity(refTitle, doc.title);
    score += titleSim * 50;

    // Author match (30% weight)
    if (ref.authors?.length && doc.author_name?.length) {
      const refLast = ref.authors.map((a) => a.last_name.toLowerCase());
      const docAuthors = doc.author_name.map((a) => a.toLowerCase());

      let authorMatches = 0;
      for (const rl of refLast) {
        if (docAuthors.some((da) => da.includes(rl) || rl.includes(da.split(" ").pop() || ""))) {
          authorMatches++;
        }
      }
      score += (authorMatches / refLast.length) * 30;
    }

    // Year match (10% weight)
    if (ref.year && doc.first_publish_year) {
      if (doc.first_publish_year === ref.year) {
        score += 10;
      } else if (Math.abs(doc.first_publish_year - ref.year) <= 3) {
        score += 5;
      }
    }

    // Publisher match (10% weight)
    if (doc.publisher?.length) {
      const raw = (ref.rawText || "").toLowerCase();
      const pubWords = doc.publisher.join(" ").toLowerCase().split(/\s+/);
      const matched = pubWords.filter((w) => w.length > 3 && raw.includes(w));
      if (matched.length > 0) {
        score += Math.min(matched.length * 3, 10);
      }
    }

    return Math.min(score, 100);
  }

  private buildResult(ref: ParsedRef, doc: OpenLibraryDoc, start: number): IntegrationResult {
    const confidence = this.calcConfidence(ref, doc);
    const workId = doc.key.replace("/works/", "");
    const coverUrl = doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null;

    return {
      source: this.sourceName,
      status: confidence >= 55 ? "found" : confidence >= 35 ? "partial_match" : "not_found",
      confidenceScore: confidence,
      sourceUrl: `https://openlibrary.org${doc.key}`,
      sourceId: workId,
      matchedTitle: doc.title,
      matchedAuthors: (doc.author_name || []).map((name) => {
        const parts = name.split(" ");
        return {
          last_name: parts.length > 1 ? parts[parts.length - 1] : name,
          first_name: parts.length > 1 ? parts.slice(0, -1).join(" ") : null,
        };
      }),
      matchedYear: doc.first_publish_year || null,
      matchedDoi: doc.isbn?.[0] ? `ISBN:${doc.isbn[0]}` : null,
      metadata: {
        publishers: doc.publisher?.slice(0, 3),
        editionCount: doc.edition_count,
        isbn: doc.isbn?.slice(0, 2),
        subjects: doc.subject?.slice(0, 5),
        coverUrl,
      },
      responseTimeMs: Date.now() - start,
      fromCache: false,
    };
  }

  private extractTitleFromRaw(raw: string): string | null {
    const match = raw.match(/\(\d{4}\)\s*\.?\s*(.+?)(?:\.\s*(?:[A-Z][a-z]+|http|doi|$))/);
    if (match && match[1] && match[1].length > 5) {
      return match[1].trim();
    }
    return null;
  }

  private sanitizeQuery(query: string): string {
    return query
      .replace(/[^\w\sğüşıöçĞÜŞİÖÇ]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 200);
  }
}
