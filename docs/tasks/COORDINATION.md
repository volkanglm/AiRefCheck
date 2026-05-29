# AiRefCheck - Görev Dağılım ve Koordinasyon Haritası

**Proje:** AiRefCheck - Akademik Referans Bütünlük Kontrol Platformu
**Koordinatör:** Ana AI (Orchestrator)
**Tarih:** Mayıs 2026

---

## AI Model Dağılımı

| Model | Ana Görev | Görev Dosyası |
|-------|-----------|---------------|
| **Qwen** | Frontend Dashboard (Next.js) | `docs/tasks/TASK-QWEN-FRONTEND.md` |
| **DeepSeek** | Backend API (Fastify + Workers) | `docs/tasks/TASK-DEEPSEEK-API.md` |
| **Kimi** | Python NLP Service (FastAPI) | `docs/tasks/TASK-KIMI-NLP.md` |
| **Mimo** | Dış API Entegrasyonları | `docs/tasks/TASK-MIMO-INTEGRATIONS.md` |
| **BigPickle** | Desktop (Tauri) + Release Pipeline | `docs/tasks/TASK-BIGPICKLE-DESKTOP.md` |
| **MiniMax** | Test Suite + Seed Data + UI Polish | `docs/tasks/TASK-MINIMAX-QA.md` + `TASK-MINIMAX-UI.md` |

---

## Faz 1: Paralel Geliştirme (Tüm modeller aynı anda başlayabilir)

```
                    ┌─────────────────────────────────────┐
                    │       PROJE İSKELETİ HAZIR ✅        │
                    │  (Zaten oluşturuldu)                 │
                    └──────────────┬──────────────────────┘
                                   │
          ┌────────────────────────┼───────────────────────────┐
          │                        │                           │
          ▼                        ▼                           ▼
   ┌──────────────┐      ┌──────────────────┐        ┌────────────────┐
   │   QWEN 🔵    │      │   DEEPSEEK 🟠    │        │   KIMI 🟣      │
   │  Frontend    │      │  Backend API     │        │  NLP Service   │
   │  Dashboard   │      │  + Workers       │        │  (Python)      │
   └──────┬───────┘      └────────┬─────────┘        └────────┬───────┘
          │                       │                           │
          │                       │                           │
          │              ┌────────┴─────────┐                 │
          │              ▼                  ▼                  │
          │      ┌──────────────┐  ┌────────────────┐         │
          │      │   MIMO 🟢    │  │  BIGPICLE 🟤   │         │
          │      │  API İnteg.  │  │  Desktop+CI/CD │         │
          │      └──────────────┘  └────────────────┘         │
          │                                                    │
          │              ┌──────────────────┐                  │
          │              ▼                  ▼                  │
          │      ┌──────────────┐  ┌────────────────┐         │
          │      │  MINIMAX 🔴  │  │  MINIMAX 🔴    │         │
          │      │  Test Suite  │  │  UI Polish     │         │
          │      └──────────────┘  └────────────────┘         │
          │                                                    │
          └────────────────────────────────────────────────────┘
```

### Faz 1 — Adım Adım Plan

#### ADIM 1: Eşzamanlı Başlangıç (Hepsi aynı anda)

| # | Model | Ne Yapacak | Dosya Sayısı |
|---|-------|-----------|-------------|
| 1 | **Qwen** | Next.js dashboard: layout, login, upload, analysis sayfaları, store'lar, hooks | ~25 dosya |
| 2 | **DeepSeek** | Fastify server, auth, document CRUD, analysis routes, workers, logger | ~23 dosya |
| 3 | **Kimi** | FastAPI app, tüm atıf stili parser'ları, style detector, test fixture'ları | ~20 dosya |
| 4 | **MiniMax** | Test suite, seed data, mock data, fixture'lar, test dosyaları | ~15 dosya |

> ⚡ Bu dördü BAĞIMSIZ — birbirini beklemeden başlayabilir.

#### ADIM 2: DeepSeek bittikten sonra (sıralı)

| # | Model | Ne Yapacak | Neden Bekliyor |
|---|-------|-----------|----------------|
| 5 | **Mimo** | Dış API entegrasyonları | DeepSeek'in `base-client.ts` ve `types.ts` yapısına ihtiyacı var |

