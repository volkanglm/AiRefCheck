# GÖREV: MiniMax - Test Suite + Seed Data + Kalite Güvence
**Atanan Model:** MiniMax
**Öncelik:** 🟡 ORTA (Faz 1 - Diğer görevlerle paralel)
**Tahmini Süre:** ~1.5 saat
**Bağımlılıklar:** Proje iskeleti hazır, Prisma schema hazır, shared types hazır

---

## Senin Rolün
Sen bir Senior QA Engineer olarak AiRefCheck projesinin **test altyapısını, seed verilerini ve kalite güvence araçlarını** geliştireceksin. Bu, tüm geliştiricilerin (AI modeller dahil) ürettikleri kodun doğruluğunu garanti altına alacak.

## Önce Oku
1. `docs/PRD.md` — Kabul kriterleri
2. `docs/CITATION_STYLES.md` — Her atıf stili için test verisi gereksinimleri
3. `docs/DATABASE_SCHEMA.md` — Veritabanı şeması
4. `packages/shared/src/index.ts` — Tüm tip tanımları
5. `prisma/schema.prisma` — Prisma modelleri
6. `apps/api/package.json` — Test araçları (vitest)
7. `apps/web/package.json` — Test araçları (vitest, playwright)
8. `apps/nlp/pyproject.toml` — Test araçları (pytest)

## Oluşturacağın Dosyalar

### BÖLÜM A: Test Verileri ve Fixture'lar

### 1. `apps/nlp/tests/fixtures/references/`
Her atıf stili için test referans dosyaları:

```
fixtures/
├── apa7/
│   ├── journal_article.txt       # 10+ APA7 dergi makalesi
│   ├── book.txt                  # 5+ kitap referansı
│   ├── book_chapter.txt          # 5+ kitap bölümü
│   ├── thesis.txt                # 3+ tez referansı
│   ├── web_page.txt              # 3+ web referansı
│   ├── turkish_authors.txt       # 5+ Türkçe yazarlı referans
│   ├── multi_author.txt          # 5+ çok yazarlı referans
│   ├── doi_included.txt          # 5+ DOI'li referans
│   └── full_bibliography.txt     # Tam bir kaynakça (20+ referans)
├── apa6/
│   └── ... (aynı yapı)
├── ieee/
│   └── ...
├── vancouver/
│   └── ...
├── mla9/
│   └── ...
├── chicago-nb/
│   └── ...
├── chicago-ad/
│   └── ...
├── harvard/
│   └── ...
├── ama11/
│   └── ...
├── mixed/
│   └── mixed_bibliography.txt    # Karma stil kaynakça
└── documents/
    ├── sample_thesis.pdf         # Test PDF dosyası (küçük)
    ├── sample_article.docx       # Test DOCX dosyası
    ├── sample_refs.bib           # Test BibTeX dosyası
    └── sample_paper.txt          # Test düz metin
```

**ÖNEMLİ:** Her dosya GERÇEK referanslar içermeli — uydurma değil, gerçek DOI'li, aranabilir referanslar. Örnekler:

```
# apa7/journal_article.txt örnek içerik:
Smith, J. A., & Jones, B. C. (2020). Machine learning applications in healthcare. Nature Medicine, 26(8), 1221-1229. https://doi.org/10.1038/s41591-020-1040-9

Silver, D., Hubert, T., Schrittwieser, J., Antonoglou, I., Lai, M., Guez, A., Lanctot, M., Sifre, L., Kumaran, D., Graepel, T., Lillicrap, T., Simonyan, K., & Hassabis, D. (2018). A general reinforcement learning algorithm that masters chess, shogi, and Go through self-play. Science, 362(6419), 1140-1144. https://doi.org/10.1126/science.aar6404
```

### 2. `apps/nlp/tests/conftest.py`
```python
"""
Pytest fixture'ları:
- sample_references: Her stil için test referansları
- sample_documents: Test dokümanları
- spacy_nlp: Yüklenmiş spaCy modeli
- parser: ReferenceParser instance
"""
```

### BÖLÜM B: NLP Servis Testleri

### 3. `apps/nlp/tests/test_bibliography_detector.py`
```python
"""Kaynakça tespiti testleri"""
def test_detect_english_references_section():
    """'References' başlığını tespit et"""
def test_detect_turkish_kaynakca():
    """'Kaynakça' başlığını tespit et"""
def test_detect_numbered_bibliography():
    """Numaralanmış kaynakçayı tespit et"""
def test_no_bibliography():
    """Kaynakça yoksa None dönmeli"""
def test_bibliography_with_appendix():
    """Ek bölümünden önce kaynakça bitmeli"""
```

### 4. `apps/nlp/tests/test_reference_splitter.py`
```python
"""Referans bölme testleri"""
def test_split_apa_references(): ...
def test_split_ieee_numbered(): ...
def test_split_vancouver_numbered(): ...
def test_split_with_empty_lines(): ...
```

### 5. `apps/nlp/tests/test_style_detector.py`
```python
"""Atıf stili algılama testleri"""
def test_detect_apa7(): ...
def test_detect_ieee(): ...
def test_detect_vancouver(): ...
def test_detect_mla9(): ...
def test_detect_chicago(): ...
def test_detect_harvard(): ...
def test_detect_mixed_style(): ...
def test_detect_unknown(): ...
```

