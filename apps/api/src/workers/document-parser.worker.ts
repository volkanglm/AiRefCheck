/**
 * AiRefCheck - Document Parse Worker
 * Processes uploaded documents: extract text, send to NLP, save results.
 * Supports PDF, DOCX, TXT, LaTeX, BibTeX formats.
 */

import { Worker, Job, Queue } from "bullmq";
import Redis from "ioredis";
import { readFile } from "fs/promises";
import path from "path";
import axios from "axios";
import { PrismaClient } from "@prisma/client";
import { env } from "../lib/env";
import { logger } from "../lib/logger";
import { GeminiService } from "../integrations/gemini-service";

/** Minimum characters for a reference line to be considered valid. */
const MIN_REF_LENGTH = 10;
/** Maximum characters per reference line sent to NLP. */
const MAX_REF_LENGTH = 2000;

const prisma = new PrismaClient();

interface ParseJobData {
  analysisId: string;
  documentId: string;
}

/**
 * Map NLP type strings to Prisma ReferenceType enum values.
 */
const TYPE_MAP: Record<string, string> = {
  "journal_article": "JOURNAL_ARTICLE",
  "journal": "JOURNAL_ARTICLE",
  "article": "JOURNAL_ARTICLE",
  "book_chapter": "BOOK_CHAPTER",
  "chapter": "BOOK_CHAPTER",
  "book": "BOOK",
  "conference_paper": "CONFERENCE_PAPER",
  "conference": "CONFERENCE_PAPER",
  "proceedings": "CONFERENCE_PAPER",
  "thesis": "THESIS",
  "master_thesis": "THESIS",
  "phd_thesis": "DISSERTATION",
  "dissertation": "DISSERTATION",
  "technical_report": "TECHNICAL_REPORT",
  "report": "TECHNICAL_REPORT",
  "web_page": "WEB_PAGE",
  "web": "WEB_PAGE",
  "online_resource": "ONLINE_RESOURCE",
  "website": "ONLINE_RESOURCE",
  "newspaper_article": "NEWSPAPER_ARTICLE",
  "newspaper": "NEWSPAPER_ARTICLE",
  "preprint": "PREPRINT",
  "dataset": "DATASET",
  "software": "SOFTWARE",
  "legal_document": "LEGAL_DOCUMENT",
  "other": "OTHER",
  "unknown": "OTHER",
};

function mapRefType(nlpType: string | null | undefined): string {
  if (!nlpType) return "JOURNAL_ARTICLE";
  const mapped = TYPE_MAP[nlpType.toLowerCase().trim()];
  return mapped || "OTHER";
}

/**
 * Extract text from various document formats.
 */
async function extractText(filePath: string, format: string): Promise<string> {
  const buffer = await readFile(filePath);

  switch (format) {
    case "PDF": {
      const pdfParse = (await import("pdf-parse")).default;
      const pdfData = await pdfParse(buffer);
      return pdfData.text;
    }
    case "DOCX": {
      const mammoth = (await import("mammoth")).default;
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }
    case "TXT":
    case "LATEX":
    case "BIBTEX":
    case "RIS":
      return buffer.toString("utf-8");
    default:
      // Fallback: try as text
      return buffer.toString("utf-8");
  }
}

/**
 * Find the bibliography/references section in extracted text.
 * Looks for common section headers in Turkish and English.
 */
function extractBibliographySection(fullText: string): string[] {
  const patterns = [
    /(?:^|\n)\s*(?:kaynakça|kaynaklar|referanslar|kullanılan kaynaklar|bibliyografya)\s*\n/i,
    /(?:^|\n)\s*(?:references|bibliography|works cited|literatur(?:e|verzeichnis))\s*\n/i,
    /(?:^|\n)\s*(?:kaynak(?:ça|lar))\s*(?:\n|$)/i,
    /(?:^|\n)\s*\d*\.?\s*(?:references|bibliography)\s*(?:\n|$)/i,
  ];

  let startIndex = -1;
  for (const pattern of patterns) {
    const match = fullText.match(pattern);
    if (match && match.index !== undefined) {
      startIndex = match.index + match[0].length;
      break;
    }
  }

  // If no bibliography section found, use the last 40% of the document
  if (startIndex === -1) {
    const lines = fullText.split("\n");
    const cutPoint = Math.floor(lines.length * 0.6);
    const bibText = lines.slice(cutPoint).join("\n");
    return mergeRefLines(bibText);
  }

  const bibText = fullText.substring(startIndex);
  return mergeRefLines(bibText);
}

