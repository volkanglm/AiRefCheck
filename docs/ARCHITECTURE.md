# AiRefCheck - Sistem Mimarisi Dokümanı

**Versiyon:** 1.0
**Tarih:** Mayıs 2026
**Durum:** Taslak

---

## 1. Mimari Genel Bakış

AiRefCheck, **modüler monolitik mimari** (modular monolith) yaklaşımıyla tasarlanmış bir web uygulamasıdır. Başlangıçta tek bir deployable birim olarak geliştirilecek, ancak modüler yapısı sayesinde gelecekte mikroservislere ayrılabilme esnekliğine sahip olacaktır.

### 1.1 Tasarım Prensipleri

| Prensip | Açıklama |
|---------|----------|
| **Separation of Concerns** | Her modülün tek bir sorumluluğu var |
| **Async-First** | Uzun süren işlemler (API doğrulama) asenkron kuyruk ile |
| **API-First** | Frontend ile Backend tamamen ayrı, REST API üzerinden haberleşme |
| **Event-Driven** | Modüller arası iletişimde event pattern |
| **Fail-Safe** | Bir dış API çökerse sistem devam etmeli |
| **Cache-Heavy** | Tekrarlı API çağrıları önbelleğe alınmalı |
| **Observable** | Her işlem loglanmalı, metrik toplanmalı |

### 1.2 Mimari Karar Kayıtları (ADR)

#### ADR-001: Modular Monolith vs Mikroservis
- **Karar:** Modular Monolith
- **Neden:** Proje başlangıç aşamasında mikroservis karmaşıklığı gereksiz. Modüler yapı ile gelecekte ayrıştırma kolay.
- **Gelecek:** Kullanım arttıkça NLP/ML ve dış API entegrasyon modülleri ayrı servis olarak çıkarılabilir.

#### ADR-002: Polyglot Yaklaşım (Node.js + Python)
- **Karar:** Node.js (Ana uygulama) + Python (NLP/ML mikroservisi)
- **Neden:** Node.js web/API geliştirmede verimli. Python NLP/ML ekosisteminde tartışmasız en iyi. İkisi birlikte en iyi sonucu verir.

#### ADR-003: WebSocket vs SSE vs Polling
- **Karar:** WebSocket (Socket.io)
- **Neden:** İki yönlü iletişim, gerçek zamanlı ilerleme güncellemeleri, kalıcı bağlantı.

---

## 2. Sistem Mimarisi Diyagramı

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              Next.js 14 App (TypeScript)                    │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │   │
│  │  │ Dashboard │ │ Upload   │ │ Analysis │ │ Reports      │   │   │
│  │  │ View     │ │ View     │ │ View     │ │ View         │   │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │   │
│  │         Socket.io Client (Real-time Updates)                │   │
│  └─────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │ HTTPS / WSS
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        API GATEWAY LAYER                            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                 Nginx (Reverse Proxy / LB)                  │   │
│  │          SSL Termination · Rate Limiting · CORS             │   │
│  └──────────────────────┬──────────────────────────────────────┘   │
└─────────────────────────┼──────────────────────────────────────────┘
                          │
           ┌──────────────┼──────────────┐
           ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────────┐
│  Node.js API │ │  Node.js API │ │  Socket.io WS    │
│  Server #1   │ │  Server #2   │ │  Server          │
│  (REST)      │ │  (REST)      │ │  (Real-time)     │
└──────┬───────┘ └──────┬───────┘ └────────┬─────────┘
       │                │                   │
       └────────────────┼───────────────────┘
                        │