#### ADIM 3: Qwen bittikten sonra (sıralı)

| # | Model | Ne Yapacak | Neden Bekliyor |
|---|-------|-----------|----------------|
| 6 | **MiniMax** (UI) | shadcn/ui bileşenleri, responsive, settings page | Qwen'in layout ve sayfa yapısına ihtiyacı var |

#### ADIM 4: Herkes bittikten sonra (sıralı)

| # | Model | Ne Yapacak |
|---|-------|-----------|
| 7 | **BigPickle** | Desktop installer script'leri + GitHub Actions release |

> BigPickle Docker compose ve CI/CD için projenin tam halini görmeli ama script'leri şimdiden yazabilir.

---

## Her Modelin Okuması Gereken Dosyalar (Önce Oku Listesi)

### Qwen:
1. `docs/PRD.md` (Bölüm 7: UI)
2. `docs/ARCHITECTURE.md` (Frontend katmanı)
3. `docs/TECH_STACK.md` (Frontend)
4. `packages/shared/src/index.ts`
5. `apps/web/package.json`

### DeepSeek:
1. `docs/ARCHITECTURE.md` (Tümü)
2. `docs/PRD.md` (FR gereksinimleri)
3. `docs/DATABASE_SCHEMA.md`
4. `prisma/schema.prisma`
5. `packages/shared/src/index.ts`
6. `.env.example`

