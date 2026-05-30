/**
 * AiRefCheck - Google Books API Client
 * Free API (1000 req/day) — excellent for book validation.
 * Many academic references are books that journal-focused DBs miss.
 */

import Redis from "ioredis";
import { BaseApiClient, IntegrationResult, ParsedRef } from "./base-client";
import { logger } from "../lib/logger";

interface GoogleBooksVolumeInfo {
  title: string;
  subtitle?: string;
  authors?: string[];
  publishedDate?: string; // "YYYY" or "YYYY-MM-DD"
  industryIdentifiers?: { type: string; identifier: string }[];
  pageCount?: number;
  publisher?: string;
  description?: string;
  infoLink?: string;
  imageLinks?: { thumbnail?: string };
}

interface GoogleBooksItem {
  id: string;
  volumeInfo: GoogleBooksVolumeInfo;
}

interface GoogleBooksResponse {
  totalItems: number;
  items?: GoogleBooksItem[];
}

export class GoogleBooksClient extends BaseApiClient {
  readonly sourceName = "google_books";
  readonly baseUrl = "https://www.googleapis.com";
  readonly rateLimit = { rpm: 40, concurrent: 2 };

  private apiKey: string;

  constructor(redis: Redis) {
    super(redis, "google_books", "https://www.googleapis.com", 10000);
    this.apiKey = process.env.GOOGLE_BOOKS_API_KEY || "";
  }