/**
 * Merge multi-line reference entries into single strings.
 * Uses heuristic rules to determine when a line starts a new reference
 * vs continues the previous one.
 */
function mergeRefLines(bibText: string): string[] {
  const lines = bibText.split("\n").map((l) => l.trim());

  // Lines that are CLEARLY continuations (never start a new ref):
  const continuationIndicators = [
    /^In\s+[A-Z]/,                 // "In EditorName (Ed.), BookTitle"  
    /^pp\.\s/i,                    // "pp. 123-145"
    /^\d+\s*[-–]\s*\d+\s*\.?\s*$/, // Just page range "123-145."
    /^[A-Z][a-z]+:\s/,             // "New York: Publisher" or "London: Routledge"
    /^Retrieved\s/i,               // "Retrieved from..."
    /^https?:\/\//i,               // URLs
    /^doi:\s*/i,                    // "doi: 10.xxx"
    /^et\s+al/i,                   // "et al."
    /^\*\*/,                       // Bold markers
    /^\d{4}\s*$/,                  // Just a year like "2013" or "2011"
    /^\d{3,4}\s*$/,                // Page numbers like "1301"
  ];

  // Copyright / watermark lines that should be skipped entirely
  const copyrightPatterns = [
    /This document is copyrighted/i,
    /This article is intended solely/i,
    /is not to be disseminated broadly/i,
    /personal use of the individual/i,
  ];

  // Header/footer noise lines (page numbers, running headers)
  const noisePatterns = [
    /^\d{1,5}\s*$/,                          // Standalone number (page number)
    /^[A-Z\s]{5,}$/,                          // ALL CAPS running header
    /^[A-Z][A-Z\s&]+\d{4}.*\d{1,5}–\d{1,5}$/,  // "AUTHOR, TITLE 54 (2013) 821–827"
  ];

  // Helper: does the text look like a journal citation (volume, pages)?
  // "Psychotherapy Research, 18, 5-14." → true (journal vol/pages pattern)
  // "Journal of Applied Psychology, 105(3), 456-478." → true
  // "Smith, J. A. (2020)." → false (author pattern)
  function looksLikeJournalCitation(text: string): boolean {
    const t = text.trim();
    // Pattern: "JournalName, NN, NN-NN." or "JournalName, NN(NN), NN-NN."
    // The key differentiator: starts with a multi-word name followed by , number
    return /^[A-Z][a-z].+,\s*\d+/.test(t) && /\d+\s*[-–]\s*\d+/.test(t);
  }

  // A new reference typically starts with:
  // - Author pattern: "Lastname, F." or "Lastname, F. M.,"
  // - Multiple authors: "Lastname, F., & Othername, G."
  // - Corporate author: "American Psychiatric Association"
  // - Numbered: "[1]" or "1."
  function isNewReference(line: string): boolean {
    // Skip very short lines
    if (line.length < 20) return false;

    // Skip copyright lines
    for (const p of copyrightPatterns) {
      if (p.test(line)) return false;
    }

    // Skip noise lines
    for (const p of noisePatterns) {
      if (p.test(line)) return false;
    }

    // Numbered references: "[1] Author..." or "1. Author..."
    if (/^\s*\[\d+\]\s*/.test(line)) return true;
    if (/^\s*\d{1,3}\.\s+[A-Z]/.test(line)) return true;

    // Must start with uppercase letter
    if (!/^[A-ZÀ-ÖØ-ÞŞĞÜÇİ]/.test(line)) return false;

    // Check if it looks like continuation first
    for (const pattern of continuationIndicators) {
      if (pattern.test(line)) return false;
    }

    // ──── CORE STRATEGY ────
    // A REAL reference start must match: "AuthorPattern (YEAR)." at the beginning
    // This distinguishes true starts from mid-reference year mentions.
    // 
    // Examples of REAL starts:
    //   "Smith, J. A. (2020). Title..."        → matches: "Smith," then "(2020)"
    //   "American Psychological Association (2020). Title..." → matches
    //
    // Examples of CONTINUATIONS (NOT new refs):
    //   "Smider, N.,...Kupfer, D. J. (1999). The MacArthur..." → year too far from start
    //   "Briggs-Gowan, M. J., Pollak, S. D., Grasso, D., ..." → no year at all
    //   "Davies, P. T., Winter, M. A., & Cicchetti, D. (2006)." → year after &

    // Check for the pattern: AuthorPattern followed by (YEAR) within ~60 chars of start
    // This is the gold standard for identifying APA/Harvard reference starts
    const earlyYearMatch = line.substring(0, 80).match(/\((?:19|20)\d{2}\)/);
    
    if (earlyYearMatch) {
      // There's a year in parentheses early in the line.
      // Check if the part BEFORE the year looks like an author list:
      const beforeYear = line.substring(0, line.indexOf(earlyYearMatch[0]));
      
      // If before the year we have comma-separated initials/names, it's likely a start
      // "Smith, J. A. " → has comma + initials → NEW REF
      // "N.,...Kupfer, D. J. " → has "...", "etc" → likely CONTINUATION
      
      // Reject if has ellipsis "...": indicates truncation/continuation
      if (/\.{3,}/.test(beforeYear)) return false;
      
      // Reject if before the year has "& " or "and " pattern (multi-author continuation)
      // like "Smider, N., & Kupfer, D. J. (1999)" → the & suggests it's a continuation
      // But "Smith, J., & Jones, K. (2020)." is a valid start too!
      // Key difference: in a start, the & appears with the LAST author before (year)
      // In a continuation, there's content BEFORE the first author on this line
      
      // Actually, let's check: does the line look like it starts with a SINGLE author
      // followed by other authors? Or does it look like it's a continuation of a previous line?
      
      // If the line BEFORE (year) has "& AuthorLastName, Initial." pattern at the end,
      // and starts with AuthorLastName, Initial. → it's a real start
      // But if it starts with a comma list ending with "...LastName, I." → could be continuation
      
      // Simplest reliable check: does the text BEFORE (year) start with "LastName, " ?
      // And does it NOT have content that looks like a previous reference's ending?
      
      // Check for continuation markers before the year:
      const hasContinuationMarker = 
        /^[a-z]/.test(beforeYear.trim()) ||       // starts lowercase (mid-sentence)
        /^\.\.\./.test(beforeYear.trim()) ||       // starts with ...
        /\.{3,}/.test(beforeYear) ||               // contains ...
        looksLikeJournalCitation(beforeYear);  // starts with journal name + volume/pages
      
      if (!hasContinuationMarker) {
        // Looks like a genuine reference start with year
        return true;
      }
    }

    // No early (YEAR) pattern — likely a continuation
    // Unless it starts with "Author, I." and has a clear author+title structure
    
    // Check for "in press" / "submitted" instead of year
    if (/\(in\s+press\)/i.test(line.substring(0, 100))) {
      return /^[A-Z][a-z]+,/.test(line); // Must start with Author,
    }

    // Lines that are clearly part of an "In (Eds.)," block continuation
    if (/\(Eds?\.\)/.test(line) && !/\(\d{4}\)/.test(line)) return false;

    // Lines starting with a name followed by ", &" are continuations
    if (/^[A-Z][a-z]+,\s*&\s*[A-Z]/.test(line)) return false;

    // Publisher-like lines: "Oxford University Press." or "IVP Academic."
    if (/^[A-Z][a-z]+\s+[A-Z][a-z]+.*\.\s*$/.test(line) && !/\d{4}/.test(line)) return false;

    // Journal name + volume pattern (NOT a new ref):
    if (/^[A-Z][a-z].+,\s*\d+,\s*\d+\s*[-–]/.test(line)) return false;
    if (/^[A-Z][a-z]+\s+[A-Z][a-z]+,\s*\d+,\s*\d+/.test(line)) return false;
    if (/^[A-Z][a-z]+.*,\s*\d+,\s*\d+\s*[-–−]/.test(line)) return false;

    // If we reach here with no year near the start, it's almost certainly a continuation
    // e.g., "Bons, D., van den Broek, E., Scheepers, F., ..." → no year → continuation
    // e.g., "Briggs-Gowan, M. J., Pollak, S. D., Grasso, D., ..." → no year → continuation
    return false;
  }

  const references: string[] = [];
  let current = "";

  for (const line of lines) {
    if (line.length < 3) continue;

    // Determine if the CURRENT (accumulated) reference is "complete"
    // A reference is COMPLETE if it ends with:
    // - A DOI/URL: "doi.org/10.xxx" or "https://..." 
    // - A page range+period: "123–145."
    // - A publisher+period: "Guilford Press."
    // - Closing paren+period: ")."
    const currentRefComplete = 
      /https?:\/\/\S+\.?\s*$/.test(current) ||           // ends with URL/DOI
      /doi\.\w+\/\S+\.?\s*$/.test(current) ||             // ends with DOI
      /\d{1,5}[-–]\d{1,5}\.\s*$/.test(current) ||        // ends with pages "123–145."
      /\d{4}\)\.\s*$/.test(current) ||                    // ends with "(2013)."
      /[A-Z][a-z]+\.?\s*$/.test(current) &&               // ends with publisher name
      !/[,&]\s*$/.test(current);                          // but NOT ending with , or &

    // Only force-merge if current ref is NOT complete
    // AND previous line ends with & (always merge) or , (likely merge)
    const prevEndsWithAmpersand = /&\s*$/.test(current);
    const prevEndsWithComma = /,\s*$/.test(current) && !currentRefComplete;

    const shouldForceMerge = prevEndsWithAmpersand || prevEndsWithComma;

    if (isNewReference(line) && current.length > 0 && !shouldForceMerge) {
      references.push(current.trim());
      current = line;
    } else if (line.length > 3) {
      if (current.length === 0) {
        current = line;
      } else {
        current += " " + line;
      }
    }
  }

  if (current.trim().length > 15) {
    references.push(current.trim());
  }

  return references.filter((r) => r.length > 20);
}

