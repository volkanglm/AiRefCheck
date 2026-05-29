# GÖREV: Frontend Dashboard - Next.js 14 + shadcn/ui
**Atanan Model:** Qwen
**Öncelik:** 🔴 YÜKSEK (Faz 1 - Temel)
**Tahmini Süre:** ~2 saat
**Bağımlılıklar:** Proje iskeleti hazır, shared types hazır

---

## Senin Rolün
Sen bir Senior Frontend Developer olarak AiRefCheck projesinin **Next.js 14 dashboard** arayüzünü geliştireceksin. Bu, kullanıcının etkileşimde bulunduğu tek yüzey.

## Önce Oku
1. `docs/PRD.md` — Bölüm 7: Kullanıcı Arayüzü Gereksinimleri (detaylı)
2. `docs/ARCHITECTURE.md` — Frontend katmanı
3. `docs/TECH_STACK.md` — Frontend teknoloji kararları
4. `packages/shared/src/index.ts` — Tüm tip tanımları (BUNU KULLAN)
5. `apps/web/package.json` — Bağımlılıklar

## Kullanacağın Teknolojiler
- Next.js 14 App Router (Server + Client Components)
- TypeScript
- shadcn/ui bileşenleri
- Tailwind CSS
- Zustand (global state)
- TanStack Query (server state, API çağrıları)
- Socket.io Client (gerçek zamanlı)
- Recharts (grafikler)
- React Hook Form + Zod (formlar)
- react-dropzone (dosya yükleme)
- lucide-react (ikonlar)

## Oluşturacağın Dosyalar

### 1. Layout ve Temel Yapı

#### `apps/web/src/app/layout.tsx`
- Root layout: HTML lang="tr", font ayarları, ThemeProvider, Toaster
- Sidebar + Header + Main content yapısı

#### `apps/web/src/app/page.tsx`
- Landing/redirect page: Giriş yapılmışsa dashboard'a, yoksa login'e

#### `apps/web/src/app/(auth)/login/page.tsx`
- Email + password form
- OAuth butonları (Google, ORCID) — sadece placeholder
- Register linki
- React Hook Form + Zod validation

#### `apps/web/src/app/(auth)/register/page.tsx`
- Ad, soyad, email, şifre formu
- Zod validation

#### `apps/web/src/app/(auth)/layout.tsx`
- Ortalanmış auth layout

### 2. Dashboard

#### `apps/web/src/app/(dashboard)/layout.tsx`
- Sidebar navigasyon
- Header (kullanıcı bilgisi, bildirimler)
- Main content area

#### `apps/web/src/app/(dashboard)/dashboard/page.tsx`
- Hoş geldin kartı
- Son analizler listesi
- İstatistik kartları: Toplam doküman, analiz, doğrulanan referans
- Hızlı eylemler: Yeni analiz, son raporlar

### 3. Dosya Yükleme

#### `apps/web/src/app/(dashboard)/upload/page.tsx`
- Büyük sürükle-bırak alanı (react-dropzone)
- Desteklenen formatlar: PDF, DOCX, LaTeX, BibTeX, RIS, TXT
- Dosya boyutu bilgisi (max 100MB)
- Yükleme ilerleme çubuğu
- Birden fazla dosya yükleme desteği
- Yükleme sonrası analiz başlatma onayı

### 4. Analiz Sonuçları

#### `apps/web/src/app/(dashboard)/analysis/[id]/page.tsx`
- **Üst bölüm:** Genel skor göstergesi (büyük dairesel gösterge 0-100)
  - Renk kodu: 80-100 yeşil, 50-79 sarı, 0-49 kırmızı
- **İstatistik kartları:** Toplam referans, doğrulanmış, şüpheli, bulunamadı, eksik, fazla
- **Referans listesi:** Kart görünümü (genişletilebilir)
  - Her kart: durum ikonu, kısa referans, güven skoru barı, tıklayınca detay
- **Grafikler:**
  - Pasta chart: Durum dağılımı
  - Bar chart: Kaynak bazlı doğrulama
- **Filtreler:** Durum, güven skoru, atıf stili
- **İşlem ilerleme:** Socket.io ile gerçek zamanlı ilerleme çubuğu

#### `apps/web/src/app/(dashboard)/analysis/[id]/components/`
- `ScoreIndicator.tsx` — Büyük dairesel skor göstergesi
- `ReferenceCard.tsx` — Tek referans kartı
- `ReferenceDetail.tsx` — Referans detay modal/dialog
- `StatusChart.tsx` — Pasta chart (Recharts)
- `SourceChart.tsx` — Bar chart
- `AnalysisProgress.tsx` — Gerçek zamanlı ilerleme
- `ReferenceFilters.tsx` — Filtre paneli

