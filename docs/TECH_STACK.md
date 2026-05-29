# AiRefCheck - Teknoloji Stack ve Teknoloji Kararları

**Versiyon:** 1.0
**Tarih:** Mayıs 2026
**Durum:** Taslak

---

## 1. Teknoloji Seçim Kriterleri

Her teknoloji seçiminde aşağıdaki kriterler değerlendirilmiştir:

| Kriter | Ağırlık | Açıklama |
|--------|---------|----------|
| Topluluk ve Ekosistem | %25 | Dokümantasyon, library desteği, Stack Overflow aktivitesi |
| Geliştirme Hızı | %20 | Hızlı prototipleme ve iterasyon |
| Performans | %20 | Yanıt süresi, throughput, memory kullanımı |
| Ölçeklenebilirlik | %15 | Horizontal scaling, caching, async desteği |
| Bakım Kolaylığı | %10 | Test edilebilirlik, debug, long-term support |
| Güvenlik | %10 | Built-in güvenlik özellikleri, patch hızı |

---

## 2. Mimari Yaklaşım Kararı

### 2.1 Monolith vs Mikroservis

| Kriter | Modular Monolith | Mikroservis |
|--------|-----------------|-------------|
| Geliştirme karmaşıklığı | ✅ Düşük | ❌ Yüksek |
| Deploy kolaylığı | ✅ Tek deploy | ❌ Çoklu deploy |
| Network latency | ✅ Yok (in-process) | ❌ Var (HTTP/gRPC) |
| Data consistency | ✅ Kolay (tek DB) | ❌ Zor (distributed tx) |
| Takım ölçeği gereksinimi | ✅ 1-3 kişi | ❌ 5+ kişi |
| Gelecekte bölünebilirlik | ✅ Modüler ise evet | ✅ Zaten bölük |
| İlk deployment süresi | ✅ Hızlı | ❌ Yavaş |

**Karar: Modular Monolith** — Proje başlangıcında tek geliştirici ile ilerleneceği için monolith en mantıklı seçim. Ancak modüler yapı sayesinde gelecekte gerektiğinde mikroservislere ayrılabilir.

### 2.2 Polyglot Yaklaşım

```
┌─────────────────────────────────────────────┐
│            Ana Uygulama (Node.js)            │
│  Web API · Auth · Dashboard · Job Queue     │
│  File Management · Report Generation        │
└──────────────────┬──────────────────────────┘
                   │ HTTP/gRPC (internal)
                   ▼
┌─────────────────────────────────────────────┐
│         NLP/ML Servisi (Python)              │
│  Reference Parsing · Style Detection         │
│  NER · Fabrication Detection · Fuzzy Match   │
└─────────────────────────────────────────────┘
```

**Neden iki dil?**
- **Node.js:** Web/API geliştirmede en verimli ekosistem. Frontend ile aynı dil (TypeScript). Socket.io, BullMQ mükemmel entegrasyon.
- **Python:** NLP ve ML'de tartışmasız lider. spaCy, Hugging Face, scikit-learn gibi library'ler sadece Python'da mevcut.

---

## 3. Frontend Teknolojileri

### 3.1 Framework: Next.js 14+ (App Router)

| Özellik | Değerlendirme |
|---------|--------------|
| SSR/SSG desteği | ✅ Dashboard için SSR, statik sayfalar için SSG |
| App Router | ✅ Modern React Server Components |
| API Routes | ✅ Basit backend endpoint'leri için |
| TypeScript desteği | ✅ Birinci sınıf destek |
| Deployment | ✅ Vercel veya self-hosted |

**Alternatifler:**
- ~~Remix~~: Daha küçük ekosistem, daha az UI library
- ~~Vite + React~~: SSR yok, daha fazla konfigürasyon
- ~~Nuxt (Vue)~~: Farklı ekosistem, React library'lerinden yararlanamaz

### 3.2 UI Bileşenleri: shadcn/ui + Tailwind CSS

