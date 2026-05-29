@docs/VISION.md
@docs/PRD.md
@docs/ARCHITECTURE.md
@docs/TECH_STACK.md
@docs/CITATION_STYLES.md
@docs/DATABASE_SCHEMA.md

# AiRefCheck - Proje Talimatları

## Proje Hakkında
AiRefCheck, akademik dokümanlardaki referansların bütünlüğünü otomatik denetleyen bir web platformudur. Detaylar için `docs/` klasöründeki dokümanları okuyun.

## Geliştirme Kuralları

### Genel
- Her zaman mevcut kodu okuyun, anlayın, sonra yazın
- TypeScript kullanın, `any` tipinden kaçının
- Tüm API çağrılarında timeout, retry ve error handling zorunludur
- Environment variable'ları `.env.example` dosyasında belgelenmeli
- Conventional Commits formatı kullanılmalı (`feat:`, `fix:`, `docs:`, vb.)

### Backend (Node.js / Fastify)
- Her route için Zod schema validation zorunlu
- Service katmanı ile route katmanı ayrılmalı
- Dış API çağrıları `integrations/` klasöründe olmalı
- Her dış API için rate limiting ve circuit breaker uygulanmalı
- Job'lar BullMQ ile asenkron işlenmeli
- Logger: winston ile yapısal loglama

### Frontend (Next.js)
- shadcn/ui bileşenlerini kullanın, custom bileşenler `components/` altında
- Server Components tercih edin, Client Components sadece gerektiğinde
- Zustand global state, TanStack Query server state için
- Form'larda React Hook Form + Zod validation
- Accessibility: WCAG 2.1 AA standartları

### Python NLP Servisi
- FastAPI endpoint'leri
- spaCy model dosyaları `models/` altında
- Her parser için kapsamlı unit test zorunlu
- Type hints zorunlu (Pydantic)

### Veritabanı
- Tüm schema değişiklikleri Prisma migration ile
- Sorgularda N+1 probleminden kaçının (Prisma include/select kullanın)
- Transaction kullanımı multi-step write'lar için zorunlu
- Index ekleme kararlarını `docs/DATABASE_SCHEMA.md` ile belgelayın

### Test
- Her yeni özellik için unit test zorunlu
- Integration test'ler API seviyesinde
- E2E test'ler kritik kullanıcı akışları için
- Test coverage hedefi: %80+
- CI'da tüm testler çalışmalı

### Güvenlik
- Hiçbir zaman secret, API key veya credential commit etmeyin
- Input validation hem client hem server tarafında
- SQL injection: Prisma parameterized queries kullanın
- XSS: React otomatik escape yapar ama dangerouslySetInnerHTML'den kaçının
- Rate limiting tüm public endpoint'lerde
- KVKK/GDPR uyumlu veri işleme

## Komutlar

```bash
# Geliştirme
pnpm dev                    # Tüm servisleri başlat
pnpm dev:web                # Sadece frontend
pnpm dev:api                # Sadece backend API
pnpm dev:nlp                # Sadece Python NLP servisi

# Test
pnpm test                   # Tüm testleri çalıştır
pnpm test:api               # Backend testleri
pnpm test:web               # Frontend testleri
pnpm test:nlp               # Python testleri
pnpm test:e2e               # E2E testleri

# Kalite
pnpm lint                   # ESLint + Prettier
pnpm lint:fix               # Otomatik düzeltme
pnpm typecheck              # TypeScript tip kontrolü

# Veritabanı
npx prisma migrate dev      # Migration oluştur ve uygula
npx prisma studio           # DB GUI
npx prisma db seed          # Seed data yükle

# Docker
docker compose up -d        # Tüm servisleri başlat
docker compose logs -f      # Logları izle
docker compose down         # Servisleri durdur
```

## Mimari Notları
- Modular Monolith yaklaşımı: Her modül kendi klasöründe, gelecekte mikroservise ayrılabilir
- Async-First: Uzun süren işlemler BullMQ job queue ile
- API-First: Frontend-backend REST API ile haberleşir
- Fail-Safe: Dış API çöküşünde sistem çalışmaya devam etmeli
- Cache-Heavy: API yanıtları Redis'te önbelleğe alınır

## Referans Ayrıştırma Kuralları
- Her atıf stili için regex pattern'ler `apps/nlp/app/parsers/patterns/` altında
- Türkçe isim ayrıştırma: `apps/nlp/app/parsers/turkish_name_handler.py`
- Yeni stil eklerken `docs/CITATION_STYLES.md` güncellenmeli
- Her parser için en az 30 test vakası zorunlu
