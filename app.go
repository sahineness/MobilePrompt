package main

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"image/png"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"
	tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api/v5"
	"github.com/kbinani/screenshot"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type Ayarlar struct {
	HedefEditorIsimleri []string `json:"hedefEditorIsimleri"`
	TelegramToken       string   `json:"telegramToken"`
	ChatID              string   `json:"chatId"`
	OtomatikEnter       bool     `json:"otomatikEnter"`
	EkranIzni           bool     `json:"ekranIzni"`
}

type KuyrukMaddesi struct {
	Metin           string `json:"metin"`
	RiskliMi        bool   `json:"riskliMi"`
	RiskNedeni      string `json:"riskNedeni"`
	OnayBekliyorMu  bool   `json:"onayBekliyorMu"`
	Kaynak          string `json:"kaynak"`
}

type IslemKuyrugu struct {
	Maddeler    []KuyrukMaddesi `json:"maddeler"`
	GecerliSira int             `json:"gecerliSira"`
}

type SistemDurumu struct {
	AktifProje         string  `json:"aktifProje"`
	BagliEditor        string  `json:"bagliEditor"`
	AktifEditor        string  `json:"aktifEditor"`
	AcikMi             bool    `json:"acikMi"`
	OdaktaMi           bool    `json:"odaktaMi"`
	HwndStr            uintptr `json:"-"`
	YaziyorMu          bool    `json:"yaziyorMu"`
	TelegramBagliMi    bool    `json:"telegramBagliMi"`
	CalisiyorMu        bool    `json:"calisiyorMu"`
	GuvenlikDurumu     string  `json:"guvenlikDurumu"`
	SonIslem           string  `json:"sonIslem"`
	HudAktif           bool    `json:"hudAktif"`
	CpuKullanim        float64 `json:"cpuKullanim"`
	RamKullanim        float64 `json:"ramKullanim"`
}

// App struct
type App struct {
	ctx     context.Context
	ayarlar Ayarlar
	kuyruk  IslemKuyrugu
	durum   SistemDurumu

	bot          *tgbotapi.BotAPI
	isBotRunning bool
	botMutex     sync.Mutex
	durdur       chan struct{}
	mu           sync.Mutex
	otomasyonMu  sync.Mutex
	sonError     string
}

const ayarDosyasi = "ayarlar.json"

// NewApp creates a new App application struct
func NewApp() *App {
	app := &App{
		kuyruk: IslemKuyrugu{
			Maddeler:    []KuyrukMaddesi{},
			GecerliSira: 0,
		},
		durum: SistemDurumu{
			CalisiyorMu: false,
		},
		durdur: make(chan struct{}),
	}
	app.ayarlariYukle()
	return app
}

// startup is called when the app starts.
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.durumGuncellemeGonder()
	if a.ayarlar.TelegramToken != "" {
		a.telegramBotunuBaslat()
	}
}

func (a *App) shutdown(ctx context.Context) {
	a.OtomasyonuDurdur()
	a.stopTelegramBot()
}

func (a *App) ayarDosyasiYolunuGetir() string {
	ex, err := os.Executable()
	if err != nil {
		return ayarDosyasi
	}
	dir := filepath.Dir(ex)
	return filepath.Join(dir, ayarDosyasi)
}

func (a *App) ayarlariYukle() {
	a.mu.Lock()
	defer a.mu.Unlock()

	varsayilanAyarlar := Ayarlar{
		HedefEditorIsimleri: []string{"Cursor", "Code", "Antigravity", "Kiro"},
		OtomatikEnter:       true,
		EkranIzni:           true,
		TelegramToken:       "",
		ChatID:              "",
	}

	data, err := os.ReadFile(a.ayarDosyasiYolunuGetir())
	if err != nil {
		a.ayarlar = varsayilanAyarlar
		return
	}

	var yuklenenAyarlar Ayarlar
	if err := json.Unmarshal(data, &yuklenenAyarlar); err != nil {
		a.ayarlar = varsayilanAyarlar
		return
	}
	a.ayarlar = yuklenenAyarlar
}

func (a *App) ayariDosyayaKaydet() {
	data, err := json.MarshalIndent(a.ayarlar, "", "  ")
	if err == nil {
		os.WriteFile(a.ayarDosyasiYolunuGetir(), data, 0644)
	}
}

// AyarlariGetir returns the current configuration
func (a *App) AyarlariGetir() Ayarlar {
	a.mu.Lock()
	defer a.mu.Unlock()
	return a.ayarlar
}

// AyarlariKaydet saves the configuration persistently
func (a *App) AyarlariKaydet(yeniAyarlar Ayarlar) {
	a.mu.Lock()
	a.ayarlar = yeniAyarlar
	a.mu.Unlock()

	a.ayariDosyayaKaydet()

	if yeniAyarlar.TelegramToken != "" {
		a.telegramBotunuBaslat()
	} else {
		a.durum.TelegramBagliMi = false
		a.bot = nil
	}
	a.durumGuncellemeGonder()
}

// KuyruguGetir returns the current queue
func (a *App) KuyruguGetir() IslemKuyrugu {
	return a.kuyruk
}