| Özellik | Değerlendirme |
|---------|--------------|
| Özelleştirilebilirlik | ✅ Kaynak kod kontrolü, styled değil |
| Erişilebilirlik | ✅ WAI-ARIA uyumlu |
| Tema desteği | ✅ Açık/Koyu mod |
| Boyut | ✅ Tree-shakeable, sadece kullanılan bileşenler |

**Alternative'ler:**
- ~~Material UI~~: Daha ağır, özelleştirme zor
- ~~Ant Design~~: Çin ekosistemi ağırlıklı
- ~~Chakra UI~~: Güçlü ama daha az popüler

### 3.3 State Management: Zustand + TanStack Query

| İhtiyaç | Çözüm |
|---------|-------|
| Global UI state (tema, sidebar, vb.) | Zustand |
| Server state (API verileri, cache) | TanStack Query (React Query) |
| Form state | React Hook Form + Zod |
| Real-time state (işlem ilerlemesi) | Socket.io events → Zustand store |

### 3.4 Veri Görselleştirme: Recharts

| Grafik Türü | Kullanım Yeri |
|-------------|--------------|
| Pie Chart | Referans durum dağılımı |
| Bar Chart | Kaynak bazlı doğrulama sonuçları |
| Histogram | Güven skoru dağılımı |
| Line Chart | Zaman içinde analiz trendi |
| Treemap | Referans kaynak haritası |

### 3.5 Frontend Stack Özeti

```
Next.js 14 (App Router)
├── TypeScript
├── Tailwind CSS
├── shadcn/ui
├── Zustand (global state)
├── TanStack Query (server state)
├── React Hook Form + Zod (forms/validation)
├── Recharts (charts)
├── Socket.io Client (real-time)
├── react-pdf (PDF önizleme)
├── react-dropzone (dosya yükleme)
└── lucide-react (ikonlar)
```

---

## 4. Backend Teknolojileri

### 4.1 Runtime ve Framework: Node.js + Fastify

| Özellik | Fastify | Express |
|---------|---------|---------|
| Performans | ✅ 2-3x daha hızlı | ❌ Daha yavaş |
| TypeScript | ✅ Yerleşik destek | ⚠️ @types gerekli |
| Plugin sistemi | ✅ Güçlü | ⚠️ Middleware bazlı |
| Schema validation | ✅ JSON Schema yerleşik | ❌ Harici gerekli |
| Swagger/OpenAPI | ✅ fastify-swagger | ⚠️ Harici |
| Lifecycle hooks | ✅ Detaylı | ⚠️ Sınırlı |

**Karar: Fastify** — Performans avantajı ve yerleşik TypeScript desteği nedeniyle.

### 4.2 API Tasarımı: REST + WebSocket

```
REST API (/api/v1/...)
├── POST   /auth/register
├── POST   /auth/login
├── POST   /auth/refresh
├── GET    /documents
├── POST   /documents/upload
├── GET    /documents/:id
├── DELETE /documents/:id
├── POST   /analyses
├── GET    /analyses/:id
├── GET    /analyses/:id/references
├── GET    /analyses/:id/summary
├── GET    /reports/:id
├── POST   /reports/:id/export
├── GET    /dashboard/stats

WebSocket (Socket.io)
├── analysis:progress  → İlerleme güncellemesi
├── analysis:complete  → Analiz tamamlandı
├── analysis:error     → Hata bildirimi
└── notification       → Genel bildirimler
```

### 4.3 Job Queue: BullMQ

```typescript
// Queue tanımları
const QUEUES = {
  DOCUMENT_PARSE: 'document:parse',       // Dosya ayrıştırma
  REFERENCE_VALIDATE: 'reference:validate', // Referans doğrulama
  REPORT_GENERATE: 'report:generate',       // Rapor oluşturma
  CACHE_WARMUP: 'cache:warmup',             // Önbellek güncelleme
} as const;

// Job opsiyonları
const JOB_OPTIONS = {
  DOCUMENT_PARSE: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    timeout: 120000, // 2 dakika
  },
  REFERENCE_VALIDATE: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    timeout: 60000, // 1 dakika / referans
  },
};
```

