/**
 * AiRefCheck - Validator Pipeline
 * Runs all integrations in parallel and aggregates results.
 */

import Redis from "ioredis";
import { BaseApiClient, IntegrationResult, ParsedRef } from "./base-client";
import { CrossRefClient } from "./crossref";
import { SemanticScholarClient } from "./semantic-scholar";
import { OpenAlexClient } from "./openalex";
import { PubMedClient } from "./pubmed";
import { ArxivClient } from "./arxiv";
import { OrcidClient } from "./orcid";
import { SpringerClient } from "./springer";
import { PlosClient } from "./plos";
import { logger } from "../lib/logger";

export interface PipelineResult {
  referenceId: string;
  status: "verified" | "suspicious" | "not_found" | "partial_match";
  confidenceScore: number;
  bestMatchUrl: string | null;
  bestMatchSource: string | null;
  sources: IntegrationResult[];
}

export class ValidatorPipeline {
  private clients: BaseApiClient[];

  constructor(redis: Redis) {
    this.clients = [
      new CrossRefClient(redis),
      new SemanticScholarClient(redis),
      new PubMedClient(redis),
      new OpenAlexClient(redis),
      new ArxivClient(redis),
      new OrcidClient(redis),
      new SpringerClient(redis),
      new PlosClient(redis),
    ];
  }

  async validate(ref: ParsedRef): Promise<PipelineResult> {
    const start = Date.now();
    logger.info(`Validating reference: ${ref.title || ref.doi || ref.rawText.substring(0, 50)}...`);

    // Check if this is a well-known reference (DSM, ICD, etc.)
    const knownResult = this.checkWellKnown(ref);
    if (knownResult) {
      logger.info(`Recognized as well-known: ${ref.title}`);
      return knownResult;
    }

    // Run all integrations in parallel (tolerate individual failures)
    const results = await Promise.allSettled(
      this.clients.map((client) => client.validateReference(ref))
    );

    const sources: IntegrationResult[] = results
      .filter((r): r is PromiseFulfilledResult<IntegrationResult> => r.status === "fulfilled")
      .map((r) => r.value);

    const failedSources = results
      .filter((r): r is PromiseRejectedResult => r.status === "rejected")
      .map((r) => r.reason?.sourceName || "unknown");

    if (failedSources.length > 0) {
      logger.warn(`Failed sources for ref: ${failedSources.join(", ")}`);
    }

    // Aggregate results
    return this.aggregate(ref, sources, Date.now() - start);
  }

  private aggregate(ref: ParsedRef, sources: IntegrationResult[], totalTime: number): PipelineResult {
    const found = sources.filter((s) => s.status === "found");
    const partial = sources.filter((s) => s.status === "partial_match");
    const notFound = sources.filter((s) => s.status === "not_found");
    const errors = sources.filter((s) => s.status === "error");

    // Calculate weighted confidence
    let totalWeight = 0;
    let weightedScore = 0;

    for (const s of sources) {
      const weight = s.source === "crossref" ? 2.0 : (s.source === "semantic_scholar" || s.source === "pubmed") ? 1.5 : (s.source === "springer" || s.source === "arxiv") ? 1.3 : 1.0;
      totalWeight += weight;
      weightedScore += s.confidenceScore * weight;
    }

    const confidenceScore = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;

    // Determine status
    let status: PipelineResult["status"];
    if (found.length >= 2 || (found.length >= 1 && confidenceScore >= 70)) {
      status = "verified";
    } else if (found.length >= 1 || partial.length >= 2 || (found.length >= 1 && partial.length >= 1)) {
      status = "partial_match";
    } else if (notFound.length > 0 && errors.length === sources.length) {
      // All sources errored (rate limit, network) — don't mark as not_found
      status = "suspicious";
    } else if (notFound.length === sources.length && sources.length > 0) {
      status = "not_found";
    } else if (partial.length >= 1) {
      status = "partial_match";
    } else {
      status = "not_found";
    }

    // Best match
    const best = sources
      .filter((s) => s.status === "found" || s.status === "partial_match")
      .sort((a, b) => b.confidenceScore - a.confidenceScore)[0];

    logger.info(`Validation complete: ${status} (score: ${confidenceScore}, ${totalTime}ms)`);

    return {
      referenceId: "",
      status,
      confidenceScore,
      bestMatchUrl: best?.sourceUrl || null,
      bestMatchSource: best?.source || null,
      sources,
    };
  }

  /**
   * Check if reference matches a well-known work (DSM, ICD, etc.)
   * These are universally recognized and should be auto-verified.
   */
  private checkWellKnown(ref: ParsedRef): PipelineResult | null {
    const title = (ref.title || "").toLowerCase();
    const raw = (ref.rawText || "").toLowerCase();

    const wellKnown = [
      // DSM versions
      { pattern: /diagnostic\s+and\s+statistical\s+manual\s+of\s+mental\s+disorders/, name: "DSM", url: "https://www.psychiatry.org/psychiatrists/practice/dsm" },
      { pattern: /dsm[- ]?(?:5|iv|iii|tr|5tr)/i, name: "DSM", url: "https://www.psychiatry.org/psychiatrists/practice/dsm" },
      // ICD
      { pattern: /international\s+classification\s+of\s+diseases/, name: "ICD (WHO)", url: "https://www.who.int/standards/classifications/classification-of-diseases" },
      { pattern: /icd[- ]?(?:10|11)/i, name: "ICD (WHO)", url: "https://www.who.int/standards/classifications/classification-of-diseases" },
      // Common style manuals
      { pattern: /publication\s+manual\s+of\s+the\s+american\s+psychological\s+association/, name: "APA Publication Manual", url: "https://apastyle.apa.org/" },
      { pattern: /apa\s+publication\s+manual/i, name: "APA Publication Manual", url: "https://apastyle.apa.org/" },
      // Major textbooks
      { pattern: /principles\s+of\s+neural\s+science/, name: "Principles of Neural Science (Kandel)", url: "https://www.mheducation.com/highered/product/principles-neural-science-kandel/M9781259642236.html" },
      { pattern: /harrison.{0,5}s?\s+principles\s+of\s+internal\s+medicine/, name: "Harrison's Principles of Internal Medicine", url: "https://accessmedicine.mhmedical.com/book.aspx?bookID=2129" },
    ];

    for (const wk of wellKnown) {
      if (wk.pattern.test(title) || wk.pattern.test(raw)) {
        return {
          referenceId: "",
          status: "verified",
          confidenceScore: 95,
          bestMatchUrl: wk.url,
          bestMatchSource: "well_known",
          sources: [{
            source: "well_known",
            sourceName: "Bilinen Kaynak",
            status: "found",
            confidenceScore: 95,
            sourceUrl: wk.url,
            sourceId: null,
            matchedTitle: wk.name,
            matchedAuthors: null,
            matchedYear: ref.year,
            matchedDoi: null,
            metadata: { reason: "Well-known academic reference" },
            responseTimeMs: 0,
            fromCache: false,
          }],
        };
      }
    }

    return null;
  }
}