func (a *App) SecurityScanner(prompt string) (bool, string) {
	// 1. SQLi
	if matched, _ := regexp.MatchString(`(?i)(insert\s+into|drop\s+table|delete\s+from|union\s+select)`, prompt); matched {
		return true, "SQL Injection Şüphesi"
	}
	// 2. XSS
	if matched, _ := regexp.MatchString(`(?i)(<script>|javascript:|onerror=)`, prompt); matched {
		return true, "XSS Şüphesi"
	}
	// 3. Hardcoded Keys
	if matched, _ := regexp.MatchString(`(?i)(sk_live_[0-9a-zA-Z]{24}|AKIA[0-9A-Z]{16})`, prompt); matched {
		return true, "Hardcoded API Key Şüphesi"
	}
	return false, ""
}

// KuyrugaEkle adds a new prompt to the back of the queue
func (a *App) KuyrugaEkle(prompt string, kaynak string) {
	riskliMi, riskNedeni := a.SecurityScanner(prompt)
	yeniMadde := KuyrukMaddesi{
		Metin:          prompt,
		RiskliMi:       riskliMi,
		RiskNedeni:     riskNedeni,
		OnayBekliyorMu: riskliMi,
		Kaynak:         kaynak,
	}

	if riskliMi {
		a.durum.GuvenlikDurumu = "RİSKLİ"
	} else if a.durum.GuvenlikDurumu == "" {
		a.durum.GuvenlikDurumu = "TEMİZ"
	}

	a.kuyruk.Maddeler = append(a.kuyruk.Maddeler, yeniMadde)
	a.durumGuncellemeGonder()
}

// KuyruguGuncelle updates the entire queue (e.g., for reordering or deleting)
func (a *App) KuyruguGuncelle(maddeler []KuyrukMaddesi) {
	a.kuyruk.Maddeler = maddeler
	if a.kuyruk.GecerliSira >= len(maddeler) {
		a.kuyruk.GecerliSira = 0
	}
	
	// Check if any risky items are left
	hasRisk := false
	for _, m := range maddeler {
		if m.OnayBekliyorMu {
			hasRisk = true
			break
		}
	}
	if hasRisk {
		a.durum.GuvenlikDurumu = "RİSKLİ"
	} else {
		a.durum.GuvenlikDurumu = "TEMİZ"
	}

	a.durumGuncellemeGonder()
}

// SistemDurumunuGetir returns the current engine status
func (a *App) SistemDurumunuGetir() SistemDurumu {
	return a.durum
}

// EditoruOneGetir brings the active AI editor to the foreground
func (a *App) EditoruOneGetir() {
	if a.durum.HwndStr != 0 {
		EditoruOneGetir(a.durum.HwndStr)
	}
}

func (a *App) durumGuncellemeGonder() {
	if a.ctx != nil {
		runtime.EventsEmit(a.ctx, "durum_guncelleme", map[string]interface{}{
			"ayarlar": a.ayarlar,
			"kuyruk":  a.kuyruk,
			"durum":   a.durum,
		})
	}
}

// SistemKaynaklariniGetir returns a formatted string of system resources
func (a *App) SistemKaynaklariniGetir() string {
	ram := a.ramKullanimiOku()
	cpu := a.cpuKullanimiOku()
	return fmt.Sprintf("💻 Sistem Kaynakları:\n🧠 RAM Kullanımı: %%%.0f\n⚙️ CPU Kullanımı: %%%.0f", ram, cpu)
}

// DosyaIncele reads a file and prepends its content as context to a prompt
func (a *App) DosyaIncele(dosyaAdi string, prompt string) (bool, string) {
	if a.durum.AktifProje == "" {
		return false, "Önce /kur ile bir çalışma alanı oluşturun."
	}
	dosyaYolu := filepath.Join(a.durum.AktifProje, dosyaAdi)
	icerik, err := os.ReadFile(dosyaYolu)
	if err != nil {
		return false, fmt.Sprintf("Dosya okunamadı: %s", err.Error())
	}
	zenginPrompt := fmt.Sprintf("BAĞLAM:\n%s\n\n--- TALİMAT:\n%s", string(icerik), prompt)
	a.KuyrugaEkle(zenginPrompt, "Telegram")
	a.durum.SonIslem = "İncelendi: " + dosyaAdi
	a.durumGuncellemeGonder()
	return true, fmt.Sprintf("✅ `%s` dosyası okundu ve prompt zenginleştirildi.", dosyaAdi)
}

func (a *App) ramKullanimiOku() float64 {
	out, err := exec.Command("cmd", "/C", "wmic", "OS", "get", "FreePhysicalMemory,TotalVisibleMemorySize", "/value").Output()
	if err != nil {
		return 0
	}
	lines := strings.Split(string(out), "\n")
	var free, total float64
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "FreePhysicalMemory=") {
			fmt.Sscanf(line, "FreePhysicalMemory=%f", &free)
		}
		if strings.HasPrefix(line, "TotalVisibleMemorySize=") {
			fmt.Sscanf(line, "TotalVisibleMemorySize=%f", &total)
		}
	}
	if total == 0 {
		return 0
	}
	return ((total - free) / total) * 100
}

func (a *App) cpuKullanimiOku() float64 {
	out, err := exec.Command("cmd", "/C", "wmic", "cpu", "get", "loadpercentage", "/value").Output()
	if err != nil {
		return 0
	}
	lines := strings.Split(string(out), "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "LoadPercentage=") {
			var val float64
			fmt.Sscanf(line, "LoadPercentage=%f", &val)
			return val
		}
	}
	return 0
}