### 4.4 Backend Stack Özeti

```
Node.js 20 LTS
├── Fastify (web framework)
├── TypeScript
├── BullMQ (job queue)
├── Socket.io (WebSocket)
├── Prisma (ORM)
├── Zod (validation)
├── JWT + bcrypt (auth)
├── multer (file upload)
├── winston (logging)
├── ioredis (Redis client)
└── axios (HTTP client)
```

---

## 5. Python NLP/ML Servisi

### 5.1 Framework: FastAPI

| Özellik | FastAPI | Flask |
|---------|---------|-------|
| Performans | ✅ Async, yüksek | ❌ Senkron |
| Otomatik API docs | ✅ Swagger/ReDoc | ❌ Harici |
| Type hints | ✅ Pydantic | ❌ Yok |
| Async desteği | ✅ Yerleşik | ⚠️ Sınırlı |

### 5.2 NLP Araçları

| Kütüphane | Kullanım Amacı |
|-----------|---------------|
| spaCy (tr_core_news + en_core_web_sm) | NER, tokenization, sentence splitting |
| PyMuPDF (fitz) | PDF'ten metin çıkarma |
| python-docx | DOCX'ten metin çıkarma |
| pybtex | BibTeX ayrıştırma |
| GROBID (REST client) | Yapısal akademik PDF ayrıştırma |
| fuzzywuzzy / rapidfuzz | Fuzzy string matching |
| beautifulsoup4 | Web scraping (Dergipark, TR Dizin) |

### 5.3 ML Araçları (V2+)

| Kütüphane | Kullanım Amacı |
|-----------|---------------|
| scikit-learn | Sınıflandırma, clustering |
| XGBoost | Gradient boosting (fabrikasyon tespiti) |
| transformers (Hugging Face) | BERT-based stil tespiti, NER |
| sentence-transformers | Anlamsal benzerlik (referans eşleştirme) |

### 5.4 Python Stack Özeti

```
Python 3.11+
├── FastAPI (web framework)
├── spaCy (NLP)
├── PyMuPDF (PDF parsing)
├── python-docx (DOCX parsing)
├── pybtex (BibTeX parsing)
├── rapidfuzz (fuzzy matching)
├── httpx (async HTTP client)
├── pydantic (validation)
├── GROBID client (academic PDF parsing)
├── beautifulsoup4 (web scraping)
├── celery veya custom async workers
└── structlog (logging)
```

---

## 6. Veritabanı

### 6.1 Primary Database: PostgreSQL 16

| Özellik | Değerlendirme |
|---------|--------------|
| İlişkisel veri | ✅ Kullanıcı, doküman, referans, analiz ilişkileri |
| JSONB desteği | ✅ API yanıtları, esnek metadata |
| Full-text search | ✅ Referans metinlerinde arama |
| Extension desteği | ✅ pg_trgm (fuzzy search), uuid-ossp |
| Index çeşitliliği | ✅ B-tree, GIN, GiST |

**Alternatifler:**
- ~~MySQL~~: JSONB desteği zayıf, extension eksik
- ~~MongoDB~~: İlişkisel veri için uygun değil, transaction desteği sınırlı

### 6.2 ORM: Prisma

| Özellik | Prisma | TypeORM | Sequelize |
|---------|--------|---------|-----------|
| TypeScript DX | ✅ Mükemmel | ⚠️ İyi | ❌ Zayıf |
| Migration | ✅ Otomatik | ⚠️ Manuel | ⚠️ Manuel |
| Query builder | ✅ Tip güvenli | ⚠️ String bazlı | ⚠️ String bazlı |
| Performans | ✅ İyi | ✅ İyi | ⚠️ Orta |
| Schema DSL | ✅ .prisma dosyası | ❌ Decorator | ❌ JSON config |

### 6.3 Cache & Queue: Redis 7

