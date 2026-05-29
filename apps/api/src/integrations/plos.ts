/**
 * AiRefCheck - PLoS Search API Client
 * PLOS (Public Library of Science) journals covering biology, medicine,
 * genetics, computational biology, pathogens, neglected tropical diseases.
 * Requires API key: PLOS_API_KEY env variable.
 * Rate limit: 10 requests/min, 1 concurrent.
 */

import Redis from "ioredis";
import { BaseApiClient, IntegrationResult, ParsedRef } from "./base-client";
import { logger } from "../lib/logger";

interface PlosDoc {
  id?: string;
  title?: string;
  "author_display"?: string[];
  "journal"?: string;
  "publication_date"?: string;
  "doi"?: string;
  "url"?: string;
  "article_type"?: string;
  "subject"?: string[];
  "volume"?: string;
  "issue"?: string;
  "elocation_id"?: string;
}

interface PlosSearchResponse {
  response?: {
    numFound?: number;
    docs?: PlosDoc[];
  };
}

export class PlosClient extends BaseApiClient {
  readonly sourceName = "plos";
  readonly baseUrl = "https://api.plos.org/search";
  readonly rateLimit = { rpm: 10, concurrent: 1 };

  private apiKey: string | undefined;

  constructor(redis: Redis) {
    super(redis, "plos", "https://api.plos.org/search", 15000);
    this.apiKey = process.env.PLOS_API_KEY;
  }

  async validateReference(ref: ParsedRef): Promise<IntegrationResult> {
    const start = Date.now();

    // Gracefully handle missing API key
    if (!this.apiKey) {
      return this.errorResult(ref, "PLOS_API_KEY not configured", Date.now() - start);
    }

    try {
      // 1. DOI varsa direkt sorgula
      if (ref.doi) {
        const cached = await this.getCached<IntegrationResult>(`doi:${ref.doi}`);
        if (cached) return { ...cached, fromCache: true };

        const doc = await this.searchByDoi(ref.doi);
        if (doc) {
          const ir = this.buildResult(ref, doc, start);
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

        const docs = await this.searchByTitle(searchTitle, ref.authors?.map((a) => a.last_name).join(" "));
        if (docs.length > 0) {
          const best = this.findBestMatch(ref, docs);
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

        const docs = await this.searchByTitle(ref.rawText.substring(0, 200));
        if (docs.length > 0) {
          const best = this.findBestMatch(ref, docs);
          if (best) {
            const ir = this.buildResult(ref, best, start);
            await this.setCache(`raw:${rawHash}`, ir);
            return ir;
          }
        }
      }

      return this.notFound(ref, Date.now() - start);
    } catch (error: any) {
      logger.error(`PLoS error: ${error.message}`);
      return this.errorResult(ref, error.message, Date.now() - start);
    }
  }

  /**
   * Search PLoS by DOI.
   */
  private async searchByDoi(doi: string): Promise<PlosDoc | null> {
    try {
      const response = await this.get<PlosSearchResponse>("", {
        q: `doi:"${doi}"`,
        api_key: this.apiKey!,
        fl: "id,title,author_display,journal,publication_date,doi,url,article_type,subject,volume,issue,elocation_id",
        rows: "1",
      });
      return response.response?.docs?.[0] || null;
    } catch {
      return null;
    }
  }

  /**
   * Search PLoS by title, optionally with author hint.
   */
  private async searchByTitle(title: string, authorHint?: string): Promise<PlosDoc[]> {
    try {
      let query = `title:"${title.substring(0, 150)}"`;
      if (authorHint) {
        query += ` AND author:"${authorHint}"`;
      }

      const response = await this.get<PlosSearchResponse>("", {
        q: query,
        api_key: this.apiKey!,
        fl: "id,title,author_display,journal,publication_date,doi,url,article_type,subject,volume,issue,elocation_id",
        rows: "5",
      });

      return response.response?.docs || [];
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

  private findBestMatch(ref: ParsedRef, docs: PlosDoc[]): PlosDoc | null {
    let best: PlosDoc | null = null;
    let bestScore = 0;

    for (const doc of docs) {
      const score = this.calculateConfidence(ref, doc);
      if (score > bestScore) {
        bestScore = score;
        best = doc;
      }
    }

    return bestScore >= 30 ? best : null;
  }

  private calculateConfidence(ref: ParsedRef, doc: PlosDoc): number {
    let score = 0;

    // Title similarity (40% weight)
    const docTitle = doc.title || "";
    const titleSim = this.titleSimilarity(ref.title || "", docTitle);
    score += titleSim * 40;

    // Year match (15%)
    const docYear = this.getYear(doc);
    if (ref.year && docYear) {
      score += ref.year === docYear ? 15 : (Math.abs(ref.year - docYear) <= 2 ? 8 : 0);
    }

    // DOI match (25%)
    if (ref.doi && doc.doi && ref.doi.toLowerCase() === doc.doi.toLowerCase()) {
      score += 25;
    }

    // Author match (15%)
    if (ref.authors?.length && doc.author_display?.length) {
      const refLastNames = ref.authors.map((a) => a.last_name.toLowerCase());
      const docLastNames = doc.author_display.map((a) => {
        const parts = a.trim().split(/\s+/);
        return (parts[parts.length - 1] || "").toLowerCase();
      });
      const matches = refLastNames.filter((n) =>
        docLastNames.some((w) => w.includes(n) || n.includes(w)),
      );
      score += (matches.length / refLastNames.length) * 15;
    }

    // Journal match (5%)
    if (ref.journal && doc.journal) {
      score += this.titleSimilarity(ref.journal, doc.journal) * 5;
    }

    return Math.min(score, 100);
  }

  private buildResult(ref: ParsedRef, doc: PlosDoc, start: number): IntegrationResult {
    const confidence = this.calculateConfidence(ref, doc);

    return {
      source: this.sourceName,
      status: confidence >= 70 ? "found" : confidence >= 40 ? "partial_match" : "not_found",
      confidenceScore: confidence,
      sourceUrl: doc.url || (doc.doi ? `https://doi.org/${doc.doi}` : null),
      sourceId: doc.id || doc.doi || null,
      matchedTitle: doc.title || null,
      matchedAuthors: this.parseAuthors(doc),
      matchedYear: this.getYear(doc),
      matchedDoi: doc.doi || null,
      metadata: {
        journal: doc.journal || null,
        articleType: doc.article_type || null,
        subjects: doc.subject || [],
        volume: doc.volume || null,
        issue: doc.issue || null,
        elocationId: doc.elocation_id || null,
      },
      responseTimeMs: Date.now() - start,
      fromCache: false,
    };
  }

  /**
   * Parse PLoS author_display array into structured authors.
   * PLoS returns authors as full name strings like "John A. Smith".
   */
  private parseAuthors(doc: PlosDoc): { last_name: string; first_name: string | null }[] {
    if (!doc.author_display?.length) return [];

    return doc.author_display
      .map((name): { last_name: string; first_name: string | null } | null => {
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) {
          const lastName = parts[parts.length - 1];
          if (!lastName) return null;
          return {
            last_name: lastName,
            first_name: parts.slice(0, -1).join(" "),
          };
        }
        const single = parts[0] || name;
        return { last_name: single, first_name: null };
      })
      .filter((a): a is { last_name: string; first_name: string | null } => a !== null);
  }

  private getYear(doc: PlosDoc): number | null {
    if (!doc.publication_date) return null;
    const yearMatch = doc.publication_date.match(/^(\d{4})/);
    return yearMatch && yearMatch[1] ? parseInt(yearMatch[1], 10) : null;  }
}