// kaynakIzleyici runs in background and periodically updates CPU/RAM
func (a *App) kaynakIzleyici() {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-a.durdur:
			return
		case <-ticker.C:
			a.durum.CpuKullanim = a.cpuKullanimiOku()
			a.durum.RamKullanim = a.ramKullanimiOku()
			a.durumGuncellemeGonder()
		}
	}
}

// EkranGoruntusuAlVeGonder captures primary display and sends to chat
func (a *App) EkranGoruntusuAlVeGonder(chatID int64) {
	n := screenshot.NumActiveDisplays()
	if n <= 0 {
		a.bot.Send(tgbotapi.NewMessage(chatID, "❌ Ekran bulunamadı!"))
		return
	}

	bounds := screenshot.GetDisplayBounds(0)
	img, err := screenshot.CaptureRect(bounds)
	if err != nil {
		a.bot.Send(tgbotapi.NewMessage(chatID, "❌ Ekran görüntüsü alınamadı: "+err.Error()))
		return
	}

	var buf bytes.Buffer
	err = png.Encode(&buf, img)
	if err != nil {
		a.bot.Send(tgbotapi.NewMessage(chatID, "❌ Görüntü işlenemedi!"))
		return
	}

	photoBytes := tgbotapi.FileBytes{
		Name:  "screenshot.png",
		Bytes: buf.Bytes(),
	}

	msg := tgbotapi.NewPhoto(chatID, photoBytes)
	msg.Caption = "📸 MobilePrompt v1.0 Canlı Ekran Görüntüsü"
	a.bot.Send(msg)
}

// stopTelegramBot safely stops receiving updates and nils the bot to prevent reuse panics
func (a *App) stopTelegramBot() {
	a.botMutex.Lock()
	defer a.botMutex.Unlock()

	if a.isBotRunning && a.bot != nil {
		a.bot.StopReceivingUpdates()
		a.isBotRunning = false
		a.bot = nil
	}
}

// OtomasyonuBaslat starts the background watcher and bot
func (a *App) OtomasyonuBaslat() {
	a.otomasyonMu.Lock()
	defer a.otomasyonMu.Unlock()

	if a.durum.CalisiyorMu {
		return
	}
	
	// Safe Restart for Telegram Bot
	a.stopTelegramBot()
	time.Sleep(1 * time.Second) // wait for previous goroutines to naturally exit

	a.durum.CalisiyorMu = true
	a.durdur = make(chan struct{})

	go a.izleyiciDongusu()
	go a.kaynakIzleyici()

	if a.ayarlar.TelegramToken != "" {
		a.telegramBotunuBaslat()
		go a.telegramBotSunucusu()
	}

	a.durumGuncellemeGonder()
}

// OtomasyonuDurdur stops the background routines
func (a *App) OtomasyonuDurdur() {
	a.otomasyonMu.Lock()
	defer a.otomasyonMu.Unlock()

	if !a.durum.CalisiyorMu {
		return
	}
	a.durum.CalisiyorMu = false
	close(a.durdur)
	a.stopTelegramBot()
	a.durumGuncellemeGonder()
}

// internal background routine to check active window
func (a *App) izleyiciDongusu() {
// ... [REST OF IZLEYICIDONGUSU IS UNAFFECTED] ...
// (Skipped for brevity using replacing exactly the needed block)
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-a.durdur:
			return
		case <-ticker.C:

			// 1inci Katman: Acik ve Gorunur Pencereleri Tara
			acikMi, acikIsim, acikHwnd := findOpenWindow(a.ayarlar.HedefEditorIsimleri)

			odaktaMi := false

			if acikMi {
				// 2nci Katman: Eger koltukta acik bir editor varsa, su anda "Focus" (Odak) onda mi kontrol et
				odakBasligi := getActiveWindowTitle()
				if odakBasligi != "" && strings.Contains(strings.ToLower(odakBasligi), strings.ToLower(acikIsim)) {
					odaktaMi = true
				}
			}

			// Durum Degistiyse Guncelle
			oncekiAcikMi := a.durum.AcikMi
			oncekiOdaktaMi := a.durum.OdaktaMi

			degistiMi := false
			if a.durum.AcikMi != acikMi || a.durum.OdaktaMi != odaktaMi || a.durum.AktifEditor != acikIsim {
				a.durum.AcikMi = acikMi
				a.durum.OdaktaMi = odaktaMi
				a.durum.AktifEditor = acikIsim
				a.durum.HwndStr = acikHwnd
				degistiMi = true
			}

			if degistiMi {
				// Sadece İLK DEFA arkaplanda bulunduğunda telegram mesajı at
				if acikMi && !odaktaMi && !oncekiAcikMi {
					if a.bot != nil && a.ayarlar.ChatID != "" {
						chatID, _ := strconv.ParseInt(a.ayarlar.ChatID, 10, 64)
						a.bot.Send(tgbotapi.NewMessage(chatID, "🔍 Editörünüz tespit edildi, bilgisayar başına geçtiğinizde yazmaya hazır olacağım."))
					}
				}

				// Editör odağa (foreground) geçtiğinde
				if a.durum.OdaktaMi && !oncekiOdaktaMi {
					runtime.EventsEmit(a.ctx, "editor_aktif", acikIsim)
					if a.bot != nil && a.ayarlar.ChatID != "" {
						chatID, _ := strconv.ParseInt(a.ayarlar.ChatID, 10, 64)
						a.bot.Send(tgbotapi.NewMessage(chatID, "🚀 Editör en öne getirildi. Yazmaya hazırım!"))
					}
				}
				a.durumGuncellemeGonder()
			}

			// Kuyrukta islenmeyi bekleyen var mi, motor bossa calistir (Fakat editor odaklanmissa)
			if acikMi && odaktaMi && !a.durum.YaziyorMu && a.kuyruk.GecerliSira < len(a.kuyruk.Maddeler) {
				go a.otomasyonMotoru()
			}
		}
	}
}

