# GÖREV: Python NLP Service - Reference Parser + Citation Style Detector
**Atanan Model:** Kimi
**Öncelik:** 🔴 YÜKSEK (Faz 1 - Temel)
**Tahmini Süre:** ~2 saat
**Bağımlılıklar:** Proje iskeleti hazır, pyproject.toml hazır

---

## Senin Rolün
Sen bir Senior Python Developer / NLP Engineer olarak AiRefCheck projesinin **Python FastAPI NLP servisini** geliştireceksin. Bu servis, referans çıkarma ve atıf stili tespitinden sorumlu — sistemin beyni.

## Önce Oku
1. `docs/CITATION_STYLES.md` — TÜM atıf stilleri, regex pattern'ler, örnekler (BUNU İYİ OKU)
2. `docs/PRD.md` — FR-201'den FR-214'e kadar referans çıkarım gereksinimleri
3. `docs/ARCHITECTURE.md` — Processing Layer, Citation Parser Engine
4. `docs/TECH_STACK.md` — Python stack
5. `apps/nlp/pyproject.toml` — Bağımlılıklar

## Mimari

```
FastAPI (apps/nlp/app/)
├── main.py                  # FastAPI app + /health endpoint
├── api/
│   ├── routes.py            # POST /api/v1/parse, /api/v1/detect-style
│   └── schemas.py           # Pydantic request/response models
├── parsers/
│   ├── bibliography_detector.py   # Kaynakça bölümü tespiti
│   ├── reference_splitter.py      # Kaynakçayı bireysel referanslara bölme
│   ├── reference_parser.py        # Her referansı yapısal bileşenlerine ayırma
│   ├── turkish_name_handler.py    # Türkçe isim ayrıştırma
│   └── patterns/
│       ├── apa.py                  # APA 6/7 regex patterns + parser
│       ├── mla.py                  # MLA 8/9 regex patterns + parser
│       ├── chicago.py              # Chicago NB/AD regex patterns + parser
│       ├── ieee.py                 # IEEE regex patterns + parser
│       ├── vancouver.py            # Vancouver regex patterns + parser
│       ├── harvard.py              # Harvard regex patterns + parser
│       ├── ama.py                  # AMA 11th regex patterns + parser
│       ├── acs.py                  # ACS regex patterns + parser
│       ├── cse.py                  # CSE regex patterns + parser
│       ├── asa.py                  # ASA regex patterns + parser
│       └── apsa.py                 # APSA regex patterns + parser
├── detectors/
│   ├── style_detector.py           # Atıf stili otomatik algılama
│   ├── fabrication_detector.py     # Fabrikasyon şüphe analizi
│   └── intext_citation_extractor.py # Metin içi atıf tespiti
├── nlp/
│   ├── ner_handler.py              # Named Entity Recognition (spaCy)
│   └── text_processor.py           # Metin ön işleme
├── models/
│   └── types.py                    # Pydantic modeller (Reference, Author, vb.)
└── utils/
    ├── fuzzy_matcher.py            # Fuzzy string matching (rapidfuzz)
    └── text_cleaner.py             # Metin temizleme yardımcıları
```

## Oluşturacağın Dosyalar

### 1. `apps/nlp/app/main.py`
```python
# FastAPI uygulaması
# CORS middleware
# /health endpoint
# Router includes
# Lifespan: spaCy model yükleme
```

