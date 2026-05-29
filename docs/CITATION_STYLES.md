# AiRefCheck - Desteklenen Atıf Stilleri ve Ayrıştırma Stratejisi

**Versiyon:** 1.0
**Tarih:** Mayıs 2026

---

## 1. Genel Bakış

AiRefCheck, akademik yayıncılıkta kullanılan tüm major atıf stillerini desteklemeyi hedefler. Her atıf stili için:

1. **Tanıma (Detection):** Kaynakçadaki atıf stilini otomatik tespit etme
2. **Ayrıştırma (Parsing):** Her referansı yapısal bileşenlerine ayırma
3. **Doğrulama (Validation):** Formatın stile uygunluğunu kontrol etme
4. **Metin İçi Atıf Eşleştirme:** In-text citation formatını tespit etme

---

## 2. Desteklenen Atıf Stilleri

### 2.1 V1.0'da Desteklenecek Stiller (Must Have)

| # | Stil | Kısa Ad | Alan | In-Text Format | Kaynakça Formatı |
|---|------|---------|------|----------------|-----------------|
| 1 | APA 7th Edition | `apa7` | Sosyal Bilimler, Eğitim, Psikoloji | (Yazar, Yıl) | Yazar, A. A. (Yıl). Başlık. Dergi, Cilt(Sayı), Sayfa. |
| 2 | APA 6th Edition | `apa6` | Sosyal Bilimler (eski) | (Yazar, Yıl) | Yazar, A. A. (Yıl). Başlık. Dergi, Cilt(Sayı), Sayfa. doi:xx |
| 3 | MLA 9th Edition | `mla9` | Beşeri Bilimler, Edebiyat | (Yazar Sayfa) | Yazar. "Başlık." Dergi, vol. Cilt, no. Sayı, Yıl, pp. Sayfa. |
| 4 | MLA 8th Edition | `mla8` | Beşeri Bilimler (eski) | (Yazar Sayfa) | Yazar. "Başlık." Dergi, vol. Cilt, no. Sayı, Yıl, pp. Sayfa. |
| 5 | Chicago 17th (Notes-Bib) | `chicago-nb` | Tarih, Sanat | Üst not [1] | Yazar Adı Soyadı, *Başlık* (Yer: Yayınevi, Yıl), Sayfa. |
| 6 | Chicago 17th (Author-Date) | `chicago-ad` | Sosyal Bilimler | (Yazar Yıl) | Yazar, Yıl. *Başlık*. Yer: Yayınevi. |
| 7 | IEEE | `ieee` | Mühendislik, Bilgisayar | [1] | [1] A. Yazar, "Başlık," *Dergi*, vol. Cilt, no. Sayı, pp. Sayfa, Yıl. |
| 8 | Vancouver (ICMJE) | `vancouver` | Tıp, Sağlık Bilimleri | (1) veya üst simge ¹ | 1. Yazar AA. Başlık. Dergi. Yıl;Cilt(Sayı):Sayfa. |
| 9 | Harvard | `harvard` | İşletme, Ekonomi | (Yazar, Yıl) | Yazar, A.A. (Yıl) 'Başlık', *Dergi*, Cilt(Sayı), pp. Sayfa. |
| 10 | Turabian 9th | `turabian9` | Öğrenci çalışmaları | Not [1] veya (Yazar Yıl) | Yazar, *Başlık* (Yer: Yayınevi, Yıl), Sayfa. |
| 11 | AMA 11th Edition | `ama11` | Tıp, Biyomedikal | Üst sayı ¹ | Yazar AA. Başlık. *Dergi*. Yıl;Cilt(Sayı):Sayfa. |
| 12 | ACS 3rd Edition | `acs3` | Kimya | Üst sayı ¹ | Yazar, A. A. *Dergi* **Yıl**, *Cilt*, Sayfa. |
| 13 | CSE (Council of Sci Ed) | `cse` | Biyoloji, Çevre | (1) veya (Yazar Yıl) | Yazar AA. Başlık. Dergi. Yıl;Cilt:Sayfa. |
| 14 | ASA 7th Edition | `asa7` | Sosyoloji | (Yazar Yıl) | Yazar, A. A. Yıl. "Başlık." *Dergi* Cilt(Sayı):Sayfa. |
| 15 | APSA 7th Edition | `apsa7` | Siyaset Bilimi | (Yazar Yıl) | Yazar, A. A. Yıl. "Başlık." *Dergi* Cilt(Sayı):Sayfa. |

### 2.2 V1.5'te Eklenecek Stiller (Should Have)

