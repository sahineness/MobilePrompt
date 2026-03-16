#!/bin/bash
# MobilePrompt - Tek Tıkla Kurulum ve Başlatma Scripti (Mac/Linux)

set -e

echo -e "\033[1;36m=============================================\033[0m"
echo -e "\033[1;36m🚀  MobilePrompt Geliştirici Ortamı Kurulumu  🚀\033[0m"
echo -e "\033[1;36m=============================================\033[0m\n"

echo -e "\033[1;33m🔍 Sistem Gereksinimleri Kontrol Ediliyor...\033[0m"

# 1. Go Kontrolü
if ! command -v go &> /dev/null; then
    echo -e "\033[1;31m❌ Hata: 'go' (Golang) sisteminizde yüklü değil!\033[0m"
    echo -e "Lütfen https://go.dev/dl/ adresinden Golang yükleyin ve tekrar deneyin."
    exit 1
else
    echo -e "\033[1;32m✅ Go kurulu.\033[0m"
fi

# 2. Node.js Kontrolü
if ! command -v npm &> /dev/null; then
    echo -e "\033[1;31m❌ Hata: 'npm' (Node.js) sisteminizde yüklü değil!\033[0m"
    echo -e "Lütfen https://nodejs.org/ adresinden Node.js yükleyin ve tekrar deneyin."
    exit 1
else
    echo -e "\033[1;32m✅ Node.js kurulu.\033[0m"
fi

# 3. Wails Kontrolü ve Yüklenmesi
if ! command -v wails &> /dev/null; then
    echo -e "\033[1;35m📦 Wails bulunamadı, sisteminize global olarak kuruluyor...\033[0m"
    go install github.com/wailsapp/wails/v2/cmd/wails@latest
    echo -e "\033[1;32m✅ Wails başarıyla kuruldu.\033[0m"
else
    echo -e "\033[1;32m✅ Wails kurulu.\033[0m"
fi

echo -e "\n\033[1;33m⚙️ Proje Bağımlılıkları İndiriliyor...\033[0m"

# 4. Backend (Go) Bağımlılıkları
echo -e "\033[1;30m-> Go Modülleri (Backend) güncelleniyor...\033[0m"
go mod tidy

# 5. Frontend (Node) Bağımlılıkları
echo -e "\033[1;30m-> NPM Paketleri (Frontend) yükleniyor...\033[0m"
cd frontend
npm install
cd ..

echo -e "\033[1;32m✅ Tüm bağımlılıklar başarıyla yüklendi.\033[0m\n"

echo -e "\033[1;36m🚀 MobilePrompt Başlatılıyor...\033[0m"
echo -e "\033[1;30mTerminali kapatırsanız uygulama da kapanacaktır.\033[0m"
echo -e "\033[1;36m---------------------------------------------\033[0m"

# 6. Uygulamayı Başlat
wails dev