### 5. Referans Detay Dialog

#### `apps/web/src/app/(dashboard)/analysis/[id]/components/ReferenceDetail.tsx`
- Tam referans metni (bileşenler vurgulanmış)
- Parse edilen alanlar tablosu
- Doğrulama sonuçları listesi:
  - Her kaynak için: İkon, kaynak adı, durum, güven skoru, link
- Şüphe nedenleri (varsa kırmızı uyarı kartları)
- Kaynak linki butonu

### 6. Raporlar

#### `apps/web/src/app/(dashboard)/reports/page.tsx`
- Rapor listesi
- Filtre: tarih, format

#### `apps/web/src/app/(dashboard)/reports/[id]/page.tsx`
- Rapor önizleme
- İndirme butonları (PDF, Excel, CSV, JSON)
- Paylaşım linki oluşturma

### 7. Lib ve Hooks

#### `apps/web/src/lib/api.ts`
```typescript
// API client (fetch wrapper)
// - Base URL: NEXT_PUBLIC_API_URL
// - JWT token otomatik ekleme
// - Error handling
// - TypeScript generic response typing
```

#### `apps/web/src/lib/socket.ts`
```typescript
// Socket.io client singleton
// - Auto-connect with auth token
// - Event listeners for analysis progress
```

#### `apps/web/src/lib/utils.ts`
```typescript
// cn() helper (clsx + tailwind-merge)
// formatDate()
// formatFileSize()
// getStatusColor()
// getScoreLabel()
```

#### `apps/web/src/hooks/useAnalysisProgress.ts`
```typescript
// Socket.io ile analiz ilerlemesini dinle
// Return: { progress, status, message }
```

#### `apps/web/src/hooks/useReferences.ts`
```typescript
// TanStack Query hook
// Fetch references for an analysis
// Filtering, sorting, pagination
```

### 8. State Management

#### `apps/web/src/stores/auth-store.ts`
```typescript
// Zustand store
// user, tokens, isAuthenticated
// login(), logout(), setUser()
// Persist to localStorage
```

#### `apps/web/src/stores/analysis-store.ts`
```typescript
// Zustand store
// activeAnalysis, filters, viewMode
// setFilter(), setViewMode()
```

### 9. Types

#### `apps/web/src/types/index.ts`
```typescript
// Re-export everything from @airefcheck/shared
// Add frontend-specific types if needed
```

## Tasarım Sistemi

### Renk Paleti
```
Primary:    #2563EB (blue-600)    — Ana eylem rengi
Success:    #16A34A (green-600)   — Doğrulanmış referans
Warning:    #D97706 (amber-600)   — Şüpheli referans
Error:      #DC2626 (red-600)     — Bulunamadı / Hata
Info:       #0891B2 (cyan-600)    — Bilgi
Background: #F8FAFC (slate-50)    — Arka plan
Surface:    #FFFFFF               — Kart arka planı
```

### Durum İkonları
- ✅ Doğrulanmış: `CheckCircle` (green)
- ⚠️ Şüpheli: `AlertTriangle` (amber)
- ❌ Bulunamadı: `XCircle` (red)
- ℹ️ Kısmen Eşleşti: `Info` (blue)
- ⏳ Beklemede: `Clock` (gray)

## Kritik Kurallar
1. **Server Components** tercih et, Client Components sadece gerektiğinde (`'use client'`)
2. **shadcn/ui** bileşenlerini kullan: Button, Card, Dialog, Input, Select, Table, Badge, Toast
3. **Responsive** tasarım: Mobil, tablet, masaüstü
4. **Dark mode** desteği (ThemeProvider)
5. **Accessibility**: aria-label, keyboard navigation
6. **Loading states**: Skeleton, spinner
7. **Error boundaries**: Hata yakalama
8. **@airefcheck/shared** tiplerini kullan, duplicate etme

## Dosya Başlığı Formatı
```typescript
/**
 * AiRefCheck - [Dosya adı]
 * [Kısa açıklama]
 */
```

## Çıktı
Tüm dosyaları oluştur. Her dosya tam, derlenebilir olmalı. Placeholder veya TODO bırakma. shadcn/ui bileşenlerini doğrudan kodla (CLI çalıştıramazsın).