| # | Stil | Kısa Ad | Alan |
|---|------|---------|------|
| 16 | Bluebook (Law) | `bluebook` | Hukuk |
| 17 | OSCOLA 4th | `oscola` | Hukuk (İngiltere) |
| 18 | NLM | `nlm` | Tıp (National Library of Medicine) |
| 19 | ABNT | `abnt` | Brezilya akademik normu |
| 20 | Oxford | `oxford` | Beşeri Bilimler (İngiltere) |
| 21 | MHRA 3rd | `mhra` | Beşeri Bilimler (İngiltere) |
| 22 | RSC | `rsc` | Kimya (Royal Society of Chemistry) |
| 23 | AIP | `aip` | Fizik |
| 24 | AGPS | `agps` | Avustralya hükümet yayıncılık |
| 25 | Cambridge | `cambridge` | Cambridge University Press |

### 2.3 V2.0'da Eklenecek Stiller (Could Have)

| # | Stil | Kısa Ad | Alan |
|---|------|---------|------|
| 26 | Nature | `nature` | Doğa Bilimleri |
| 27 | Science | `science` | Genel Bilim |
| 28 | Cell | `cell` | Biyoloji |
| 29 | Lancet | `lancet` | Tıp |
| 30 | PLOS | `plos` | Açık erişim bilim |

### 2.4 Türk Akademik Atıf Normları

Türkiye'deki üniversiteler genellikle APA veya IEEE tabanlı kendi stillerini kullanır. Bunlar V1.0'da desteklenecektir:

| Üniversite/Kurum | Baz Stili | Farklar |
|------------------|-----------|---------|
| Ankara Üniversitesi | APA tabanlı | Türkçe isim formatı, çeviri eser formatı |
| İstanbul Üniversitesi | APA tabanlı | Küçük farklılıklar |
| Hacettepe Üniversitesi | APA 7 tabanlı | Standart APA'ya yakın |
| ODTÜ (METU) | APA 7 | İngilizce/Türkçe ayrımı |
| Boğaziçi Üniversitesi | APA 7 / MLA | Bölüme göre değişir |
| YÖK Tez Yazım Kılavuzu | APA benzeri | Özel tez formatı |
| Dergipark | Çoklu stil | APA, Vancouver, Harvard |
| TÜBİTAK | Vancouver benzeri | Fen bilimleri |

---

## 3. Atıf Stili Tanıma Stratejisi

### 3.1 Tanıma Yaklaşımı: Hibrit (Kural + ML)

```
Kaynakça Metni
    │
    ├── 1. Regex Pattern Matching (Hızlı)
    │   └── Her stil için önceden tanımlanmış pattern'ler
    │       └── En çok eşleşen stil = Aday stil
    │
    ├── 2. Yapısal İpuçları (Orta)
    │   ├── Parantez kullanımı: () vs [] vs üst sayı
    │   ├── Yıl konumu: başta vs ortada vs sonda
    │   ├── Başlık formatı: "tırnak" vs *italik* vs düz
    │   ├── Yazar formatı: Soyadı, A. A. vs A. A. Soyadı vs Soyadı AA
    │   └── Cilt/sayı formatı: vol. X, no. Y vs X(Y) vs ;X(Y):
    │
    └── 3. ML Sınıflandırıcı (V2)
        └── BERT-based stil sınıflandırıcı (eğitilmiş model)
            └── Her referans için stil olasılığı
                └── Çoğunluk oyu = Stild
```

### 3.2 Karar Algoritması

```python
def detect_citation_style(references: list[str]) -> CitationStyleMatch:
    scores = {}

    # Adım 1: Her stil için regex pattern eşleşme sayısı
    for style in SUPPORTED_STYLES:
        pattern = STYLE_PATTERNS[style]
        matches = sum(1 for ref in references if pattern.match(ref))
        scores[style] = matches / len(references)

    # Adım 2: En yüksek skorlu stilleri al
    top_styles = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:3]

    # Adım 3: Yapısal ipuçları ile ağırlaştır
    for style, score in top_styles:
        structural_bonus = calculate_structural_signals(references, style)
        scores[style] += structural_bonus * 0.3

    # Adım 4: Final karar
    best_style = max(scores, key=scores.get)
    confidence = scores[best_style]

    # Adım 5: Karma stil tespiti
    if confidence < 0.6:
        return CitationStyleMatch(
            style="mixed",
            confidence=confidence,
            detected_styles=top_styles,
            warning="Kaynakça birden fazla stil içeriyor olabilir"
        )

    return CitationStyleMatch(
        style=best_style,
        confidence=confidence
    )
```

---

## 4. Her Atıf Stili İçin Ayrıştırma Stratejisi

### 4.1 APA 7 Örneği

