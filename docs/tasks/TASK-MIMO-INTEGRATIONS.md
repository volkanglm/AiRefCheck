# GÖREV: Dış API Entegrasyonları - CrossRef + Semantic Scholar + OpenAlex + Türk DB'leri
**Atanan Model:** Mimo
**Öncelik:** 🟡 ORTA (Faz 1 - DeepSeek'in worker'larından sonra entegre olacak)
**Tahmini Süre:** ~1.5 saat
**Bağımlılıklar:** Proje iskeleti hazır, shared types hazır

---

## Senin Rolün
Sen bir Senior Integration Engineer olarak AiRefCheck projesinin **dış akademik API entegrasyonlarını** geliştireceksin. Her entegrasyon, referans doğrulama pipeline'ının kritik bir parçası.

## Önce Oku
1. `docs/PRD.md` — Bölüm 6: Veri Kaynakları ve Dış API'ler (tüm tabloları oku)
2. `docs/ARCHITECTURE.md` — External Integration Layer
3. `docs/TECH_STACK.md` — Rate limiting, circuit breaker, caching
4. `packages/shared/src/index.ts` — Validation, SourceStatus tipleri

## Mimari

Her entegrasyon için aynı yapı:
```typescript
// apps/api/src/integrations/{source}.ts

export interface IntegrationResult {
  source: string;           // 'crossref', 'semantic_scholar', vb.
  status: SourceStatus;     // 'found' | 'not_found' | 'partial_match' | 'error' | 'timeout'
  confidenceScore: number;  // 0-100
  sourceUrl: string | null;
  sourceId: string | null;
  matchedTitle: string | null;
  matchedAuthors: Author[] | null;
  matchedYear: number | null;
  matchedDoi: string | null;
  metadata: Record<string, unknown> | null;
  responseTimeMs: number;
  fromCache: boolean;
}
```

## Oluşturacağın Dosyalar

### 1. `apps/api/src/integrations/types.ts`
Ortak tipler ve IntegrationResult arayüzü.

### 2. `apps/api/src/integrations/base-client.ts`
```typescript
/**
 * Temel API client sınıfı.
 * Tüm entegrasyonlar bu sınıftan extend eder.
 *
 * Özellikler:
 * - Rate limiting (per-source)
 * - Circuit breaker (5 hata → 60s açık)
 * - Response caching (Redis, 7 gün TTL)
 * - Retry logic (exponential backoff)
 * - Timeout handling
 * - Request/response logging
 */
export abstract class BaseApiClient {
  abstract readonly sourceName: string;
  abstract readonly baseUrl: string;
  abstract readonly rateLimit: { rpm: number; concurrent: number };

  protected async get<T>(path: string, params?: Record<string, string>): Promise<T>;
  protected async post<T>(path: string, body: unknown): Promise<T>;

  // Cache yardımcıları
  protected async getCached<T>(key: string): Promise<T | null>;
  protected async setCache(key: string, data: unknown, ttl?: number): Promise<void>;

  // Circuit breaker
  private async executeWithCircuitBreaker<T>(fn: () => Promise<T>): Promise<T>;

  // Retry with backoff
  private async retryWithBackoff<T>(fn: () => Promise<T>, attempts?: number): Promise<T>;

  // Ana doğrulama metodu
  abstract validateReference(ref: ParsedReference): Promise<IntegrationResult>;
}
```