// otomasyonMotoru processes a prompt
func (a *App) otomasyonMotoru() {
	if a.durum.YaziyorMu || len(a.kuyruk.Maddeler) == 0 || a.kuyruk.GecerliSira >= len(a.kuyruk.Maddeler) {
		return
	}

	madde := a.kuyruk.Maddeler[a.kuyruk.GecerliSira]

	a.durum.YaziyorMu = true
	a.durumGuncellemeGonder()

	if madde.OnayBekliyorMu {
		a.durum.YaziyorMu = false
		a.durumGuncellemeGonder()
		return
	}

	// Bring window to front
	time.Sleep(500 * time.Millisecond)
	a.EditoruOneGetir()
	time.Sleep(500 * time.Millisecond)
	
	// Motor yazmaya baslamadan once SIKI kontrol: Siradaki onayli ama editor gercekten odakta mi?
	acikMi, acikIsim, _ := findOpenWindow(a.ayarlar.HedefEditorIsimleri)
	mOdaktaMi := false
	if acikMi {
		odakBasligi := getActiveWindowTitle()
		if odakBasligi != "" && strings.Contains(strings.ToLower(odakBasligi), strings.ToLower(acikIsim)) {
			mOdaktaMi = true
		}
	}

	if !mOdaktaMi {
		a.durum.YaziyorMu = false
		if a.bot != nil && a.ayarlar.ChatID != "" {
			chatID, _ := strconv.ParseInt(a.ayarlar.ChatID, 10, 64)
			a.bot.Send(tgbotapi.NewMessage(chatID, "⚠️ Lütfen editörü öne getirin! Otomasyon Motoru odağı kaybettiği için durdu."))
		}
		if a.ctx != nil {
			runtime.EventsEmit(a.ctx, "sistem_bildirimi", map[string]string{
				"tip":   "hata",
				"mesaj": "İşlem Durduruldu: Editör odağı bulunamadı.",
			})
		}
		a.durumGuncellemeGonder()
		return
	}

	sendString(madde.Metin)

	if a.ayarlar.OtomatikEnter {
		time.Sleep(200 * time.Millisecond)
		sendEnter()
	}

	// Basarili Islem Bildirimi
	if a.bot != nil && a.ayarlar.ChatID != "" {
		chatID, _ := strconv.ParseInt(a.ayarlar.ChatID, 10, 64)
		a.bot.Send(tgbotapi.NewMessage(chatID, fmt.Sprintf("✅ İşlem No: TX-%d başarıyla editöre aktarıldı.", a.kuyruk.GecerliSira+1)))
	}
	if a.ctx != nil {
		runtime.EventsEmit(a.ctx, "sistem_bildirimi", map[string]string{
			"tip":   "basari",
			"mesaj": fmt.Sprintf("TX-%d Başarıyla Yazıldı", a.kuyruk.GecerliSira+1),
		})
	}

	a.kuyruk.GecerliSira++
	a.durum.YaziyorMu = false
	a.durumGuncellemeGonder()
}

// TelegramBaglantisiniTestEt provides a way to ping the UI to see if token works
func (a *App) TelegramBaglantisiniTestEt(token string) bool {
	testBot, err := tgbotapi.NewBotAPI(token)
	if err != nil {
		return false
	}
	return testBot.Self.UserName != ""
}

// telegramBotunuBaslat connects to TG
func (a *App) telegramBotunuBaslat() {
	a.botMutex.Lock()
	defer a.botMutex.Unlock()

	if a.isBotRunning || a.bot != nil {
		return // Singleton: Bot sadece bir kez başlatılsın
	}

	bot, err := tgbotapi.NewBotAPI(a.ayarlar.TelegramToken)
	if err != nil {
		a.durum.TelegramBagliMi = false
		return
	}
	a.bot = bot
	a.isBotRunning = true
	a.durum.TelegramBagliMi = true
}