**Girdi:**
```
Smith, J. A., & Johnson, B. C. (2023). Artificial intelligence in education: 
A systematic review. Journal of Educational Technology, 15(3), 234-256. 
https://doi.org/10.1234/jet.2023.015
```

**Ayrıştırma Regex:**
```regex
^(?<authors>.+?)\s*\((?<year>\d{4})\)\.\s*(?<title>[^.]+)\.\s*
(?<journal>[^,]+),\s*(?<volume>\d+)(\((?<issue>\d+)\))?,\s*
(?<pages>\d+(-\d+)?)\.\s*(https?:\/\/doi\.org\/(?<doi>[^\s]+))?$
```

**Çıktı:**
```json
{
  "authors": [
    {"lastName": "Smith", "firstName": "J. A."},
    {"lastName": "Johnson", "firstName": "B. C."}
  ],
  "year": 2023,
  "title": "Artificial intelligence in education: A systematic review",
  "journal": "Journal of Educational Technology",
  "volume": "15",
  "issue": "3",
  "pages": "234-256",
  "doi": "10.1234/jet.2023.015",
  "type": "journal_article"
}
```

### 4.2 IEEE Örneği

**Girdi:**
```
[1] J. A. Smith and B. C. Johnson, "Artificial intelligence in education: 
A systematic review," Journal of Educational Technology, vol. 15, no. 3, 
pp. 234-256, 2023.
```

**Ayrıştırma Regex:**
```regex
^\[(?<num>\d+)\]\s*(?<authors>.+?),\s*"(?<title>[^"]+),"?\s*
(?<journal>[^,]+),\s*vol\.\s*(?<volume>\d+),\s*no\.\s*(?<issue>\d+),\s*
pp\.\s*(?<pages>\d+(-\d+)?),\s*(?<year>\d{4})\.$
```

### 4.3 Vancouver Örneği

**Girdi:**
```
1. Smith JA, Johnson BC. Artificial intelligence in education: a systematic 
review. Journal of Educational Technology. 2023;15(3):234-256.
```

**Ayrıştırma Regex:**
```regex
^(?<num>\d+)\.\s*(?<authors>.+?)\.\s*(?<title>[^.]+)\.\s*
(?<journal>[^.]+)\.\s*(?<year>\d{4});(?<volume>\d+)\((?<issue>\d+)\):(?<pages>\d+(-\d+)?)\.$
```

### 4.4 Harvard Örneği

**Girdi:**
```
Smith, J.A. and Johnson, B.C. (2023) 'Artificial intelligence in education: 
a systematic review', Journal of Educational Technology, 15(3), pp. 234-256.
```

**Ayrıştırma Regex:**
```regex
^(?<authors>.+?)\s*\((?<year>\d{4})\)\s*'(?<title>[^']+)'\s*,\s*
(?<journal>[^,]+),\s*(?<volume>\d+)\((?<issue>\d+)\),\s*pp\.\s*(?<pages>\d+(-\d+)?)\.$
```

---

## 5. Metin İçi Atıf Formatları

### 5.1 Desteklenen In-Text Formatlar

| Format | Örnek | Kullanılan Stiller |
|--------|-------|-------------------|
| Author-Year (Parantez) | (Smith, 2023) | APA, Harvard, Chicago AD, ASA |
| Author-Year (Anlatı) | Smith (2023) | APA, Harvard |
| Sayısal [Köşeli] | [1] | IEEE, Vancouver (bazı), ACS |
| Sayısal (Yuvarlak) | (1) | Vancouver, CSE |
| Üst Sayı | ¹ | AMA, ACS, Nature, Science |
| Yazar-Sayfa | (Smith 234) | MLA |
| Yazar-Year-Sayfa | (Smith 2023: 234) | Bazı varyantlar |
| Footnote | ¹ bkz. dipnot | Chicago NB, Turabian, MHRA |
| Doi/URL bazlı | (doi:10.1234/...) | Nadir |

### 5.2 In-Text Citation Regex

```regex
# APA Author-Year
\(([A-Z][a-z]+(?:\s(?:et\s+al\.|&\s+[A-Z][a-z]+))?),\s*(\d{4})(?:,\s*(?:p{1,2}\.\s*\d+))?\)

# IEEE [Number]
\[(\d+)\]

# Vancouver Superscript Number
[\u2070-\u2099]+  # Unicode superscript

# Vancouver (Number)
\((\d+)\)

# MLA Author-Page
\(([A-Z][a-z]+)\s+(\d+(?:-\d+)?)\)
```

---

## 6. Özel Durumlar ve Zorluklar

### 6.1 Türkçe İsim Formatları

