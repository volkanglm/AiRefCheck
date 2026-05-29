# AiRefCheck - Dış API Anahtarları ve Erişim Rehberi

**Tarih:** Mayıs 2026
**Kimin için:** Proje sahibi (toplanacak)
**Aciliyet:** 🔴 YÜKSEK — Uygulama çalışamaz bunlar olmadan

---

## Hızlı Özet Tablosu

| # | API | Ücretsiz mi? | Kayıt Gerekli mi? | Anahtar Alınacak URL | .env Değişkeni | Öncelik |
|---|-----|-------------|-------------------|---------------------|----------------|---------|
| 1 | CrossRef | ✅ Evet | ❌ Hayır | — | `CROSSREF_MAILTO` | 🔴 Zorunlu |
| 2 | Semantic Scholar | ✅ Evet | ⚠️ İsteğe bağlı | https://www.semanticscholar.org/product/api | `SEMANTIC_SCHOLAR_API_KEY` | 🔴 Zorunlu |
| 3 | OpenAlex | ✅ Evet | ❌ Hayır | — | `OPENALEX_EMAIL` | 🔴 Zorunlu |
| 4 | DOI Resolver | ✅ Evet | ❌ Hayır | — | — | 🔴 Zorunlu |
| 5 | PubMed | ✅ Evet | ⚠️ İsteğe bağlı | https://www.ncbi.nlm.nih.gov/books/NBK25501/ | `PUBMED_API_KEY` | 🟡 Önerilen |
| 6 | arXiv | ✅ Evet | ❌ Hayır | — | — | 🟡 Önerilen |
| 7 | ORCID | ✅ Evet | ✅ Evet | https://orcid.org/developer-tools | `ORCID_CLIENT_ID/SECRET` | 🟢 İsteğe bağlı |
| 8 | Google Scholar | ⚠️ Scraping | ❌ Hayır | — | — | 🟢 İsteğe bağlı |
| 9 | Dergipark | ✅ Ücretsiz | ❌ Hayır | — | — | 🔴 Zorunlu (TR) |
| 10 | YÖK Tez | ✅ Ücretsiz | ❌ Hayır | — | — | 🔴 Zorunlu (TR) |
| 11 | TR Dizin | ✅ Ücretsiz | ❌ Hayır | — | — | 🔴 Zorunlu (TR) |

> **İlk 4'ü almadan sistemi başlatamazsın.** Geri kalanı sonra eklenebilir.

---

## 1. CrossRef API 🔴 ZORUNLU

**Ne yapar:** DOI ile referans doğrulama. 150M+ akademik kayıt. En güvenilir kaynak.

**Maliyet:** Tamamen ücretsiz. Rate limit: 50 istek/dakika.

**Ne yapman gerekiyor:**
1. Hiçbir yere kayıt olmana gerek YOK
2. Sadece bir e-posta adresin olmalı (polite pool için)
3. `.env` dosyasına e-postanı yaz:

```env
CROSSREF_MAILTO=senin@email.com
```

**Neden e-posta istiyor?** CrossRef, e-posta gönderen kullanıcılara "polite pool" (öncelikli kuyruk) verir. Rate limit 50→100 req/dk artar.

**Test:**
```bash
curl "https://api.crossref.org/works/10.1038/nature12373"
```
Bu URL'yi tarayıcıda aç. JSON yanıtı gelirse çalışıyor demektir.

---

## 2. Semantic Scholar API 🔴 ZORUNLU

**Ne yapar:** 200M+ makale ile başlık+yazar araması. AI tabanlı akademik arama.

**Maliyet:** Ücretsiz (100 req/dk). API key ile 1 req/s.

**Ne yapman gerekiyor:**
1. Git: https://www.semanticscholar.org/product/api
2. "Get API Key" butonuna tıkla
3. Formu doldur (isim, e-posta, kullanım amacı: "Academic reference verification tool")
4. API key e-postana gelir
5. `.env` dosyasına ekle:

```env
SEMANTIC_SCHOLAR_API_URL=https://api.semanticscholar.org
SEMANTIC_SCHOLAR_API_KEY=buraya-gelen-keyi-yapistir
```