### Kimi:
1. `docs/CITATION_STYLES.md` (EN KRİTİK — tüm stiller ve regex'ler)
2. `docs/PRD.md` (FR-201'den FR-214'e)
3. `docs/ARCHITECTURE.md` (Processing Layer)
4. `apps/nlp/pyproject.toml`

### Mimo:
1. `docs/PRD.md` (Bölüm 6: Veri Kaynakları)
2. `docs/ARCHITECTURE.md` (External Integration Layer)
3. `docs/TECH_STACK.md` (Rate limiting, caching)
4. DeepSeek'in oluşturduğu: `apps/api/src/integrations/types.ts`
5. `packages/shared/src/index.ts`

### BigPickle:
1. `docs/ARCHITECTURE.md` (Deployment)
2. `apps/desktop/src-tauri/tauri.conf.json`
3. `apps/desktop/src-tauri/Cargo.toml`
4. `.github/workflows/ci.yml`
5. `docker/docker-compose.yml`

### MiniMax:
1. `docs/CITATION_STYLES.md` (Test verisi için)
2. `docs/DATABASE_SCHEMA.md`
3. `prisma/schema.prisma`
4. `packages/shared/src/index.ts`
5. Kimi'nin oluşturduğu parser dosyaları (test yazmak için)

---

## GitHub Reposu Kurulum Sırası

Sen (kullanıcı) şu adımları izleyeceksin:

```bash
# 1. GitHub'da repo oluştur (manuel)
# https://github.com/new → AiRefCheck (private)

# 2. Lokalde git başlat
cd /Users/volkan/Desktop/aiprojects/AiRefCheck
git init
git add .
git commit -m "feat: initial project skeleton with docs, monorepo, and task assignments"

# 3. Remote ekle ve push'la
git remote add origin https://github.com/VOLKAN_USERNAME/AiRefCheck.git
git branch -M main
git push -u origin main
```

---

## Görev Tamamlandığında Ne Yapılacak?

Her model görevini bitirdiğinde:

1. **Kod Kontrolü:** Ana AI (ben) kodu review edeceğim
2. **Entegrasyon Kontrolü:** Modüller arası uyum kontrolü
3. **Test Çalıştırma:** `pnpm test` ile tüm testler
4. **Merge:** Her model'in çıktısını sırayla entegre et
5. **E2E Test:** Tam sistem testi
6. **Release Tag:** `git tag v0.1.0` → GitHub Actions tetiklenir

---

## İletişim Protokolü

Her modele görev verirken şunu gönder:

```
Senin görev dosyan: docs/tasks/TASK-[MODEL]-[GÖREV].md

1. Önce görev dosyasını oku
2. "Önce Oku" bölümündeki dosyaları oku (docs/ klasöründen)
3. Görev dosyasındaki talimatlara göre kod yaz
4. Tüm dosyaları belirttiğim yollara oluştur

ÖNEMLİ:
- docs/ klasöründeki dokümanları referans al
- packages/shared/src/index.ts tiplerini kullan
- Her dosyada dosya başlığı yorumu bırak
- Placeholder veya TODO bırakma, tam kod yaz
```

---

## Proje Dosya Yapısı (Tamamı)

```
AiRefCheck/
├── .github/workflows/
│   ├── ci.yml                          ✅ Oluşturuldu
│   └── release.yml                     📋 BigPickle
├── apps/
│   ├── api/                            📋 DeepSeek (ana)
│   │   ├── src/
│   │   │   ├── server.ts
│   │   │   ├── lib/ (prisma, redis, logger, jwt, errors)
│   │   │   ├── middleware/ (auth, validation)
│   │   │   ├── modules/ (auth, documents, analyses, reports)
│   │   │   ├── workers/ (parser, validator)
│   │   │   └── integrations/           📋 Mimo
│   │   └── package.json                ✅ Oluşturuldu
│   ├── web/                            📋 Qwen (ana) + MiniMax (UI)
│   │   ├── src/
│   │   │   ├── app/ (layout, pages)
│   │   │   ├── components/ (ui, shared)
│   │   │   ├── hooks/
│   │   │   ├── stores/
│   │   │   └── lib/
│   │   └── package.json                ✅ Oluşturuldu
│   ├── nlp/                            📋 Kimi (ana)
│   │   ├── app/ (api, parsers, detectors, nlp, utils)
│   │   ├── tests/                      📋 MiniMax (test)
│   │   └── pyproject.toml              ✅ Oluşturuldu
│   └── desktop/                        📋 BigPickle
│       ├── src-tauri/
│       │   ├── src/ (main.rs, commands.rs, sidecar.rs)
│       │   ├── Cargo.toml              ✅ Oluşturuldu
│       │   └── tauri.conf.json         ✅ Oluşturuldu
│       └── package.json                ✅ Oluşturuldu
├── packages/
│   └── shared/
│       └── src/index.ts                ✅ Oluşturuldu
├── prisma/
│   └── schema.prisma                   ✅ Oluşturuldu
├── docker/
│   ├── docker-compose.yml              ✅ Oluşturuldu
│   ├── Dockerfile.api                  ✅ Oluşturuldu
│   ├── Dockerfile.web                  ✅ Oluşturuldu
│   └── Dockerfile.nlp                  ✅ Oluşturuldu
├── scripts/                            📋 BigPickle
├── docs/
│   ├── VISION.md                       ✅ Oluşturuldu
│   ├── PRD.md                          ✅ Oluşturuldu
│   ├── ARCHITECTURE.md                 ✅ Oluşturuldu
│   ├── TECH_STACK.md                   ✅ Oluşturuldu
│   ├── CITATION_STYLES.md              ✅ Oluşturuldu
│   ├── DATABASE_SCHEMA.md              ✅ Oluşturuldu
│   └── tasks/
│       ├── TASK-DEEPSEEK-API.md        ✅ Oluşturuldu
│       ├── TASK-QWEN-FRONTEND.md       ✅ Oluşturuldu
│       ├── TASK-KIMI-NLP.md            ✅ Oluşturuldu
│       ├── TASK-MIMO-INTEGRATIONS.md   ✅ Oluşturuldu
│       ├── TASK-BIGPICKLE-DESKTOP.md   ✅ Oluşturuldu
│       ├── TASK-MINIMAX-QA.md          ✅ Oluşturuldu
│       └── TASK-MINIMAX-UI.md          ✅ Oluşturuldu
├── .env.example                        ✅ Oluşturuldu
├── .gitignore                          ✅ Oluşturuldu
├── package.json                        ✅ Oluşturuldu
├── pnpm-workspace.yaml                 ✅ Oluşturuldu
├── tsconfig.base.json                  ✅ Oluşturuldu
├── CLAUDE.md                           ✅ Oluşturuldu
└── README.md                           ✅ Oluşturuldu
```

**Durum:** ✅ = Oluşturuldu | 📋 = AI modeline atandı

---

*Bu doküman proje koordinasyonu için referans noktasıdır.*
*Son güncelleme: Mayıs 2026*
