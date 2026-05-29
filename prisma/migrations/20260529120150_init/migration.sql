-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('FREE', 'PRO', 'INSTITUTION_ADMIN', 'SYSTEM_ADMIN');

-- CreateEnum
CREATE TYPE "DocumentFormat" AS ENUM ('PDF', 'DOCX', 'LATEX', 'BIBTEX', 'RIS', 'TXT', 'URL');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('UPLOADED', 'PARSING', 'PARSED', 'ANALYZING', 'ANALYZED', 'ERROR');

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('PENDING', 'EXTRACTING_REFERENCES', 'DETECTING_STYLE', 'VALIDATING', 'DETECTING_FABRICATION', 'MATCHING_CITATIONS', 'GENERATING_REPORT', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ReferenceType" AS ENUM ('JOURNAL_ARTICLE', 'BOOK', 'BOOK_CHAPTER', 'CONFERENCE_PAPER', 'THESIS', 'DISSERTATION', 'TECHNICAL_REPORT', 'WEB_PAGE', 'ONLINE_RESOURCE', 'NEWSPAPER_ARTICLE', 'PREPRINT', 'DATASET', 'SOFTWARE', 'LEGAL_DOCUMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "ReferenceStatus" AS ENUM ('VERIFIED', 'SUSPICIOUS', 'NOT_FOUND', 'PARTIAL_MATCH', 'PENDING');

-- CreateEnum
CREATE TYPE "SourceStatus" AS ENUM ('FOUND', 'NOT_FOUND', 'PARTIAL_MATCH', 'ERROR', 'TIMEOUT', 'RATE_LIMITED');

-- CreateEnum
CREATE TYPE "CitationMatchType" AS ENUM ('EXACT', 'FUZZY', 'AMBIGUOUS', 'UNMATCHED');

-- CreateEnum
CREATE TYPE "ReportFormat" AS ENUM ('PDF', 'EXCEL', 'CSV', 'JSON');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'GENERATING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "orcidId" TEXT,
    "googleId" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'FREE',
    "institutionId" TEXT,
    "avatarUrl" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'tr',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "institutions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "logoUrl" TEXT,
    "licenseType" TEXT NOT NULL DEFAULT 'basic',
    "maxUsers" INTEGER NOT NULL DEFAULT 10,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "institutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "format" "DocumentFormat" NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'UPLOADED',
    "errorMessage" TEXT,
    "rawText" TEXT,
    "language" TEXT,
    "pageCount" INTEGER,
    "detectedTitle" TEXT,
    "detectedAuthors" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analyses" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "detectedStyle" TEXT,
    "styleConfidence" DOUBLE PRECISION,
    "totalReferences" INTEGER NOT NULL DEFAULT 0,
    "verifiedCount" INTEGER NOT NULL DEFAULT 0,
    "suspiciousCount" INTEGER NOT NULL DEFAULT 0,
    "notFoundCount" INTEGER NOT NULL DEFAULT 0,
    "partialMatchCount" INTEGER NOT NULL DEFAULT 0,
    "missingCount" INTEGER NOT NULL DEFAULT 0,
    "orphanCount" INTEGER NOT NULL DEFAULT 0,
    "overallScore" DOUBLE PRECISION,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "processingTimeMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_summaries" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "statusDistribution" JSONB NOT NULL,
    "sourceDistribution" JSONB NOT NULL,
    "scoreDistribution" JSONB NOT NULL,
    "yearDistribution" JSONB NOT NULL,
    "referenceTypeDist" JSONB NOT NULL,
    "warnings" JSONB NOT NULL,
    "recommendations" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analysis_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "references" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "rawText" TEXT NOT NULL,
    "authors" JSONB NOT NULL,
    "year" INTEGER,
    "title" TEXT,
    "journal" TEXT,
    "bookTitle" TEXT,
    "publisher" TEXT,
    "publisherCity" TEXT,
    "volume" TEXT,
    "issue" TEXT,
    "pages" TEXT,
    "doi" TEXT,
    "url" TEXT,
    "isbn" TEXT,
    "edition" TEXT,
    "editors" JSONB,
    "translators" JSONB,
    "refType" "ReferenceType" NOT NULL DEFAULT 'JOURNAL_ARTICLE',
    "language" TEXT,
    "parseConfidence" DOUBLE PRECISION,
    "parseErrors" JSONB,
    "status" "ReferenceStatus" NOT NULL DEFAULT 'PENDING',
    "confidenceScore" DOUBLE PRECISION,
    "bestMatchUrl" TEXT,
    "bestMatchSource" TEXT,
    "suspicionLevel" TEXT,
    "suspicionScore" DOUBLE PRECISION,
    "suspicionReasons" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "validations" (
    "id" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" "SourceStatus" NOT NULL,
    "confidenceScore" DOUBLE PRECISION,
    "sourceUrl" TEXT,
    "sourceId" TEXT,
    "matchedTitle" TEXT,
    "matchedAuthors" JSONB,
    "matchedYear" INTEGER,
    "matchedDoi" TEXT,
    "metadata" JSONB,
    "responseTimeMs" INTEGER,
    "errorMessage" TEXT,
    "fromCache" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "validations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intext_citations" (
    "id" TEXT NOT NULL,
    "referenceId" TEXT,
    "analysisId" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "citationFormat" TEXT NOT NULL,
    "pageNumber" INTEGER,
    "context" TEXT,
    "matchType" "CitationMatchType",
    "matchConfidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intext_citations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "format" "ReportFormat" NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "fileUrl" TEXT,
    "fileSize" INTEGER,
    "templateName" TEXT,
    "includeLogo" BOOLEAN NOT NULL DEFAULT false,
    "logoUrl" TEXT,
    "sections" JSONB NOT NULL,
    "shareToken" TEXT,
    "shareExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_cache" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "queryKey" TEXT NOT NULL,
    "queryType" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "hitCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_orcidId_key" ON "users"("orcidId");

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "institutions_domain_key" ON "institutions"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "documents_storedName_key" ON "documents"("storedName");

-- CreateIndex
CREATE INDEX "documents_userId_idx" ON "documents"("userId");

-- CreateIndex
CREATE INDEX "documents_status_idx" ON "documents"("status");

-- CreateIndex
CREATE UNIQUE INDEX "analyses_documentId_key" ON "analyses"("documentId");

-- CreateIndex
CREATE INDEX "analyses_documentId_idx" ON "analyses"("documentId");

-- CreateIndex
CREATE INDEX "analyses_status_idx" ON "analyses"("status");

-- CreateIndex
CREATE UNIQUE INDEX "analysis_summaries_analysisId_key" ON "analysis_summaries"("analysisId");

-- CreateIndex
CREATE INDEX "references_analysisId_idx" ON "references"("analysisId");

-- CreateIndex
CREATE INDEX "references_status_idx" ON "references"("status");

-- CreateIndex
CREATE INDEX "references_doi_idx" ON "references"("doi");

-- CreateIndex
CREATE INDEX "references_title_idx" ON "references"("title");

-- CreateIndex
CREATE UNIQUE INDEX "references_analysisId_orderIndex_key" ON "references"("analysisId", "orderIndex");

-- CreateIndex
CREATE INDEX "validations_referenceId_idx" ON "validations"("referenceId");

-- CreateIndex
CREATE INDEX "validations_source_idx" ON "validations"("source");

-- CreateIndex
CREATE INDEX "validations_source_status_idx" ON "validations"("source", "status");

-- CreateIndex
CREATE INDEX "intext_citations_analysisId_idx" ON "intext_citations"("analysisId");

-- CreateIndex
CREATE INDEX "intext_citations_referenceId_idx" ON "intext_citations"("referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "reports_analysisId_key" ON "reports"("analysisId");

-- CreateIndex
CREATE UNIQUE INDEX "reports_shareToken_key" ON "reports"("shareToken");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "api_cache_source_idx" ON "api_cache"("source");

-- CreateIndex
CREATE INDEX "api_cache_expiresAt_idx" ON "api_cache"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "api_cache_source_queryKey_key" ON "api_cache"("source", "queryKey");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_summaries" ADD CONSTRAINT "analysis_summaries_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "references" ADD CONSTRAINT "references_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validations" ADD CONSTRAINT "validations_referenceId_fkey" FOREIGN KEY ("referenceId") REFERENCES "references"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intext_citations" ADD CONSTRAINT "intext_citations_referenceId_fkey" FOREIGN KEY ("referenceId") REFERENCES "references"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