  async validateReference(ref: ParsedRef): Promise<IntegrationResult> {
    const start = Date.now();

    try {
      // Only use Google Books for book-like references
      // Skip if clearly a journal article (has journal name + volume/pages)
      if (this.isLikelyJournalArticle(ref)) {
        return this.notFound(ref, Date.now() - start);
      }

      // Strategy 1: ISBN/DOI search if available
      if (ref.doi) {
        const isbnResult = await this.searchByIsbn(ref.doi);
        if (isbnResult) {
          const ir = this.buildResult(ref, isbnResult, start);
          if (ir.status === "found") return ir;
        }
      }

      // Strategy 2: Title + Author search
      const searchTitle = ref.title || this.extractTitleFromRaw(ref.rawText);
      if (searchTitle && searchTitle.length > 3) {
        const cacheKey = `title:${searchTitle.substring(0, 80).toLowerCase().replace(/\s+/g, "_")}`;
        const cached = await this.getCached<IntegrationResult>(cacheKey);
        if (cached) return { ...cached, fromCache: true };

        let query = `intitle:${this.sanitizeQuery(searchTitle)}`;
        if (ref.authors?.length) {
          const authorName = ref.authors[0].last_name;
          if (authorName) {
            query += `+inauthor:${this.sanitizeQuery(authorName)}`;
          }
        }

        const books = await this.searchBooks(query);
        if (books.length > 0) {
          const best = this.findBestMatch(ref, books);
          if (best) {
            const ir = this.buildResult(ref, best, start);
            await this.setCache(cacheKey, ir);
            return ir;
          }
        }

        // Strategy 3: Title-only search (author might be wrong)
        const titleOnlyBooks = await this.searchBooks(`intitle:${this.sanitizeQuery(searchTitle)}`);
        if (titleOnlyBooks.length > 0) {
          const best = this.findBestMatch(ref, titleOnlyBooks);
          if (best) {
            const ir = this.buildResult(ref, best, start);
            await this.setCache(cacheKey, ir);
            return ir;
          }
        }
      }

      // Strategy 4: Raw text search
      if (ref.rawText && ref.rawText.length > 20) {
        const rawQuery = ref.rawText.substring(0, 100);
        const rawHash = `raw:${rawQuery.substring(0, 60).toLowerCase().replace(/\s+/g, "_")}`;
        const cached = await this.getCached<IntegrationResult>(rawHash);
        if (cached) return { ...cached, fromCache: true };

        const books = await this.searchBooks(this.sanitizeQuery(rawQuery));
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
      logger.error(`Google Books error: ${error.message}`);
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
    // Add API key if configured
    if (this.apiKey) {
      url.searchParams.set("key", this.apiKey);
    }

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "AiRefCheck/0.1.0",
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      // Google Books returns 429 on rate limit — don't throw, just return empty
      if (response.status === 429) {
        logger.warn("Google Books rate limit hit");
        throw new Error(`Google Books rate limited`);
      }
      throw new Error(`Google Books API ${response.status}: ${response.statusText}`);
    }

    return response.json() as T;
  }

  /**
   * Determine if this reference is likely a journal article, not a book.
   * Google Books is for books — don't waste API calls on articles.
   */
  private isLikelyJournalArticle(ref: ParsedRef): boolean {
    // If it has a journal name AND volume/pages, it's likely an article
    if (ref.journal && ref.journal.length > 3) {
      // Check for volume/page patterns in raw text
      const raw = ref.rawText || "";
      const hasVolume = /,\s*\d+/i.test(raw) || /volume\s+\d+/i.test(raw);
      const hasPages = /\d+\s*[-–]\s*\d+/.test(raw);
      return hasVolume || hasPages;
    }
    return false;
  }

  private async searchBooks(query: string): Promise<GoogleBooksItem[]> {
    try {
      const response = await this.get<GoogleBooksResponse>("/books/v1/volumes", {
        q: query.substring(0, 200),
        maxResults: "5",
        printType: "books",
      });
      return response.items || [];
    } catch {
      return [];
    }
  }

  private async searchByIsbn(identifier: string): Promise<GoogleBooksItem | null> {
    try {
      const response = await this.get<GoogleBooksResponse>("/books/v1/volumes", {
        q: `isbn:${identifier}`,
        maxResults: "1",
      });
      return response.items?.[0] || null;
    } catch {
      return null;
    }
  }

  private findBestMatch(ref: ParsedRef, books: GoogleBooksItem[]): GoogleBooksItem | null {
    let best: GoogleBooksItem | null = null;
    let bestScore = 0;

    for (const book of books) {
      const score = this.calcConfidence(ref, book.volumeInfo);
      if (score > bestScore) {
        bestScore = score;
        best = book;
      }
    }

    return bestScore >= 30 ? best : null;
  }

  private calcConfidence(ref: ParsedRef, info: GoogleBooksVolumeInfo): number {
    let score = 0;

    // Title match (50% weight)
    const refTitle = ref.title || this.extractTitleFromRaw(ref.rawText) || "";
    const titleSim = this.titleSimilarity(refTitle, info.title);
    const subtitleSim = info.subtitle ? this.titleSimilarity(refTitle, info.subtitle) : 0;
    score += Math.max(titleSim, subtitleSim) * 50;

    // Author match (30% weight)
    if (ref.authors?.length && info.authors?.length) {
      const refLast = ref.authors.map((a) => a.last_name.toLowerCase());
      const bookAuthors = info.authors.map((a) => a.toLowerCase());

      let authorMatches = 0;
      for (const rl of refLast) {
        if (bookAuthors.some((ba) => ba.includes(rl) || rl.includes(ba.split(" ").pop() || ""))) {
          authorMatches++;
        }
      }
      score += (authorMatches / refLast.length) * 30;
    }

    // Year match (10% weight)
    if (ref.year && info.publishedDate) {
      const bookYear = parseInt(info.publishedDate.substring(0, 4), 10);
      if (!isNaN(bookYear)) {
        if (bookYear === ref.year) {
          score += 10;
        } else if (Math.abs(bookYear - ref.year) <= 2) {
          // Edition might be different year
          score += 5;
        }
      }
    }

    // Publisher match (10% weight)
    const raw = (ref.rawText || "").toLowerCase();
    if (info.publisher) {
      const pubWords = info.publisher.toLowerCase().split(/\s+/);
      const matched = pubWords.filter((w) => w.length > 3 && raw.includes(w));
      if (matched.length > 0) {
        score += Math.min(matched.length * 3, 10);
      }
    }

    return Math.min(score, 100);
  }

  private buildResult(ref: ParsedRef, item: GoogleBooksItem, start: number): IntegrationResult {
    const info = item.volumeInfo;
    const confidence = this.calcConfidence(ref, info);
    const isbn = info.industryIdentifiers?.find((i) => i.type === "ISBN_13" || i.type === "ISBN_10");

    return {
      source: this.sourceName,
      status: confidence >= 55 ? "found" : confidence >= 35 ? "partial_match" : "not_found",
      confidenceScore: confidence,
      sourceUrl: info.infoLink || `https://books.google.com/books?id=${item.id}`,
      sourceId: item.id,
      matchedTitle: info.title,
      matchedAuthors: (info.authors || []).map((name) => {
        const parts = name.split(" ");
        return {
          last_name: parts.length > 1 ? parts[parts.length - 1] : name,
          first_name: parts.length > 1 ? parts.slice(0, -1).join(" ") : null,
        };
      }),
      matchedYear: info.publishedDate ? parseInt(info.publishedDate.substring(0, 4), 10) || null : null,
      matchedDoi: isbn ? `ISBN:${isbn.identifier}` : null,
      metadata: {
        subtitle: info.subtitle,
        publisher: info.publisher,
        pageCount: info.pageCount,
        isbn: isbn?.identifier,
        thumbnail: info.imageLinks?.thumbnail,
      },
      responseTimeMs: Date.now() - start,
      fromCache: false,
    };
  }

  private extractTitleFromRaw(raw: string): string | null {
    // Try to extract title from raw text: "Author (Year). Title. Publisher."
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
      .substring(0, 150);
  }
}
