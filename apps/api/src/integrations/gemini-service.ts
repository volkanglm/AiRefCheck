/**
 * AiRefCheck - Gemini AI Service
 * Uses Google Gemini to enhance reference parsing and search quality.
 * Falls back gracefully when API is unavailable.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "../lib/logger";

const GEMINI_MODEL = "gemini-2.5-flash";
const MIN_API_KEY_LENGTH = 10;

export interface GeminiParsedRef {
  title: string | null;
  authors: { last_name: string; first_name: string | null }[] | null;
  year: number | null;
  journal: string | null;
  book_title: string | null;
  publisher: string | null;
  volume: string | null;
  issue: string | null;
  pages: string | null;
  doi: string | null;
  url: string | null;
  ref_type: string;
  confidence: number;
}

export interface GeminiSearchQuery {
  title_query: string;
  author_query: string;
  combined_query: string;
  doi_hint: string | null;
}

/** Strip markdown code fences that Gemini sometimes wraps around JSON. */
function stripCodeFences(text: string): string {
  return text
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();
}

/** Coerce a year value that may have been returned as a string. */
function coerceYear(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

export class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private enabled: boolean;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey.length > MIN_API_KEY_LENGTH) {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.enabled = true;
      logger.info("Gemini AI service enabled");
    } else {
      this.enabled = false;
      logger.warn(
        "Gemini API key not configured — AI-enhanced features disabled"
      );
    }
  }

  /**
   * Parse a raw reference string using Gemini.
   * Used when regex-based parsing fails or has low confidence.
   */
  async parseReference(rawText: string): Promise<GeminiParsedRef | null> {
    if (!this.enabled || !this.genAI) return null;

    try {
      const model = this.genAI.getGenerativeModel({ model: GEMINI_MODEL });

      const prompt = `You are an academic reference parser. Parse the following reference into structured data. Return ONLY valid JSON, no markdown, no explanation.

Reference: "${rawText}"

Return JSON with this exact structure:
{
  "title": "string or null",
  "authors": [{"last_name": "string", "first_name": "string or null"}] or null,
  "year": number or null,
  "journal": "string or null",
  "book_title": "string or null",
  "publisher": "string or null",
  "volume": "string or null",
  "issue": "string or null",
  "pages": "string or null",
  "doi": "string or null",
  "url": "string or null",
  "ref_type": "journal_article|book|book_chapter|thesis|conference_paper|web_page|other",
  "confidence": 0.0-1.0
}

Rules:
- Extract authors as "Last, First" format
- DOI should be just the identifier (e.g., "10.1234/abc"), not a URL
- year must be a number
- confidence reflects how certain you are about the parsing (0.0-1.0)
- If a field cannot be reliably extracted, set it to null
- For Turkish names, preserve special characters (ç, ğ, ı, ö, ş, ü)`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();

      const jsonStr = stripCodeFences(text);
      const parsed = JSON.parse(jsonStr) as GeminiParsedRef;

      parsed.year = coerceYear(parsed.year);

      logger.info(
        `Gemini parsed ref: "${parsed.title}" (type=${parsed.ref_type}, conf=${parsed.confidence})`
      );
      return parsed;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : String(error);
      logger.error(`Gemini parse error: ${message}`);
      return null;
    }
  }

  /**
   * Generate optimized search queries for a reference.
   * This helps APIs like CrossRef, Semantic Scholar find better matches.
   */
  async generateSearchQueries(
    rawText: string
  ): Promise<GeminiSearchQuery | null> {
    if (!this.enabled || !this.genAI) return null;

    try {
      const model = this.genAI.getGenerativeModel({ model: GEMINI_MODEL });

      const prompt = `You are helping build search queries for an academic reference verification system. Given this reference text, generate optimized search queries.

Reference: "${rawText}"

Return ONLY valid JSON:
{
  "title_query": "just the title, cleaned up for search",
  "author_query": "just author last names separated by spaces",
  "combined_query": "title + first author last name, optimized for API search",
  "doi_hint": "DOI if detectable, otherwise null"
}

Rules:
- title_query: lowercase, remove special chars, keep core words only
- author_query: just the last names, lowercase, space separated (e.g., "smith johnson")
- combined_query: best query for finding this ref in academic databases (title + author)
- doi_hint: only if you can clearly identify a DOI in the text`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonStr = stripCodeFences(text);

      const queries = JSON.parse(jsonStr) as GeminiSearchQuery;
      logger.debug(
        `Gemini search queries: ${queries.combined_query?.substring(0, 60)}...`
      );
      return queries;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : String(error);
      logger.error(`Gemini search query error: ${message}`);
      return null;
    }
  }

  /**
   * Batch parse references — sends up to 10 refs at once for efficiency.
   */
  async batchParseReferences(
    rawTexts: string[]
  ): Promise<Map<number, GeminiParsedRef>> {
    const results = new Map<number, GeminiParsedRef>();

    if (!this.enabled || !this.genAI || rawTexts.length === 0) return results;

    try {
      const model = this.genAI.getGenerativeModel({ model: GEMINI_MODEL });

      const refsList = rawTexts
        .map((r, i) => `[${i}] ${r}`)
        .join("\n\n");

      const prompt = `Parse these academic references into structured data. Return ONLY a valid JSON array.

References:
${refsList}

Return a JSON array where each element has:
{
  "index": 0,
  "title": "string or null",
  "authors": [{"last_name": "string", "first_name": "string or null"}] or null,
  "year": number or null,
  "journal": "string or null",
  "book_title": "string or null",
  "publisher": "string or null",
  "volume": "string or null",
  "issue": "string or null",
  "pages": "string or null",
  "doi": "string or null",
  "url": "string or null",
  "ref_type": "journal_article|book|book_chapter|thesis|conference_paper|web_page|other",
  "confidence": 0.0-1.0
}`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonStr = stripCodeFences(text);

      const parsed = JSON.parse(jsonStr) as Array<
        GeminiParsedRef & { index: number }
      >;

      for (const item of parsed) {
        item.year = coerceYear(item.year);
        results.set(item.index, item);
      }

      logger.info(
        `Gemini batch parsed ${results.size}/${rawTexts.length} references`
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : String(error);
      logger.error(`Gemini batch parse error: ${message}`);
    }

    return results;
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}
