# AiRefCheck - Veritabanı Şema Tasarımı

**Versiyon:** 1.0
**Tarih:** Mayıs 2026
**ORM:** Prisma

---

## 1. ER Diyagramı (Genel Bakış)

```
┌──────────┐     ┌──────────────┐     ┌───────────────┐
│  users   │────▶│  documents   │────▶│  analyses     │
└──────────┘     └──────────────┘     └───────┬───────┘
                                             │
                    ┌────────────────────────┤
                    │                        │
                    ▼                        ▼
          ┌──────────────────┐    ┌──────────────────┐
          │  references      │    │  analysis_summary│
          └────────┬─────────┘    └──────────────────┘
                   │
     ┌─────────────┼─────────────────┐
     │             │                 │
     ▼             ▼                 ▼
┌────────────┐ ┌──────────────┐ ┌────────────────┐
│validations │ │intext_cites  │ │fabrication_    │
│            │ │              │ │analysis        │
└────────────┘ └──────────────┘ └────────────────┘
     │
     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│source_results│    │  reports     │    │ audit_logs   │
└──────────────┘    └──────────────┘    └──────────────┘
```

---

## 2. Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// USER & AUTH
// ============================================

enum UserRole {
  FREE
  PRO
  INSTITUTION_ADMIN
  SYSTEM_ADMIN
}

model User {
  id            String    @id @default(uuid())
  email         String    @unique
  passwordHash  String?
  firstName     String
  lastName      String
  orcidId       String?   @unique
  googleId      String?   @unique
  role          UserRole  @default(FREE)
  institutionId String?
  avatarUrl     String?
  locale        String    @default("tr")
  emailVerified Boolean   @default(false)
  isActive      Boolean   @default(true)

  // İlişkiler
  documents     Document[]
  refreshTokens RefreshToken[]
  auditLogs     AuditLog[]
  institution   Institution? @relation(fields: [institutionId], references: [id])

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@map("users")
}

model RefreshToken {
  id        String   @id @default(uuid())
  token     String   @unique
  userId    String
  expiresAt DateTime
  isRevoked Boolean  @default(false)

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  @@map("refresh_tokens")
}