### 6. `apps/nlp/tests/test_parsers/`
Her stil için test dosyası:

```python
# test_parsers/test_apa_parser.py
"""APA 7 referans ayrıştırma testleri"""
def test_parse_journal_article(): ...
def test_parse_book(): ...
def test_parse_book_chapter(): ...
def test_parse_thesis(): ...
def test_parse_web_resource(): ...
def test_parse_turkish_authors(): ...
def test_parse_multiple_authors(): ...
def test_parse_doi(): ...
def test_parse_no_year(): ...
def test_confidence_score(): ...

# test_parsers/test_ieee_parser.py
# test_parsers/test_vancouver_parser.py
# test_parsers/test_mla_parser.py
# test_parsers/test_chicago_parser.py
# test_parsers/test_harvard_parser.py
```

### 7. `apps/nlp/tests/test_intext_citations.py`
```python
"""Metin içi atıf tespiti testleri"""
def test_extract_apa_author_year(): ...
def test_extract_ieee_bracket(): ...
def test_extract_vancouver_superscript(): ...
def test_extract_mla_author_page(): ...
```

### BÖLÜM C: API Testleri

### 8. `apps/api/src/__tests__/setup.ts`
```typescript
/**
 * Test setup:
 * - Fastify app oluşturma (test config)
 * - Prisma test veritabanı bağlantısı
 * - Redis mock
 * - Auth token üretme yardımcıları
 */
```

### 9. `apps/api/src/__tests__/auth.test.ts`
```typescript
/**
 * Auth route testleri
 */
describe('POST /api/v1/auth/register', () => {
  it('should register a new user', async () => { ... });
  it('should reject duplicate email', async () => { ... });
  it('should validate input', async () => { ... });
  it('should hash password', async () => { ... });
});

describe('POST /api/v1/auth/login', () => {
  it('should login with correct credentials', async () => { ... });
  it('should reject wrong password', async () => { ... });
  it('should return access and refresh tokens', async () => { ... });
});

describe('POST /api/v1/auth/refresh', () => {
  it('should refresh tokens', async () => { ... });
  it('should reject invalid refresh token', async () => { ... });
});
```

### 10. `apps/api/src/__tests__/documents.test.ts`
```typescript
/**
 * Document route testleri
 */
describe('POST /api/v1/documents', () => {
  it('should upload a PDF file', async () => { ... });
  it('should reject files > 100MB', async () => { ... });
  it('should reject unsupported formats', async () => { ... });
  it('should require authentication', async () => { ... });
});

describe('GET /api/v1/documents', () => {
  it('should list user documents', async () => { ... });
  it('should paginate results', async () => { ... });
});
```

### 11. `apps/api/src/__tests__/analyses.test.ts`
### 12. `apps/api/src/__tests__/reports.test.ts`

### BÖLÜM D: Seed Data

### 13. `prisma/seed.ts`
```typescript
/**
 * Geliştirme veritabanı için seed data.

 * Oluşturacak veriler:
 *
 * Kullanıcılar:
 * - admin@airefcheck.com / admin123 (SYSTEM_ADMIN)
 * - pro@airefcheck.com / pro123 (PRO)
 * - free@airefcheck.com / free123 (FREE)
 *
 * Kurum:
 * - Ankara Üniversitesi
 *
 * Her kullanıcı için:
 * - 2-3 doküman (farklı formatlarda)
 * - 1-2 analiz (farklı durumlarda)
 * - Her analizde 10-20 referans (mixed: verified, suspicious, not_found)
 * - Doğrulama sonuçları
 * - 1 rapor
 */
```

### BÖLÜM E: Frontend Test Utilities

### 14. `apps/web/src/__tests__/setup.ts`
```typescript
// Vitest setup
// - @testing-library/jest-dom matchers
// - MSW (Mock Service Worker) handlers
// - Test query client (TanStack Query)
```

### 15. `apps/web/src/__tests__/mocks/handlers.ts`
```typescript
/**
 * MSW request handlers
 * Mock API yanıtları:
 * - POST /api/v1/auth/login → mock token
 * - GET /api/v1/documents → mock document list
 * - GET /api/v1/analyses/:id → mock analysis
 * - GET /api/v1/analyses/:id/references → mock references
 */
```

### 16. `apps/web/src/__tests__/mocks/data.ts`
```typescript
/**
 * Mock data factory
 * Her tip için gerçekçi mock data üreticiler
 */
export const mockAnalysis: Analysis = { ... };
export const mockReferences: Reference[] = [ ... ];
export const mockUser: User = { ... };
```

## Kritik Kurallar
1. **Gerçekçi test verisi** — Uydurma referanslar değil, gerçek DOI'li referanslar
2. **Her stil için en az 5 test vakası** — basit, karmaşık, Türkçe, hatalı
3. **Edge case'leri kapsa** — boş veri, null, hatalı format, çok uzun metin
4. **Deterministik testler** — Her çalıştırmada aynı sonuç
5. **Fixture'ları paylaş** — API ve NLP testleri aynı veriyi kullanabilmeli
6. **Mock data tipleri** — @airefcheck/shared tipleriyle uyumlu

## Çıktı
Tüm dosyaları oluştur. Test verileri gerçekçi ve kapsamlı olmalı. Her test dosyasında en az 5 test fonksiyonu olmalı.
