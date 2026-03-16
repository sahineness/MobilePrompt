<#
.SYNOPSIS
    MobilePrompt - Tek Tıkla Kurulum ve Başlatma Scripti (Windows)
.DESCRIPTION
    Go, Node.js ve Wails bağımlılıklarını kontrol eder, eksikleri yükler,
    projeyi derler ve geliştirici modunda (wails dev) başlatır.
#>

$ErrorActionPreference = "Stop"

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "🚀 MobilePrompt Geliştirici Ortamı Kurulumu 🚀" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# 1. Ortam Kontrolü
Write-Host "🔍 Sistem Gereksinimleri Kontrol Ediliyor..." -ForegroundColor Yellow

$goInstalled = Get-Command go -ErrorAction SilentlyContinue
if (!$goInstalled) {
    Write-Host "❌ Hata: 'go' (Golang) sisteminizde yüklü değil!" -ForegroundColor Red
    Write-Host "Lütfen https://go.dev/dl/ adresinden Golang yükleyin ve tekrar deneyin." -ForegroundColor White
    exit 1
} else {
    Write-Host "✅ Go kurulu." -ForegroundColor Green
}

$npmInstalled = Get-Command npm -ErrorAction SilentlyContinue
if (!$npmInstalled) {
    Write-Host "❌ Hata: 'npm' (Node.js) sisteminizde yüklü değil!" -ForegroundColor Red
    Write-Host "Lütfen https://nodejs.org/ adresinden Node.js yükleyin ve tekrar deneyin." -ForegroundColor White
    exit 1
} else {
    Write-Host "✅ Node.js kurulu." -ForegroundColor Green
}

# 2. Wails Kurulumu
$wailsInstalled = Get-Command wails -ErrorAction SilentlyContinue
if (!$wailsInstalled) {
    Write-Host "📦 Wails bulunamadı, sisteminize global olarak kuruluyor..." -ForegroundColor Magenta
    try {
        go install github.com/wailsapp/wails/v2/cmd/wails@latest
        Write-Host "✅ Wails başarıyla kuruldu." -ForegroundColor Green
    } catch {
        Write-Host "❌ Wails kurulumunda bir hata oluştu." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ Wails kurulu." -ForegroundColor Green
}

Write-Host ""
Write-Host "⚙️ Proje Bağımlılıkları İndiriliyor..." -ForegroundColor Yellow

# 3. Kök Dizin Go modülleri
Write-Host "-> Go Modülleri (Backend) güncelleniyor..." -ForegroundColor DarkGray
go mod tidy
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Go modülleri güncellenirken hata oluştu." -ForegroundColor Red
    exit 1
}

# 4. Frontend Node modülleri
Write-Host "-> NPM Paketleri (Frontend) yükleniyor..." -ForegroundColor DarkGray
Push-Location frontend
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ NPM paketleri yüklenirken hata oluştu." -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location

Write-Host "✅ Tüm bağımlılıklar başarıyla yüklendi." -ForegroundColor Green
Write-Host ""
Write-Host "🚀 MobilePrompt Başlatılıyor..." -ForegroundColor Cyan
Write-Host "Terminali kapatırsanız uygulama da kapanacaktır." -ForegroundColor DarkGray
Write-Host "---------------------------------------------" -ForegroundColor Cyan

# 5. Başlat
wails dev