### 3. `apps/api/src/integrations/crossref.ts`
```typescript
/**
 * CrossRef API Client
 *
 * API: https://api.crossref.org
 * Rate Limit: 50 req/dk (polite pool ile email header)
 * Docs: https://api.crossref.org/swagger-ui/index.html
 *
 * Endpoints:
 * - GET /works/{doi} → DOI ile direkt sorgulama
 * - GET /works?query.title={title}&query.author={author} → Başlık+yazar ile arama
 * - GET /works?query.bibliographic={full_text} → Tam referans metni ile arama
 *
 * Cache Key: crossref:{doi} veya crossref:title_hash:{hash}
 * Cache TTL: 7 gün
 */
export class CrossRefClient extends BaseApiClient {
  sourceName = 'crossref';
  baseUrl = 'https://api.crossref.org';
  rateLimit = { rpm: 50, concurrent: 5 };

  async validateReference(ref: ParsedReference): Promise<IntegrationResult> {
    // 1. DOI varsa direkt sorgula
    // 2. Yoksa başlık + yazar ile arama
    // 3. Sonucu match et ve confidence hesapla
  }

  async searchByDoi(doi: string): Promise<CrossRefWork | null>;
  async searchByTitle(title: string, authors?: string[]): Promise<CrossRefWork[]>;

  private calculateConfidence(ref: ParsedReference, work: CrossRefWork): number {
    // Başlık benzerliği (fuzzy): 40% ağırlık
    // Yazar eşleşmesi: 25% ağırlık
    // Yıl eşleşmesi: 15% ağırlık
    // DOI eşleşmesi: 15% ağırlık
    // Dergi eşleşmesi: 5% ağırlık
  }
}
```

### 4. `apps/api/src/integrations/semantic-scholar.ts`
```typescript
/**
 * Semantic Scholar API Client
 *
 * API: https://api.semanticscholar.org
 * Rate Limit: 100 req/dk (API key ile daha fazla)
 * Docs: https://api.semanticscholar.org/api-docs/
 *
 * Endpoints:
 * - GET /paper/{paper_id} → ID ile sorgulama (Semantic Scholar ID, DOI, PMID, ACL, URL)
 * - GET /paper/search?query={title}&limit=5 → Başlık ile arama
 * - GET /paper/DOI:{doi} → DOI ile sorgulama
 *
 * Cache Key: ss:{paper_id} veya ss:title_hash:{hash}
 */
export class SemanticScholarClient extends BaseApiClient { ... }
```

### 5. `apps/api/src/integrations/openalex.ts`
```typescript
/**
 * OpenAlex API Client
 *
 * API: https://api.openalex.org
 * Rate Limit: 10 req/s (polite pool ile email param)
 * Docs: https://docs.openalex.org/
 *
 * Endpoints:
 * - GET /works?filter=doi:{doi} → DOI ile sorgulama
 * - GET /works?search={title} → Başlık ile arama
 * - GET /works?filter=title.search:{title},publication_year:{year}
 *
 * Cache Key: oa:{work_id} veya oa:title_hash:{hash}
 */
export class OpenAlexClient extends BaseApiClient { ... }
```

### 6. `apps/api/src/integrations/doi-resolver.ts`
```typescript
/**
 * DOI Resolver Client
 *
 * API: https://doi.org/api/handles/{doi}
 * Alternatif: https://api.crossref.org/works/{doi}
 *
 * DOI'yi çözümler ve yönlendirilen URL'yi bulur.
 * DOI var/yok kontrolü için hızlı çözüm.
 */
export class DoiResolverClient extends BaseApiClient { ... }
```

### 7. `apps/api/src/integrations/dergipark.ts`
```typescript
/**
 * Dergipark Client
 *
 * Web: https://dergipark.org.tr
 * Scrape: Arama sayfasından makale tespiti
 * Alternatif: API varsa kullan
 *
 * Arama: https://dergipark.org.tr/search?q={title}&ct=article
 *
 * Türkçe makale doğrulama için kritik.
 */
export class DergiparkClient extends BaseApiClient { ... }
```

### 8. `apps/api/src/integrations/tr-dizin.ts`
```typescript
/**
 * TR Dizin Client
 *
 * Web: https://trdizin.gov.tr
 * API: https://api.trdizin.gov.tr (eğer mevcutsa)
 * Scrape: Arama sayfasından makale tespiti
 *
 * Türkçe akademik indeks.
 */
export class TRDizinClient extends BaseApiClient { ... }
```

### 9. `apps/api/src/integrations/yok-tez.ts`
```typescript
/**
 * YÖK Tez Client
 *
 * Web: https://tez.yok.gov.tr
 * API: https://api.tez.yok.gov.tr (eğer mevcutsa)
 *
 * Tez referanslarının doğrulanması için.
 * Başlık + yazar ile tez arama.
 */
export class YokTezClient extends BaseApiClient { ... }
```