model Institution {
  id          String   @id @default(uuid())
  name        String
  domain      String?  @unique
  logoUrl     String?
  licenseType String   @default("basic")
  maxUsers    Int      @default(10)
  isActive    Boolean  @default(true)

  users       User[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("institutions")
}

// ============================================
// DOCUMENT
// ============================================

enum DocumentFormat {
  PDF
  DOCX
  LATEX
  BIBTEX
  RIS
  TXT
  URL
}

enum DocumentStatus {
  UPLOADED
  PARSING
  PARSED
  ANALYZING
  ANALYZED
  ERROR
}

model Document {
  id            String         @id @default(uuid())
  userId        String
  originalName  String
  storedName    String         @unique
  format        DocumentFormat
  fileSize      Int
  mimeType      String
  status        DocumentStatus @default(UPLOADED)
  errorMessage  String?
  rawText       String?        @db.Text
  language      String?
  pageCount     Int?

  // Metadata
  detectedTitle String?
  detectedAuthors String?

  // İlişkiler
  user          User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  analysis      Analysis?

  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  deletedAt     DateTime?

  @@index([userId])
  @@index([status])
  @@map("documents")
}

// ============================================
// ANALYSIS
// ============================================

enum AnalysisStatus {
  PENDING
  EXTRACTING_REFERENCES
  DETECTING_STYLE
  VALIDATING
  DETECTING_FABRICATION
  MATCHING_CITATIONS
  GENERATING_REPORT
  COMPLETED
  FAILED
}

model Analysis {
  id                String         @id @default(uuid())
  documentId        String         @unique
  status            AnalysisStatus @default(PENDING)
  progress          Int            @default(0) // 0-100
  errorMessage      String?

  // Tespit edilen atıf stili
  detectedStyle     String?
  styleConfidence   Float?

  // Özet istatistikler
  totalReferences   Int            @default(0)
  verifiedCount     Int            @default(0)
  suspiciousCount   Int            @default(0)
  notFoundCount     Int            @default(0)
  partialMatchCount Int            @default(0)
  missingCount      Int            @default(0)
  orphanCount       Int            @default(0)
  overallScore      Float?         // 0-100 genel bütünlük skoru

  // İşlem süreleri
  startedAt         DateTime?
  completedAt       DateTime?
  processingTimeMs  Int?

  // İlişkiler
  document          Document       @relation(fields: [documentId], references: [id], onDelete: Cascade)
  references        Reference[]
  summary           AnalysisSummary?
  report            Report?

  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt

  @@index([documentId])
  @@index([status])
  @@map("analyses")
}

model AnalysisSummary {
  id                    String   @id @default(uuid())
  analysisId            String   @unique

  // Dağılım verileri (JSON)
  statusDistribution    Json     // {"verified": 20, "suspicious": 3, ...}
  sourceDistribution    Json     // {"crossref": 18, "semantic_scholar": 15, ...}
  scoreDistribution     Json     // {"90-100": 15, "70-89": 5, ...}
  yearDistribution      Json     // {"2020": 5, "2021": 8, ...}
  referenceTypeDist     Json     // {"journal": 18, "book": 5, ...}

  // Uyarılar
  warnings              Json     // [{"type": "mixed_style", "detail": "..."}]

  // Öneriler
  recommendations       Json     // ["Referans 5 DOI ekleyiniz", ...]

  analysis              Analysis @relation(fields: [analysisId], references: [id], onDelete: Cascade)

  createdAt             DateTime @default(now())

  @@map("analysis_summaries")
}

// ============================================
// REFERENCE
// ============================================

enum ReferenceType {
  JOURNAL_ARTICLE
  BOOK
  BOOK_CHAPTER
  CONFERENCE_PAPER
  THESIS
  DISSERTATION
  TECHNICAL_REPORT
  WEB_PAGE
  ONLINE_RESOURCE
  NEWSPAPER_ARTICLE
  PREPRINT
  DATASET
  SOFTWARE
  LEGAL_DOCUMENT
  OTHER
}

enum ReferenceStatus {
  VERIFIED
  SUSPICIOUS
  NOT_FOUND
  PARTIAL_MATCH
  PENDING
}

model Reference {
  id              String          @id @default(uuid())
  analysisId      String
  orderIndex      Int             // Kaynakçadaki sırası

  // Orijinal referans metni
  rawText         String          @db.Text

  // Parse edilmiş alanlar
  authors         Json            // [{lastName, firstName, orcid}]
  year            Int?
  title           String?
  journal         String?
  bookTitle       String?
  publisher       String?
  publisherCity   String?
  volume          String?
  issue           String?
  pages           String?
  doi             String?
  url             String?
  isbn            String?
  edition         String?
  editors         Json?
  translators     Json?
  refType         ReferenceType   @default(JOURNAL_ARTICLE)
  language        String?

  // Parse kalitesi
  parseConfidence Float?
  parseErrors     Json?           // ["missing_year", "unparsed_authors"]

  // Doğrulama sonucu
  status          ReferenceStatus @default(PENDING)
  confidenceScore Float?          // 0-100
  bestMatchUrl    String?
  bestMatchSource String?

  // Şüphe analizi
  suspicionLevel  String?         // none, low, medium, high, critical
  suspicionScore  Float?
  suspicionReasons Json?          // [{type, description, severity, evidence}]

  // İlişkiler
  analysis        Analysis        @relation(fields: [analysisId], references: [id], onDelete: Cascade)
  validations     Validation[]
  inTextCitations InTextCitation[]

  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  @@unique([analysisId, orderIndex])
  @@index([analysisId])
  @@index([status])
  @@index([doi])
  @@index([title])
  @@map("references")
}

// ============================================
// VALIDATION (Doğrulama Sonuçları)
// ============================================

enum SourceStatus {
  FOUND
  NOT_FOUND
  PARTIAL_MATCH
  ERROR
  TIMEOUT
  RATE_LIMITED
}

model Validation {
  id              String       @id @default(uuid())
  referenceId     String
  source          String       // crossref, semantic_scholar, openalex, vb.
  status          SourceStatus
  confidenceScore Float?       // 0-100
  sourceUrl       String?
  sourceId        String?      // Dış kaynaktaki ID
  matchedTitle    String?
  matchedAuthors  Json?
  matchedYear     Int?
  matchedDoi      String?
  metadata        Json?        // Kaynak bazlı ek bilgiler
  responseTimeMs  Int?
  errorMessage    String?
  fromCache       Boolean      @default(false)

  // İlişkiler
  reference       Reference    @relation(fields: [referenceId], references: [id], onDelete: Cascade)

  createdAt       DateTime     @default(now())

  @@index([referenceId])
  @@index([source])
  @@index([source, status])
  @@map("validations")
}

// ============================================
// IN-TEXT CITATION (Metin İçi Atıflar)
// ============================================

enum CitationMatchType {
  EXACT
  FUZZY
  AMBIGUOUS
  UNMATCHED
}

model InTextCitation {
  id              String            @id @default(uuid())
  referenceId     String?
  analysisId      String
  rawText         String            // "(Smith, 2023)" veya "[1]"
  citationFormat  String            // author_year, numeric_bracket, numeric_paren, superscript
  pageNumber      Int?              // Metinde geçtiği sayfa
  context         String?           @db.Text  // Etrafındaki metin
  matchType       CitationMatchType?
  matchConfidence Float?

  // İlişkiler
  reference       Reference?        @relation(fields: [referenceId], references: [id], onDelete: SetNull)

  createdAt       DateTime          @default(now())

  @@index([analysisId])
  @@index([referenceId])
  @@map("intext_citations")
}

// ============================================
// REPORT
// ============================================

enum ReportFormat {
  PDF
  EXCEL
  CSV
  JSON
}

enum ReportStatus {
  PENDING
  GENERATING
  COMPLETED
  FAILED
}

model Report {
  id              String       @id @default(uuid())
  analysisId      String       @unique
  format          ReportFormat
  status          ReportStatus @default(PENDING)
  fileUrl         String?
  fileSize        Int?
  templateName    String?
  includeLogo     Boolean      @default(false)
  logoUrl         String?
  sections        Json         // ["summary", "details", "charts", "recommendations"]
  shareToken      String?      @unique  // Paylaşım linki için
  shareExpiresAt  DateTime?

  // İlişkiler
  analysis        Analysis     @relation(fields: [analysisId], references: [id], onDelete: Cascade)

  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  @@map("reports")
}

// ============================================
// AUDIT LOG
// ============================================

model AuditLog {
  id         String   @id @default(uuid())
  userId     String?
  action     String   // document.upload, analysis.start, vb.
  entity     String   // document, analysis, report
  entityId   String?
  details    Json?
  ipAddress  String?
  userAgent  String?

  user       User?    @relation(fields: [userId], references: [id])

  createdAt  DateTime @default(now())

  @@index([userId])
  @@index([action])
  @@index([createdAt])
  @@map("audit_logs")
}

// ============================================
// API CACHE (Dış API yanıtları)
// ============================================

model ApiCache {
  id          String   @id @default(uuid())
  source      String   // crossref, semantic_scholar, vb.
  queryKey    String   // DOI veya title_hash
  queryType   String   // doi, title, author, vb.
  response    Json
  hitCount    Int      @default(0)
  expiresAt   DateTime

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([source, queryKey])
  @@index([source])
  @@index([expiresAt])
  @@map("api_cache")
}
```

---

## 3. İndeks Stratejisi

### 3.1 Birincil İndeksler (B-Tree)

| Tablo | İndeks | Kullanım |
|-------|--------|----------|
| users | email (UNIQUE) | Giriş sorgusu |
| users | orcidId (UNIQUE) | ORCID ile eşleşme |
| documents | userId | Kullanıcının dosyaları |
| documents | status | İşlem kuyruğu sorguları |
| analyses | documentId (UNIQUE) | Doküman-analiz ilişkisi |
| analyses | status | İşlem durumu sorguları |
| references | analysisId | Analizin referansları |
| references | doi | DOI ile arama |
| references | title | Başlık ile arama |
| references | status | Durum filtreleme |
| validations | referenceId | Referans doğrulamaları |
| validations | (source, status) | Kaynak bazlı istatistik |
| intext_citations | analysisId | Analizin atıfları |
| intext_citations | referenceId | Referans-atıf eşleşme |
| audit_logs | userId | Kullanıcı logları |
| audit_logs | createdAt | Zaman bazlı sorgular |
| api_cache | (source, queryKey) UNIQUE | Önbellek arama |
| api_cache | expiresAt | Süresi dolan kayıtlar |

### 3.2 Full-Text Search (GIN Index)

```sql
-- Referans başlığında full-text arama
CREATE INDEX idx_references_title_fts ON references
  USING gin(to_tsvector('english', coalesce(title, '')));

-- Referans ham metninde arama
CREATE INDEX idx_references_raw_fts ON references
  USING gin(to_tsvector('english', coalesce("rawText", '')));
```

### 3.3 Trigram Index (Fuzzy Search)

```sql
-- pg_trgm extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Başlıkta fuzzy arama
CREATE INDEX idx_references_title_trgm ON references
  USING gin(coalesce(title, '') gin_trgm_ops);
```

---

## 4. Veri Saklama ve Temizleme Politikası

### 4.1 Veri Tutma Süreleri

| Veri Türü | Tutma Süresi | Açıklama |
|-----------|-------------|----------|
| Kullanıcı hesapları | Hesap silinene kadar | KVKK hakkı |
| Yüklenen dokümanlar | 30 gün (varsayılan) | Kullanıcı tercihi ile 1-90 gün |
| Analiz sonuçları | 1 yıl | Kullanıcı tercihi ile daha uzun |
| Raporlar | 6 ay | Paylaşılan linkler 30 gün |
| API önbelleği | 7 gün (TTL) | Otomatik temizleme |
| Audit logları | 2 yıl | Yasal gereksinim |
| Oturum verileri | 7 gün | Refresh token süresi |

### 4.2 Temizleme Job'ı

```sql
-- Günlük çalışan temizleme sorguları
DELETE FROM api_cache WHERE "expiresAt" < NOW();
DELETE FROM documents WHERE "deletedAt" < NOW() - INTERVAL '30 days';
UPDATE documents SET "rawText" = NULL WHERE "createdAt" < NOW() - INTERVAL '30 days';
DELETE FROM refresh_tokens WHERE "expiresAt" < NOW() OR "isRevoked" = true;
```

---

## 5. Migration Stratejisi

### 5.1 İlk Migration

```bash
# İlk schema oluşturma
npx prisma migrate dev --name init

# Seed data
npx prisma db seed
```

### 5.2 Migration Kuralları
- Her schema değişikliği için yeni migration
- Migration'lar geri alınamaz (rollback yerine forward fix)
- Production'da migration öncesi yedek
- Migration test ortamında önce test edilir

---

*Bu doküman AiRefCheck projesinin veritabanı şema tasarımını tanımlar.*

*Son güncelleme: Mayıs 2026*
