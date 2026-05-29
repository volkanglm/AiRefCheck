/**
 * AiRefCheck - PubMed/NCBI E-Utilities API Client
 * 35M+ biomedical citations from MEDLINE.
 * Uses esearch → efetch (XML) flow with regex-based parsing.
 */

import Redis from "ioredis";
import { BaseApiClient, IntegrationResult, ParsedRef } from "./base-client";
import { logger } from "../lib/logger";

// --- NCBI E-Utilities response types ---

interface ESearchResponse {
  esearchresult: {
    idlist: string[];
    count: string;
    retmax: string;
  };
}

interface ParsedPubMedArticle {
  pmid: string;
  title: string | null;
  authors: { last_name: string; first_name: string | null }[];
  year: number | null;
  journal: string | null;
  doi: string | null;
  volume: string | null;
  issue: string | null;
  pages: string | null;
  abstract: string | null;
}

// --- Constants ---

const PUBMED_DEFAULT_BASE_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
const PUBMED_ARTICLE_BASE_URL = "https://pubmed.ncbi.nlm.nih.gov";
const EFETCH_RETMAX = 5;

export class PubMedClient extends BaseApiClient {
  readonly sourceName = "pubmed";
  readonly baseUrl: string;
  readonly rateLimit = { rpm: 600, concurrent: 3 }; // 10 req/s with API key → 600 rpm

  private readonly apiKey: string;

  constructor(redis: Redis) {
    const baseUrl = process.env.PUBMED_API_URL || PUBMED_DEFAULT_BASE_URL;
    super(redis, "pubmed", baseUrl, 15000);
    this.baseUrl = baseUrl;
    this.apiKey = process.env.PUBMED_API_KEY || "";
  }

  async validateReference(ref: ParsedRef): Promise<IntegrationResult> {
    const start = Date.now();

    try {
      // 1. DOI ile arama (esearch + efetch)
      if (ref.doi) {
        const cached = await this.getCached<IntegrationResult>(`doi:${ref.doi}`);
        if (cached) return { ...cached, fromCache: true };

        const article = await this.searchByDoi(ref.doi);
        if (article) {
          const ir = this.buildResult(ref, article, start);
          await this.setCache(`doi:${ref.doi}`, ir);
          return ir;
        }
      }

      // 2. Başlık ile arama
      if (ref.title) {
        const titleHash = ref.title.toLowerCase().replace(/\s+/g, "_").substring(0, 100);
        const cached = await this.getCached<IntegrationResult>(`title:${titleHash}`);
        if (cached) return { ...cached, fromCache: true };

        const articles = await this.searchByTitle(
          ref.title,
          ref.authors?.map((a) => a.last_name),
        );
        if (articles.length > 0) {
          const best = this.findBestMatch(ref, articles);
          if (best) {
            const ir = this.buildResult(ref, best, start);
            await this.setCache(`title:${titleHash}`, ir);
            return ir;
          }
        }
      }

      return this.notFound(ref, Date.now() - start);
    } catch (error: any) {
      logger.error(`PubMed error: ${error.message}`);
      return this.errorResult(ref, error.message, Date.now() - start);
    }
  }

  // --- E-Utilities API calls ---

  private async searchByDoi(doi: string): Promise<ParsedPubMedArticle | null> {
    try {
      // Search PubMed by DOI
      const pmids = await this.esearch(`${doi}[doi]`);
      if (pmids.length === 0) return null;

      // Fetch article details
      const articles = await this.efetch(pmids.slice(0, 1));
      return articles[0] || null;
    } catch {
      return null;
    }
  }

  private async searchByTitle(
    title: string,
    authorLastNames?: string[],
  ): Promise<ParsedPubMedArticle[]> {
    try {
      // Build search term: title + optional author filter
      let searchTerm = `${title}[Title]`;
      if (authorLastNames && authorLastNames.length > 0) {
        const authorQuery = authorLastNames
          .slice(0, 3) // Limit to first 3 authors to avoid overly specific queries
          .map((a) => `${a}[Author]`)
          .join(" AND ");
        searchTerm += ` AND ${authorQuery}`;
      }

      const pmids = await this.esearch(searchTerm);
      if (pmids.length === 0) {
        // Fallback: title-only search without authors
        const fallbackTerm = `${title}[Title]`;
        const fallbackPmids = await this.esearch(fallbackTerm);
        if (fallbackPmids.length === 0) return [];
        return this.efetch(fallbackPmids.slice(0, EFETCH_RETMAX));
      }

      return this.efetch(pmids.slice(0, EFETCH_RETMAX));
    } catch {
      return [];
    }
  }

