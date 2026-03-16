<div align="center">
  <img src="logo.png" alt="MobilePrompt Logo" width="120" height="120" style="border-radius: 20px; box-shadow: 0 0 20px rgba(0,209,255,0.4);">
  <br/>
  <h1>🚀 MobilePrompt v1.0</h1>
  <p><strong>Your PC, in your pocket. The ultimate Mobile-to-PC AI Orchestrator.</strong></p>
  
  [![Go Version](https://img.shields.io/badge/go-1.22+-00ADD8?style=for-the-badge&logo=go)](https://golang.org/)
  [![React](https://img.shields.io/badge/react-18.2+-61DAFB?style=for-the-badge&logo=react)](https://reactjs.org/)
  [![Wails](https://img.shields.io/badge/wails-v2-red?style=for-the-badge&logo=wails)](https://wails.io/)
  [![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
  [![Build Status](https://img.shields.io/badge/build-passing-brightgreen?style=for-the-badge&logo=githubactions)](https://github.com/eness/MobilePrompt)
</div>

<br/>

## 🌌 The Hook
**MobilePrompt** is a paradigm shift in how developers interact with their environments. Imagine dictating code revisions while on the road, managing your local server from bed, or instantly injecting context into your AI editor (Cursor/VS Code) via Telegram, without ever touching your keyboard. 

Designed with a stunning Space Black & Neon Cyan Cyber-Aesthetic glassmorphism UI, MobilePrompt acts as an invisible bridge between your mobile device and your desktop workspace. It's not just an orchestrator; it's your remote AI co-pilot.

---

## ✨ Feature Highlights

- 📱 **Mobile Command Center:** Complete control of your PC via Telegram. Send commands, check logs, and trigger workflows on the fly.
- 💉 **Context Injector:** Remotely read project files and inject them directly as context into your actively focused AI editor.
- 🏗️ **Instant Scaffolding:** Create new project workspaces and launch editors with a single `/kur` and `/kod` command sequence.
- 🛡️ **Cyber-Security Ready:** Built for security professionals and power users to remotely manage and execute automated scripts safely.
- ⚡ **Go-Powered Performance:** Built on **Wails V2**, ensuring an ultra-lightweight, blazing-fast, and cross-platform native backend.

---

## 🤖 Telegram Command Palette

Master your desktop with our comprehensive Telegram bot command set:

| Command | Description |
| :--- | :--- |
| `/durum` | 📊 **System Status:** View real-time resource usage & queue status. |
| `/kur [name]` | 📁 **Scaffold:** Create a brand new workspace directory on your desktop. |
| `/kod [editor]` | 🖥️ **Launch:** Open the active workspace in your preferred code editor. |
| `/yaz [text]` | ⚡ **Dictate:** Instantly inject dictation or code directly into the active editor. |
| `/incele [file]` | 🔍 **Inject Context:** Scan the workspace for a file and set it as AI context. |
| `/ekran` | 📸 **Screenshot:** Get a live snapshot of your desktop workspace instantly. |
| `/sonraki` | ⏭️ **Next:** Manually advance to the next task in the automation queue. |
| `/ozet` | 📈 **Summary:** Generate a report of consumed prompts and operations. |
| `/temizle` | 🗑️ **Clear:** Flush the operation queue immediately (Emergency Stop). |
| `/durdur` | ⏸️ **Pause:** Suspend the automation compiler temporarily. |
| `/devam` | ▶️ **Resume:** Restart paused automation processes. |
| `/guvenlik` | 🛡️ **Scanner:** Check the Security Scanner status for potential prompt risks. |
| `/kapat` | ☠️ **Shutdown:** Perform a remote shutdown of the MobilePrompt host system. |

---

## 🚀 Quick Setup

We've automated the entire build and installation process. Missing Go, Node, or Wails? The script installs them for you.

### For Windows

Run the following in PowerShell within the directory:
```powershell
.\kurulum.ps1
```

### For macOS & Linux

Execute the bash script in your terminal:
```bash
chmod +x kurulum.sh
./kurulum.sh
```

*(This single command verifies dependencies, installs missing modules, and launches the application in developer mode.)*

---

## 🔒 Security & False Positives Notice

**IMPORTANT:** MobilePrompt utilizes `go-vgo/robotgo` for low-level keyboard/mouse automation and `kbinani/screenshot` for remote desktop viewing. Due to the nature of these powerful background APIs, **certain Antivirus software might flag the compiled executable** as a false positive (e.g., 2/72 on VirusTotal).

Rest assured, this is purely due to the heuristic analysis of automation behaviors. The entire source code is open and transparent. We prioritize security and implement Thread-Safe operations (Guard & Mutex) to prevent unauthorized execution.

---

## 🌐 Documentation & Localization

<details open>
<summary>🇹🇷 <b>Turkish Documentation (Kurulum Rehberi)</b></summary>

MobilePrompt v1.0, bilgisayarınızı Telegram üzerinden yönetmenizi sağlayan ultra hızlı bir yapay zeka orkestratörüdür. Kurulum için `kurulum.ps1` veya `kurulum.sh` betiklerini çalıştırmanız yeterlidir. Uygulamayı başlattıktan sonra Telegram entegrasyonu için aşağıdaki 5 adımı izleyin:

1. **Bot Oluşturma:** Telegram'da **@BotFather** hesabına gidin ve `/newbot` komutuyla yeni bir bot oluşturarak size verilen HTTP API Token'ı kopyalayın.
2. **Token Girişi:** MobilePrompt masaüstü arayüzünde sol menüden "Sistem Ayarları"na gidin. Kopyaladığınız Token'ı yapıştırıp ayarları kaydedin. (Chat ID boş kalabilir).
3. **Bağlantı Kurma:** Soldaki menüden "Sistemi Başlat" butonuna tıklayarak motoru aktif edin. Ardından Telegram'da kendi botunuza gidip "Start" diyerek veya herhangi bir mesaj atarak uygulamanın sizin kimliğinize kenetlenmesini sağlayın.
4. **Komutları Tanımlama:** Uygulamanın tam potansiyeli için BotFather'a dönüp `/setcommands` komutunu girin. MobilePrompt içindeki "Kurulum Rehberi" sayfasında bulunan komut listesini olduğu gibi kopyalayıp BotFather'a yapıştırın.
5. **İlk Kullanım:** Botunuzda menü belirecektir. `/kur "Yeni Proje"` ile masanızda anında bir çalışma alanı oluşturun, `/kod` yazarak o klasörü kod editörünüzde başlatın ve bilgisayar başına geçmeden çalışmaya başlayın.
</details>

---

<div align="center">
  <p>
    <a href="https://multidesign.com.tr" target="_blank">multidesign.com.tr</a> • 
    <a href="https://github.com/sahiinenes" target="_blank">GitHub</a> • 
    <a href="https://linkedin.com/in/sahiinenes" target="_blank">LinkedIn</a>
  </p>
</div>