### 2. `apps/nlp/app/models/types.py`
```python
from pydantic import BaseModel
from typing import Optional
from enum import Enum

class Author(BaseModel):
    last_name: str
    first_name: str
    orcid: Optional[str] = None
    is_corporate: bool = False

class CitationStyle(str, Enum):
    APA7 = "apa7"
    APA6 = "apa6"
    MLA9 = "mla9"
    MLA8 = "mla8"
    CHICAGO_NB = "chicago-nb"
    CHICAGO_AD = "chicago-ad"
    IEEE = "ieee"
    VANCOUVER = "vancouver"
    HARVARD = "harvard"
    TURABIAN9 = "turabian9"
    AMA11 = "ama11"
    ACS3 = "acs3"
    CSE = "cse"
    ASA7 = "asa7"
    APSA7 = "apsa7"
    MIXED = "mixed"
    UNKNOWN = "unknown"

class ReferenceType(str, Enum):
    JOURNAL_ARTICLE = "journal_article"
    BOOK = "book"
    BOOK_CHAPTER = "book_chapter"
    CONFERENCE_PAPER = "conference_paper"
    THESIS = "thesis"
    DISSERTATION = "dissertation"
    TECHNICAL_REPORT = "technical_report"
    WEB_PAGE = "web_page"
    ONLINE_RESOURCE = "online_resource"
    NEWSPAPER_ARTICLE = "newspaper_article"
    PREPRINT = "preprint"
    DATASET = "dataset"
    SOFTWARE = "software"
    LEGAL_DOCUMENT = "legal_document"
    OTHER = "other"

class ParsedReference(BaseModel):
    id: str
    raw_text: str
    authors: list[Author]
    year: Optional[int] = None
    title: Optional[str] = None
    journal: Optional[str] = None
    book_title: Optional[str] = None
    publisher: Optional[str] = None
    publisher_city: Optional[str] = None
    volume: Optional[str] = None
    issue: Optional[str] = None
    pages: Optional[str] = None
    doi: Optional[str] = None
    url: Optional[str] = None
    isbn: Optional[str] = None
    edition: Optional[str] = None
    editors: Optional[list[Author]] = None
    translators: Optional[list[Author]] = None
    ref_type: ReferenceType = ReferenceType.JOURNAL_ARTICLE
    language: Optional[str] = None
    parse_confidence: float = 0.0

class StyleMatchResult(BaseModel):
    style: CitationStyle
    confidence: float
    detected_styles: Optional[list[dict]] = None
    warning: Optional[str] = None

class InTextCitation(BaseModel):
    raw_text: str
    citation_format: str  # author_year, numeric_bracket, numeric_paren, superscript
    page_number: Optional[int] = None
    context: Optional[str] = None

class ParseRequest(BaseModel):
    text: str
    bibliography_hint: Optional[str] = None  # Opsiyonel kaynakça bölümü

class ParseResponse(BaseModel):
    detected_style: StyleMatchResult
    references: list[ParsedReference]
    in_text_citations: list[InTextCitation]
    bibliography_start: int
    bibliography_end: int

class StyleDetectRequest(BaseModel):
    references: list[str]

class StyleDetectResponse(BaseModel):
    result: StyleMatchResult
```

### 3. `apps/nlp/app/api/routes.py`
```python
# POST /api/v1/parse
#   - Body: ParseRequest (ham metin)
#   - Response: ParseResponse (ayrıştırılmış referanslar)
#
# POST /api/v1/detect-style
#   - Body: StyleDetectRequest (referans listesi)
#   - Response: StyleDetectResponse (algılanan stil)
#
# GET /health
#   - Response: {"status": "healthy", "spacy_loaded": true}
```

### 4. `apps/nlp/app/api/schemas.py`
Pydantic modeller zaten types.py'de, burada ek request/response varsa.

### 5. `apps/nlp/app/parsers/bibliography_detector.py`
```python
def detect_bibliography(text: str) -> tuple[int, int]:
    """
    Ham metinden kaynakça bölümünün başlangıç ve bitiş indeksini tespit et.

    İpuçları:
    - "Kaynakça", "References", "Bibliography", "Literature Cited" başlıkları
    - "Works Cited", "KAYNAKÇA", "KAYNAKLAR"
    - Numaralanmış liste başlangıcı
    - Yazar adı pattern'i ile başlayan satırların yoğunlaştığı bölge
    - Tez yapısı: Son bölümden sonra, eklerden önce

    Return: (start_index, end_index)
    """
```