  /**
   * NCBI ESearch — returns array of PMID strings.
   */
  private async esearch(term: string): Promise<string[]> {
    const params: Record<string, string> = {
      db: "pubmed",
      term,
      retmode: "json",
      retmax: String(EFETCH_RETMAX),
      usehistory: "n",
    };
    if (this.apiKey) params.api_key = this.apiKey;

    const response = await this.get<ESearchResponse>("esearch.fcgi", params);
    return response?.esearchresult?.idlist || [];
  }

  /**
   * NCBI EFetch — fetches article details as XML, parsed via regex.
   */
  private async efetch(pmids: string[]): Promise<ParsedPubMedArticle[]> {
    const params: Record<string, string> = {
      db: "pubmed",
      id: pmids.join(","),
      rettype: "xml",
      retmode: "xml",
    };
    if (this.apiKey) params.api_key = this.apiKey;

    const xml = await this.get<string>("efetch.fcgi", params, {
      responseType: "text",
      transformResponse: [(data: string) => data],
    });

    if (!xml || typeof xml !== "string") return [];

    return this.parseXmlResponse(xml, pmids);
  }

  // --- XML Parsing (regex-based, no external deps) ---

  private parseXmlResponse(xml: string, pmids: string[]): ParsedPubMedArticle[] {
    const articles: ParsedPubMedArticle[] = [];

    // Split into individual <PubmedArticle> blocks
    const articleRegex = /<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/g;
    let match: RegExpExecArray | null;

    while ((match = articleRegex.exec(xml)) !== null) {
      const block = match[1];
      articles.push(this.parseSingleArticle(block));
    }

    // If regex splitting failed, try parsing the whole XML as one article
    if (articles.length === 0 && pmids.length > 0) {
      const single = this.parseSingleArticle(xml);
      if (single.title || single.pmid) {
        articles.push(single);
      }
    }

    return articles;
  }

  private parseSingleArticle(block: string): ParsedPubMedArticle {
    return {
      pmid: this.extractValue(block, "<PMID[^>]*>([^<]+)</PMID>") || "",
      title: this.extractValue(block, "<ArticleTitle>([\\s\\S]*?)</ArticleTitle>"),
      authors: this.extractAuthors(block),
      year: this.extractYear(block),
      journal: this.extractValue(block, "<Title>([^<]+)</Title>"),
      doi: this.extractDoi(block),
      volume: this.extractValue(block, "<Volume>([^<]+)</Volume>"),
      issue: this.extractValue(block, "<Issue>([^<]+)</Issue>"),
      pages: this.extractValue(block, "<MedlinePgn>([^<]+)</MedlinePgn>"),
      abstract: this.extractAbstract(block),
    };
  }

  /**
   * Generic regex extractor — returns first capture group or null.
   */
  private extractValue(xml: string, pattern: string): string | null {
    const regex = new RegExp(pattern);
    const match = regex.exec(xml);
    if (!match?.[1]) return null;
    // Strip any nested HTML/XML tags (e.g. <i>, <sub> in titles)
    return match[1].replace(/<[^>]+>/g, "").trim() || null;
  }

  private extractAuthors(xml: string): { last_name: string; first_name: string | null }[] {
    const authors: { last_name: string; first_name: string | null }[] = [];

    // Find all <Author> blocks
    const authorBlockRegex = /<Author[^>]*>([\s\S]*?)<\/Author>/g;
    let match: RegExpExecArray | null;

    while ((match = authorBlockRegex.exec(xml)) !== null) {
      const authorBlock = match[1];
      const lastName = this.extractValue(authorBlock, "<LastName>([^<]+)</LastName>");
      const foreName = this.extractValue(authorBlock, "<ForeName>([^<]+)</ForeName>");
      const collectiveName = this.extractValue(authorBlock, "<CollectiveName>([^<]+)</CollectiveName>");

      if (lastName) {
        authors.push({ last_name: lastName, first_name: foreName || null });
      } else if (collectiveName) {
        // Group authors (e.g. "WHO Collaborating Centre")
        authors.push({ last_name: collectiveName, first_name: null });
      }
    }

    return authors;
  }

