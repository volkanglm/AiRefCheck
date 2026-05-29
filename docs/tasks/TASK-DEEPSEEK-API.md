# GÖREV: Backend API Server - Fastify + Auth + Document CRUD
**Atanan Model:** DeepSeek
**Öncelik:** 🔴 YÜKSEK (Faz 1 - Temel)
**Tahmini Süre:** ~2 saat
**Bağımlılıklar:** Proje iskeleti hazır, Prisma schema hazır

---

## Senin Rolün
Sen bir Senior Backend Developer olarak AiRefCheck projesinin **Node.js/Fastify backend API** katmanını geliştireceksin. Bu, tüm sistemin omurgası olacak.

## Önce Oku
1. `docs/ARCHITECTURE.md` — Sistem mimarisini anla
2. `docs/PRD.md` — FR-101'den FR-208'e kadar referans gereksinimleri
3. `docs/DATABASE_SCHEMA.md` — Veritabanı şemasını anla
4. `prisma/schema.prisma` — Prisma model yapısını incele
5. `packages/shared/src/index.ts` — Paylaşılan tip tanımlarını kullan
6. `.env.example` — Environment değişkenlerini anla

## Oluşturacağın Dosyalar

### 1. `apps/api/src/server.ts` — Ana sunucu dosyası
```typescript
// Fastify server oluşturma
// - CORS, Helmet, Rate Limit plugin'leri
// - Socket.io entegrasyonu
// - Prisma client bağlantısı
// - Redis bağlantısı
// - Graceful shutdown
// - Error handler
// - 3001 portunda dinleme
```

### 2. `apps/api/src/lib/prisma.ts` — Prisma client singleton
### 3. `apps/api/src/lib/redis.ts` — Redis client singleton (ioredis)
### 4. `apps/api/src/lib/logger.ts` — Winston logger yapılandırması
### 5. `apps/api/src/lib/jwt.ts` — JWT yardımcı fonksiyonları (jose library)
### 6. `apps/api/src/lib/errors.ts` — Custom error sınıfları (AppError, NotFoundError, vb.)

### 7. `apps/api/src/middleware/auth.ts` — JWT authentication middleware
### 8. `apps/api/src/middleware/validation.ts` — Zod validation middleware

### 9. `apps/api/src/modules/auth/auth.service.ts` — Auth iş mantığı
```typescript
// register(email, password, firstName, lastName) → User + tokens
// login(email, password) → tokens
// refreshToken(token) → new tokens
// validateUser(userId) → User
// Şifre bcrypt ile hashlenecek
// JWT access (15dk) + refresh (7gün) token üretilecek
```

### 10. `apps/api/src/modules/auth/auth.routes.ts` — Auth route'ları
```
POST /api/v1/auth/register    → Kayıt
POST /api/v1/auth/login       → Giriş
POST /api/v1/auth/refresh     → Token yenileme
GET  /api/v1/auth/me          → Mevcut kullanıcı bilgisi
```

### 11. `apps/api/src/modules/documents/document.service.ts` — Document iş mantığı
```typescript
// upload(userId, file) → Document kaydet + dosyayı uploads/ dizinine yaz
// getById(userId, docId) → Document (kullanıcının kendi dosyası)
// list(userId, page, limit) → Kullanıcının dosyaları (sayfalı)
// delete(userId, docId) → Soft delete
// updateStatus(docId, status) → Durum güncelleme
```

### 12. `apps/api/src/modules/documents/document.routes.ts` — Document route'ları
```
POST   /api/v1/documents         → Dosya yükle (multipart/form-data)
GET    /api/v1/documents         → Dosyaları listele
GET    /api/v1/documents/:id     → Dosya detayı
DELETE /api/v1/documents/:id     → Dosya sil
```