/**
 * Sanitize reference lines before sending to NLP service.
 *
 * PDF extraction can produce:
 * - Empty/whitespace-only strings
 * - Strings shorter than meaningful content
 * - Extremely long merged strings (> 10K chars) that cause regex backtracking in NLP parsers
 * - Non-printable control characters (\x00-\x1F, \x7F) from corrupt PDF encodings
 * - PDF internal artifacts like "(cid:NN)"
 * - Unicode replacement characters (\uFFFD) from failed decoding
 */
function sanitizeRefLines(lines: string[]): string[] {
  const sanitized: string[] = [];

  for (const raw of lines) {
    // Strip PDF (cid:NN) artifacts
    let cleaned = raw.replace(/\(cid:\d+\)/g, "");

    // Remove non-printable control characters (keep \t, \n, \r as they'll be collapsed later)
    cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

    // Remove Unicode replacement characters
    cleaned = cleaned.replace(/\uFFFD/g, "");

    // Collapse whitespace sequences into single spaces
    cleaned = cleaned.replace(/\s+/g, " ").trim();

    // Skip if too short after cleaning
    if (cleaned.length < MIN_REF_LENGTH) {
      continue;
    }

    // ─── Split merged references ───
    // PDF extraction sometimes puts two references on the same line.
    // Pattern: "...pages. AuthorLastname, I." or "...pages.doi:xxx. AuthorLastname,"
    // We split at boundaries like ". LastName, I." where LastName is capitalized
    const splitRefs = splitMergedReferences(cleaned);

    for (const ref of splitRefs) {
      // Truncate extremely long strings to prevent regex backtracking in NLP parsers
      if (ref.length > MAX_REF_LENGTH) {
        logger.warn(
          `Truncating reference line from ${ref.length} to ${MAX_REF_LENGTH} chars`,
        );
        sanitized.push(ref.substring(0, MAX_REF_LENGTH));
      } else {
        sanitized.push(ref);
      }
    }
  }

  return sanitized;
}