┌───────────────────────┼───────────────────────────────────────────┐
│               BUSINESS LOGIC LAYER                                 │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                  Express.js / Fastify                        │  │
│  │                                                             │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐  │  │
│  │  │ Auth Module │  │ Document     │  │ Analysis          │  │  │
│  │  │ (JWT/OAuth) │  │ Module       │  │ Module            │  │  │
│  │  └─────────────┘  └──────────────┘  └───────────────────┘  │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐  │  │
│  │  │ User Module │  │ Report       │  │ Dashboard         │  │  │
│  │  │             │  │ Module       │  │ Module            │  │  │
│  │  └─────────────┘  └──────────────┘  └───────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                        │                                          │
│  ┌─────────────────────┼───────────────────────────────────────┐ │
│  │        JOB QUEUE (BullMQ + Redis)                           │ │
│  │                                                             │ │
│  │  ┌──────────────┐  ┌───────────────┐  ┌────────────────┐  │ │
│  │  │ Document     │  │ Reference     │  │ Report         │  │ │
│  │  │ Parse Queue  │  │ Validate Queue│  │ Generate Queue │  │ │
│  │  └──────┬───────┘  └──────┬────────┘  └────────────────┘  │ │
│  └─────────┼─────────────────┼────────────────────────────────┘ │
└────────────┼─────────────────┼────────────────────────────────────┘
             │                 │
             ▼                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│               PROCESSING LAYER (Worker Services)                    │
│                                                                     │
│  ┌──────────────────────┐    ┌──────────────────────────────────┐  │
│  │  Node.js Worker      │    │  Python NLP/ML Service           │  │
│  │                      │    │                                  │  │
│  │  · File parsing      │    │  · Reference extraction (spaCy)  │  │
│  │  · BibTeX parse      │    │  · Citation style detection      │  │
│  │  · Text extraction   │    │  · Fabrication detection (ML)    │  │
│  │  · Reference split   │    │  · Fuzzy matching                │  │
│  │  · In-text detection │    │  · Text classification           │  │
│  │  · Report generation │    │  · NER (Named Entity Recognition)│  │
│  └──────────┬───────────┘    └──────────────┬───────────────────┘  │
└─────────────┼───────────────────────────────┼──────────────────────┘
              │                               │
              ▼                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│               EXTERNAL INTEGRATION LAYER                            │
│                                                                     │
│  ┌────────────┐ ┌──────────────┐ ┌────────────┐ ┌──────────────┐  │
│  │ CrossRef   │ │ Semantic     │ │ OpenAlex   │ │ Google       │  │
│  │ API Client │ │ Scholar      │ │ API Client │ │ Scholar      │  │
│  │            │ │ API Client   │ │            │ │ Scraper      │  │
│  └────────────┘ └──────────────┘ └────────────┘ └──────────────┘  │
│  ┌────────────┐ ┌──────────────┐ ┌────────────┐ ┌──────────────┐  │
│  │ DOI        │ │ Dergipark    │ │ YÖK Tez    │ │ TR Dizin     │  │
│  │ Resolver   │ │ Client       │ │ Client     │ │ Client       │  │
│  └────────────┘ └──────────────┘ └────────────┘ └──────────────┘  │
│  ┌────────────┐ ┌──────────────┐ ┌────────────┐                    │
│  │ PubMed     │ │ arXiv        │ │ ORCID      │                    │
│  │ Client     │ │ Client       │ │ Client     │                    │
│  └────────────┘ └──────────────┘ └────────────┘                    │
│                                                                     │
│  Rate Limiter · Circuit Breaker · Response Cache · Retry Handler   │
└─────────────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    DATA LAYER                                       │
│                                                                     │
│  ┌──────────────────┐  ┌─────────────┐  ┌───────────────────────┐  │
│  │   PostgreSQL     │  │   Redis     │  │   File Storage        │  │
│  │                  │  │             │  │                       │  │
│  │  · Users         │  │  · Sessions │  │  · Uploaded docs      │  │
│  │  · Documents     │  │  · Cache    │  │  · Generated reports  │  │
│  │  · References    │  │  · Job Queue│  │  · Temp files         │  │
│  │  · Analyses      │  │  · Pub/Sub  │  │                       │  │
│  │  · Reports       │  │             │  │  (Local / MinIO/S3)   │  │
│  │  · Audit Logs    │  │             │  │                       │  │
│  └──────────────────┘  └─────────────┘  └───────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Katmanlı Mimari Detayı

### 3.1 Presentation Layer (Frontend)
- **Framework:** Next.js 14+ (App Router)
- **Dil:** TypeScript
- **UI:** shadcn/ui + Tailwind CSS
- **State:** Zustand (global) + TanStack Query (server state)
- **Grafik:** Recharts
- **Gerçek zamanlı:** Socket.io Client

