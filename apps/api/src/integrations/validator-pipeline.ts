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
    ];
  }

  async validate(ref: ParsedRef): Promise<PipelineResult> {
    const start = Date.now();
    logger.info(`Validating reference: ${ref.title || ref.doi || ref.rawText.substring(0, 50)}...`);

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
      const weight = s.source === "crossref" ? 2.0 : (s.source === "semantic_scholar" || s.source === "pubmed") ? 1.5 : 1.0;
      totalWeight += weight;
      weightedScore += s.confidenceScore * weight;
    }

    const confidenceScore = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;

    // Determine status
    let status: PipelineResult["status"];
    if (found.length >= 2 || (found.length >= 1 && confidenceScore >= 70)) {
      status = "verified";
    } else if (found.length >= 1 || partial.length >= 2) {
      status = "partial_match";
    } else if (notFound.length === sources.length) {
      status = "not_found";
    } else {
      status = "suspicious";
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
}