**⚠️ API key alamasan bile sistem çalışır** — sadece rate limit daha düşük olur (100 req/dk vs 1 req/s). Key alana kadar boş bırakabilirsin.

**Test:**
```bash
curl "https://api.semanticscholar.org/graph/v1/paper/search?query=machine+learning&limit=3"
```

---

## 3. OpenAlex API 🔴 ZORUNLU

**Ne yapar:** 250M+ akademik çalışma. Tamamen açık ve ücretsiz akademik veritabanı.

**Maliyet:** Tamamen ücretsiz. 10 req/s (e-posta ile).

**Ne yapman gerekiyor:**
1. Hiçbir yere kayıt olmana gerek YOK
2. Sadece e-posta adresini parametre olarak gönderiyoruz
3. `.env` dosyasına ekle:

```env
OPENALEX_API_URL=https://api.openalex.org
OPENALEX_EMAIL=senin@email.com
```

**Neden e-posta?** OpenAlex, e-posta gönderen kullanıcılara öncelikli erişim verir ve sorun durumunda iletişim kurabilir.

**Test:**
```bash
curl "https://api.openalex.org/works?search=machine+learning&per_page=3&mailto=senin@email.com"
```

---

## 4. DOI Resolver 🔴 ZORUNLU

**Ne yapar:** DOI numarasını URL'ye çevirir. Referansın gerçek olup olmadığını hızlıca kontrol eder.

**Maliyet:** Tamamen ücretsiz.

**Ne yapman gerekiyor:**
- Hiçbir şey yapmana gerek YOK. Sistem otomatik kullanır.
- Sadece `https://doi.org/10.1234/xyz` formatında URL'leri sorgularız.

**Test:**
```bash
curl -L "https://doi.org/api/handles/10.1038/nature12373"
```

---

## 5. PubMed API (E-utilities) 🟡 ÖNERİLEN

**Ne yapar:** Tıp ve biyomedikal makale arama. 36M+ makale.

**Maliyet:** Ücretsiz. 10 req/s (API key ile 10 req/s, olmadan 3 req/s).

**Ne yapman gerekiyor:**
1. Git: https://www.ncbi.nlm.nih.gov/books/NBK25501/
2. "Get an API Key" linkine tıkla
3. NCBI hesabı oluştur (Google ile de giriş yapabilirsin)
4. Settings → API Key Management → "Create a key"
5. `.env` dosyasına ekle:

```env
PUBMED_API_URL=https://eutils.ncbi.nlm.nih.gov/entrez/eutils
PUBMED_API_KEY=buraya-gelen-keyi-yapistir
```

**Test:**
```bash
curl "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=machine+learning&retmax=3"
```

---

## 6. arXiv API 🟡 ÖNERİLEN

**Ne yapar:** Fizik, matematik, bilgisayar bilimleri ön baskıları.

**Maliyet:** Tamamen ücretsiz. Kayıt gerekmez.

**Ne yapman gerekiyor:**
- Hiçbir şey yapmana gerek YOK. Sistem otomatik kullanır.

**Test:**
```bash
curl "http://export.arxiv.org/api/query?search_query=ti:machine+learning&max_results=3"
```

---

## 7. ORCID 🟢 İSTEĞE BAĞLI

**Ne yapar:** Yazar profillerini doğrulama. Yazar ORCID ile eşleşme.

**Ne yapman gerekiyor:**
1. Git: https://orcid.org/developer-tools
2. ORCID hesabınla giriş yap (yoksa oluştur)
3. "Register for the free Public API" veya "Member API"
4. Client ID ve Client Secret al
5. `.env` dosyasına ekle:

```env
ORCID_CLIENT_ID=APP-XXXXXXXX
ORCID_CLIENT_SECRET=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

---

## 8. Google Scholar 🟢 İSTEĞE BAĞLI

**Ne yapar:** En geniş akademik arama motoru. 380M+ makale.

**⚠️ DİKKAT:** Google Scholar'ın resmi API'si YOKTUR. Web scraping yapılır.
- Google rate limit uygular (çok istek = geçici IP ban)
- Sistemimiz scraping'i çok dikkatli yapacak (5 req/dk limit)
- Şu an için düşük öncelikli, diğer API'ler yeterli olabilir

**Ne yapman gerekiyor:**
- Şimdilik hiçbir şey yapmana gerek yok
- İleride SerpAPI veya ScraperAPI gibi ücretli servis düşünülebilir

---

## 9-11. Türk Akademik Veritabanları 🔴 ZORUNLU (TR)

### Dergipark
**Ne yapar:** Türkçe hakemli dergi makaleleri.
- URL: https://dergipark.org.tr
- Kayıt gerekmez, web scraping ile erişilir
- `.env` değişkeni: `DERGIPARK_BASE_URL=https://dergipark.org.tr`

### YÖK Tez
**Ne yapar:** Türkiye'deki tüm tezler (doktora + yüksek lisans).
- URL: https://tez.yok.gov.tr
- Kayıt gerekmez, web arama kullanılır
- `.env` değişkeni: `YOK_TEZ_BASE_URL=https://tez.yok.gov.tr`

### TR Dizin
**Ne yapar:** Türkçe akademik yayın indeksi.
- URL: https://trdizin.gov.tr
- Kayıt gerekmez, web scraping ile erişilir
- `.env` değişkeni: `TR_DIZIN_BASE_URL=https://trdizin.gov.tr`

**Not:** Bu üçü için özel API key gerekmiyor. Sistem web scraping yapacak.

---

## Toplanacak .env Dosyası (Kopyala-Yapıştır)

```env
# ============================================
# DIŞ API ANAHTARLARI - DOLDURMAN GEREKENLER
# ============================================

# 1. CrossRef — E-postanı yaz (kayıt gerekmez)
CROSSREF_API_URL=https://api.crossref.org
CROSSREF_MAILTO=BURAYA_EMAILINI_YAZ

# 2. Semantic Scholar — API key al (isteğe bağlı, almasan da olur)
SEMANTIC_SCHOLAR_API_URL=https://api.semanticscholar.org
SEMANTIC_SCHOLAR_API_KEY=

# 3. OpenAlex — E-postanı yaz (kayıt gerekmez)
OPENALEX_API_URL=https://api.openalex.org
OPENALEX_EMAIL=BURAYA_EMAILINI_YAZ

# 4. PubMed — API key al (isteğe bağlı)
PUBMED_API_URL=https://eutils.ncbi.nlm.nih.gov/entrez/eutils
PUBMED_API_KEY=

# 5. ORCID — Client ID + Secret al (isteğe bağlı)
ORCID_CLIENT_ID=
ORCID_CLIENT_SECRET=
```

---

## Öncelik Sırası (Ne Önce Yapılmalı)

### ⚡ HEMEN YAP (5 dakika)
1. `.env` dosyasındaki `CROSSREF_MAILTO` → E-postanı yaz
2. `.env` dosyasındaki `OPENALEX_EMAIL` → Aynı e-postayı yaz
3. Test: Yukarıdaki curl komutlarını çalıştır

### 📋 BUGÜN YAP (15 dakika)
4. Semantic Scholar API key al → `.env`'e yapıştır
5. PubMed API key al → `.env`'e yapıştır

### 📅 SONRA YAP
6. ORCID client credentials
7. Google Scholar alternatifleri araştır

---

## Sık Sorulan Sorular

**S: Ücretsiz kotalar yetmez mi?**
C: Evet, başlangıç için fazlasıyla yeterli. Bir referans doğrulama ~3-5 API çağrısı yapar. 100 istek/dk = dakikada ~25 referans doğrulayabilirsin.

**S: API key'lerimi GitHub'a commit edersem ne olur?**
C: ASLA YAPMA! `.env` dosyası `.gitignore`'da. Sadece `.env.example` commit edilir (içinde anahtar yok).

**S: Hangi API'yi önce alayım?**
C: CrossRef + OpenAlex (sadece e-posta yazma). Bunlar 30 saniyede halledilir ve sistemin %70'ini çalıştırır.

---

*Bu rehberi takip ederek tüm dış API erişimlerini sağlamış olacaksın.*
*Son güncelleme: Mayıs 2026*
