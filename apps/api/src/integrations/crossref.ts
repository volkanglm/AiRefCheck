/**
 * AiRefCheck - CrossRef API Client
 * DOI-based and title-based reference validation.
 * 150M+ academic records. Free, rate-limited.
 */

import Redis from "ioredis";
import { BaseApiClient, IntegrationResult, ParsedRef } from "./base-client";
import { logger } from "../lib/logger";

interface CrossRefWork {
  DOI: string;
  title?: string[];
  author?: { given?: string; family?: string }[];
  "published-print"?: { "date-parts": number[][] };
  "published-online"?: { "date-parts": number[][] };
  "container-title"?: string[];
  volume?: string;
  issue?: string;
  page?: string;
  score?: number;
  URL: string;
}

interface CrossRefResponse {
  status: string;
  message: { items: CrossRefWork[] } | CrossRefWork;
}

export class CrossRefClient extends BaseApiClient {
  readonly sourceName = "crossref";
  readonly baseUrl = "https://api.crossref.org";
  readonly rateLimit = { rpm: 50, concurrent: 5 };

  constructor(redis: Redis) {
    super(redis, "crossref", "https://api.crossref.org", 15000);
  }

  async validateReference(ref: ParsedRef): Promise<IntegrationResult> {
    const start = Date.now();

    try {
      // 1. DOI varsa direkt sorgula
      if (ref.doi) {
        const cached = await this.getCached<IntegrationResult>(`doi:${ref.doi}`);
        if (cached) return { ...cached, fromCache: true };

        const result = await this.searchByDoi(ref.doi);
        if (result) {
          const ir = this.buildResult(ref, result, start);
          await this.setCache(`doi:${ref.doi}`, ir);
          return ir;
        }
      }

      // 2. Başlık ile arama
      if (ref.title) {
        const titleHash = ref.title.toLowerCase().replace(/\s+/g, "_").substring(0, 100);
        const cached = await this.getCached<IntegrationResult>(`title:${titleHash}`);
        if (cached) return { ...cached, fromCache: true };

        const results = await this.searchByTitle(ref.title, ref.authors?.map((a) => a.last_name).join(" "));
        if (results.length > 0) {
          const best = this.findBestMatch(ref, results);
          if (best) {
            const ir = this.buildResult(ref, best, start);
            await this.setCache(`title:${titleHash}`, ir);
            return ir;
          }
        }
      }

      return this.notFound(ref, Date.now() - start);
    } catch (error: any) {
      logger.error(`CrossRef error: ${error.message}`);
      return this.errorResult(ref, error.message, Date.now() - start);
    }
  }

  private async searchByDoi(doi: string): Promise<CrossRefWork | null> {
    try {
      const response = await this.get<CrossRefResponse>(`/works/${encodeURIComponent(doi)}`);
      return response.message as CrossRefWork;
    } catch {
      return null;
    }
  }

  private async searchByTitle(title: string, authorHint?: string): Promise<CrossRefWork[]> {
    try {
      const params: Record<string, string> = {
        query: title.substring(0, 200),
        rows: "5",
        select: "DOI,title,author,published-print,published-online,container-title,score",
      };
      if (authorHint) params["query.author"] = authorHint;

      const response = await this.get<CrossRefResponse>("/works", params);
      return (response.message as { items: CrossRefWork[] }).items || [];
    } catch {
      return [];
    }
  }

  private findBestMatch(ref: ParsedRef, works: CrossRefWork[]): CrossRefWork | null {
    let best: CrossRefWork | null = null;
    let bestScore = 0;

    for (const work of works) {
      const score = this.calculateConfidence(ref, work);
      if (score > bestScore) {
        bestScore = score;
        best = work;
      }
    }

    return bestScore >= 30 ? best : null;
  }

  private calculateConfidence(ref: ParsedRef, work: CrossRefWork): number {
    let score = 0;

    // Title similarity (40% weight)
    const workTitle = work.title?.[0] || "";
    const titleSim = this.titleSimilarity(ref.title || "", workTitle);
    score += titleSim * 40;

    // Year match (15%)
    const workYear = this.getYear(work);
    if (ref.year && workYear) {
      score += ref.year === workYear ? 15 : (Math.abs(ref.year - workYear) <= 2 ? 8 : 0);
    }

    // DOI match (20%)
    if (ref.doi && work.DOI && ref.doi.toLowerCase() === work.DOI.toLowerCase()) {
      score += 20;
    }

    // Author match (20%)
    if (ref.authors?.length && work.author?.length) {
      const refLastNames = ref.authors.map((a) => a.last_name.toLowerCase());
      const workLastNames = work.author.map((a) => (a.family || "").toLowerCase());
      const matches = refLastNames.filter((n) => workLastNames.some((w) => w.includes(n) || n.includes(w)));
      score += (matches.length / refLastNames.length) * 20;
    }

    // Journal match (5%)
    if (ref.journal && work["container-title"]?.[0]) {
      score += this.titleSimilarity(ref.journal, work["container-title"][0]) * 5;
    }

    return Math.min(score, 100);
  }

  private buildResult(ref: ParsedRef, work: CrossRefWork, start: number): IntegrationResult {
    const confidence = this.calculateConfidence(ref, work);
    return {
      source: this.sourceName,
      status: confidence >= 70 ? "found" : confidence >= 40 ? "partial_match" : "not_found",
      confidenceScore: confidence,
      sourceUrl: work.URL,
      sourceId: work.DOI,
      matchedTitle: work.title?.[0] || null,
      matchedAuthors: work.author?.map((a) => ({ last_name: a.family || "", first_name: a.given || null })) || null,
      matchedYear: this.getYear(work),
      matchedDoi: work.DOI,
      metadata: { journal: work["container-title"]?.[0], volume: work.volume, issue: work.issue, page: work.page },
      responseTimeMs: Date.now() - start,
      fromCache: false,
    };
  }

  private getYear(work: CrossRefWork): number | null {
    const parts = work["published-print"]?.["date-parts"]?.[0] || work["published-online"]?.["date-parts"]?.[0];
    return parts?.[0] || null;
  }
}