### 3.2 API Layer (Backend)
- **Framework:** Fastify (Node.js) — yüksek performans
- **Dil:** TypeScript
- **API Stili:** REST + WebSocket
- **Auth:** JWT + OAuth2 (Google, ORCID)
- **Validation:** Zod schemas

### 3.3 Business Logic Layer
- **Auth Module:** Kayıt, giriş, JWT yönetimi, OAuth, RBAC
- **Document Module:** Dosya yükleme, format algılama, depolama
- **Analysis Module:** Analiz orkestrasyonu, durum yönetimi
- **Report Module:** Rapor oluşturma, şablon yönetimi, dışa aktarma
- **Dashboard Module:** İstatistikler, geçmiş, özet veriler

### 3.4 Processing Layer (Workers)
- **Node.js Workers:** Dosya ayrıştırma, referans bölme, rapor oluşturma
- **Python Service:** NLP, ML, referans çıkarma, stil tespiti

### 3.5 External Integration Layer
- API client'ları (her dış servis için bir adapter)
- Circuit Breaker pattern
- Rate Limiting
- Response Caching
- Retry Logic

### 3.6 Data Layer
- **PostgreSQL:** İlişkisel veriler
- **Redis:** Cache, session, job queue, pub/sub
- **File Storage:** Yerel dosya sistemi veya S3-uyumlu (MinIO)

---

## 4. Veri Akışı

### 4.1 Doküman Analizi Ana Akış

```
[Kullanıcı] → Doküman Yükle
    │
    ▼
[API Server] → Dosya Kaydet → [File Storage]
    │
    ▼
[API Server] → Analiz Job Oluştur → [BullMQ Queue]
    │
    ▼
[Kullanıcı] ← WebSocket: "Analiz başladı" ← [Socket.io]
    │
    ▼
[Node.js Worker] → Dosya Oku → [File Storage]
    │
    ▼
[Node.js Worker] → Format Algıla → PDF/DOCX/LaTeX/BibTeX Parser
    │
    ▼
[Node.js Worker] → Ham Metin Çıkar
    │
    ▼
[WebSocket] → İlerleme: "Metin çıkarıldı" → [Kullanıcı]
    │
    ▼
[Python Service] ← Ham Metin → Kaynakça Tespiti
    │
    ▼
[Python Service] → Referans Ayrıştırma (NLP)
    │
    ▼
[Python Service] → Atıf Stili Tespiti
    │
    ▼
[Python Service] → Metin İçi Atıf Çıkarımı
    │
    ▼
[WebSocket] → İlerleme: "25 referans tespit edildi" → [Kullanıcı]
    │
    ▼
[Node.js Worker] → Her Referans İçin Paralel:
    │
    ├──→ [CrossRef API] ──→ Sonuç
    ├──→ [Semantic Scholar API] ──→ Sonuç
    ├──→ [OpenAlex API] ──→ Sonuç
    ├──→ [DOI Resolver] ──→ Sonuç
    ├──→ [Dergipark API] ──→ Sonuç
    └──→ [TR Dizin / YÖK Tez] ──→ Sonuç
    │
    ▼
[Node.js Worker] → Sonuçları Toparla → Güven Skoru Hesapla
    │
    ▼
[WebSocket] → İlerleme: "Referans 15/25 doğrulanıyor..." → [Kullanıcı]
    │
    ▼
[Python Service] → Fabrikasyon Analizi
    │
    ▼
[Node.js Worker] → Eksik/Fazla Referans Eşleştirmesi
    │
    ▼
[Node.js Worker] → Sonuçları DB'ye Kaydet → [PostgreSQL]
    │
    ▼
[WebSocket] → "Analiz tamamlandı" → [Kullanıcı]
    │
    ▼
[Kullanıcı] → Dashboard'da Sonuçları Görüntüle
```

### 4.2 Referans Doğrulama Alt Akışı