  private extractYear(xml: string): number | null {
    // Try <Year> inside <PubDate> first (most reliable)
    const pubDateBlock = /<PubDate>([\s\S]*?)<\/PubDate>/;
    const pubDateMatch = pubDateBlock.exec(xml);
    if (pubDateMatch) {
      const year = this.extractValue(pubDateMatch[1], "<Year>(\\d{4})</Year>");
      if (year) return parseInt(year, 10);
      // Some entries use <MedlineDate> format like "2022 Jan-Feb"
      const medlineDate = this.extractValue(pubDateMatch[1], "<MedlineDate>(\\d{4})");
      if (medlineDate) return parseInt(medlineDate, 10);
    }

    // Fallback: <Year> anywhere in the article block
    const anyYear = this.extractValue(xml, "<Year>(\\d{4})</Year>");
    return anyYear ? parseInt(anyYear, 10) : null;
  }

  private extractDoi(xml: string): string | null {
    // DOI is typically in <ArticleId IdType="doi">
    const doiPattern = /<ArticleId\s+IdType="doi"[^>]*>([^<]+)<\/ArticleId>/;
    const match = doiPattern.exec(xml);
    if (match?.[1]) return match[1].trim();

    // Fallback: <ArticleId IdType="pii"> or ELocationID
    const elocationPattern = /<ELocationID[^>]*EIdType="doi"[^>]*>([^<]+)<\/ELocationID>/;
    const elocMatch = elocationPattern.exec(xml);
    return elocMatch?.[1]?.trim() || null;
  }

  private extractAbstract(xml: string): string | null {
    // Combine all <AbstractText> segments
    const segments: string[] = [];
    const abstractRegex = /<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g;
    let match: RegExpExecArray | null;

    while ((match = abstractRegex.exec(xml)) !== null) {
      const text = match[1].replace(/<[^>]+>/g, "").trim();
      if (text) segments.push(text);
    }

    return segments.length > 0 ? segments.join(" ") : null;
  }

  // --- Confidence scoring & matching ---

  private findBestMatch(
    ref: ParsedRef,
    articles: ParsedPubMedArticle[],
  ): ParsedPubMedArticle | null {
    let best: ParsedPubMedArticle | null = null;
    let bestScore = 0;

    for (const article of articles) {
      const score = this.calculateConfidence(ref, article);
      if (score > bestScore) {
        bestScore = score;
        best = article;
      }
    }

    return bestScore >= 30 ? best : null;
  }

  private calculateConfidence(ref: ParsedRef, article: ParsedPubMedArticle): number {
    let score = 0;

    // Title similarity (45% weight) — higher weight for biomedical focus
    const titleSim = this.titleSimilarity(ref.title || "", article.title || "");
    score += titleSim * 45;

    // Year match (15%)
    if (ref.year && article.year) {
      score += ref.year === article.year ? 15 : Math.abs(ref.year - article.year) <= 2 ? 7 : 0;
    }

    // DOI match (20%)
    if (ref.doi && article.doi && ref.doi.toLowerCase() === article.doi.toLowerCase()) {
      score += 20;
    }

    // Author match (15%)
    if (ref.authors?.length && article.authors.length) {
      const refLastNames = ref.authors.map((a) => a.last_name.toLowerCase());
      const articleLastNames = article.authors.map((a) => a.last_name.toLowerCase());
      const matches = refLastNames.filter((n) =>
        articleLastNames.some((a) => a.includes(n) || n.includes(a)),
      );
      score += (matches.length / refLastNames.length) * 15;
    }

    // Journal match (5%)
    if (ref.journal && article.journal) {
      score += this.titleSimilarity(ref.journal, article.journal) * 5;
    }

    return Math.min(score, 100);
  }

  private buildResult(
    ref: ParsedRef,
    article: ParsedPubMedArticle,
    start: number,
  ): IntegrationResult {
    const confidence = this.calculateConfidence(ref, article);

    return {
      source: this.sourceName,
      status:
        confidence >= 65
          ? "found"
          : confidence >= 35
            ? "partial_match"
            : "not_found",
      confidenceScore: confidence,
      sourceUrl: article.pmid
        ? `${PUBMED_ARTICLE_BASE_URL}/${article.pmid}/`
        : null,
      sourceId: article.pmid || null,
      matchedTitle: article.title,
      matchedAuthors:
        article.authors.length > 0 ? article.authors : null,
      matchedYear: article.year,
      matchedDoi: article.doi,
      metadata: {
        journal: article.journal,
        volume: article.volume,
        issue: article.issue,
        pages: article.pages,
        pmid: article.pmid,
        hasAbstract: !!article.abstract,
      },
      responseTimeMs: Date.now() - start,
      fromCache: false,
    };
  }
}