// telegramBotSunucusu
func (a *App) telegramBotSunucusu() {
	defer func() {
		if r := recover(); r != nil {
			// sessizce kurtar
		}
	}()

	a.botMutex.Lock()
	botRef := a.bot
	isRunning := a.isBotRunning
	a.botMutex.Unlock()

	if botRef == nil || !isRunning {
		return
	}

	u := tgbotapi.NewUpdate(0)
	u.Timeout = 60

	guncellemeler := botRef.GetUpdatesChan(u)

	for {
		select {
		case <-a.durdur:
			return
		case guncelleme := <-guncellemeler:
			if guncelleme.CallbackQuery != nil && guncelleme.CallbackQuery.Data != "" {
				callback := tgbotapi.NewCallback(guncelleme.CallbackQuery.ID, "")
				a.bot.Request(callback)

				switch guncelleme.CallbackQuery.Data {
				case "onayla":
					if a.kuyruk.GecerliSira < len(a.kuyruk.Maddeler) {
						a.kuyruk.Maddeler[a.kuyruk.GecerliSira].OnayBekliyorMu = false
					}
					msg := tgbotapi.NewMessage(guncelleme.CallbackQuery.Message.Chat.ID, "🚀 Prompt Onaylandı! Yazılıyor...")
					a.bot.Send(msg)
					go a.otomasyonMotoru()
				case "atla":
					msg := tgbotapi.NewMessage(guncelleme.CallbackQuery.Message.Chat.ID, "❌ Prompt Atlandı.")
					a.bot.Send(msg)
					a.kuyruk.GecerliSira++
					a.durumGuncellemeGonder()
				}
			}

			if guncelleme.Message != nil {
				// Eger UI'da henuz ChatID ayarlanmamissa, gelen ilk mesaji (komut ya da düz) yakala ve gonder
				if a.ayarlar.ChatID == "" {
					runtime.EventsEmit(a.ctx, "telegram_chat_id_bulundu", map[string]interface{}{
						"chatId": guncelleme.Message.Chat.ID,
					})
					a.bot.Send(tgbotapi.NewMessage(guncelleme.Message.Chat.ID, "🚀 MobilePrompt v1.0 Sistem Aktif! Sizi dinliyorum Enes."))
				}

				if guncelleme.Message.IsCommand() {
					komutAdi := guncelleme.Message.Command()
					
					// UI'a Toast icin bildirim atalim
					if a.ctx != nil {
						runtime.EventsEmit(a.ctx, "telegram_bildirim", map[string]string{
							"komut": komutAdi,
						})
					}

					switch komutAdi {
					case "durum":
						guvenlik := a.durum.GuvenlikDurumu
						if guvenlik == "" {
							guvenlik = "BİLİNMİYOR"
						}
						msg := tgbotapi.NewMessage(guncelleme.Message.Chat.ID, fmt.Sprintf("MobilePrompt v1.0 Durumu:\nAktif Editör: %s\nKuyruk: %d/%d\nGüvenlik: %s", a.durum.AktifEditor, a.kuyruk.GecerliSira, len(a.kuyruk.Maddeler), guvenlik))
						a.bot.Send(msg)
					case "ekran":
						if !a.ayarlar.EkranIzni {
							msg := tgbotapi.NewMessage(guncelleme.Message.Chat.ID, "❌ Ekran İzni kapalı. Uygulama ayarlarından açın.")
							a.bot.Send(msg)
						} else {
							a.EkranGoruntusuAlVeGonder(guncelleme.Message.Chat.ID)
						}
					case "sonraki":
						if a.kuyruk.GecerliSira < len(a.kuyruk.Maddeler) {
							madde := a.kuyruk.Maddeler[a.kuyruk.GecerliSira]
							uyari := ""
							if madde.OnayBekliyorMu {
								uyari = "🚨 DİKKAT: " + madde.RiskNedeni + "\n\n"
							}
							msg := tgbotapi.NewMessage(guncelleme.Message.Chat.ID, fmt.Sprintf("%sSıradaki prompt:\n\n%s", uyari, madde.Metin))
							keyboard := tgbotapi.NewInlineKeyboardMarkup(
								tgbotapi.NewInlineKeyboardRow(
									tgbotapi.NewInlineKeyboardButtonData("Onayla", "onayla"),
									tgbotapi.NewInlineKeyboardButtonData("Atla", "atla"),
								),
							)
							msg.ReplyMarkup = keyboard
							a.bot.Send(msg)
						} else {
							msg := tgbotapi.NewMessage(guncelleme.Message.Chat.ID, "Kuyruk boş. Yeni komutlar bekleniyor.")
							a.bot.Send(msg)
						}
					case "ozet":
						kalandi := len(a.kuyruk.Maddeler) - a.kuyruk.GecerliSira
						toplam := len(a.kuyruk.Maddeler)
						msg := tgbotapi.NewMessage(guncelleme.Message.Chat.ID, fmt.Sprintf("📊 Özet Rapor:\nŞimdiye kadar %d prompt işlendi.\nToplam %d prompt, kalan: %d.", a.kuyruk.GecerliSira, toplam, kalandi))
						a.bot.Send(msg)
					case "temizle":
						a.kuyruk.Maddeler = []KuyrukMaddesi{}
						a.kuyruk.GecerliSira = 0
						a.durumGuncellemeGonder()
						a.bot.Send(tgbotapi.NewMessage(guncelleme.Message.Chat.ID, "🗑️ Kuyruk tamamen boşaltıldı."))
					case "durdur":
						a.OtomasyonuDurdur()
						a.bot.Send(tgbotapi.NewMessage(guncelleme.Message.Chat.ID, "⏸️ Otomasyon motoru donduruldu."))
					case "devam":
						a.OtomasyonuBaslat()
						a.bot.Send(tgbotapi.NewMessage(guncelleme.Message.Chat.ID, "▶️ Otomasyon motoru başlatıldı."))
					case "guvenlik":
						guv := a.durum.GuvenlikDurumu
						if guv == "" { guv = "GÜVENLİ" }
						rIcon := "✅"
						if guv == "RİSKLİ" { rIcon = "🚨" }
						a.bot.Send(tgbotapi.NewMessage(guncelleme.Message.Chat.ID, fmt.Sprintf("%s Güncel Güvenlik Kalkanı: %s", rIcon, guv)))
					case "kapat":
						a.bot.Send(tgbotapi.NewMessage(guncelleme.Message.Chat.ID, "☠️ İşletim sistemi MobilePrompt bağlantısı kesiliyor. Uygulama kapatıldı."))
						time.Sleep(1 * time.Second)
						os.Exit(0)
					case "iptal":
						// Kuyruktaki son telegram promptunu sil
						if len(a.kuyruk.Maddeler) > a.kuyruk.GecerliSira {
							var yeniKuyruk []KuyrukMaddesi
							var silindi bool
							for i := len(a.kuyruk.Maddeler) - 1; i >= a.kuyruk.GecerliSira; i-- {
								if a.kuyruk.Maddeler[i].Kaynak == "Telegram" && !silindi {
									silindi = true
									continue
								}
								yeniKuyruk = append([]KuyrukMaddesi{a.kuyruk.Maddeler[i]}, yeniKuyruk...)
							}
							
							// Bitenleri koruyarak birlestir
							tamMaddeler := append(a.kuyruk.Maddeler[:a.kuyruk.GecerliSira], yeniKuyruk...)
							
							if silindi {
								a.KuyruguGuncelle(tamMaddeler)
								a.bot.Send(tgbotapi.NewMessage(guncelleme.Message.Chat.ID, "⏪ Telefondan gönderilen son komut kuyruktan silindi."))
							} else {
								a.bot.Send(tgbotapi.NewMessage(guncelleme.Message.Chat.ID, "Kuyrukta iptal edilecek Telegram komutu bulunamadı."))
							}
						} else {
							a.bot.Send(tgbotapi.NewMessage(guncelleme.Message.Chat.ID, "Kuyruk boş, iptal edilecek işlem yok."))
						}
					case "yaz":
						metin := guncelleme.Message.CommandArguments()
						if metin == "" {
							a.bot.Send(tgbotapi.NewMessage(guncelleme.Message.Chat.ID, "Format: `/yaz [Dikte etmek istediğiniz kod komutu]`"))
						} else {
							a.KuyrugaEkle(metin, "Telegram")
							a.bot.Send(tgbotapi.NewMessage(guncelleme.Message.Chat.ID, "⚡ Komut direkt onaylandı ve bilgisayarınıza gönderildi!"))
							// Trigger auto engine if possible
							if a.durum.OdaktaMi && a.kuyruk.GecerliSira < len(a.kuyruk.Maddeler) && !a.durum.YaziyorMu {
								go a.otomasyonMotoru()
							} else if a.durum.AcikMi && !a.durum.OdaktaMi {
								a.EditoruOneGetir()
							}
						}
					case "kur":
						projeAdi := guncelleme.Message.CommandArguments()
						if projeAdi == "" {
							a.bot.Send(tgbotapi.NewMessage(guncelleme.Message.Chat.ID, "Format: `/kur [proje-adi]`"))
						} else {
							home, _ := os.UserHomeDir()
							hedefDizin := filepath.Join(home, "Desktop", projeAdi)
							err := os.MkdirAll(hedefDizin, 0755)
							if err != nil {
								a.bot.Send(tgbotapi.NewMessage(guncelleme.Message.Chat.ID, "❌ Klasör oluşturulamadı: "+err.Error()))
								if a.ctx != nil {
									runtime.EventsEmit(a.ctx, "sistem_bildirimi", map[string]string{"tip": "hata", "mesaj": "Klasör oluşturulamadı!"})
								}
							} else {
								a.durum.AktifProje = hedefDizin
								a.durum.BagliEditor = "" // Proje degisince editor baglantisi da sifirlanir
								a.durumGuncellemeGonder()
								a.bot.Send(tgbotapi.NewMessage(guncelleme.Message.Chat.ID, fmt.Sprintf("📁 Masaüstünde `%s` klasörü oluşturuldu ve Çalışma Alanı olarak belirlendi.", projeAdi)))
								if a.ctx != nil {
									runtime.EventsEmit(a.ctx, "sistem_bildirimi", map[string]string{"tip": "basari", "mesaj": "Çalışma Alanı: " + projeAdi})
								}
							}
						}
					case "kod":
						editorAdi := guncelleme.Message.CommandArguments()
						if editorAdi == "" {
							a.bot.Send(tgbotapi.NewMessage(guncelleme.Message.Chat.ID, "Format: `/kod [editor-adi]` (Örn: `/kod code` veya `/kod cursor`)"))
						} else if a.durum.AktifProje == "" {
							a.bot.Send(tgbotapi.NewMessage(guncelleme.Message.Chat.ID, "⚠️ Önce bir çalışma alanı belirlemelisiniz. (`/kur proje-adi`)"))
						} else {
							cmd := exec.Command("cmd", "/C", "start", editorAdi, a.durum.AktifProje)
							err := cmd.Run()
							
							if err != nil {
								// Hata alirsa hizli fallback
								a.bot.Send(tgbotapi.NewMessage(guncelleme.Message.Chat.ID, fmt.Sprintf("⚠️ `%s` PATH üzerinde bulunamadı, dizinler aranıyor...", editorAdi)))
								
								// Basit Fallback (Ornegin Cursor veya VS Code icin LocalAppData/Programs veya ProgramFiles)
								localApp := os.Getenv("LOCALAPPDATA")
								programF := os.Getenv("PROGRAMFILES")
								
								olasiYollar := []string{
									filepath.Join(localApp, "Programs", editorAdi, editorAdi+".exe"),
									filepath.Join(localApp, "Programs", strings.ToLower(editorAdi), editorAdi+".exe"),
									filepath.Join(programF, editorAdi, editorAdi+".exe"),
								}
								
								bulundu := false
								for _, yol := range olasiYollar {
									if _, err := os.Stat(yol); err == nil {
										exec.Command("cmd", "/C", "start", yol, a.durum.AktifProje).Run()
										bulundu = true
										break
									}
								}

								if !bulundu {
									a.bot.Send(tgbotapi.NewMessage(guncelleme.Message.Chat.ID, "❌ Editör otomatik olarak bulunamadı. Lütfen elle açın."))
									if a.ctx != nil { runtime.EventsEmit(a.ctx, "sistem_bildirimi", map[string]string{"tip": "hata", "mesaj": "Editör Bulunamadı"}) }
									continue
								}
							}
							
							a.durum.BagliEditor = editorAdi
							a.durumGuncellemeGonder()
							a.bot.Send(tgbotapi.NewMessage(guncelleme.Message.Chat.ID, fmt.Sprintf("🚀 `%s` başarıyla `%s` dizininde başlatıldı.", editorAdi, filepath.Base(a.durum.AktifProje))))
							if a.ctx != nil {
								runtime.EventsEmit(a.ctx, "sistem_bildirimi", map[string]string{"tip": "bilgi", "mesaj": editorAdi + " Başlatılıyor..."})
							}
						}
					case "incele":
						arglar := guncelleme.Message.CommandArguments()
						parcalar := strings.SplitN(arglar, " ", 2)
						if len(parcalar) < 2 || parcalar[0] == "" || parcalar[1] == "" {
							a.bot.Send(tgbotapi.NewMessage(guncelleme.Message.Chat.ID, "Format: `/incele [dosya_adi] [prompt]`\nÖrnek: `/incele main.go Bu kodu optimize et`"))
						} else {
							basarili, mesaj := a.DosyaIncele(parcalar[0], parcalar[1])
							a.bot.Send(tgbotapi.NewMessage(guncelleme.Message.Chat.ID, mesaj))
							if basarili {
								if a.durum.OdaktaMi && !a.durum.YaziyorMu {
									go a.otomasyonMotoru()
								}
							}
						}
					case "sistem":
						rapor := a.SistemKaynaklariniGetir()
						a.bot.Send(tgbotapi.NewMessage(guncelleme.Message.Chat.ID, rapor))
					case "onayla":
						if a.kuyruk.GecerliSira < len(a.kuyruk.Maddeler) {
							// Siradaki madde onay bekliyor mu kontrol et
							if a.kuyruk.Maddeler[a.kuyruk.GecerliSira].OnayBekliyorMu {
								a.kuyruk.Maddeler[a.kuyruk.GecerliSira].OnayBekliyorMu = false
								a.durumGuncellemeGonder()
								a.bot.Send(tgbotapi.NewMessage(guncelleme.Message.Chat.ID, "✅ Komut başarıyla onaylandı ve motor tetiklendi."))
								
								// Eger calisiyorsa ve baska islem yapmiyorsa baslat
								if a.durum.CalisiyorMu && !a.durum.YaziyorMu {
									go a.otomasyonMotoru()
								}
							} else {
								a.bot.Send(tgbotapi.NewMessage(guncelleme.Message.Chat.ID, "Siradaki komut zaten onaylanmis veya islemde."))
							}
						} else {
							a.bot.Send(tgbotapi.NewMessage(guncelleme.Message.Chat.ID, "⚠️ Onaylanacak bekleyen bir prompt bulunamadı."))
						}
					}
				} else {
					// Düz metin geldi, React UI'a onay için gönder (slash ile başlamıyor ve UI'da chat is configured)
					if a.ayarlar.ChatID != "" && a.ctx != nil {
						metin := guncelleme.Message.Text
						runtime.EventsEmit(a.ctx, "telegram_prompt_onay_istegi", map[string]string{
							"metin": metin,
						})
						a.bot.Send(tgbotapi.NewMessage(guncelleme.Message.Chat.ID, "⏳ İsteğiniz masaüstüne iletildi. Onay bekleniyor..."))
					}
				}
			}
		}
	}
}