```
[Referans] → DOI var mı?
    │
    ├── Evet → [DOI Resolver] → Tam Eşleşme?
    │           │
    │           ├── Evet → ✅ DOĞRULANMIŞ (Skor: 95+)
    │           └── Hayır → Fuzzy Search'e devam et
    │
    └── Hayır → [CrossRef API] → Başlık + Yazar ile arama
                │
                ├── Tam Eşleşme → ✅ DOĞRULANMIŞ (Skor: 90+)
                ├── Yakın Eşleşme → Diğer kaynakları da kontrol et
                └── Bulunamadı → Diğer kaynakları kontrol et
                    │
                    ▼
                [Semantic Scholar] → Başlık arama
                    │
                    ├── Eşleşme → Skoru birleştir
                    └── Bulunamadı → [OpenAlex] → Başlık arama
                        │
                        ├── Eşleşme → Skoru birleştir
                        └── Bulunamadı → [Dergipark/TR Dizin] →
                            │
                            ├── Eşleşme → ✅/⚠️ Sonuç
                            └── Bulunamadı → ❌ BULUNAMADI
                                              │
                                              ▼
                                        [Fabrikasyon Analizi]
                                              │
                                    ┌─────────┼─────────┐
                                    ▼         ▼         ▼
                              ⚠️ ŞÜPHELİ  ❌ SAHTE  ℹ️ DÜŞÜK KALİTE
```

---

## 5. Bileşen Detayları

### 5.1 Document Ingestion Service

```typescript
// Ara yüz tanımı
interface DocumentIngestionService {
  upload(file: File, userId: string): Promise<Document>;
  detectFormat(buffer: Buffer): DocumentFormat;
  extractText(buffer: Buffer, format: DocumentFormat): Promise<string>;
  detectSections(text: string): DocumentSections;
}

type DocumentFormat = 'pdf' | 'docx' | 'latex' | 'bibtex' | 'ris' | 'txt';

interface DocumentSections {
  title?: string;
  abstract?: string;
  body: string;
  bibliography: string;
  bibliographyStart: number;
  bibliographyEnd: number;
}
```

### 5.2 Citation Parser Engine

```typescript
interface CitationParserEngine {
  detectStyle(references: string[]): CitationStyleMatch;
  parseReferences(references: string[], style: CitationStyle): ParsedReference[];
  extractInTextCitations(body: string, style: CitationStyle): InTextCitation[];
  matchCitationsToBibliography(
    citations: InTextCitation[],
    references: ParsedReference[]
  ): CitationMatch[];
}

interface ParsedReference {
  id: string;
  rawText: string;
  authors: Author[];
  year: number | null;
  title: string | null;
  journal?: string;
  bookTitle?: string;
  publisher?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  url?: string;
  isbn?: string;
  type: ReferenceType;
  parseConfidence: number; // 0-100
}

interface CitationMatch {
  citation: InTextCitation;
  reference: ParsedReference | null; // null = missing reference
  matchConfidence: number;
}
```

### 5.3 Reference Validator Pipeline

```typescript
interface ReferenceValidatorPipeline {
  validate(reference: ParsedReference): Promise<ValidationResult>;
  validateBatch(references: ParsedReference[]): Promise<ValidationResult[]>;
}

interface ValidationResult {
  referenceId: string;
  status: 'verified' | 'suspicious' | 'not_found' | 'partial_match';
  confidenceScore: number; // 0-100
  sources: SourceResult[];
  warnings: ValidationWarning[];
  bestMatchUrl?: string;
}

interface SourceResult {
  source: string; // 'crossref', 'semantic_scholar', etc.
  status: 'found' | 'not_found' | 'partial' | 'error';
  confidenceScore: number;
  url?: string;
  metadata?: Record<string, any>;
  responseTime: number;
}
```

### 5.4 Fabrication Detector

```typescript
interface FabricationDetector {
  analyze(
    reference: ParsedReference,
    validationResult: ValidationResult
  ): FabricationAnalysis;
}

interface FabricationAnalysis {
  suspicionLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
  suspicionScore: number; // 0-100
  reasons: SuspcionReason[];
  recommendations: string[];
}

interface SuspcionReason {
  type: 'no_database_match' | 'invalid_doi' | 'invalid_journal' |
        'year_anomaly' | 'author_anomaly' | 'url_dead' |
        'retracted' | 'pattern_mismatch';
  description: string;
  severity: 'info' | 'warning' | 'error';
  evidence: string;
}
```

---

## 6. Asenkron İşlem Mimarisi

### 6.1 Job Queue Tasarımı

