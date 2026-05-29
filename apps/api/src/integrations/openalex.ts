/**
 * AiRefCheck - OpenAlex API Client
 * 250M+ works. Fully open and free academic database.
 */

import Redis from "ioredis";
import { BaseApiClient, IntegrationResult, ParsedRef } from "./base-client";
import { logger } from "../lib/logger";

interface OAXWork {
  id: string;
  doi?: string;
  title?: string;
  authorships?: { author: { display_name?: string } }[];
  publication_year?: number;
  host_venue?: { display_name?: string };
  primary_location?: { source?: { display_name?: string } };
  biblio?: { volume?: string; issue?: string; first_page?: string; last_page?: string };
}

export class OpenAlexClient extends BaseApiClient {
  readonly sourceName = "openalex";
  readonly baseUrl = "https://api.openalex.org";
  readonly rateLimit = { rpm: 600, concurrent: 10 };

  constructor(redis: Redis) {
    super(redis, "openalex", "https://api.openalex.org", 12000);
    if (process.env.OPENALEX_EMAIL) {
      this.client.defaults.params = { mailto: process.env.OPENALEX_EMAIL };
    }
  }

  async validateReference(ref: ParsedRef): Promise<IntegrationResult> {
    const start = Date.now();
    try {
      if (ref.doi) {
        const cached = await this.getCached<IntegrationResult>(`doi:${ref.doi}`);
        if (cached) return { ...cached, fromCache: true };

        const work = await this.getByDoi(ref.doi);
        if (work) {
          const ir = this.buildResult(ref, work, start);
          await this.setCache(`doi:${ref.doi}`, ir);
          return ir;
        }
      }

      if (ref.title) {
        const titleHash = ref.title.toLowerCase().replace(/\s+/g, "_").substring(0, 100);
        const cached = await this.getCached<IntegrationResult>(`title:${titleHash}`);
        if (cached) return { ...cached, fromCache: true };

        const works = await this.searchByTitle(ref.title, ref.year);
        if (works.length > 0) {
          const ir = this.buildResult(ref, works[0], start);
          await this.setCache(`title:${titleHash}`, ir);
          return ir;
        }
      }

      return this.notFound(ref, Date.now() - start);
    } catch (error: any) {
      logger.error(`OpenAlex error: ${error.message}`);
      return this.errorResult(ref, error.message, Date.now() - start);
    }
  }

  private async getByDoi(doi: string): Promise<OAXWork | null> {
    try {
      const normalizedDoi = doi.startsWith("https://doi.org/") ? doi : `https://doi.org/${doi}`;
      return await this.get<OAXWork>(`/works/doi:${encodeURIComponent(normalizedDoi)}`);
    } catch { return null; }
  }

  private async searchByTitle(title: string, year?: number | null): Promise<OAXWork[]> {
    try {
      const params: Record<string, string> = { search: title.substring(0, 200), per_page: "5" };
      if (year) params.filter = `publication_year:${year}`;
      const res = await this.get<{ results: OAXWork[] }>("/works", params);
      return res.results || [];
    } catch { return []; }
  }

  private buildResult(ref: ParsedRef, work: OAXWork, start: number): IntegrationResult {
    const confidence = this.calcConfidence(ref, work);
    const doiUrl = work.doi ? (work.doi.startsWith("http") ? work.doi : `https://doi.org/${work.doi}`) : null;
    return {
      source: this.sourceName,
      status: confidence >= 65 ? "found" : confidence >= 35 ? "partial_match" : "not_found",
      confidenceScore: confidence,
      sourceUrl: doiUrl,
      sourceId: work.id,
      matchedTitle: work.title || null,
      matchedAuthors: work.authorships?.map((a) => {
        const parts = (a.author.display_name || "").split(" ");
        return { last_name: parts.length > 1 ? parts[parts.length - 1] : parts[0], first_name: parts.length > 1 ? parts.slice(0, -1).join(" ") : null };
      }) || null,
      matchedYear: work.publication_year || null,
      matchedDoi: work.doi || null,
      metadata: { journal: work.host_venue?.display_name || work.primary_location?.source?.display_name, volume: work.biblio?.volume, issue: work.biblio?.issue },
      responseTimeMs: Date.now() - start,
      fromCache: false,
    };
  }

  private calcConfidence(ref: ParsedRef, work: OAXWork): number {
    let s = 0;
    s += this.titleSimilarity(ref.title || "", work.title || "") * 45;
    if (ref.year && work.publication_year) s += (ref.year === work.publication_year ? 15 : Math.abs(ref.year - work.publication_year) <= 2 ? 7 : 0);
    if (ref.doi && work.doi && ref.doi.toLowerCase().includes(ref.doi.toLowerCase())) s += 25;
    if (ref.authors?.length && work.authorships?.length) {
      const rLast = ref.authors.map((a) => a.last_name.toLowerCase());
      const wLast = work.authorships.map((a) => { const n = (a.author.display_name || "").split(" "); return (n[n.length - 1] || "").toLowerCase(); });
      const m = rLast.filter((n) => wLast.some((w) => w.includes(n) || n.includes(w)));
      s += (m.length / rLast.length) * 15;
    }
    return Math.min(s, 100);
  }
}
