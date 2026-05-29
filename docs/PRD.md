# AiRefCheck - Ürün Gereksinimleri Dokümanı (PRD)

**Versiyon:** 1.0
**Tarih:** Mayıs 2026
**Durum:** Taslak

---

## 1. Ürün Genel Bakış

AiRefCheck, akademik dokümanlardaki referansların bütünlüğünü otomatik olarak denetleyen bir web platformudur. Kullanıcılar dokümanlarını yükler, sistem referansları çıkarır ve doğrular, sonuçlar detaylı bir dashboard'da sunulur.

### 1.1 Ürün Hedefleri
1. Akademik referans doğrulama süresini %90 oranında azaltmak
2. Uydurulmuş referans tespitinde %95+ başarı oranı sağlamak
3. Tüm major akademik atıf stillerini desteklemek
4. Kullanıcı dostu bir arayüz ile teknik bilgi gerektirmeden kullanım sağlamak

### 1.2 Kapsam Dışı (Out of Scope - V1)
- Plagiarism (intihal) tespiti
- Metin kalitesi değerlendirmesi
- Dilbilgisi ve yazım denetimi
- Akademik içerik üretimi
- Otomatik referans düzeltme (sadece tespit)

---

## 2. Kullanıcı Hikayeleri

### US-001: Doküman Yükleme
**Bir akademik danışman olarak,** tez dokümanını sisteme yüklemek istiyorum **böylece** referansların otomatik olarak kontrol edilebilmesini sağlayabileceğim.

**Kabul Kriterleri:**
- [ ] PDF, DOCX, TXT, LaTeX (.tex), BibTeX (.bib), RIS (.ris) formatları desteklenmeli
- [ ] Sürükle-bırak ve dosya seçici ile yükleme yapılabilmeli
- [ ] Maksimum dosya boyutu: 100MB
- [ ] Yükleme sırasında ilerleme çubuğu gösterilmeli
- [ ] Birden fazla dosya aynı anda yüklenebilmeli (toplu analiz)
- [ ] Yüklenen dosya otomatik olarak format tanıma ile sınıflandırılmalı

### US-002: Otomatik Referans Çıkarımı
**Bir jüri üyesi olarak,** yüklenen dokümandan referansların otomatik olarak çıkarılmasını istiyorum **böylece** manuel olarak her referansı kopyalayıp aramak zorunda kalmayacağım.

**Kabul Kriterleri:**
- [ ] Kaynakça bölümü otomatik tespit edilmeli
- [ ] Her referans ayrı ayrı ayrıştırılmalı (yazar, yıl, başlık, dergi/kitap, DOI, vb.)
- [ ] Atıf stili otomatik olarak tanınmalı
- [ ] Tanıma güven skoru her referans için gösterilmeli
- [ ] Kullanıcı çıkarılan referansları düzenleyebilmeli
- [ ] Metin içi atıflar da tespit edilmeli

### US-003: Referans Doğrulama
**Bir araştırmacı olarak,** her referansın gerçek olup olmadığını görmek istiyorum **böylece** çalışmamın bütünlüğünü sağlayabileceğim.

**Kabul Kriterleri:**
- [ ] Her referans birden fazla akademik veritabanına karşı sorgulanmalı
- [ ] DOI varsa DOI resolver ile doğrulanmalı
- [ ] Sonuç her referans için: ✅ Doğrulanmış / ⚠️ Şüpheli / ❌ Bulunamadı / ℹ️ Kısmen Eşleşti
- [ ] Doğrulanmış referanslar için kaynak linki sağlanmalı
- [ ] Şüpheli referanslar için şüphe nedeni açıklanmalı
- [ ] Güven skoru (0-100) her referans için hesaplanmalı

### US-004: Eksik/Fazla Referans Tespiti
**Bir tez danışmanı olarak,** metinde atıf yapılıp kaynakçaya konulmayan veya kaynakçada olup metinde atıf yapılmayan referansları görmek istiyorum **böylece** öğrencimin tezini tam olarak değerlendirebileyim.

**Kabul Kriterleri:**
- [ ] Metin içi atıflar kaynakça ile eşleştirilmeli
- [ ] Kaynakçada olup metinde atıf yapılmayanlar "Orfan Referans" olarak işaretlenmeli
- [ ] Metinde atıf yapılıp kaynakçada olmayanlar "Eksik Referans" olarak işaretlenmeli
- [ ] Eşleşme güven skoru gösterilmeli
- [ ] Liste ve görsel grafik ile sunulmalı

