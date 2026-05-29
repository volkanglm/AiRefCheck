# AiRefCheck - Akademik Referans Bütünlük Kontrol Platformu

> Akademik danışmanlar, tez jüri üyeleri ve araştırmacılar için yapay zekâ destekli referans doğrulama aracı.

[![Durum: Geliştirme Aşamasında](https://img.shields.io/badge/Durum-Geliştirme%20Aşamasında-yellow)]()
[![Lisans: MIT](https://img.shields.io/badge/Lisans-MIT-blue)]()

---

## Ne Yapar?

AiRefCheck, makale ve tezlerdeki referansları otomatik olarak kontrol eder:

- **Uydurulmuş referans tespiti:** Var olmayan makale, kitap veya yazarları belirler
- **Eksik referans tespiti:** Metinde atıf yapılıp kaynakçaya konulmayan kaynakları bulur
- **Fazla referans tespiti:** Kaynakçada olup metinde hiç atıf yapılmayan kaynakları tespit eder
- **Detay doğrulama:** Yıl, yazar, başlık, dergi, DOI gibi bilgilerin doğruluğunu kontrol eder
- **Atıf stili analizi:** Kullanılan atıf stilini tespit eder ve format hatalarını raporlar

## Nasıl Çalışır?

```
Doküman Yükle → Referansları Çıkar → Her Birini Doğrula → Sonuçları Sun
     │                  │                    │                 │
  PDF/DOCX/       NLP ile ayrıştırma   10+ akademik       Detaylı
  LaTeX/BibTeX    15+ atıf stili       veritabanına        dashboard
                  tanıma               karşı sorgulama     ve rapor
```

## Desteklenen Atıf Stilleri

| Stil | Alan | V1 |
|------|------|----|
| APA 7th / 6th | Sosyal Bilimler | ✅ |
| MLA 9th / 8th | Beşeri Bilimler | ✅ |
| Chicago 17th | Tarih, Sanat | ✅ |
| IEEE | Mühendislik | ✅ |
| Vancouver (ICMJE) | Tıp | ✅ |
| Harvard | İşletme, Ekonomi | ✅ |
| Turabian 9th | Öğrenci çalışmaları | ✅ |
| AMA 11th | Tıp | ✅ |
| ACS 3rd | Kimya | ✅ |
| CSE | Biyoloji | ✅ |
| ASA 7th | Sosyoloji | ✅ |
| APSA 7th | Siyaset Bilimi | ✅ |
| + Türk Akademik Normları | Türkiye | ✅ |
| + 15+ ek stil | Çeşitli | V1.5+ |

## Doğrulama Kaynakları

| Kaynak | Kapsam |
|--------|--------|
| CrossRef | 150M+ DOI metadata |
| Semantic Scholar | 200M+ akademik çalışma |
| OpenAlex | 250M+ çalışma |
| DOI Resolver | DOI doğrulama |
| Google Scholar | Geniş akademik web |
| Dergipark | Türkçe hakemli dergiler |
| TR Dizin | Türkçe akademik indeks |
| YÖK Tez | Türk tez veritabanı |
| PubMed | Biyomedikal |
| arXiv | Fizik, Matematik, CS |

## Teknoloji Stack

| Katman | Teknoloji |
|--------|-----------|
| Frontend | Next.js 14, TypeScript, shadcn/ui, Tailwind CSS |
| Backend API | Node.js, Fastify, TypeScript |
| NLP/ML | Python, FastAPI, spaCy, PyMuPDF |
| Veritabanı | PostgreSQL 16, Redis 7 |
| Job Queue | BullMQ |
| Gerçek zamanlı | Socket.io |
| ORM | Prisma |
| Containerization | Docker, Docker Compose |
| CI/CD | GitHub Actions |

## Proje Yapısı

```
AiRefCheck/
├── apps/
│   ├── web/                # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/        # App Router sayfaları
│   │   │   ├── components/ # UI bileşenleri
│   │   │   ├── hooks/      # Custom hooks
│   │   │   ├── stores/     # Zustand stores
│   │   │   └── lib/        # Utility fonksiyonlar
│   │   └── package.json
│   ├── api/                # Fastify backend
│   │   ├── src/
│   │   │   ├── modules/    # İş modülleri
│   │   │   ├── routes/     # API route'ları
│   │   │   ├── services/   # İş mantığı
│   │   │   ├── workers/    # BullMQ worker'ları
│   │   │   └── integrations/ # Dış API client'ları
│   │   └── package.json
│   └── nlp/                # Python NLP servisi
│       ├── app/
│       │   ├── api/        # FastAPI endpoints
│       │   ├── parsers/    # Referans ayrıştırıcılar
│       │   ├── detectors/  # Stil ve fabrikasyon tespiti
│       │   ├── nlp/        # NLP modelleri
│       │   └── utils/      # Yardımcı fonksiyonlar
│       └── pyproject.toml
├── packages/
│   └── shared/             # Paylaşılan tipler ve sabitler
├── prisma/
│   └── schema.prisma       # Veritabanı şeması
├── docker/
│   ├── Dockerfile.api
│   ├── Dockerfile.web
│   ├── Dockerfile.nlp
│   └── docker-compose.yml
├── docs/                   # Proje dokümantasyonu
├── CLAUDE.md
└── README.md
```

## Hızlı Başlangıç

### Gereksinimler
- Node.js 20+
- Python 3.11+
- PostgreSQL 16
- Redis 7
- Docker & Docker Compose (opsiyonel)

### Kurulum

```bash
# Repoyu klonla
git clone https://github.com/volkan/airefcheck.git
cd airefcheck

# Environment değişkenlerini ayarla
cp .env.example .env
# .env dosyasını düzenle

# Bağımlılıkları yükle
pnpm install
cd apps/nlp && poetry install && cd ../..

# Veritabanını hazırla
npx prisma migrate dev
npx prisma db seed

# Geliştirme sunucularını başlat
pnpm dev
```

### Docker ile

```bash
docker compose up -d
```

## Dokümantasyon

| Doküman | Açıklama |
|---------|----------|
| [Vizyon & Misyon](docs/VISION.md) | Proje vizyonu, misyonu, hedef kitle |
| [Ürün Gereksinimleri (PRD)](docs/PRD.md) | Fonksiyonel ve fonksiyonel olmayan gereksinimler |
| [Sistem Mimarisi](docs/ARCHITECTURE.md) | Katmanlı mimari, veri akışı, C4 model |
| [Teknoloji Stack](docs/TECH_STACK.md) | Teknoloji kararları ve gerekçeleri |
| [Atıf Stilleri](docs/CITATION_STYLES.md) | Desteklenen stiller ve ayrıştırma stratejisi |
| [Veritabanı Şeması](docs/DATABASE_SCHEMA.md) | Prisma schema, indeks stratejisi |

## Katkıda Bulunma

Katkılar memnuniyetle karşılanır! Lütfen bir PR açmadan önce:

1. Repoyu fork'layın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'feat: add amazing feature'`)
4. Branch'inize push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

## Lisans

MIT License - detaylar için [LICENSE](LICENSE) dosyasına bakınız.

## İletişim

Proje Sahibi: [@volkan](https://github.com/volkan)

---

*AiRefCheck - Akademik bütünlüğü korumak için geliştirilmiştir.*