/**
 * Split a single line that contains multiple references merged together.
 * 
 * Detects boundaries like:
 *   "...563–570. Ito, J. R., Donovan, D..."
 *   "...174–183. Ditman, K. S., Cr..."
 *   "...168–172. Heather, N., Brodie, J., ..."
 *   "...Erlbaum. Huedo-Medina, T. B.,..."
 */
function splitMergedReferences(text: string): string[] {
  const results: string[] = [];

  // Pattern to find where a new reference starts after a period-space
  // Must be: ". " followed by a Capitalized word + comma (author pattern)
  // AND preceded by something that looks like end of a reference:
  //   - pages: "123–145" or "123-145"
  //   - year+paren: "(2008)"
  //   - doi/URL ending
  //   - publisher name
  //   - closing period after journal citation
  
  // Split points: ". " before "Lastname, I." pattern
  // But NOT: ". " inside a title (e.g., "A. B. and C. D.")
  // Heuristic: the text BEFORE the split point should look like end of a ref
  
  let remaining = text;
  
  // Find all positions where ". " is followed by "Lastname," pattern
  // Use a regex to find candidate split points
  // Match capitalized surnames including hyphenated (e.g., Huedo-Medina, Crits-Christoph)
  // and multi-word names (e.g., van der Meer, de la Cruz)
  const surname = '[A-Z][a-zà-öø-ÿşğüçı\\u00F1-\\u024F]+(?:[-\\s]+[A-Z][a-zà-öø-ÿşğüçı\\u00F1-\\u024F]+)*';
  const splitPattern = new RegExp(
    `\\. (?=(?:${surname}),\\s*(?:[A-Z]\\.|van|de|von|der|le|la))`,
    'g'
  );
  
  let lastEnd = 0;
  let match;
  
  while ((match = splitPattern.exec(remaining)) !== null) {
    const splitPos = match.index + 2; // After ". "
    const beforeSplit = remaining.substring(lastEnd, splitPos).trim();
    const afterSplit = remaining.substring(splitPos).trim();
    
    // Validate: does the text before this split look like end of a reference?
    // It should end with one of:
    //   - pages: digits-digits.
    //   - year in parens: (YYYY).
    //   - publisher: "Press." or "Erlbaum." etc
    //   - DOI: doi.org/xxx.
    //   - URL ending
    //   - journal+vol+pages: "Journal Name, 33, 27-32."
    if (beforeSplit.length > 30 && looksLikeEndOfRef(beforeSplit)) {
      // This is a valid split point
      if (beforeSplit.length > 20) {
        results.push(beforeSplit);
      }
      // Continue processing the rest
      remaining = afterSplit;
      lastEnd = 0;
      splitPattern.lastIndex = 0; // Reset regex for new string
    }
  }
  
  // ─── PASS 2: Broader pattern for OCR/PDF-corrupted names ───
  // Catches cases where PDF extraction breaks surnames by inserting spaces
  // (e.g., "Sheffi led" is "Sheffield" with a space inserted).
  // Pattern: ". " + capitalized word + optional lowercase words + initial letter
  // The "before split" validator still protects against false splits.
  const broadPattern = new RegExp(
    `\\. (?=[A-Z][a-z]{2,}(?:\\s+[a-z]+)*\\s+[A-Z]\\.)`,
    'g'
  );

  // Apply broader pattern on any chunks that the strict pattern couldn't split.
  // Process both already-split results (in case first ref has a hidden merge)
  // and the remaining unsplit text.
  const pass2Candidates = results.length > 0
    ? [...results.splice(0, results.length), remaining.trim()]
    : [remaining.trim()];

  for (const chunk of pass2Candidates) {
    if (chunk.length <= 30) {
      if (chunk.length > 20) results.push(chunk);
      continue;
    }

    broadPattern.lastIndex = 0;
    let chunkRemaining = chunk;
    let chunkLastEnd = 0;
    let broadMatch: RegExpExecArray | null;

    while ((broadMatch = broadPattern.exec(chunkRemaining)) !== null) {
      const splitPos = broadMatch.index + 2; // After ". "
      const beforeSplit = chunkRemaining.substring(chunkLastEnd, splitPos).trim();
      const afterSplit = chunkRemaining.substring(splitPos).trim();

      if (beforeSplit.length > 30 && looksLikeEndOfRef(beforeSplit)) {
        if (beforeSplit.length > 20) {
          results.push(beforeSplit);
        }
        chunkRemaining = afterSplit;
        chunkLastEnd = 0;
        broadPattern.lastIndex = 0;
      }
    }

    // Add whatever remains from this chunk
    if (chunkRemaining.trim().length > 20) {
      results.push(chunkRemaining.trim());
    }
  }

  // If no splits happened, return the original text
  if (results.length === 0) {
    results.push(text);
  }
  
  return results;
}