### 6. `apps/nlp/app/parsers/reference_splitter.py`
```python
def split_references(bibliography_text: str, style: CitationStyle) -> list[str]:
    """
    Kaynakça metnini bireysel referanslara böl.

    Strateji:
    - IEEE/Vancouver: [1] veya 1. ile başlayan satırlar
    - APA/MLA/Harvard: Yazar adı ile başlayan satırlar
    - Satır sonları + yeni referans başlangıç pattern'i
    - Boş satır ile ayrılmış referanslar
    """
```

### 7. `apps/nlp/app/parsers/reference_parser.py`
```python
class ReferenceParser:
    """
    Ana referans ayrıştırıcı. Stil algılandıktan sonra
    ilgili pattern modülünü kullanarak her referansı ayrıştırır.
    """
    def __init__(self):
        self.parsers = {
            CitationStyle.APA7: apa.APA7Parser(),
            CitationStyle.APA6: apa.APA6Parser(),
            # ... her stil için
        }

    def parse(self, reference_text: str, style: CitationStyle) -> ParsedReference:
        ...

    def parse_batch(self, references: list[str], style: CitationStyle) -> list[ParsedReference]:
        ...
```

### 8. HER ATIF STİLİ İÇİN PARSER (`apps/nlp/app/parsers/patterns/*.py`)

Her stil dosyası için yapı:
```python
# Örnek: apps/nlp/app/parsers/patterns/apa.py

import re
from ...models.types import ParsedReference, Author, ReferenceType

class APA7Parser:
    """
    APA 7th Edition referans ayrıştırıcı.

    Örnek girdi:
    Smith, J. A., & Johnson, B. C. (2023). Artificial intelligence in education:
    A systematic review. Journal of Educational Technology, 15(3), 234-256.
    https://doi.org/10.1234/jet.2023.015
    """

    # Regex pattern'ler (docs/CITATION_STYLES.md'den al)
    JOURNAL_PATTERN = re.compile(
        r'^(?P<authors>.+?)\s*\((?P<year>\d{4})\)\.\s*'
        r'(?P<title>[^.]+)\.\s*'
        r'(?P<journal>[^,]+),\s*'
        r'(?P<volume>\d+)(\((?P<issue>\d+)\))?,\s*'
        r'(?P<pages>\d+(?:-\d+)?)\.\s*'
        r'(?:https?://doi\.org/(?P<doi>[^\s]+))?$',
        re.MULTILINE | re.DOTALL
    )

    BOOK_PATTERN = re.compile(...)
    CHAPTER_PATTERN = re.compile(...)
    THESIS_PATTERN = re.compile(...)
    WEB_PATTERN = re.compile(...)

    def parse(self, text: str) -> ParsedReference:
        """Tek referans metnini parse et."""
        # Her pattern'i dene, en iyi eşleşmeyi bul
        ...

    def _parse_authors(self, author_str: str) -> list[Author]:
        """Yazar string'ini Author listesine dönüştür."""
        # "Smith, J. A., & Johnson, B. C." → [{lastName: Smith, firstName: J.A.}, ...]
        ...

class APA6Parser(APA7Parser):
    """APA 6th — küçük farklar"""
    ...
```

**HER STİL İÇİN BU YAPARI OLUŞTUR:**
- `apa.py` — APA 7 + APA 6
- `mla.py` — MLA 9 + MLA 8
- `chicago.py` — Chicago Notes-Bib + Author-Date
- `ieee.py` — IEEE
- `vancouver.py` — Vancouver/ICMJE
- `harvard.py` — Harvard
- `ama.py` — AMA 11th
- `acs.py` — ACS 3rd
- `cse.py` — CSE
- `asa.py` — ASA 7th
- `apsa.py` — APSA 7th