```
                    ┌─────────────────┐
                    │   API Server    │
                    └────────┬────────┘
                             │ Job Oluştur
                             ▼
                    ┌─────────────────┐
                    │     Redis       │
                    │  BullMQ Queue   │
                    │                 │
                    │ ┌─────────────┐ │
                    │ │ parse-queue │ │ ← Dosya ayrıştırma
                    │ ├─────────────┤ │
                    │ │ validate-   │ │ ← Referans doğrulama
                    │ │ queue       │ │
                    │ ├─────────────┤ │
                    │ │ report-     │ │ ← Rapor oluşturma
                    │ │ queue       │ │
                    │ └─────────────┘ │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ Worker 1 │  │ Worker 2 │  │ Worker N │
        │ (Parse)  │  │ (Validate│  │ (Report) │
        └──────────┘  └──────────┘  └──────────┘
              │              │              │
              └──────────────┼──────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Redis Pub/Sub  │
                    │  İlerleme       │
                    │  Güncellemeleri │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Socket.io      │
                    │  → Kullanıcı    │
                    └─────────────────┘
```

### 6.2 Job Öncelikleri
1. **Critical:** Kullanıcının aktif olarak izlediği analiz
2. **High:** Yeni yüklenen dokümanların analizi
3. **Medium:** Rapor oluşturma
4. **Low:** Arka plan önbellek güncellemeleri

### 6.3 Retry Stratejisi
- Dış API çağrıları: Exponential backoff (1s, 2s, 4s, 8s, max 30s)
- Maksimum retry: 3
- Circuit breaker: 5 başarısızlıktan sonra 60s bekleme

---

## 7. Güvenlik Mimarisi

### 7.1 Kimlik Doğrulama
```
[Kullanıcı] → Giriş (Email/Şifre veya OAuth2)
    │
    ▼
[Auth Service] → JWT Token Üret (Access + Refresh)
    │
    ├── Access Token: 15 dakika geçerli
    └── Refresh Token: 7 gün geçerli (httpOnly cookie)
    │
    ▼
[API Gateway] → Her istekte JWT doğrulama
    │
    ├── Geçerli → İstek işlenir
    └── Geçersiz/Süresi dolmuş → Refresh denemesi → Başarısız → 401
```

### 7.2 Rol ve İzinler
| Rol | Doküman Yükleme | Analiz | Rapor | Kurumsal Panel | Admin |
|-----|----------------|--------|-------|----------------|-------|
| Free User | ✅ (5/ay) | ✅ | ✅ (PDF) | ❌ | ❌ |
| Pro User | ✅ (Sınırsız) | ✅ | ✅ (Tümü) | ❌ | ❌ |
| Institution Admin | ✅ (Sınırsız) | ✅ | ✅ (Tümü) | ✅ | ❌ |
| System Admin | ✅ | ✅ | ✅ | ✅ | ✅ |

### 7.3 Veri Güvenliği
- **Transit:** TLS 1.3 (HTTPS/WSS)
- **Rest:** AES-256 dosya şifreleme
- **PII:** KVKK uyumlu veri işleme
- **Retention:** Kullanıcı tercihi ile dosya saklama (1 gün - 90 gün)
- **Audit:** Tüm işlemler loglanır

---

## 8. Ölçeklenebilirlik Stratejisi

### 8.1 Horizontal Scaling
```
                    ┌─────────────┐
                    │   Nginx LB  │
                    └──────┬──────┘
                           │
            ┌──────────────┼──────────────┐
            ▼              ▼              ▼
      ┌──────────┐  ┌──────────┐  ┌──────────┐
      │ API #1   │  │ API #2   │  │ API #3   │
      └──────────┘  └──────────┘  └──────────┘
            │              │              │
            └──────────────┼──────────────┘
                           │
                    ┌──────┴──────┐
                    │ PostgreSQL  │
                    │ (Primary)   │
                    │    +        │
                    │ (Replica)   │
                    └─────────────┘
```

