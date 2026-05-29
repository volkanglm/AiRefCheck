/**
 * AiRefCheck - Semantic Scholar API Client
 * 200M+ papers. AI-powered academic search.
 */

import Redis from "ioredis";
import { BaseApiClient, IntegrationResult, ParsedRef } from "./base-client";
import { logger } from "../lib/logger";

interface SSPaper {
  paperId: string;
  title?: string;
  authors?: { name?: string }[];
  year?: number;
  doi?: string;
  url?: string;
  venue?: string;
  journal?: { name?: string; volume?: string; pages?: string };
  externalIds?: { DOI?: string; PubMed?: string; ArXiv?: string };
}

export class SemanticScholarClient extends BaseApiClient {
  readonly sourceName = "semantic_scholar";
  readonly baseUrl = "https://api.semanticscholar.org";
  readonly rateLimit = { rpm: 60, concurrent: 1 }; // 1 req/s with API key

  constructor(redis: Redis) {
    super(redis, "semantic_scholar", "https://api.semanticscholar.org", 12000);
    if (process.env.SEMANTIC_SCHOLAR_API_KEY) {
      this.client.defaults.headers.common["x-api-key"] = process.env.SEMANTIC_SCHOLAR_API_KEY;
    }
  }

  async validateReference(ref: ParsedRef): Promise<IntegrationResult> {
    const start = Date.now();
    try {
      // 1. DOI ile sorgula
      if (ref.doi) {
        const cached = await this.getCached<IntegrationResult>(`doi:${ref.doi}`);
        if (cached) return { ...cached, fromCache: true };

        const paper = await this.getByDoi(ref.doi);
        if (paper) {
          const ir = this.buildResult(ref, paper, start);
          await this.setCache(`doi:${ref.doi}`, ir);
          return ir;
        }
      }

      // 2. Başlık ile arama
      if (ref.title && ref.title.length > 5) {
        const titleHash = ref.title.toLowerCase().replace(/\s+/g, "_").substring(0, 100);
        const cached = await this.getCached<IntegrationResult>(`title:${titleHash}`);
        if (cached) return { ...cached, fromCache: true };

        const papers = await this.searchByTitle(ref.title);
        if (papers.length > 0) {
          const best = papers[0];
          const ir = this.buildResult(ref, best, start);
          await this.setCache(`title:${titleHash}`, ir);
          return ir;
        }
      }

      // 3. rawText ile fallback arama
      if (ref.rawText && ref.rawText.length > 20) {
        const rawHash = ref.rawText.substring(0, 100).toLowerCase().replace(/\s+/g, "_");
        const cached = await this.getCached<IntegrationResult>(`raw:${rawHash}`);
        if (cached) return { ...cached, fromCache: true };

        const papers = await this.searchByTitle(ref.rawText.substring(0, 200));
        if (papers.length > 0) {
          const ir = this.buildResult(ref, papers[0], start);
          await this.setCache(`raw:${rawHash}`, ir);
          return ir;
        }
      }

      return this.notFound(ref, Date.now() - start);
    } catch (error: any) {
      logger.error(`Semantic Scholar error: ${error.message}`);
      return this.errorResult(ref, error.message, Date.now() - start);
    }
  }

  private async getByDoi(doi: string): Promise<SSPaper | null> {
    try {
      return await this.get<SSPaper>(`/graph/v1/paper/DOI:${encodeURIComponent(doi)}`, {
        fields: "title,authors,year,doi,venue,journal,externalIds,url",
      });
    } catch { return null; }
  }

  private async searchByTitle(title: string): Promise<SSPaper[]> {
    try {
      const res = await this.get<{ data: SSPaper[] }>("/graph/v1/paper/search", {
        query: title.substring(0, 200),
        limit: "5",
        fields: "title,authors,year,doi,venue,journal,externalIds,url",
      });
      return res.data || [];
    } catch { return []; }
  }

  private buildResult(ref: ParsedRef, paper: SSPaper, start: number): IntegrationResult {
    const confidence = this.calcConfidence(ref, paper);
    return {
      source: this.sourceName,
      status: confidence >= 65 ? "found" : confidence >= 35 ? "partial_match" : "not_found",
      confidenceScore: confidence,
      sourceUrl: paper.url || null,
      sourceId: paper.paperId,
      matchedTitle: paper.title || null,
      matchedAuthors: paper.authors?.map((a) => {
        const parts = (a.name || "").split(" ");
        return { last_name: parts.length > 1 ? parts[parts.length - 1] : parts[0], first_name: parts.length > 1 ? parts.slice(0, -1).join(" ") : null };
      }) || null,
      matchedYear: paper.year || null,
      matchedDoi: paper.doi || paper.externalIds?.DOI || null,
      metadata: { venue: paper.venue, journal: paper.journal?.name },
      responseTimeMs: Date.now() - start,
      fromCache: false,
    };
  }

  private calcConfidence(ref: ParsedRef, paper: SSPaper): number {
    let s = 0;
    s += this.titleSimilarity(ref.title || "", paper.title || "") * 45;
    if (ref.year && paper.year) s += (ref.year === paper.year ? 15 : Math.abs(ref.year - paper.year) <= 2 ? 7 : 0);
    if (ref.doi && paper.doi && ref.doi.toLowerCase() === paper.doi.toLowerCase()) s += 25;
    if (ref.authors?.length && paper.authors?.length) {
      const rLast = ref.authors.map((a) => a.last_name.toLowerCase());
      const pLast = paper.authors.map((a) => { const n = (a.name || "").split(" "); return (n[n.length - 1] || "").toLowerCase(); });
      const m = rLast.filter((n) => pLast.some((p) => p.includes(n) || n.includes(p)));
      s += (m.length / rLast.length) * 15;
    }
    return Math.min(s, 100);
  }
}
