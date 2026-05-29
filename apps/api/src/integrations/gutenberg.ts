/**
 * AiRefCheck - Project Gutenberg API Client (via RapidAPI)
 * 70,000+ free public domain books. Great for classic literature validation.
 */

import Redis from "ioredis";
import { BaseApiClient, IntegrationResult, ParsedRef } from "./base-client";
import { logger } from "../lib/logger";

interface GutenbergAuthor {
  id: number;
  name: string;
}

interface GutenbergBook {
  id: number;
  title: string;
  alternative_title: string | null;
  authors: GutenbergAuthor[];
  subjects: string[];
  bookshelves: string[];
  formats: Record<string, string>;
}

interface GutenbergResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: GutenbergBook[];
}

export class GutenbergClient extends BaseApiClient {
  readonly sourceName = "gutenberg";
  readonly baseUrl = "https://project-gutenberg-free-books-api1.p.rapidapi.com";
  readonly rateLimit = { rpm: 30, concurrent: 1 };

  private apiKey: string;
  private apiHost = "project-gutenberg-free-books-api1.p.rapidapi.com";

  constructor(redis: Redis) {
    super(redis, "gutenberg", "https://project-gutenberg-free-books-api1.p.rapidapi.com", 10000);
    this.apiKey = process.env.GUTENBERG_RAPIDAPI_KEY || "";
  }

  async validateReference(ref: ParsedRef): Promise<IntegrationResult> {
    const start = Date.now();

    if (!this.apiKey) {
      return this.errorResult(ref, "Gutenberg API key not configured", Date.now() - start);
    }

    try {
      // Search by title first
      const searchTitle = ref.title || this.extractTitleFromRaw(ref.rawText);

      if (searchTitle && searchTitle.length > 3) {
        const cacheKey = `title:${searchTitle.substring(0, 80).toLowerCase().replace(/\s+/g, "_")}`;
        const cached = await this.getCached<IntegrationResult>(cacheKey);
        if (cached) return { ...cached, fromCache: true };

        const books = await this.searchBooks(searchTitle);
        if (books.length > 0) {
          const best = this.findBestMatch(ref, books);
          if (best) {
            const ir = this.buildResult(ref, best, start);
            await this.setCache(cacheKey, ir);
            return ir;
          }
        }
      }

      // Fallback: rawText search
      if (ref.rawText && ref.rawText.length > 20) {
        const rawHash = ref.rawText.substring(0, 80).toLowerCase().replace(/\s+/g, "_");
        const cached = await this.getCached<IntegrationResult>(rawHash);
        if (cached) return { ...cached, fromCache: true };

        const books = await this.searchBooks(ref.rawText.substring(0, 100));
        if (books.length > 0) {
          const best = this.findBestMatch(ref, books);
          if (best) {
            const ir = this.buildResult(ref, best, start);
            await this.setCache(rawHash, ir);
            return ir;
          }
        }
      }

      return this.notFound(ref, Date.now() - start);
    } catch (error: any) {
      logger.error(`Gutenberg error: ${error.message}`);
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
        "X-RapidAPI-Key": this.apiKey,
        "X-RapidAPI-Host": this.apiHost,
      },
    });

    if (!response.ok) {
      throw new Error(`Gutenberg API ${response.status}: ${response.statusText}`);
    }

    return response.json() as T;
  }

  private async searchBooks(query: string): Promise<GutenbergBook[]> {
    try {
      const response = await this.get<GutenbergResponse>("/books", {
        search: query.substring(0, 200),
      });
      return response.results || [];
    } catch {
      return [];
    }
  }

  private findBestMatch(ref: ParsedRef, books: GutenbergBook[]): GutenbergBook | null {
    let best: GutenbergBook | null = null;
    let bestScore = 0;

    for (const book of books) {
      const score = this.calcConfidence(ref, book);
      if (score > bestScore) {
        bestScore = score;
        best = book;
      }
    }

    return bestScore >= 25 ? best : null;
  }

  private calcConfidence(ref: ParsedRef, book: GutenbergBook): number {
    let score = 0;

    // Title match (50% weight — books are mainly identified by title)
    const titleSim = this.titleSimilarity(ref.title || ref.rawText.substring(0, 100), book.title);
    score += titleSim * 50;

    // Also check alternative title
    if (book.alternative_title) {
      const altSim = this.titleSimilarity(ref.title || "", book.alternative_title);
      if (altSim > titleSim) {
        score = altSim * 50; // use better match
      }
    }

    // Author match (35% weight)
    if (ref.authors?.length && book.authors?.length) {
      const refLast = ref.authors.map((a) => a.last_name.toLowerCase());
      const bookNames = book.authors.map((a) => a.name.toLowerCase());
      const matches = refLast.filter((n) =>
        bookNames.some((b) => b.includes(n) || n.includes(b.split(",")[0].trim()))
      );
      score += (matches.length / refLast.length) * 35;
    }

    // Year is tricky for Gutenberg (public domain = old books)
    // But if we have a year and it's before 1930, give a small bonus
    if (ref.year && ref.year < 1930) {
      score += 5;
    }

    // Subject overlap (10%)
    if (ref.journal && book.subjects?.length) {
      const journalWords = ref.journal.toLowerCase().split(/\s+/);
      const subjectWords = book.subjects.join(" ").toLowerCase();
      const overlap = journalWords.filter((w) => w.length > 3 && subjectWords.includes(w));
      if (overlap.length > 0) {
        score += Math.min(overlap.length * 3, 10);
      }
    }

    return Math.min(score, 100);
  }

  private buildResult(ref: ParsedRef, book: GutenbergBook, start: number): IntegrationResult {
    const confidence = this.calcConfidence(ref, book);
    const gutenbergUrl = `https://www.gutenberg.org/ebooks/${book.id}`;

    return {
      source: this.sourceName,
      status: confidence >= 60 ? "found" : confidence >= 35 ? "partial_match" : "not_found",
      confidenceScore: confidence,
      sourceUrl: gutenbergUrl,
      sourceId: String(book.id),
      matchedTitle: book.title,
      matchedAuthors: book.authors.map((a) => {
        const parts = a.name.split(",");
        return {
          last_name: parts[0]?.trim() || a.name,
          first_name: parts[1]?.trim() || null,
        };
      }),
      matchedYear: null, // Gutenberg doesn't always have publication year
      matchedDoi: null,
      metadata: {
        alternative_title: book.alternative_title,
        subjects: book.subjects?.slice(0, 5),
        bookshelves: book.bookshelves?.slice(0, 3),
        formats: {
          html: book.formats?.["text/html"] || book.formats?.["text/html; charset=utf-8"],
          epub: book.formats?.["application/epub+zip"],
          text: book.formats?.["text/plain"],
        },
      },
      responseTimeMs: Date.now() - start,
      fromCache: false,
    };
  }

  /**
   * Extract title from raw reference text.
   */
  private extractTitleFromRaw(raw: string): string | null {
    const match = raw.match(/\(\d{4}\)\s*\.?\s*(.+?)(?:\.\s|\.(?=\s*[A-Z])|$)/);
    if (match && match[1] && match[1].length > 5) {
      return match[1].trim();
    }
    return null;
  }
}
