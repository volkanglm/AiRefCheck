# GÖREV: Frontend Bileşenler + UI Polish + Responsive Tasarım
**Atanan Model:** MiniMax (İkinci görev olarak)
**Öncelik:** 🟢 DÜŞÜK (Faz 2 — Qwen ana dashboard'ı bitirdikten sonra)
**Tahmini Süre:** ~1 saat
**Bağımlılıklar:** Qwen'in dashboard görevini tamamlaması

---

## Senin Rolün
Qwen ana dashboard iskeletini kurduktan sonra, sen **ek UI bileşenlerini, sayfaları ve responsive tasarım detaylarını** tamamlayacaksın. Qwen'in kodunu okuyup üzerine inşa edeceksin.

## Önce Oku
1. Qwen'in oluşturduğu tüm dosyaları oku (`apps/web/src/`)
2. `docs/PRD.md` — Bölüm 7: UI gereksinimleri
3. `packages/shared/src/index.ts` — Tip tanımları

## Oluşturacağın Dosyalar

### 1. `apps/web/src/app/(dashboard)/settings/page.tsx`
- Profil bilgileri düzenleme
- Dil seçimi (TR/EN)
- Şifre değiştirme
- Veri saklama tercihleri
- Hesap silme

### 2. `apps/web/src/app/(dashboard)/history/page.tsx`
- Geçmiş analizler listesi
- Tarih filtresi
- Durum filtresi
- Arama
- Sayfalama

### 3. `apps/web/src/components/ui/` — shadcn/ui Bileşenleri
Qwen CLI çalıştıramayacağı için, bu bileşenleri doğrudan yaz:

- `button.tsx`
- `card.tsx`
- `dialog.tsx`
- `input.tsx`
- `select.tsx`
- `table.tsx`
- `badge.tsx`
- `toast.tsx`
- `skeleton.tsx`
- `progress.tsx`
- `tabs.tsx`
- `dropdown-menu.tsx`
- `avatar.tsx`
- `separator.tsx`
- `tooltip.tsx`
- `alert.tsx`
- `sheet.tsx` (mobile sidebar)

### 4. `apps/web/src/components/shared/`
- `loading-spinner.tsx`
- `error-boundary.tsx`
- `empty-state.tsx`
- `confirm-dialog.tsx`
- `file-upload-zone.tsx`
- `status-badge.tsx` — Referans durumu için renkli badge
- `score-bar.tsx` — 0-100 güven skoru barı
- `confidence-indicator.tsx` — Dairesel gösterge

### 5. Responsive Düzeltmeler
- Mobil sidebar (Sheet ile toggle)
- Tablet grid ayarları
- Touch-friendly butonlar
- Mobil tablo → kart görünümü dönüşümü

## Kritik Kurallar
1. Qwen'in kodunu BOZMA, üzerine EKLE
2. shadcn/ui standartlarına uy
3. Tailwind CSS utility-first yaklaşım
4. Dark mode ile test et
5. Mobil-first responsive

## Çıktı
Tüm dosyaları oluştur. Her bileşen export edilebilir ve yeniden kullanılabilir olmalı.