### 13. `apps/api/src/modules/analyses/analysis.service.ts` — Analysis iş mantığı
```typescript
// create(documentId) → Analiz oluştur + BullMQ job'una ekle
// getById(analysisId) → Analiz detayı + referanslar
// getSummary(analysisId) → Özet istatistikler
// listByUser(userId, page, limit) → Kullanıcının analizleri
```

### 14. `apps/api/src/modules/analyses/analysis.routes.ts` — Analysis route'ları
```
POST /api/v1/analyses              → Yeni analiz başlat
GET  /api/v1/analyses/:id          → Analiz detayı
GET  /api/v1/analyses/:id/summary  → Özet istatistikler
GET  /api/v1/analyses/:id/references → Referans listesi
```

### 15. `apps/api/src/modules/reports/report.service.ts` — Report iş mantığı
### 16. `apps/api/src/modules/reports/report.routes.ts` — Report route'ları
```
POST /api/v1/reports               → Rapor oluştur (PDF/Excel)
GET  /api/v1/reports/:id           → Rapor detayı
GET  /api/v1/reports/:id/download  → Rapor indir
```

### 17. `apps/api/src/workers/document-parser.worker.ts` — BullMQ Worker
```typescript
// document:parse kuyruğunu dinle
// Dosyayı oku → format algıla → ham metin çıkar
// NLP servisine gönder (http://nlp:8000/api/v1/parse)
// Sonucu DB'ye kaydet →下一个 job'a gönder (reference:validate)
// WebSocket ile ilerleme gönder
```

### 18. `apps/api/src/workers/reference-validator.worker.ts` — BullMQ Worker
```typescript
// reference:validate kuyruğunu dinle
// Her referans için paralel doğrulama başlat
// Dış API'leri çağır (integrations/)
// Sonuçları DB'ye kaydet
// WebSocket ile ilerleme gönder
```

### 19. `apps/api/src/integrations/crossref.ts` — CrossRef API client
```typescript
// searchByDoi(doi) → CrossRef sonucu
// searchByTitle(title, authors) → CrossRef arama
// Rate limit: 50 req/dk
// Cache: Redis 7 gün TTL
// Circuit breaker: 5 hata → 60s bekle
```

### 20. `apps/api/src/integrations/semantic-scholar.ts` — Semantic Scholar API client
### 21. `apps/api/src/integrations/openalex.ts` — OpenAlex API client
### 22. `apps/api/src/integrations/doi-resolver.ts` — DOI resolver

### 23. `apps/api/src/routes/index.ts` — Tüm route'ları birleştiren index
```typescript
// fastify.register(authRoutes, { prefix: '/api/v1/auth' })
// fastify.register(documentRoutes, { prefix: '/api/v1/documents' })
// fastify.register(analysisRoutes, { prefix: '/api/v1/analyses' })
// fastify.register(reportRoutes, { prefix: '/api/v1/reports' })
```

## Kritik Kurallar
1. **TypeScript strict mode** — `any` kullanma
2. **Her route için Zod validation** — Request body ve params
3. **Service katmanı ayrı** — Route → Service → Prisma/Integration
4. **Error handling** — Her route try-catch, AppError sınıfı
5. **Logging** — Winston ile her önemli işlemi logla
6. **Rate limiting** — Her dış API için ayrı rate limiter
7. **Cache** — Redis ile API yanıtlarını cache'le
8. **@airefcheck/shared** — Tip tanımlarını shared paketinden kullan

## Test Gereksinimleri
- Her service fonksiyonu için unit test
- Her route için integration test (Fastify inject)
- Auth route'ları için güvenlik testleri
- `apps/api/src/__tests__/` dizinine yaz

## Dosya Formatı
Her dosyada dosya başlığı:
```typescript
/**
 * AiRefCheck - [Dosya adı]
 * [Kısa açıklama]
 */
```

## Çıktı
Tüm dosyaları oluştur. Her dosya tam, derlenebilir ve çalıştırılabilir olmalı. Placeholder veya TODO bırakma.