| Kullanım Amacı | Redis Yapısı |
|----------------|-------------|
| Session storage | `String` (JSON) |
| API response cache | `String` (JSON) + TTL |
| Rate limiting | `String` (counter) + TTL |
| Job queue | BullMQ (internal) |
| Pub/Sub | Redis Pub/Sub (real-time events) |
| Leaderboard | `Sorted Set` (kullanıcı istatistikleri) |

### 6.4 File Storage

| Aşama | Çözüm |
|-------|-------|
| Geliştirme | Local filesystem (`./uploads/`) |
| Production V1 | Local + Nginx statik servis |
| Production V2 | MinIO (S3-uyumlu, self-hosted) |
| Production V3 | AWS S3 veya Cloudflare R2 |

---

## 7. Doküman İşleme Teknolojileri

| Format | Node.js Library | Python Library | Kullanım |
|--------|----------------|----------------|----------|
| PDF | pdf-parse | PyMuPDF (fitz) | Metin çıkarma |
| PDF (yapısal) | - | GROBID API | Başlık, yazar, kaynakça tespiti |
| DOCX | mammoth | python-docx | Metin ve stil çıkarma |
| LaTeX | - | regex + custom parser | Yapısal ayrıştırma |
| BibTeX | bibtex-parse-js | pybtex | Doğrudan referans listesi |
| RIS | custom parser | custom parser | Referans listesi |
| TXT | fs.readFile | open() | Ham metin |

---

## 8. Dış API Entegrasyonları

### 8.1 HTTP Client

**Node.js:** axios (interceptor ile retry, logging)
**Python:** httpx (async, timeout, retry)

### 8.2 Rate Limiting

```typescript
// Her API için rate limiter konfigürasyonu
const API_RATE_LIMITS = {
  crossref:      { rpm: 50,  concurrent: 5  },
  semanticScholar: { rpm: 100, concurrent: 10 },
  openAlex:      { rpm: 10,  concurrent: 5  }, // politeness pool
  doiResolver:   { rpm: 30,  concurrent: 3  },
  googleScholar: { rpm: 5,   concurrent: 1  }, // scraping - çok dikkatli
  dergipark:     { rpm: 20,  concurrent: 3  },
  yokTez:        { rpm: 10,  concurrent: 2  },
  pubmed:        { rpm: 10,  concurrent: 3  },
  arxiv:         { rpm: 30,  concurrent: 5  },
};
```

### 8.3 Circuit Breaker

```typescript
// Circuit breaker konfigürasyonu
const CIRCUIT_BREAKER = {
  failureThreshold: 5,   // 5 başarısızlık sonrası açık
  resetTimeout: 60000,   // 60 saniye sonra yarım açık
  monitorInterval: 10000, // 10 saniyede bir kontrol
};
```

---

## 9. DevOps ve Altyapı

### 9.1 Containerization

```yaml
# docker-compose.yml yapısı
services:
  app:        # Next.js frontend + Fastify API
  worker:     # BullMQ worker
  nlp:        # Python NLP service
  postgres:   # PostgreSQL 16
  redis:      # Redis 7
  nginx:      # Reverse proxy
  minio:      # S3-compatible storage (opsiyonel)
```

### 9.2 CI/CD: GitHub Actions

```yaml
# Pipeline aşamaları
on: [push, pull_request]

jobs:
  lint:       # ESLint, Prettier, Black, Ruff
  test:       # Jest/Vitest (Node), pytest (Python)
  build:      # Docker image build
  security:   # npm audit, safety check, SAST
  deploy:     # Docker Compose deploy (staging/prod)
```

### 9.3 Monitoring

| Araç | Kullanım |
|------|----------|
| Prometheus | Metrik toplama |
| Grafana | Dashboard ve alerting |
| Winston/structlog | Uygulama logları |
| Sentry | Error tracking |
| Uptime Robot | Uptime monitoring |

### 9.4 Logging

```typescript
// Log seviyeleri
type LogLevel = 'error' | 'warn' | 'info' | 'debug';

// Yapısal log formatı
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  traceId: string;
  message: string;
  metadata: Record<string, any>;
}
```

---

## 10. Geliştirme Araçları

### 10.1 Package Management