/**
 * Check whether text ending looks like the end of a bibliographic reference.
 * Used to validate candidate split points in merged references.
 */
function looksLikeEndOfRef(text: string): boolean {
  return (
    /\d{1,5}\s*[-–]\s*\d{1,5}\.\s*$/.test(text) ||           // ends with pages (e.g., "27-32.")
    /\d{4}\)\.\s*$/.test(text) ||                               // ends with YYYY).
    /\(\d{4}\)\.\s*$/.test(text) ||                             // ends with (YYYY).
    /doi\.org\/\S+\.?\s*$/.test(text) ||                        // ends with DOI
    /https?:\/\/\S+\.?\s*$/.test(text) ||                       // ends with URL
    /[A-Z][a-z]+\.\s*$/.test(text) ||                           // ends with publisher name
    /\w+,\s*\d+,\s*\d+\s*[-–]\s*\d+\.\s*$/.test(text)          // journal+vol+pages (e.g., "Dergisi, 33, 27-32.")
  );
}

export function startParseWorker() {
  const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });

  const worker = new Worker<ParseJobData>(
    "document-parse",
    async (job: Job<ParseJobData>) => {
      const { analysisId, documentId } = job.data;
      logger.info(`Parse job started: analysis=${analysisId}, document=${documentId}`);

      try {
        // Update status
        await prisma.analysis.update({
          where: { id: analysisId },
          data: { status: "EXTRACTING_REFERENCES", progress: 10, startedAt: new Date() },
        });
        await job.updateProgress(10);

        // Get document metadata
        const doc = await prisma.document.findUnique({ where: { id: documentId } });
        if (!doc) throw new Error(`Document not found: ${documentId}`);

        // Extract text from file
        const filePath = path.join(env.UPLOAD_DIR, doc.storedName);
        logger.info(`Extracting text from: ${filePath} (format: ${doc.format})`);

        const fullText = await extractText(filePath, doc.format);
        logger.info(`Text extracted: ${fullText.length} chars`);

        // Save raw text
        await prisma.document.update({
          where: { id: documentId },
          data: { rawText: fullText, status: "PARSED" },
        });
        await job.updateProgress(30);

        // Find bibliography section
        await prisma.analysis.update({
          where: { id: analysisId },
          data: { status: "DETECTING_STYLE", progress: 35 },
        });

        const refLines = extractBibliographySection(fullText);
        logger.info(`Found ${refLines.length} candidate reference lines`);

        // Sanitize reference lines before sending to NLP
        const sanitizedRefs = sanitizeRefLines(refLines);
        logger.info(
          `After sanitization: ${sanitizedRefs.length} valid references (filtered ${refLines.length - sanitizedRefs.length})`,
        );

        if (sanitizedRefs.length === 0) {
          throw new Error("Dokümanda referans/kaynakça bölümü bulunamadı");
        }

        await job.updateProgress(40);

        // Call NLP service for parsing
        const refsToParse = sanitizedRefs.slice(0, 500);
        logger.info(
          `Sending ${refsToParse.length} references to NLP (total payload ~${JSON.stringify({ references: refsToParse }).length} bytes)`,
        );

        const nlpResponse = await axios.post(
          `${env.NLP_SERVICE_URL}/api/v1/parse`,
          { references: refsToParse },
          { timeout: 120000 },
        ).catch((err) => {
          if (err.response) {
            // NLP returned an error response (4xx/5xx) — log the body for diagnosis
            const status = err.response.status;
            const body = typeof err.response.data === "string"
              ? err.response.data.substring(0, 500)
              : JSON.stringify(err.response.data).substring(0, 500);
            logger.error(`NLP service error ${status}: ${body}`, {
              refsSent: refsToParse.length,
              sampleRef: refsToParse[0]?.substring(0, 100),
            });
            throw new Error(
              `NLP servisi ${status} hatası döndürdü: ${body}`,
            );
          }
          if (err.code === "ECONNABORTED") {
            logger.error("NLP service request timed out", {
              refsSent: refsToParse.length,
              timeout: 120000,
            });
            throw new Error(
              "NLP servisi zaman aşımına uğradı — referanslar çok karmaşık veya çok büyük olabilir",
            );
          }
          if (err.code === "ECONNREFUSED") {
            logger.error("NLP service connection refused");
            throw new Error("NLP servisine bağlanılamadı — servis çalışmıyor olabilir");
          }
          logger.error(`NLP request failed: ${err.message}`, { code: err.code });
          throw err;
        });

        const { parsed_references, detected_style, style_confidence } = nlpResponse.data;
        logger.info(`NLP parsed: ${parsed_references?.length || 0} refs, style=${detected_style}, conf=${style_confidence}`);
        await job.updateProgress(70);

        if (!parsed_references || parsed_references.length === 0) {
          throw new Error("Referans ayrıştırma başarısız — hiçbir referans bulunamadı");
        }

        // ─── Gemini AI Enhancement ───
        // For references with very low parse confidence (< 0.5) or no title, use Gemini to re-parse
        const gemini = new GeminiService();
        let geminiEnhanced = 0;

        if (gemini.isEnabled()) {
          const weakRefs = parsed_references
            .map((ref: any, idx: number) => ({ ref, idx }))
            .filter((item: any) => !item.ref.title || (item.ref.parse_confidence || 0) < 0.5);

          if (weakRefs.length > 0) {
            logger.info(`Gemini: Re-parsing ${weakRefs.length} low-confidence references`);

            // Process in batches of 10
            for (let b = 0; b < weakRefs.length; b += 10) {
              const batch = weakRefs.slice(b, b + 10);
              const rawBatch = batch.map((item: any) => item.ref.raw_text || "");
              const geminiResults = await gemini.batchParseReferences(rawBatch);

              for (const item of batch) {
                const gRef = geminiResults.get(item.idx - weakRefs[0].idx);
                if (gRef) {
                  const original = parsed_references[item.idx];
                  const originalConf = original.parse_confidence || 0;
                  const geminiConf = gRef.confidence || 0;
                  
                  // Always use Gemini if it found a title and original didn't
                  const needsTitle = !original.title && gRef.title;
                  // Or if Gemini has higher overall confidence
                  const isBetter = geminiConf > originalConf;
                  // Also use if original has no title but Gemini provides any useful data
                  const originalMissingData = !original.title && (gRef.title || gRef.authors?.length);
                  
                  if (needsTitle || isBetter || originalMissingData) {
                    parsed_references[item.idx] = {
                      ...original,
                      title: gRef.title || original.title,
                      authors: gRef.authors?.length ? gRef.authors : original.authors,
                      year: gRef.year || original.year,
                      journal: gRef.journal || original.journal,
                      book_title: gRef.book_title || original.book_title,
                      publisher: gRef.publisher || original.publisher,
                      volume: gRef.volume || original.volume,
                      issue: gRef.issue || original.issue,
                      pages: gRef.pages || original.pages,
                      doi: gRef.doi || original.doi,
                      url: gRef.url || original.url,
                      type: gRef.ref_type || original.type,
                      parse_confidence: Math.max(geminiConf, originalConf),
                    };
                    geminiEnhanced++;
                  }
                }
              }
            }

            logger.info(`Gemini enhanced ${geminiEnhanced}/${weakRefs.length} weak references`);
          }
        }

        // Save parsed references to DB
        await prisma.analysis.update({
          where: { id: analysisId },
          data: {
            detectedStyle: detected_style,
            styleConfidence: style_confidence,
            status: "VALIDATING",
            progress: 75,
            totalReferences: parsed_references.length,
          },
        });

        for (let i = 0; i < parsed_references.length; i++) {
          const ref = parsed_references[i];
          await prisma.reference.create({
            data: {
              analysisId,
              orderIndex: i + 1,
              rawText: ref.raw_text || "",
              authors: ref.authors || [],
              year: ref.year || null,
              title: ref.title || null,
              journal: ref.journal || null,
              publisher: ref.publisher || null,
              volume: ref.volume || null,
              issue: ref.issue || null,
              pages: ref.pages || null,
              doi: ref.doi || null,
              url: ref.url || null,
              isbn: ref.isbn || null,
              refType: mapRefType(ref.type),
              parseConfidence: ref.parse_confidence || null,
              status: "PENDING",
            },
          });
        }

        await job.updateProgress(90);

        // Queue validation job
        const validateQueue = new Queue("reference-validate", { connection });
        await validateQueue.add("validate", { analysisId }, {
          attempts: 2,
          backoff: { type: "exponential", delay: 5000 },
          timeout: 300000,
        });

        logger.info(`Parse job completed: ${parsed_references.length} references extracted, validation queued`);
      } catch (error: any) {
        logger.error(`Parse job failed: ${error.message}`, { stack: error.stack });
        await prisma.analysis.update({
          where: { id: analysisId },
          data: { status: "FAILED", errorMessage: error.message.substring(0, 500) },
        });
        throw error;
      }
    },
    { connection, concurrency: 3 },
  );

  worker.on("completed", (job) => logger.info(`Parse job ${job.id} completed`));
  worker.on("failed", (job, err) => logger.error(`Parse job ${job?.id} failed: ${err.message}`));

  logger.info("Document parse worker started");
  return worker;
}
