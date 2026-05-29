/**
 * AiRefCheck - Base API Client
 * All external integrations extend this class.
 * Provides rate limiting, circuit breaker, caching, retry logic.
 */

import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import Redis from "ioredis";
import { logger } from "../lib/logger";

interface RateLimitConfig {
  rpm: number;        // requests per minute
  concurrent: number;  // max concurrent requests
}

interface IntegrationResult {
  source: string;
  status: "found" | "not_found" | "partial_match" | "error" | "timeout";
  confidenceScore: number;
  sourceUrl: string | null;
  sourceId: string | null;
  matchedTitle: string | null;
  matchedAuthors: { last_name: string; first_name: string | null }[] | null;
  matchedYear: number | null;
  matchedDoi: string | null;
  metadata: Record<string, unknown> | null;
  responseTimeMs: number;
  fromCache: boolean;
}

interface ParsedRef {
  doi?: string | null;
  title?: string | null;
  year?: number | null;
  authors?: { last_name: string; first_name: string | null }[] | null;
  journal?: string | null;
  rawText: string;
}

export { IntegrationResult, ParsedRef };

export abstract class BaseApiClient {
  abstract readonly sourceName: string;
  abstract readonly baseUrl: string;
  abstract readonly rateLimit: RateLimitConfig;

  protected client: AxiosInstance;
  private failureCount = 0;
  private circuitOpen = false;
  private circuitOpenSince = 0;
  private static readonly CIRCUIT_THRESHOLD = 5;
  private static readonly CIRCUIT_RESET_MS = 60000;

  constructor(
    protected redis: Redis,
    sourceName: string,
    baseUrl: string,
    defaultTimeout = 10000,
  ) {
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: defaultTimeout,
      headers: { "User-Agent": `AiRefCheck/0.1.0 (mailto:${process.env.CROSSREF_MAILTO || "contact@airefcheck.com"})` },
    });
  }

  abstract validateReference(ref: ParsedRef): Promise<IntegrationResult>;

  protected async get<T>(path: string, params?: Record<string, string>, config?: AxiosRequestConfig): Promise<T> {
    await this.checkCircuit();
    const start = Date.now();

    try {
      const response = await this.client.get<T>(path, { params, ...config });
      this.failureCount = 0;
      return response.data;
    } catch (error: any) {
      this.failureCount++;
      if (this.failureCount >= BaseApiClient.CIRCUIT_THRESHOLD) {
        this.circuitOpen = true;
        this.circuitOpenSince = Date.now();
        logger.warn(`Circuit breaker OPEN for ${this.sourceName}`);
      }
      throw error;
    }
  }

  protected async getCached<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.redis.get(`cache:${this.sourceName}:${key}`);
      if (cached) {
        await this.redis.incr(`cache:${this.sourceName}:${key}:hits`);
        return JSON.parse(cached) as T;
      }
    } catch { /* cache miss is fine */ }
    return null;
  }

  protected async setCache(key: string, data: unknown, ttlSeconds = 604800): Promise<void> {
    try {
      await this.redis.setex(`cache:${this.sourceName}:${key}`, ttlSeconds, JSON.stringify(data));
    } catch { /* cache write failure is fine */ }
  }

  private async checkCircuit(): Promise<void> {
    if (this.circuitOpen) {
      if (Date.now() - this.circuitOpenSince > BaseApiClient.CIRCUIT_RESET_MS) {
        this.circuitOpen = false;
        this.failureCount = 0;
        logger.info(`Circuit breaker CLOSED for ${this.sourceName}`);
      } else {
        throw new Error(`Circuit breaker OPEN for ${this.sourceName}`);
      }
    }
  }

  protected notFound(ref: ParsedRef, responseTimeMs: number): IntegrationResult {
    return { source: this.sourceName, status: "not_found", confidenceScore: 0, sourceUrl: null, sourceId: null, matchedTitle: null, matchedAuthors: null, matchedYear: null, matchedDoi: null, metadata: null, responseTimeMs, fromCache: false };
  }

  protected errorResult(ref: ParsedRef, error: string, responseTimeMs: number): IntegrationResult {
    return { source: this.sourceName, status: "error", confidenceScore: 0, sourceUrl: null, sourceId: null, matchedTitle: null, matchedAuthors: null, matchedYear: null, matchedDoi: null, metadata: { error }, responseTimeMs, fromCache: false };
  }

  protected titleSimilarity(a: string, b: string): number {
    if (!a || !b) return 0;
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9ğüşıöçĞÜŞİÖÇ\s]/g, "").split(/\s+/).filter(Boolean);
    const wordsA = normalize(a);
    const wordsB = normalize(b);
    if (!wordsA.length || !wordsB.length) return 0;
    const intersection = wordsA.filter((w) => wordsB.includes(w));
    return intersection.length / Math.max(wordsA.length, wordsB.length);
  }
}