| Dil | Araç | Neden |
|-----|------|-------|
| Node.js | pnpm | Disk verimliliği, hızlı install, workspace desteği |
| Python | Poetry | Deterministik build, virtual env yönetimi |

### 10.2 Code Quality

| Araç | Kullanım |
|------|----------|
| ESLint + Prettier | JS/TS linting ve formatting |
| Black + Ruff | Python linting ve formatting |
| Husky + lint-staged | Pre-commit hooks |
| Conventional Commits | Commit mesaj standardı |
| Zod (runtime) + TypeScript (compile-time) | End-to-end type safety |

### 10.3 Testing

| Araç | Kullanım |
|------|----------|
| Vitest | Node.js unit/integration testleri |
| pytest | Python unit/integration testleri |
| Playwright | E2E testleri |
| MSW (Mock Service Worker) | API mocking |
| Testcontainers | Entegrasyon testleri (DB, Redis) |

---

## 11. Teknoloji Karar Matrisi

### Frontend Framework

| | Next.js | Remix | Vite+React | Nuxt |
|---|---------|-------|------------|------|
| SSR | ✅ | ✅ | ❌ | ✅ |
| Ekosistem | ✅✅✅ | ✅✅ | ✅✅✅ | ✅✅ |
| TypeScript | ✅✅✅ | ✅✅ | ✅✅✅ | ✅✅ |
| Deploy kolaylığı | ✅✅✅ | ✅✅ | ✅✅✅ | ✅✅ |
| UI library uyumu | ✅✅✅ | ✅✅ | ✅✅✅ | ✅✅ |
| **Toplam** | **15** | **10** | **11** | **10** |

### Backend Framework

| | Fastify | Express | NestJS | FastAPI |
|---|---------|---------|--------|---------|
| Performans | ✅✅✅ | ✅✅ | ✅✅ | ✅✅✅ |
| Öğrenme eğrisi | ✅✅ | ✅✅✅ | ✅ | ✅✅ |
| TypeScript | ✅✅✅ | ✅✅ | ✅✅✅ | N/A |
| Plugin/Modül | ✅✅✅ | ✅✅ | ✅✅✅ | ✅✅✅ |
| Dokümantasyon | ✅✅ | ✅✅✅ | ✅✅ | ✅✅✅ |
| **Toplam** | **13** | **12** | **10** | **Python** |

### ORM

| | Prisma | TypeORM | Drizzle | Sequelize |
|---|--------|---------|---------|-----------|
| TypeScript DX | ✅✅✅ | ✅✅ | ✅✅✅ | ✅ |
| Migration | ✅✅✅ | ✅✅ | ✅✅ | ✅✅ |
| Sorgu performansı | ✅✅ | ✅✅✅ | ✅✅✅ | ✅✅ |
| Öğrenme eğrisi | ✅✅✅ | ✅✅ | ✅✅ | ✅ |
| Topluluk | ✅✅✅ | ✅✅✅ | ✅✅ | ✅✅ |
| **Toplam** | **14** | **13** | **12** | **9** |

---

## 12. Güvenlik Teknolojileri

| Katman | Araç | Amaç |
|--------|------|------|
| HTTPS | Let's Encrypt / Nginx | TLS şifreleme |
| Auth | JWT (jose library) | Stateless kimlik doğrulama |
| OAuth2 | passport.js | Google, ORCID sosyal giriş |
| Şifre | bcrypt (Node), argon2 (alternatif) | Şifre hashleme |
| Rate Limit | fastify-rate-limit | API istek sınırlama |
| CORS | fastify-cors | Cross-origin kontrol |
| Helmet | fastify-helmet | HTTP güvenlik header'ları |
| Validation | Zod | Input validation |
| SQL Injection | Prisma (parameterized queries) | ORM koruması |
| XSS | DOMPurify (frontend) | Output encoding |
| CSRF | SameSite cookies | Cross-site request forgery koruması |

---

*Bu doküman AiRefCheck projesinin teknoloji kararlarını ve gerekçelerini tanımlar.*

*Son güncelleme: Mayıs 2026*