// BuildApp Derleme islemini gerceklestirir ve wails loglarini frontende gonderir
func (a *App) BuildApp(platform string) {
	if a.ctx == nil {
		return
	}

	runtime.EventsEmit(a.ctx, "build_log", "🚀 Derleme işlemi başlatılıyor: "+platform)

	hedef := "windows/amd64"
	switch platform {
	case "linux":
		hedef = "linux/amd64"
		dockerCmd := exec.Command("docker", "ps")
		if err := dockerCmd.Run(); err != nil {
			runtime.EventsEmit(a.ctx, "sistem_bildirimi", map[string]string{"tip": "hata", "mesaj": "Docker Desktop çalışmıyor!"})
			runtime.EventsEmit(a.ctx, "build_log", "❌ Hata: Linux derlemesi için Docker Desktop kurulu ve çalışıyor olmalıdır.")
			runtime.EventsEmit(a.ctx, "build_bitti", false)
			return
		}
		runtime.EventsEmit(a.ctx, "build_log", "✅ Docker bağlantısı başarılı, linux derlemesi hazırlanıyor...")
	case "mac":
		runtime.EventsEmit(a.ctx, "build_log", "❌ Hata: macOS derlemeleri doğrudan Windows üzerinden desteklenmiyor. Lütfen GitHub Actions veya Mac cihaz kullanın.")
		runtime.EventsEmit(a.ctx, "build_bitti", false)
		return
	}

	projeDizini, err := os.Getwd()
	if err != nil {
		runtime.EventsEmit(a.ctx, "build_log", "❌ Çalışma dizini alınamadı: "+err.Error())
		runtime.EventsEmit(a.ctx, "build_bitti", false)
		return
	}

	wailsJsonPath := filepath.Join(projeDizini, "wails.json")
	if _, err := os.Stat(wailsJsonPath); os.IsNotExist(err) {
		runtime.EventsEmit(a.ctx, "sistem_bildirimi", map[string]string{"tip": "hata", "mesaj": "Proje kök dizini bulunamadı"})
		runtime.EventsEmit(a.ctx, "build_log", "❌ Hata: Proje kök dizini bulunamadı. wails.json dosyası eksik.")
		runtime.EventsEmit(a.ctx, "build_log", "Mevcut Dizin: "+projeDizini)
		runtime.EventsEmit(a.ctx, "build_bitti", false)
		return
	}

	cmd := exec.Command("wails", "build", "-platform", hedef)
	cmd.Dir = projeDizini

	stdoutPipe, err := cmd.StdoutPipe()
	if err != nil {
		runtime.EventsEmit(a.ctx, "build_log", "Stdout borusu açılamadı: "+err.Error())
		runtime.EventsEmit(a.ctx, "build_bitti", false)
		return
	}
	stderrPipe, err := cmd.StderrPipe()
	if err != nil {
		runtime.EventsEmit(a.ctx, "build_log", "Stderr borusu açılamadı: "+err.Error())
		runtime.EventsEmit(a.ctx, "build_bitti", false)
		return
	}

	if err := cmd.Start(); err != nil {
		runtime.EventsEmit(a.ctx, "build_log", "Komut başlatılamadı: "+err.Error())
		runtime.EventsEmit(a.ctx, "build_bitti", false)
		return
	}

	// stdout ve stderr streamini eşzamanlı okumak
	var wg sync.WaitGroup
	wg.Add(2)

	logGonder := func(r io.Reader, pfx string) {
		defer wg.Done()
		scanner := bufio.NewScanner(r)
		for scanner.Scan() {
			metin := scanner.Text()
			if strings.TrimSpace(metin) != "" {
				runtime.EventsEmit(a.ctx, "build_log", pfx+metin)
			}
		}
	}

	go logGonder(stdoutPipe, "")
	go logGonder(stderrPipe, "[ERR] ")

	wg.Wait()
	err = cmd.Wait()

	if err != nil {
		runtime.EventsEmit(a.ctx, "build_log", "❌ Derleme sırasında hata oluştu: "+err.Error())
		runtime.EventsEmit(a.ctx, "build_bitti", false)
		return
	}

	// Output tasi
	home, _ := os.UserHomeDir()
	masaustuCikti := filepath.Join(home, "Desktop", "MobilePrompt_Cikti")
	os.MkdirAll(masaustuCikti, 0755)

	buildBinDizini := filepath.Join(projeDizini, "build", "bin")
	exeIsmi := "MobilePrompt.exe" // varsayilan win
	if platform == "linux" {
		exeIsmi = "MobilePrompt"
	}
	kaynakDosya := filepath.Join(buildBinDizini, exeIsmi)
	hedefDosya := filepath.Join(masaustuCikti, exeIsmi)

	input, err := os.ReadFile(kaynakDosya)
	if err == nil {
		err = os.WriteFile(hedefDosya, input, 0755)
		if err == nil {
			runtime.EventsEmit(a.ctx, "build_log", "✅ Derlenmiş dosya başarıyla kopyalandı: "+hedefDosya)
		} else {
			runtime.EventsEmit(a.ctx, "build_log", "⚠️ Dosya kopyalanamadı: "+err.Error())
		}
	} else {
		// eger executable adi farksizsa, gecerli dizinden ilk .exe'yi veya dosyayi bulmayi dene
		runtime.EventsEmit(a.ctx, "build_log", "⚠️ Bin dizininden dosya adı "+exeIsmi+" bulunamadı. Lütfen "+buildBinDizini+" dizinini kontrol edin.")
	}

	runtime.EventsEmit(a.ctx, "build_bitti", true)
}