### US-005: Detaylı Dashboard
**Bir akademisyen olarak,** tüm analiz sonuçlarını tek bir ekranda görmek istiyorum **böylece** hızlıca genel durumu değerlendirebileyim.

**Kabul Kriterleri:**
- [ ] Genel doküman bütünlük skoru (0-100) gösterilmeli
- [ ] Referans dağılımı pasta/grafik ile gösterilmeli (doğru/şüpheli/bulunamadı)
- [ ] Her referans için genişletilebilir detay kartı olmalı
- [ ] Filtreleme ve sıralama yapılabilmeli (durum, güven skoru, stil, vb.)
- [ ] Zaman çizelgesi: İşlem adımlarının durumu gösterilmeli
- [ ] Özet istatistikler: Toplam referans, doğrulanan, şüpheli, eksik, fazla sayıları

### US-006: Rapor Dışa Aktarma
**Bir jüri üyesi olarak,** analiz sonuçlarını PDF veya Excel olarak dışa aktarmak istiyorum **böylece** raporu jüri toplantısında sunabileyim.

**Kabul Kriterleri:**
- [ ] PDF rapor oluşturulmalı (profesyonel formatlı)
- [ ] Excel/CSV olarak detaylı veri indirilebilmeli
- [ ] Rapor özelleştirilebilmeli (hangi bölümler dahil edilecek)
- [ ] Kurum logosu eklenebilmeli
- [ ] Paylaşılabilir link ile online rapor erişimi

### US-007: Atıf Stili Doğrulama
**Bir araştırmacı olarak,** referanslarımın belirli bir atıf stiline (ör. APA 7) uygun olup olmadığını kontrol etmek istiyorum.

**Kabul Kriterleri:**
- [ ] 20+ major atıf stili desteklenmeli
- [ ] Her referansın stil uyumu kontrol edilmeli
- [ ] Format hataları tespit edilmeli ve açıklanmalı
- [ ] Türk üniversite stilleri desteklenmeli
- [ ] Kullanıcı hedef stili seçebilmeli veya otomatik tespit kullanabilmeli

---

## 3. Fonksiyonel Gereksinimler

### 3.1 Doküman Yükleme ve İşleme Modülü