### 10. `apps/api/src/integrations/pubmed.ts`
```typescript
/**
 * PubMed E-utilities Client
 *
 * API: https://eutils.ncbi.nlm.nih.gov/entrez/eutils
 * Rate Limit: 10 req/s (API key ile 10/s)
 *
 * Endpoints:
 * - esearch.fcgi?db=pubmed&term={title}[Title] → PMID bulma
 * - efetch.fcgi?db=pubmed&id={pmid}&rettype=xml → Detay çekme
 * - esummary.fcgi?db=pubmed&id={pmid} → Özet
 */
export class PubMedClient extends BaseApiClient { ... }
```

### 11. `apps/api/src/integrations/arxiv.ts`
```typescript
/**
 * arXiv API Client
 *
 * API: http://export.arxiv.org/api/query
 * Rate Limit: 30 req/s
 *
 * Endpoints:
 * - ?search_query=ti:"{title}"&max_results=5 → Başlık ile arama
 * - ?id_list={arxiv_id} → ID ile sorgulama
 */
export class ArxivClient extends BaseApiClient { ... }
```

### 12. `apps/api/src/integrations/orcid.ts`
```typescript
/**
 * ORCID Client
 * Yazar doğrulama için ORCID profil sorgulama.
 *
 * API: https://pub.orcid.org/v3.0/{orcid_id}/works
 */
export class OrcidClient extends BaseApiClient { ... }
```

### 13. `apps/api/src/integrations/validator-pipeline.ts`
```typescript
/**
 * Referans Doğrulama Pipeline
 *
 * Bir referansı tüm entegrasyonlara paralel olarak gönderir,
 * sonuçları toplar ve nihai güven skorunu hesaplar.
 */
export class ValidatorPipeline {
  private clients: BaseApiClient[];

  constructor(redis: Redis, logger: Logger) {
    this.clients = [
      new CrossRefClient(redis, logger),
      new SemanticScholarClient(redis, logger),
      new OpenAlexClient(redis, logger),
      new DoiResolverClient(redis, logger),
      new DergiparkClient(redis, logger),
      new TRDizinClient(redis, logger),
      new PubMedClient(redis, logger),
      new ArxivClient(redis, logger),
    ];
  }

  async validate(ref: ParsedReference): Promise<ValidationPipelineResult> {
    // 1. DOI varsa önce DOI resolver ile kontrol et
    // 2. Tüm client'lara paralel sorgu gönder (Promise.allSettled)
    // 3. Başarılı sonuçları topla
    // 4. Confidence score'ları birleştir
    // 5. En iyi eşleşmeyi belirle
    // 6. Nihai durumu belirle: verified / suspicious / not_found / partial_match
  }
}
```

### 14. `apps/api/src/integrations/index.ts`
Tüm entegrasyonları export eden index dosyası.

## Kritik Kurallar
1. **BaseApiClient extend** — Her client aynı yapıda olmalı
2. **Rate limiting** — Her API için belirlenen limitlere uy
3. **Circuit breaker** — 5 başarısızlıkta devreye girmeli
4. **Cache** — Redis ile her API yanıtı cache'lenmeli (7 gün)
5. **Timeout** — Her istek için timeout (5s default)
6. **Retry** — Exponential backoff (1s, 2s, 4s)
7. **Logging** — Her istek ve yanıt loglanmalı (responseTimeMs dahil)
8. **Graceful degradation** — Bir API çökerse diğerleri devam etmeli
9. **TypeScript strict** — any kullanma
10. **Error handling** — API hataları yakalanmalı, IntegrationResult olarak dönmeli

## Test Gereksinimleri
Her client için:
- DOI ile doğrulama testi (gerçek DOI kullan)
- Başlık ile arama testi
- Bulunamayan referans testi
- Rate limit / timeout testi (mock)
- Cache testi

Dosya: `apps/api/src/integrations/__tests__/`

## Çıktı
Tüm dosyaları oluştur. Her dosya tam, derlenebilir olmalı. API endpoint'leri, rate limit'ler ve cache stratejisi dokümantasyona uygun olmalı.