### 9. `apps/nlp/app/parsers/turkish_name_handler.py`
```python
class TurkishNameHandler:
    """
    Türkçe isimleri doğru ayrıştırma.

    "Yılmaz, Mehmet" → lastName: Yılmaz, firstName: Mehmet
    "Öztürk, A. F." → lastName: Öztürk, firstName: A. F.
    "Kaya, M., ve Demir, A." → [Kaya M., Demir A.]
    "Aydın et al." → [Aydın ...]

    Özel durumlar:
    - İki kelime soyadı (Özdemir Yılmaz, M.)
    - Türkçe karakterler (ç, ğ, ı, ö, ş, ü, İ, Ç, Ğ, Ö, Ş, Ü)
    - "ve" bağlacı (& yerine)
    - "vd." kısaltması (et al. yerine)
    """
```

### 10. `apps/nlp/app/detectors/style_detector.py`
```python
class StyleDetector:
    """
    Kaynakçadaki atıf stilini otomatik algılama.

    Strateji (docs/CITATION_STYLES.md Bölüm 3):
    1. Her stil için regex pattern eşleşme sayısı
    2. Yapısal ipuçları (parantez tipi, yıl konumu, başlık formatı)
    3. Ağırlıklı skorlama
    4. Karma stil tespiti (%60 altında güven skoru)
    """
    def detect(self, references: list[str]) -> StyleMatchResult:
        ...
```

### 11. `apps/nlp/app/detectors/intext_citation_extractor.py`
```python
class InTextCitationExtractor:
    """
    Metin içi atıfları tespit etme.

    Formatlar (docs/CITATION_STYLES.md Bölüm 5):
    - (Smith, 2023) → APA, Harvard
    - Smith (2023) → APA anlatı
    - [1] → IEEE
    - (1) → Vancouver
    - ¹ (superscript) → AMA, ACS
    - (Smith 234) → MLA
    """
    def extract(self, body_text: str, style: CitationStyle) -> list[InTextCitation]:
        ...
```

### 12. `apps/nlp/app/detectors/fabrication_detector.py`
```python
class FabricationDetector:
    """
    Uydurulmuş referans şüphe analizi.

    Kontroller:
    - Yıl mantıksallığı (gelecek, çok eski)
    - DOI format doğruluğu
    - URL format doğruluğu
    - Dergi adı geçerlilik pattern'leri
    - Yazar adı tutarlılığı
    - Basit heuristik skorlama
    """
    def analyze(self, reference: ParsedReference) -> FabricationResult:
        ...
```

### 13. `apps/nlp/app/utils/fuzzy_matcher.py`
```python
# rapidfuzz ile fuzzy string matching
# title_similarity(title1, title2) → float 0-100
# author_similarity(authors1, authors2) → float 0-100
```

### 14. `apps/nlp/app/utils/text_cleaner.py`
```python
# Metin temizleme fonksiyonları
# normalize_whitespace(text) → str
# remove_line_numbers(text) → str
# clean_doi(doi) → str
# extract_doi_from_url(url) → str
```

## TEST GEREKSİNİMLERİ
Her parser için en az 10 test vakası:

```python
# apps/nlp/tests/test_apa_parser.py
def test_apa7_journal_article():
    """Basit dergi makalesi"""
    ...

def test_apa7_multiple_authors():
    """Çok yazarlı makale"""
    ...

def test_apa7_book():
    """Kitap referansı"""
    ...

def test_apa7_turkish_authors():
    """Türkçe yazar isimleri"""
    ...

# Her stil için benzer test dosyaları:
# test_mla_parser.py
# test_ieee_parser.py
# test_vancouver_parser.py
# test_chicago_parser.py
# test_style_detector.py
# test_bibliography_detector.py
```

## Kritik Kurallar
1. **Type hints zorunlu** — Pydantic modeller kullan
2. **Her parser kendi dosyasında** — patterns/ altında
3. **Türkçe isim desteği** — turkish_name_handler.py kullan
4. **Regex pattern'leri özenli** — docs/CITATION_STYLES.md'den al
5. **Error handling** — Parse edilemeyen referans için graceful fallback
6. **Confidence score** — Her parse için güven skoru hesapla
7. **FastAPI async** — Endpoint'ler async def

## Çıktı
Tüm dosyaları oluştur. Her dosya tam, çalıştırılabilir olmalı. Her parser için en az 5 test vakası yaz.