| ID | Gereksinim | Öncelik |
|----|-----------|---------|
| FR-101 | PDF dosyalarından metin çıkarma desteği | Must |
| FR-102 | DOCX dosyalarından metin çıkarma desteği | Must |
| FR-103 | LaTeX (.tex) dosyalarını ayrıştırma | Must |
| FR-104 | BibTeX (.bib) dosyalarını ayrıştırma | Must |
| FR-105 | RIS (.ris) dosyalarını ayrıştırma | Should |
| FR-106 | Düz metin (TXT) dosyalarını işleme | Must |
| FR-107 | Sürükle-bırak dosya yükleme | Must |
| FR-108 | Toplu dosya yükleme (maks. 20 dosya) | Should |
| FR-109 | Maksimum dosya boyutu: 100MB | Must |
| FR-110 | Dosya formatı otomatik algılama | Must |
| FR-111 | OCR desteği (taranmış PDF'ler için) | Could |
| FR-112 | URL'den doküman çekme | Could |
| FR-113 | Metin yapıştırma ile doğrudan analiz | Should |

### 3.2 Referans Çıkarım ve Ayrıştırma Modülü

| ID | Gereksinim | Öncelik |
|----|-----------|---------|
| FR-201 | Kaynakça bölümünü otomatik tespit etme | Must |
| FR-202 | Her referansı yapısal bileşenlerine ayırma (yazar, yıl, başlık, vb.) | Must |
| FR-203 | Metin içi atıfları tespit etme | Must |
| FR-204 | Atıf stilini otomatik algılama | Must |
| FR-205 | Karma atıf stili durumunu tespit etme ve raporlama | Should |
| FR-206 | Çıkarılan her referans için güven skoru hesaplama | Must |
| FR-207 | Kullanıcı tarafında referans düzenleme imkanı | Should |
| FR-208 | Manuel referans ekleme imkanı | Could |
| FR-209 | Türkçe karakterli yazar adlarını düzgün ayrıştırma | Must |
| FR-210 | Çoklu yazarlı referansları işleme | Must |
| FR-211 | Kurumsal yazar (corporate author) desteği | Should |
| FR-212 | Editörlü kitap bölümlerini ayrıştırma | Must |
| FR-213 | Çeviri eser referanslarını işleme | Should |
| FR-214 | Tez referanslarını (doktora/yüksek lisans) ayırt etme | Must |

### 3.3 Referans Doğrulama Modülü

| ID | Gereksinim | Öncelik |
|----|-----------|---------|
| FR-301 | CrossRef API ile DOI doğrulama | Must |
| FR-302 | Semantic Scholar API ile makale arama | Must |
| FR-303 | OpenAlex API ile geniş akademik arama | Must |
| FR-304 | Google Scholar üzerinden doğrulama | Should |
| FR-305 | DOI resolver ile doğrudan DOI sorgulama | Must |
| FR-306 | ISBN veritabanı ile kitap doğrulama | Should |
| FR-307 | YÖK Tez veritabanı ile tez doğrulama | Must |
| FR-308 | Dergipark üzerinden Türkçe makale arama | Must |
| FR-309 | TR Dizin entegrasyonu | Must |
| FR-310 | Yayınevi API'leri (Elsevier, Springer, Wiley) entegrasyonu | Could |
| FR-311 | ArXiv entegrasyonu | Should |
| FR-312 | PubMed entegrasyonu (tıp/biyoloji) | Should |
| FR-313 | JSTOR entegrasyonu | Could |
| FR-314 | Fazzy matching ile yaklaşık eşleşme | Must |
| FR-315 | Çoklu kaynak karşılaştırması ile güven skoru hesaplama | Must |
| FR-316 | API hata ve timeout durumlarında graceful degradation | Must |
| FR-317 | Rate limiting yönetimi | Must |
| FR-318 | API yanıtlarını önbelleğe alma (cache) | Must |

### 3.4 Fabrikasyon ve Şüphe Tespit Modülü

| ID | Gereksinim | Öncelik |
|----|-----------|---------|
| FR-401 | Hiçbir kaynakta bulunamayan referansları "Potansiyel Fabrikasyon" olarak işaretleme | Must |
| FR-402 | Yazar adı tutarsızlık kontrolü | Must |
| FR-403 | Yıl tutarsızlık kontrolü (gelecek yılı, makul olmayan tarih) | Must |
| FR-404 | Dergi adı geçerlilik kontrolü | Should |
| FR-405 | DOI format doğrulama | Must |
| FR-406 | URL geçerlilik kontrolü (varsa) | Should |
| FR-407 | Bibliyometrik tutarlılık analizi (alıntı sayısı vs. beklenen) | Could |
| FR-408 | AI ile "paper mill" çıktısı tespiti | Could |
| FR-409 | Retracted makale uyarısı | Must |
| FR-410 | Kendine atıf oranı analizi | Could |
| FR-411 | Şüphe nedeninin kullanıcıya açıklaması | Must |
| FR-412 | Güven skoru hesaplama (0-100) | Must |

### 3.5 Metin-Kaynakça Eşleştirme Modülü

| ID | Gereksinim | Öncelik |
|----|-----------|---------|
| FR-501 | Metin içi atıfları tespit etme (Author, Year), [1], superscript, vb. | Must |
| FR-502 | Tespit edilen atıfları kaynakça ile eşleştirme | Must |
| FR-503 | Eksik referansları raporlama (atıf var, kaynakçada yok) | Must |
| FR-504 | Orfan referansları raporlama (kaynakçada var, atıf yok) | Must |
| FR-505 | Eşleşme güven skoru | Must |
| FR-506 | Metin içi atıf formatının kaynakça stiliyle tutarlılık kontrolü | Should |

### 3.6 Dashboard ve Analitik Modülü

| ID | Gereksinim | Öncelik |
|----|-----------|---------|
| FR-601 | Genel doküman bütünlük skoru (0-100) | Must |
| FR-602 | Referans durum dağılımı grafiği (pasta chart) | Must |
| FR-603 | Referans güven skoru dağılımı histogramı | Should |
| FR-604 | Her referans için detay kartı (genişletilebilir) | Must |
| FR-605 | Filtreleme: durum, güven skoru, atıf stili, şüphe tipi | Must |
| FR-606 | Sıralama: güven skoru, yazar, yıl, durum | Must |
| FR-607 | Arama: referans metni içinde arama | Should |
| FR-608 | İşlem ilerleme çubuğu (gerçek zamanlı) | Must |
| FR-609 | Referans detay popup/modal: kaynak linkleri, şüphe nedenleri, API yanıtları | Must |
| FR-610 | Zaman içinde analiz geçmişi (kullanıcı bazlı) | Should |
| FR-611 | Kurum bazlı istatistikler (kurumsal kullanıcılar için) | Could |
| FR-612 | Interaktif kaynak haritası görselleştirmesi | Could |

### 3.7 Rapor ve Dışa Aktarma Modülü

| ID | Gereksinim | Öncelik |
|----|-----------|---------|
| FR-701 | PDF rapor oluşturma (profesyonel formatlı) | Must |
| FR-702 | Excel/CSV indirme | Must |
| FR-703 | JSON formatında ham veri indirme | Should |
| FR-704 | Paylaşılabilir link ile online rapor | Should |
| FR-705 | Rapor şablonu özelleştirme | Could |
| FR-706 | Kurum logosu ekleme | Could |
| FR-707 | E-posta ile rapor gönderme | Could |
| FR-708 | Baskı çıktısına uygun (print-friendly) görünüm | Should |

---

## 4. Fonksiyonel Olmayan Gereksinimler

### 4.1 Performans
| ID | Gereksinim | Hedef |
|----|-----------|-------|
| NFR-101 | Referans çıkarım süresi (50 referans) | < 10 saniye |
| NFR-102 | Tek referans doğrulama süresi | < 5 saniye |
| NFR-103 | Tam doküman analiz süresi (50 referans) | < 120 saniye |
| NFR-104 | Dashboard API yanıt süresi | < 200ms |
| NFR-105 | Dosya yükleme süresi (50MB) | < 30 saniye |
| NFR-106 | Eşzamanlı kullanıcı desteği (başlangıç) | 100 kullanıcı |
| NFR-107 | Eşzamanlı işlenen doküman sayısı | 20 doküman |

### 4.2 Güvenlik
| ID | Gereksinim | Öncelik |
|----|-----------|---------|
| NFR-201 | HTTPS zorunlu | Must |
| NFR-202 | JWT tabanlı kimlik doğrulama | Must |
| NFR-203 | OAuth2 ile sosyal giriş (Google, ORCID) | Should |
| NFR-204 | Rol tabanlı erişim kontrolü (RBAC) | Must |
| NFR-205 | Dosya şifreleme (rest'te AES-256) | Must |
| NFR-206 | KVKK/GDPR uyumu | Must |
| NFR-207 | Veri saklama politikası (kullanıcı tercihi) | Must |
| NFR-208 | API rate limiting | Must |
| NFR-209 | OWASP Top 10 uyumu | Must |
| NFR-210 | Güvenlik loglama ve audit trail | Must |

### 4.3 Kullanılabilirlik
| ID | Gereksinim | Öncelik |
|----|-----------|---------|
| NFR-301 | Responsive tasarım (mobil, tablet, masaüstü) | Must |
| NFR-302 | Türkçe ve İngilizce dil desteği | Must |
| NFR-303 | WCAG 2.1 AA erişilebilirlik | Should |
| NFR-304 | Klavye navigasyonu desteği | Must |
| NFR-305 | Kullanıcı rehberi ve yardım içeriği | Must |
| NFR-306 | Onboarding tutorial | Should |
| NFR-307 | Toast/bildirim sistemi | Must |

### 4.4 Güvenilirlik
| ID | Gereksinim | Öncelik |
|----|-----------|---------|
| NFR-401 | Sistem uptime | %99.5+ |
| NFR-402 | Otomatik yedekleme (günlük) | Must |
| NFR-403 | Felaket kurtarma planı | Must |
| NFR-404 | API timeout sonrası retry mekanizması | Must |
| NFR-405 | Kısmi hata toleransı (bir API çökerse diğerleri çalışır) | Must |

### 4.5 Ölçeklenebilirlik
| ID | Gereksinim | Öncelik |
|----|-----------|---------|
| NFR-501 | Horizontal scaling desteği | Must |
| NFR-502 | Veritabanı replication | Should |
| NFR-503 | CDN ile statik varlık dağıtımı | Must |
| NFR-504 | API yanıtları önbellekleme (Redis) | Must |

---

## 5. Modül Spesifikasyonları

### 5.1 Document Parser Module
**Sorumluluk:** Yüklenen dosyaları formatlarına göre ayrıştırma ve ham metin çıkarma.

**Girdiler:** PDF, DOCX, TXT, LaTeX, BibTeX, RIS dosyaları
**Çıktılar:** Ham metin, yapısal metadata (başlık, bölümler, kaynakça konumu)

**Alt bileşenler:**
- `PdfParser`: PDF'ten metin çıkarma (pdf-parse veya PyMuPDF)
- `DocxParser`: DOCX'ten metin ve stil çıkarma
- `LatexParser`: LaTeX dosyalarını yapısal olarak ayrıştırma
- `BibtexParser`: BibTeX dosyalarını doğrudan referans listesine dönüştürme
- `RisParser`: RIS formatını ayrıştırma
- `TextParser`: Düz metin referans satırlarını tespit etme

### 5.2 Citation Parser Engine
**Sorumluluk:** Ham metinden kaynakça bölümünü tespit etme, her referansı ayrıştırma ve yapısal veri çıkarma.

**Girdiler:** Ham metin, dosya formatı bilgisi
**Çıktılar:** Parse edilmiş referans listesi (her biri için: yazarlar, yıl, başlık, dergi/kitap, cilt, sayı, sayfa, DOI, URL, vb.), tespit edilen atıf stili, metin içi atıflar

**Alt bileşenler:**
- `BibliographyDetector`: Kaynakça bölümünün başlangıç ve bitişini tespit
- `ReferenceSplitter`: Kaynakça metnini bireysel referanslara bölme
- `StyleDetector`: Atıf stilini otomatik algılama
- `ReferenceParser`: Her referansı yapısal bileşenlerine ayırma (stil bazlı regex + NLP)
- `InTextCitationExtractor`: Metin içi atıfları tespit etme
- `TurkishNameHandler`: Türkçe isim ve karakter desteği

### 5.3 Reference Validator Pipeline
**Sorumluluk:** Her referansı birden fazla dış kaynağa karşı sorgulama ve doğrulama sonucu üretme.

**Girdiler:** Parse edilmiş referans listesi
**Çıktılar:** Her referans için doğrulama sonucu (durum, güven skoru, eşleşen kaynaklar, linkler)

**Alt bileşenler:**
- `CrossRefValidator`: CrossRef API ile sorgulama
- `SemanticScholarValidator`: Semantic Scholar API ile sorgulama
- `OpenAlexValidator`: OpenAlex API ile sorgulama
- `DoiResolver`: DOI resolver ile doğrulama
- `GoogleScholarValidator`: Google Scholar scraping (rate-limited)
- `TurkishDbValidator`: Dergipark, TR Dizin, YÖK Tez sorgulama
- `IsbnValidator`: ISBN ile kitap doğrulama
- `FuzzyMatcher`: Yaklaşık eşleşme algoritması (Levenshtein, trigram)
- `ScoreAggregator`: Çoklu kaynak sonuçlarını tek güven skorunda birleştirme

### 5.4 Fabrication Detector
**Sorumluluk:** Uydurulmuş referansları tespit etme için şüphe analizi.

**Girdiler:** Doğrulama sonuçları, parse edilmiş referanslar
**Çıktılar:** Her referans için şüphe analizi (şüphe tipi, nedeni, güven skoru)

**Alt bileşenler:**
- `NoMatchDetector`: Hiçbir kaynakta bulunamayan referansları işaretleme
- `InconsistencyDetector`: Metadata tutarsızlık analizi
- `JournalValidator`: Dergi adı geçerlilik kontrolü
- `RetractionChecker`: Retracted makale kontrolü
- `PatternAnalyzer`: Sahte referans örüntü tespiti (AI destekli)
- `SelfCitationAnalyzer`: Kendine atıf oranı analizi

### 5.5 Dashboard & Analytics Module
**Sorumluluk:** Kullanıcıya sonuçları görsel olarak sunma.

**Girdiler:** Tüm analiz sonuçları
**Çıktılar:** Web arayüzü, grafikler, tablolar, raporlar

### 5.6 Report Generator Module
**Sorumluluk:** Sonuçlardan profesyonel raporlar oluşturma.

**Girdiler:** Analiz sonuçları, rapor şablonu, kullanıcı tercihleri
**Çıktılar:** PDF, Excel/CSV, JSON raporlar

---

## 6. Veri Kaynakları ve Dış API'ler

### 6.1 Akademik Veritabanları

| Kaynak | API Türü | Ücretsiz Kotası | Kapsam | Öncelik |
|--------|---------|----------------|--------|---------|
| CrossRef | REST API | Sınırsız (rate limit) | DOI metadata, 150M+ kayıt | Must |
| Semantic Scholar | REST API | Sorgu başına ücretsiz | 200M+ makale | Must |
| OpenAlex | REST API | Ücretsiz, Sınırsız | 250M+ çalışma | Must |
| Google Scholar | Web Scraping | Sınırlı (proxy gerekli) | Geniş akademik web | Should |
| DOI Resolver | REST API | Ücretsiz | DOI → metadata | Must |
| PubMed | REST API (E-utilities) | Ücretsiz | Biyomedikal | Should |
| arXiv | REST API | Ücretsiz | Fizik, matematik, CS | Should |
| JSTOR | REST API | Sınırlı | Sosyal bilimler, beşeri | Could |
| ORCID | REST API | Ücretsiz | Yazar profilleri | Should |

### 6.2 Türk Akademik Kaynaklar

| Kaynak | Tür | Kapsam | Öncelik |
|--------|-----|--------|---------|
| Dergipark | Web/API | Türkçe hakemli dergiler | Must |
| TR Dizin | Web | Türkçe akademik indeks | Must |
| YÖK Tez | Web/API | Türk tez veritabanı | Must |
| SOBİAD | Web | Sosyal bilimler indeksi | Could |
| İSAM | Web | İslam araştırmaları | Could |

### 6.3 Yayınevi API'leri

| Kaynak | Kapsam | Öncelik |
|--------|--------|---------|
| Elsevier/ScienceDirect | Bilim ve teknoloji | Could |
| Springer Nature | Bilim ve teknoloji | Could |
| Wiley | Çok disiplinli | Could |
| Taylor & Francis | Sosyal ve beşeri bilimler | Could |
| SAGE | Sosyal bilimler | Could |

---

## 7. Kullanıcı Arayüzü Gereksinimleri

### 7.1 Ana Sayfa / Dashboard
- Sol sidebar: Navigasyon menüsü
- Üst bar: Kullanıcı bilgileri, bildirimler, dil seçici
- Merkez: Analiz özet kartları, son analizler, hızlı eylemler
- Renk teması: Açık/Koyu mod desteği

### 7.2 Doküman Yükleme Ekranı
- Büyük sürükle-bırak alanı
- Dosya türü ikonları ve bilgileri
- Son yüklenen dosyalar listesi
- Yükleme ilerleme çubuğu

### 7.3 Analiz Sonuçları Ekranı
- **Üst bölüm:** Genel skor göstergesi, özet istatistikler
- **Orta bölüm:** Referans listesi (kart veya tablo görünümü)
  - Her referans kartı: Durum ikonu, kısa referans metni, güven skoru barı
  - Tıklanınca detay modal: Tam referans, doğrulama kaynakları, şüphe nedenleri, API yanıtları
- **Alt bölüm:** Grafikler (dağılım, trend)
- **Sağ panel:** Filtreler ve sıralama

### 7.4 Referans Detay Görünümü
- Tam referans metni (vurgulanmış bileşenler)
- Parse edilen alanlar (yazar, yıl, başlık, vb.)
- Doğrulama sonuçları listesi (her API kaynağı için)
  - ✅ CrossRef: Eşleşti (Skor: 95) - [Link]
  - ✅ Semantic Scholar: Eşleşti (Skor: 92) - [Link]
  - ⚠️ Google Scholar: Kısmen eşleşti (Skor: 70) - [Detay]
- Şüphe nedenleri (varsa)
- İlgili referans önerileri

### 7.5 Rapor Ekranı
- Rapor önizleme
- Format seçimi (PDF, Excel, JSON)
- Şablon özelleştirme
- İndirme ve paylaşım butonları

---

## 8. Öncelik Matrisi (MoSCoW)

### Must Have (MVP - V1.0)
- Doküman yükleme (PDF, DOCX, BibTeX, TXT)
- Otomatik kaynakça tespiti ve referans çıkarımı
- 15+ atıf stili tanıma ve ayrıştırma
- CrossRef, Semantic Scholar, OpenAlex doğrulama
- DOI doğrulama
- Türk veritabanları (Dergipark, TR Dizin, YÖK Tez)
- Eksik/fazla referans tespiti
- Fabrikasyon şüphe analizi
- Dashboard ve detay kartları
- PDF ve Excel rapor

### Should Have (V1.5)
- Google Scholar entegrasyonu
- LaTeX (.tex) desteği
- RIS dosya desteği
- PubMed, arXiv entegrasyonu
- Retracted makale kontrolü
- OCR desteği
- URL'den doküman çekme
- Paylaşılabilir rapor linki
- Kurum logosu ekleme

### Could Have (V2.0)
- Yayınevi API entegrasyonları (Elsevier, Springer, vb.)
- JSTOR entegrasyonu
- AI ile "paper mill" tespiti
- Kendine atıf analizi
- Toplu doküman analizi (klasör bazlı)
- İnteraktif kaynak haritası
- Kurumsal istatistik paneli
- E-posta rapor gönderimi

### Won't Have (V1)
- Plagiarism tespiti
- Otomatik referans düzeltme
- Akademik içerik üretimi
- Mobil uygulama

---

## 9. Sürüm Planı

### V1.0 - MVP (Hafta 1-12)
**Hedef:** Temel referans doğrulama aracı
- Doküman yükleme ve ayrıştırma
- Referans çıkarım motoru (15 atıf stili)
- CrossRef + Semantic Scholar + OpenAlex doğrulama
- DOI çözümleme
- Türk veritabanları entegrasyonu
- Eksik/fazla referans tespiti
- Temel dashboard
- PDF rapor oluşturma

### V1.5 - Geliştirme (Hafta 13-20)
**Hedef:** Kapsam ve UX iyileştirmesi
- Google Scholar entegrasyonu
- LaTeX/RIS desteği
- PubMed/arXiv entegrasyonu
- Gelişmiş dashboard ve filtreler
- Excel rapor
- Paylaşılabilir linkler
- OCR desteği

### V2.0 - Profesyonel (Hafta 21-32)
**Hedef:** Kurumsal kullanıma hazır
- Yayınevi API'leri
- AI ile gelişmiş fabrikasyon tespiti
- Toplu analiz
- Kurumsal panel
- Rol tabanlı erişim
- Gelişmiş analitik
- Eklenti sistemi (OJS entegrasyonu)

### V3.0 - Platform (Hafta 33-48)
**Hedef:** Genişleyen ekosistem
- Tarayıcı eklentisi
- Word/LaTeX editör eklentileri
- API (üçüncü parti entegrasyon)
- Akademik dürüstlük ağı
- Referans öneri sistemi

---

## 10. Kabul Kriterleri (Proje Genel)

### MVP Kabul Kriterleri
- [ ] PDF dokümanı yüklenip referanslar çıkarılabilmeli
- [ ] APA 7, IEEE, Vancouver, Harvard stillerinde referanslar doğru ayrıştırılabilmeli
- [ ] CrossRef API ile %90+ referans doğrulanabilmeli
- [ ] En az bir Türk veritabanı entegre çalışmalı
- [ ] Eksik ve fazla referanslar doğru tespit edilebilmeli
- [ ] Dashboard'da tüm sonuçlar görüntülenebilmeli
- [ ] PDF rapor indirilebilmeli
- [ ] 50 referanslı bir doküman 120 saniyeden kısa sürede işlenebilmeli
- [ ] Sistem 10 eşzamanlı kullanıcıyı desteklemeli
- [ ] KVKK uyumlu veri işleme sağlanmalı

---

*Bu doküman AiRefCheck projesinin ürün gereksinimlerini tanımlar. Geliştirme sürecinde living document olarak güncellenecektir.*

*Son güncelleme: Mayıs 2026*
