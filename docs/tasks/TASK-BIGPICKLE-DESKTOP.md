# GÖREV: Tauri Desktop App + GitHub Release Pipeline
**Atanan Model:** BigPickle
**Öncelik:** 🟡 ORTA (Faz 1 — paralel geliştirilebilir)
**Tahmini Süre:** ~1.5 saat
**Bağımlılıklar:** Proje iskeleti hazır, Tauri config kısmen hazır

---

## Senin Rolün
Sen bir Senior Desktop/DevOps Engineer olarak AiRefCheck projesinin **Tauri masaüstü uygulamasını** ve **GitHub Actions release pipeline'ını** geliştireceksin. Amaç: kullanıcıların Mac (.dmg) ve Windows (.exe/.msi) olarak indirip tek tıkla kurabilmesi.

## Önce Oku
1. `docs/ARCHITECTURE.md` — Deployment katmanı
2. `docs/TECH_STACK.md` — Tauri, Docker, CI/CD
3. `apps/desktop/src-tauri/tauri.conf.json` — Mevcut Tauri config
4. `apps/desktop/src-tauri/Cargo.toml` — Rust bağımlılıkları
5. `apps/desktop/package.json` — Frontend bağımlılıkları
6. `.github/workflows/ci.yml` — Mevcut CI pipeline (build-desktop job'ı var)
7. `docker/docker-compose.yml` — Docker yapısı

## Strateji: Hibrit Yaklaşım

```
Seçenek A: Full Desktop (Tauri + Sidecar Services)
- Tauri app → Next.js frontend'i sarar
- Sidecar: Fastify API + Python NLP (gömülü binary)
- SQLite (gömülü) PostgreSQL yerine
- Dosya tabanlı cache Redis yerine
- Avantaj: Gerçekten tek dosya installer
- Dezavantaj: Binary boyutu büyük (~200MB)

Seçenek B: Docker Desktop
- Docker Compose ile tüm servisler
- Başlatma script'i ile one-click
- Avvantaj: Tam stack, güvenilir
- Dezavantaj: Docker Desktop gerektirir

Karar: Her ikisini de destekle.
- Seçenek B'yi V1 olarak yap (daha kolay, daha güvenilir)
- Seçenek A'yı V2 olarak planla
```

## Oluşturacağın Dosyalar

### BÖLÜM A: Docker Desktop Distribution (V1)

### 1. `scripts/install-mac.sh`
```bash
#!/bin/bash
# AiRefCheck Mac Kurulum Script'i
#
# Yapacakları:
# 1. Docker Desktop kurulu mu kontrol et (yoksa brew ile kur)
# 2. docker-compose.yml dosyasını indir
# 3. Servisleri başlat (docker compose up -d)
# 4. Tarayıcıda aç (open http://localhost:3000)
# 5. Menü bar ikon (opsiyonel)
# 6. .app wrapper (Automator veya Platypus ile)
```

### 2. `scripts/install-windows.ps1`
```powershell
# AiRefCheck Windows Kurulum Script'i
#
# Yapacakları:
# 1. Docker Desktop kurulu mu kontrol et
# 2. WSL2 aktif mi kontrol et
# 3. docker-compose.yml dosyasını indir
# 4. Servisleri başlat
# 5. Tarayıcıda aç (Start-Process "http://localhost:3000")
```

### 3. `scripts/start.sh` (Mac/Linux)
```bash
#!/bin/bash
# AiRefCheck Başlatma Script'i
# Docker servisi başlat + tarayıcı aç + durum kontrol
```

### 4. `scripts/start.ps1` (Windows)
```powershell
# AiRefCheck Başlatma Script'i (Windows)
```

### 5. `scripts/stop.sh` (Mac/Linux)
### 6. `scripts/stop.ps1` (Windows)

### 7. `scripts/status.sh` / `scripts/status.ps1`
Servis durumunu kontrol etme.

### 8. `scripts/create-mac-app.sh`
```bash
#!/bin/bash
# Mac .app wrapper oluşturma script'i
# Platypus veya Automator kullanarak
# start.sh'i .app içine gömme
# .dmg oluşturma (hdiutil)
```

### 9. `scripts/create-windows-installer.ps1`
```powershell
# Windows .exe installer oluşturma
# NSIS veya Inno Setup kullanarak
# start.ps1'i installer içine gömme
```

### BÖLÜM B: Tauri Desktop App (V2 Foundation)

### 10. `apps/desktop/src-tauri/src/main.rs`
```rust
// Tauri ana dosyası
// - Splash screen
// - Backend service launcher (sidecar)
// - Health check (backend ready mi?)
// - Window management
// - Auto-updater
```

### 11. `apps/desktop/src-tauri/src/commands.rs`
```rust
// Tauri IPC komutları
// - start_backend() → Sidecar başlatma
// - check_backend_health() → Health check
// - open_in_browser() → Tarayıcıda aç
// - get_app_version() → Versiyon bilgisi
// - check_for_updates() → Güncelleme kontrolü
```

### 12. `apps/desktop/src-tauri/src/sidecar.rs`
```rust
// Sidecar process yönetimi
// - Fastify API'yi child process olarak başlat
// - Python NLP'yi child process olarak başlat
// - Process health monitoring
// - Graceful shutdown
```

### 13. `apps/desktop/src-tauri/capabilities/default.json`
Tauri izin tanımları.

### 14. `apps/desktop/src/app.tsx`
```typescript
// Tauri frontend wrapper
// Loading screen while backend starts
// Health check polling
// Error handling
```

### CÖLÜM C: GitHub Actions Release Pipeline

### 15. `.github/workflows/release.yml`
```yaml
name: Build & Release Desktop App

on:
  push:
    tags: ['v*']

jobs:
  # 1. Tag'den versiyon numarasını al
  # 2. Changelog oluştur
  # 3. Docker image'ları build et
  # 4. Mac .dmg oluştur (scripts/create-mac-app.sh)
  # 5. Windows .exe installer oluştur
  # 6. GitHub Release oluştur
  # 7. Asset'leri release'e yükle
```

### 16. `.github/workflows/build-docker.yml`
```yaml
name: Build & Push Docker Images

on:
  push:
    branches: [main]

jobs:
  # Docker image'ları build et
  # GitHub Container Registry'ye push et
  # Tag: latest + git sha
```

### DÖLÜM D: Docker Compose Desktop Config

### 17. `docker/docker-compose.desktop.yml`
```yaml
# Desktop dağıtımı için özel compose
# - Kullanıcı dostu portlar
# - Local volume mount
# - Health check
# - Auto-restart
# - Tek komutla başlatma: docker compose -f docker-compose.desktop.yml up -d
```

### 18. `docker/.env.desktop`
```env
# Desktop dağıtımı için önceden yapılandırılmış env
NODE_ENV=production
APP_PORT=3001
DATABASE_URL=postgresql://airefcheck:airefcheck@postgres:5432/airefcheck
# ...
```

## Test Gereksinimleri
- Mac'te `./scripts/start.sh` çalışıp tüm servisleri başlatmalı
- Windows'ta `.\scripts\start.ps1` çalışıp tüm servisleri başlatmalı
- `docker compose -f docker/docker-compose.desktop.yml up -d` tek komutla çalışmalı
- GitHub Actions workflow'ları syntax olarak geçerli olmalı

## Kritik Kurallar
1. **Cross-platform** — Mac ve Windows'u ayrı ayrı ele al
2. **Kullanıcı dostu** — Akademisyenler teknik değil, tek tıkla çalışmalı
3. **Hata mesajları** — Anlaşılır Türkçe/İngilizce hata mesajları
4. **Docker zorunluluğu** — Docker Desktop kurulu değilse kullanıcıya bilgi ver
5. **Port çakışması** — 3000, 3001, 5432, 6379, 8000 portları kullanılıyor uyarısı
6. **Güvenlik** — .env dosyasında varsayılan şifreler üretimde DEĞİŞTİRİLMELİ uyarısı

## Çıktı
Tüm dosyaları oluştur. Script'ler çalıştırılabilir olmalı (chmod +x). GitHub Actions workflow'ları geçerli YAML olmalı.
