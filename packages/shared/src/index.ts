// AiRefCheck - Paylaşılan Tip Tanımları

// ============================================
// Document Types
// ============================================

export type DocumentFormat = 'pdf' | 'docx' | 'latex' | 'bibtex' | 'ris' | 'txt' | 'url';

export type DocumentStatus = 'uploaded' | 'parsing' | 'parsed' | 'analyzing' | 'analyzed' | 'error';

export interface Document {
  id: string;
  userId: string;
  originalName: string;
  format: DocumentFormat;
  fileSize: number;
  status: DocumentStatus;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Analysis Types
// ============================================

export type AnalysisStatus =
  | 'pending'
  | 'extracting_references'
  | 'detecting_style'
  | 'validating'
  | 'detecting_fabrication'
  | 'matching_citations'
  | 'generating_report'
  | 'completed'
  | 'failed';

export interface Analysis {
  id: string;
  documentId: string;
  status: AnalysisStatus;
  progress: number;
  detectedStyle: string | null;
  styleConfidence: number | null;
  totalReferences: number;
  verifiedCount: number;
  suspiciousCount: number;
  notFoundCount: number;
  partialMatchCount: number;
  missingCount: number;
  orphanCount: number;
  overallScore: number | null;
  startedAt: string | null;
  completedAt: string | null;
  processingTimeMs: number | null;
  createdAt: string;
}

export interface AnalysisSummary {
  id: string;
  analysisId: string;
  statusDistribution: Record<string, number>;
  sourceDistribution: Record<string, number>;
  scoreDistribution: Record<string, number>;
  yearDistribution: Record<string, number>;
  warnings: AnalysisWarning[];
  recommendations: string[];
}

export interface AnalysisWarning {
  type: string;
  detail: string;
  severity: 'info' | 'warning' | 'error';
}

// ============================================
// Reference Types
// ============================================

export type ReferenceType =
  | 'journal_article'
  | 'book'
  | 'book_chapter'
  | 'conference_paper'
  | 'thesis'
  | 'dissertation'
  | 'technical_report'
  | 'web_page'
  | 'online_resource'
  | 'newspaper_article'
  | 'preprint'
  | 'dataset'
  | 'software'
  | 'legal_document'
  | 'other';

export type ReferenceStatus = 'verified' | 'suspicious' | 'not_found' | 'partial_match' | 'pending';

export interface Author {
  lastName: string;
  firstName: string;
  orcid?: string;
}

export interface Reference {
  id: string;
  analysisId: string;
  orderIndex: number;
  rawText: string;
  authors: Author[];
  year: number | null;
  title: string | null;
  journal: string | null;
  bookTitle: string | null;
  publisher: string | null;
  volume: string | null;
  issue: string | null;
  pages: string | null;
  doi: string | null;
  url: string | null;
  isbn: string | null;
  refType: ReferenceType;
  parseConfidence: number | null;
  status: ReferenceStatus;
  confidenceScore: number | null;
  bestMatchUrl: string | null;
  bestMatchSource: string | null;
  suspicionLevel: string | null;
  suspicionScore: number | null;
  suspicionReasons: SuspicionReason[];
  validations: Validation[];
}

export interface SuspicionReason {
  type: string;
  description: string;
  severity: 'info' | 'warning' | 'error';
  evidence: string;
}

// ============================================
// Validation Types
// ============================================

export type SourceStatus = 'found' | 'not_found' | 'partial_match' | 'error' | 'timeout' | 'rate_limited';

export interface Validation {
  id: string;
  referenceId: string;
  source: string;
  status: SourceStatus;
  confidenceScore: number | null;
  sourceUrl: string | null;
  sourceId: string | null;
  matchedTitle: string | null;
  matchedAuthors: Author[] | null;
  matchedYear: number | null;
  matchedDoi: string | null;
  metadata: Record<string, unknown> | null;
  responseTimeMs: number | null;
  fromCache: boolean;
}

// ============================================
// In-Text Citation Types
// ============================================

export type CitationMatchType = 'exact' | 'fuzzy' | 'ambiguous' | 'unmatched';

export interface InTextCitation {
  id: string;
  referenceId: string | null;
  analysisId: string;
  rawText: string;
  citationFormat: string;
  pageNumber: number | null;
  context: string | null;
  matchType: CitationMatchType | null;
  matchConfidence: number | null;
}

// ============================================
// Report Types
// ============================================

export type ReportFormat = 'pdf' | 'excel' | 'csv' | 'json';
export type ReportStatus = 'pending' | 'generating' | 'completed' | 'failed';

export interface Report {
  id: string;
  analysisId: string;
  format: ReportFormat;
  status: ReportStatus;
  fileUrl: string | null;
  fileSize: number | null;
  shareToken: string | null;
  shareExpiresAt: string | null;
  createdAt: string;
}

// ============================================
// API Request/Response Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================
// WebSocket Event Types
// ============================================

export interface WsAnalysisProgress {
  analysisId: string;
  status: AnalysisStatus;
  progress: number;
  currentReference?: number;
  totalReferences?: number;
  message?: string;
}

export interface WsAnalysisComplete {
  analysisId: string;
  overallScore: number;
  totalReferences: number;
  verifiedCount: number;
  suspiciousCount: number;
  notFoundCount: number;
}

export interface WsAnalysisError {
  analysisId: string;
  error: string;
  details?: string;
}

export interface WsNotification {
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
}

// ============================================
// Citation Style Types
// ============================================

export type CitationStyle =
  | 'apa7' | 'apa6' | 'mla9' | 'mla8'
  | 'chicago-nb' | 'chicago-ad'
  | 'ieee' | 'vancouver' | 'harvard'
  | 'turabian9' | 'ama11' | 'acs3'
  | 'cse' | 'asa7' | 'apsa7'
  | 'mixed' | 'unknown';

export interface CitationStyleMatch {
  style: CitationStyle;
  confidence: number;
  detectedStyles?: { style: CitationStyle; score: number }[];
  warning?: string;
}

// ============================================
// Auth Types
// ============================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'free' | 'pro' | 'institution_admin' | 'system_admin';
  orcidId?: string;
  avatarUrl?: string;
  locale: string;
  createdAt: string;
}