### 8.2 Önbellekleme Stratejisi
| Kaynak | Cache Süresi | Anahtar |
|--------|-------------|---------|
| CrossRef API yanıtı | 7 gün | `crossref:{doi}` veya `crossref:{title_hash}` |
| Semantic Scholar yanıtı | 7 gün | `ss:{paper_id}` veya `ss:{title_hash}` |
| OpenAlex yanıtı | 7 gün | `oa:{work_id}` veya `oa:{title_hash}` |
| DOI resolver | 30 gün | `doi:{doi}` |
| Analiz sonucu | 24 saat | `analysis:{analysis_id}` |
| Kullanıcı oturumu | 7 gün | `session:{session_id}` |

---

## 9. Teknik Borç ve Riskler

### 9.1 Tanımlanan Riskler

| Risk | Etki | Olasılık | Azaltma |
|------|------|----------|---------|
| Dış API'lerin rate limit'e takılması | Yüksek | Yüksek | Önbellekleme, rate limit yönetimi, circuit breaker |
| Google Scholar scraping engellenmesi | Orta | Yüksek | Proxy rotation, CAPTCHA çözümü, alternatif kaynaklara öncelik |
| NLP modelinin Türkçe referansları yanlış ayrıştırması | Yüksek | Orta | Türkçe eğitilmiş model, kural tabanlı fallback, test süiti |
| Büyük dosyaların işleme süresi | Orta | Orta | Chunked processing, timeout yönetimi, ilerleme bildirimi |
| KVKK uyumsuzluk riski | Yüksek | Düşük | Privacy by design, veri minimizasyonu, DPO danışmanlığı |
| DOI olmayan eski kaynakların doğrulanamaması | Orta | Yüksek | Fuzzy matching, ISBN arama, web araması fallback |

### 9.2 Teknik Borç Öngörüleri
- V1.0'da regex bazlı referans ayrıştırma → V2.0'da ML modeli
- V1.0'da Google Scholar scraping → V2.0'da resmi API veya SerpAPI
- V1.0'da tek sunucu deploy → V2.0'da Docker Compose / Kubernetes

---

## 10. C4 Model Açıklamaları

### 10.1 Context Diagram (Seviye 1)

```
                    ┌─────────────────┐
                    │    Akademisyen  │
                    │ (Danışman/Jüri)│
                    └────────┬────────┘
                             │ Yükler doküman
                             │ Görür sonuçlar
                             ▼
                    ┌─────────────────┐
                    │   AiRefCheck    │
                    │    Platformu    │
                    └────────┬────────┘
                             │ API çağrıları
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌───────────────┐  ┌─────────────────┐  ┌────────────────┐
│ Akademik DB'ler│  │ DOI/ISBN Servisleri│ │ Türk DB'leri   │
│ (CrossRef, SS, │  │ (DOI Resolver,   │ │ (Dergipark,    │
│  OpenAlex)     │  │  ISBN DB)        │ │  TR Dizin, YÖK)│
└───────────────┘  └─────────────────┘  └────────────────┘
```

### 10.2 Container Diagram (Seviye 2)

```
┌─────────────────────────────────────────────────────────────────┐
│                        AiRefCheck Sistemi                       │
│                                                                 │
│  ┌───────────────┐    ┌───────────────┐    ┌────────────────┐  │
│  │  Web Client   │───▶│  API Server   │───▶│  PostgreSQL    │  │
│  │  (Next.js)    │◀──▶│  (Fastify)    │    │  Database      │  │
│  └───────────────┘    └───────┬───────┘    └────────────────┘  │
│         ▲                     │                                  │
│         │              ┌──────┴───────┐    ┌────────────────┐  │
│         │              │  Job Queue   │───▶│  Redis         │  │
│         │              │  (BullMQ)    │    │                │  │
│         │              └──────┬───────┘    └────────────────┘  │
│         │                     │                                  │
│         │              ┌──────┴───────┐    ┌────────────────┐  │
│         │              │  Workers     │    │  File Storage  │  │
│  Socket │              │  (Node.js)   │───▶│  (Local/S3)    │  │
│  .io    │              └──────┬───────┘    └────────────────┘  │
│         │                     │                                  │
│         │              ┌──────┴───────┐                         │
│         └──────────────│ NLP Service  │                         │
│                        │ (Python)     │                         │
│                        └──────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
```

---

*Bu doküman AiRefCheck projesinin sistem mimarisini tanımlar. Geliştirme sürecinde living document olarak güncellenecektir.*

*Son güncelleme: Mayıs 2026*