```
# Türkçe isim örnekleri ve ayrıştırma

# Tam isim formatı
"Yılmaz, Mehmet" → lastName: "Yılmaz", firstName: "Mehmet"
"Öztürk, Ayşe Fatma" → lastName: "Öztürk", firstName: "Ayşe Fatma"

# Baş harf formatı
"Yılmaz, M." → lastName: "Yılmaz", firstName: "M."
"Öztürk, A. F." → lastName: "Öztürk", firstName: "A. F."

# Çoklu yazar (&)
"Yılmaz, M., & Öztürk, A. F." → [Yılmaz M., Öztürk A. F.]

# Çoklu yazar (ve)
"Yılmaz, M. ve Öztürk, A. F." → [Yılmaz M., Öztürk A. F.]

# "et al." / "vd."
"Yılmaz, M., vd." → [Yılmaz M., ...]
```

### 6.2 Çeviri Eserler

```
# APA formatında çeviri eser
Freud, S. (2023). Rüyaların yorumu (A. Yılmaz, Çev.). Orijinal eser 1900'de 
yayınlanmıştır. Yayınevi.

# Ayrıştırma stratejisi
- "Çev." veya "Trans." → çevirmen tespiti
- Orijinal yıl → ek metadata
```

### 6.3 Tez Referansları

```
# APA tez referansı
Yılmaz, M. (2023). Yapay zekâ destekli eğitim sistemleri 
[Doktora tezi, Ankara Üniversitesi].

# IEEE tez referansı
[1] M. Yılmaz, "Yapay zekâ destekli eğitim sistemleri," 
Ph.D. dissertation, Ankara Univ., Ankara, Turkey, 2023.
```

### 6.4 Editörlü Kitap Bölümleri

```
# APA kitap bölümü
Smith, J. (2023). AI in education. In A. Brown & B. Davis (Eds.), 
Handbook of educational technology (pp. 234-256). Publisher. 
https://doi.org/10.1234/handbook

# Ayrıştırma stratejisi
- "In" kelimesi → kitap bölümü tespiti
- "(Eds.)" veya "(Ed.)" → editör tespiti
- "pp." → sayfa aralığı
```

### 6.5 Online Kaynaklar

```
# APA online kaynak
World Health Organization. (2023, March 15). Global health report. 
https://www.who.int/report-2023

# Ayrıştırma stratejisi
- Tarih formatı: (Yıl, Ay Gün) → tam tarih
- URL son paragraf → erişim tarihi olabilir
```

---

## 7. Referans Tipi Sınıflandırması

```typescript
type ReferenceType =
  | 'journal_article'       // Dergi makalesi
  | 'book'                  // Kitap
  | 'book_chapter'          // Kitap bölümü
  | 'conference_paper'      // Konferans bildirisi
  | 'thesis'                // Tez (doktora/yüksek lisans)
  | 'dissertation'          // Doktora tezi (IEEE)
  | 'technical_report'      // Teknik rapor
  | 'web_page'              // Web sayfası
  | 'online_resource'       // Çevrimiçi kaynak
  | 'newspaper_article'     // Gazete makalesi
  | 'magazine_article'      // Dergi makalesi (popüler)
  | 'film'                  // Film
  | 'interview'             // Mülakat
  | 'legal_document'        // Hukuki belge
  | 'patent'                // Patent
  | 'preprint'              // Ön baskı (arXiv vb.)
  | 'dataset'               // Veri seti
  | 'software'              // Yazılım
  | 'other';                // Diğer
```

---

## 8. Test Stratejisi

### 8.1 Her Atıf Stili İçin Test Vakaları

Her desteklenen stil için aşağıdaki test verileri hazırlanmalıdır:

1. **Basit dergi makalesi** (1-2 yazar)
2. **Çok yazarlı makale** (3+ yazarlar)
3. **Kitap referansı**
4. **Kitap bölümü**
5. **Tez referansı**
6. **Online kaynak**
7. **DOI'li referans**
8. **URL'li referans**
9. **Türkçe yazar isimleri**
10. **Kurumsal yazar**
11. **Editörlü eser**
12. **Çeviri eser**
13. **Retracted makale**

### 8.2 Test Veri Seti Büyüklüğü

| Stil | V1 Test Vakası | V2 Test Vakası |
|------|---------------|---------------|
| APA 7 | 50+ | 200+ |
| APA 6 | 30+ | 100+ |
| MLA 9 | 30+ | 100+ |
| Chicago | 30+ | 100+ |
| IEEE | 30+ | 100+ |
| Vancouver | 30+ | 100+ |
| Harvard | 30+ | 100+ |
| Diğer stiller | 15+ | 50+ |

---

*Bu doküman AiRefCheck projesinin desteklediği atıf stillerini ve ayrıştırma stratejisini tanımlar.*

*Son güncelleme: Mayıs 2026*
