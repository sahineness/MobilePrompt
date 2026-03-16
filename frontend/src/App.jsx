import { useState, useEffect } from 'react';
import { Reorder, AnimatePresence, motion } from 'framer-motion';
import { 
  PlayIcon, StopIcon, PaperAirplaneIcon, TrashIcon, 
  Cog6ToothIcon, HomeIcon, QueueListIcon, 
  ComputerDesktopIcon, DevicePhoneMobileIcon, CheckBadgeIcon,
  CheckCircleIcon, ClipboardDocumentCheckIcon, ChatBubbleOvalLeftEllipsisIcon, CloudArrowDownIcon
} from '@heroicons/react/24/solid';

const EventsOn = (eventName, callback) => window.runtime.EventsOn(eventName, callback);
const AyarlariGetir = () => window.go.main.App.AyarlariGetir();
const AyarlariKaydet = (c) => window.go.main.App.AyarlariKaydet(c);
const KuyruguGetir = () => window.go.main.App.KuyruguGetir();
const KuyrugaEkle = (p, kaynak) => window.go.main.App.KuyrugaEkle(p, kaynak);
const KuyruguGuncelle = (q) => window.go.main.App.KuyruguGuncelle(q);
const SistemDurumunuGetir = () => window.go.main.App.SistemDurumunuGetir();
const OtomasyonuBaslat = () => window.go.main.App.OtomasyonuBaslat();
const OtomasyonuDurdur = () => window.go.main.App.OtomasyonuDurdur();
const TelegramBaglantisiniTestEt = (t) => window.go.main.App.TelegramBaglantisiniTestEt(t);
const EditoruOneGetir = () => window.go.main.App.EditoruOneGetir();
const BuildApp = (platform) => window.go.main.App.BuildApp(platform);
function MenuButonu({ aktif, ikon, etiket, onClick }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full py-4 rounded-xl flex items-center gap-4 px-6 font-bold tracking-widest text-xs uppercase transition-all duration-300 ${
        aktif 
          ? 'bg-[#00D1FF]/10 text-[#00D1FF] border border-[#00D1FF]/20 shadow-[0_0_20px_rgba(0,209,255,0.15)]' 
          : 'text-gray-500 hover:bg-white/5 hover:text-white border border-transparent'
      }`}
    >
      {ikon} 
      {etiket}
    </button>
  );
}

export default function App() {
  const [ayarlar, setAyarlar] = useState(null);
  const [kuyruk, setKuyruk] = useState({ maddeler: [], gecerliSira: 0 });
  const [durum, setDurum] = useState({ aktifEditor: '', acikMi: false, odaktaMi: false, yaziyorMu: false, telegramBagliMi: false, calisiyorMu: false, guvenlikDurumu: 'BİLİNMİYOR', sonIslem: '', cpuKullanim: 0, ramKullanim: 0 });
  const [yeniPrompt, setYeniPrompt] = useState('');
  const [mevcutSayfa, setMevcutSayfa] = useState('dashboard');
  const [exportLog, setExportLog] = useState([]);
  const [isExporting, setIsExporting] = useState(false);

  // Settings Temp State
  const [tgToken, setTgToken] = useState('');
  const [tgChatID, setTgChatID] = useState('');
  const [editorlerStr, setEditorlerStr] = useState('');
  const [ekranIzni, setEkranIzni] = useState(true);
  const [testSonucu, setTestSonucu] = useState(null);
  
  const [toastBildirimi, setToastBildirimi] = useState(null);
  const [onayBekleyenPrompt, setOnayBekleyenPrompt] = useState(null);

  useEffect(() => {
    durumuYukle();
    
    const abonelikIptal = EventsOn('durum_guncelleme', (data) => {
      setAyarlar(data.ayarlar);
      setKuyruk(data.kuyruk);
      setDurum(data.durum);
    });
    
    const tgBildirimIptal = EventsOn('telegram_bildirim', (data) => {
       setToastBildirimi({ tip: data.tip || 'bilgi', mesaj: `Telegram: /${data.komut}` });
       setTimeout(() => setToastBildirimi(null), 4000);
    });

    const sistemBildirimIptal = EventsOn('sistem_bildirimi', (data) => {
       setToastBildirimi({ tip: data.tip, mesaj: data.mesaj });
       setTimeout(() => setToastBildirimi(null), 4000);
    });
    
    const tgOnayIstegiIptal = EventsOn('telegram_prompt_onay_istegi', (data) => {
       setOnayBekleyenPrompt(data.metin);
    });

    const buildLogIptal = EventsOn('build_log', (rawMsg) => {
       const msg = rawMsg.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
       setExportLog(prev => [...prev.slice(-99), msg]);
    });
    const buildDoneIptal = EventsOn('build_bitti', (basarili) => {
       setIsExporting(false);
    });

    return () => { abonelikIptal(); tgBildirimIptal(); tgOnayIstegiIptal(); sistemBildirimIptal(); buildLogIptal(); buildDoneIptal(); };
  }, []);

  const durumuYukle = async () => {
    try {
      const a = await AyarlariGetir();
      const k = await KuyruguGetir();
      const d = await SistemDurumunuGetir();
      setAyarlar(a);
      setKuyruk(k);
      setDurum(d);
      
      setTgToken(a.telegramToken || '');
      setTgChatID(a.chatId || '');
      setEditorlerStr((a.hedefEditorIsimleri || []).join(', '));
      setEkranIzni(a.ekranIzni ?? true);
    } catch (e) {
      // sessizce kurtar
    }
  };

  const promptEkle = async () => {
    if (!yeniPrompt.trim()) return;
    await KuyrugaEkle(yeniPrompt.trim(), "Masaüstü");
    setYeniPrompt('');
  };

  const siralamayiGuncelle = async (yeniMaddeler) => {
    await KuyruguGuncelle(yeniMaddeler);
  };

  const sil = async (index) => {
    const yeniMaddeler = kuyruk.maddeler.filter((_, i) => i !== index);
    await KuyruguGuncelle(yeniMaddeler);
  };

  const otomasyonuGecisYap = async () => {
    if (durum.calisiyorMu) {
      await OtomasyonuDurdur();
    } else {
      await OtomasyonuBaslat();
    }
  };

  const ayarlariKaydetIslemi = async () => {
    const hedefEditorler = editorlerStr.split(',').map(s => s.trim()).filter(Boolean);
    const yeniAyarData = {
      ...ayarlar,
      telegramToken: tgToken,
      chatId: tgChatID,
      hedefEditorIsimleri: hedefEditorler.length > 0 ? hedefEditorler : ["Cursor", "Code", "Antigravity", "Kiro"],
      otomatikEnter: ayarlar.otomatikEnter ?? true,
      ekranIzni: ekranIzni,
    };
    await AyarlariKaydet(yeniAyarData);
    setTestSonucu({ type: 'success', msg: 'Ayarlar başarıyla kaydedildi.' });
    setTimeout(() => setTestSonucu(null), 3000);
  };

  const baglantiyiTestEt = async () => {
    if (!tgToken.trim()) {
      setTestSonucu({ type: 'error', msg: 'Token boş bırakılamaz.' });
      return;
    }
    setTestSonucu({ type: 'info', msg: 'Bağlantı test ediliyor...' });
    const basariliMi = await TelegramBaglantisiniTestEt(tgToken.trim());
    if (basariliMi) {
      setTestSonucu({ type: 'success', msg: 'Bağlantı başarılı!' });
    } else {
      setTestSonucu({ type: 'error', msg: 'Bağlanılamadı. Token hatalı olabilir.' });
    }
  };

  if (!ayarlar) return <div className="h-screen w-screen flex items-center justify-center text-[#00D1FF] bg-[#0B0E14] font-sans tracking-widest text-sm font-bold animate-pulse">V13 MOTORU BAŞLATILIYOR...</div>;

  return (
    <div className="h-screen w-screen bg-[#0B0E14] font-sans text-white overflow-hidden flex flex-col relative select-none">
      
      {/* Title Bar (Modern In-App) */}
      <div style={{ '--wails-draggable': 'drag' }} className="h-12 border-b border-white/5 bg-black/40 backdrop-blur-xl flex justify-between items-center px-6 shrink-0 z-50">
         <div className="flex items-center gap-4 pointer-events-none">
            <span className="text-[11px] font-black tracking-[0.2em] text-gray-500 uppercase">MOBILE<span className="text-[#00D1FF]">PROMPT</span></span>
         </div>
      </div>

      <div className="flex flex-1 h-[calc(100vh-3rem)]">
        
        {/* Left Sidebar */}
        <div className="w-72 border-r border-white/5 bg-black/20 backdrop-blur-2xl flex flex-col py-8 px-6 no-drag-region shrink-0">
          
          <div className="flex items-center gap-4 mb-12">
            <div className="w-3 h-3 rounded-full bg-[#00D1FF] shadow-[0_0_15px_#00D1FF] animate-pulse"></div>
            <div className="flex flex-col">
              <span className="text-white font-black text-sm tracking-widest uppercase">System Core</span>
              <div className="flex items-center gap-2 mt-1">
                 <span className="text-[#00D1FF]/70 font-bold text-[10px] tracking-widest uppercase">Master UI</span>
                 <span className="bg-[#00D1FF]/10 text-[#00D1FF] border border-[#00D1FF]/30 px-1.5 py-0.5 rounded text-[8px] font-black">v1.0</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 flex-1">
             <MenuButonu aktif={mevcutSayfa === 'dashboard'} ikon={<HomeIcon className="w-5 h-5"/>} etiket="Dashboard" onClick={() => setMevcutSayfa('dashboard')} />
             <MenuButonu aktif={mevcutSayfa === 'kurulum'} ikon={<ChatBubbleOvalLeftEllipsisIcon className="w-5 h-5"/>} etiket="Kurulum Rehberi" onClick={() => setMevcutSayfa('kurulum')} />
             <MenuButonu aktif={mevcutSayfa === 'kuyruk'} ikon={<QueueListIcon className="w-5 h-5"/>} etiket="İşlem Kuyruğu" onClick={() => setMevcutSayfa('kuyruk')} />
             <MenuButonu aktif={mevcutSayfa === 'export'} ikon={<CloudArrowDownIcon className="w-5 h-5"/>} etiket="Dışa Aktar" onClick={() => setMevcutSayfa('export')} />
             <MenuButonu aktif={mevcutSayfa === 'ayarlar'} ikon={<Cog6ToothIcon className="w-5 h-5"/>} etiket="Sistem Ayarları" onClick={() => setMevcutSayfa('ayarlar')} />
          </div>

          {/* Motor Toggle */}
          <button 
             onClick={otomasyonuGecisYap}
             className={`w-full py-5 rounded-2xl flex items-center justify-center gap-3 text-xs font-black transition-all duration-500 uppercase tracking-widest border shadow-2xl mt-8 ${
               durum.calisiyorMu 
                 ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border-rose-500/30 hover:shadow-[0_0_30px_rgba(244,63,94,0.3)]' 
                 : 'bg-[#00D1FF]/10 text-[#00D1FF] hover:bg-[#00D1FF]/20 border-[#00D1FF]/30 hover:shadow-[0_0_30px_rgba(0,209,255,0.3)]'
             }`}
           >
             {durum.calisiyorMu ? (
                <><StopIcon className="w-5 h-5" /> MOTORU DURDUR</>
             ) : (
                <><PlayIcon className="w-5 h-5" /> SİSTEMİ BAŞLAT</>
             )}
           </button>
        </div>

        {/* Main Area Area */}
        <div className="flex-1 p-8 overflow-y-auto no-drag-region relative custom-scrollbar">
          
          {/* Global Toast */}
          <AnimatePresence>
            {toastBildirimi && (
              <motion.div initial={{ opacity: 0, y: -20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9, y: -20 }}
                className={`absolute top-8 right-8 z-50 border rounded-2xl p-4 backdrop-blur-xl flex items-center gap-3 shadow-2xl ${
                   toastBildirimi.tip === 'hata' ? 'bg-rose-500/10 border-rose-500/40 text-rose-100' :
                   toastBildirimi.tip === 'uyari' ? 'bg-orange-500/10 border-orange-500/40 text-orange-100' :
                   'bg-[#00D1FF]/10 border-[#00D1FF]/40 text-cyan-50'
                }`}
              >
                <span className="text-sm font-bold tracking-wide">{toastBildirimi.mesaj}</span>
              </motion.div>
            )}

            {/* TG Confirmation Modal */}
            {onayBekleyenPrompt && (
              <motion.div initial={{ opacity: 0, y: 30, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95, y: 30 }}
                className="absolute bottom-8 right-8 z-50 bg-[#0B0E14] border border-[#00D1FF]/40 rounded-3xl p-6 shadow-[0_0_50px_rgba(0,209,255,0.15)] ring-1 ring-[#00D1FF]/20 w-96 backdrop-blur-3xl"
              >
                <div className="flex items-center gap-3 mb-4">
                   <div className="w-10 h-10 rounded-full bg-[#00D1FF]/20 flex flex-shrink-0 items-center justify-center animate-pulse">
                      <DevicePhoneMobileIcon className="w-6 h-6 text-[#00D1FF]" />
                   </div>
                   <div>
                     <h3 className="text-sm font-black text-white tracking-widest uppercase">Telegram Komutu</h3>
                     <p className="text-xs text-[#00D1FF]/80">Sıraya eklenmeyi bekliyor</p>
                   </div>
                </div>
                <div className="bg-black/60 border border-white/5 rounded-xl p-4 mb-5 text-[13px] leading-relaxed text-gray-300 max-h-32 overflow-y-auto custom-scrollbar">
                   {onayBekleyenPrompt}
                </div>
                <div className="flex gap-3">
                   <button onClick={() => { KuyrugaEkle(onayBekleyenPrompt, "Telegram").then(() => setOnayBekleyenPrompt(null)); }} className="flex-1 bg-[#00D1FF] text-[#0B0E14] font-black tracking-widest uppercase py-3 rounded-xl hover:bg-cyan-400 transition-colors shadow-lg">ONAYLA</button>
                   <button onClick={() => setOnayBekleyenPrompt(null)} className="flex-1 bg-white/5 text-gray-400 font-bold tracking-widest uppercase py-3 rounded-xl border border-white/10 hover:bg-white/10 hover:text-white transition-colors">REDDET</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {mevcutSayfa === 'dashboard' && (
              <motion.div key="dashboard" initial={{ opacity: 0, filter: 'blur(10px)' }} animate={{ opacity: 1, filter: 'blur(0px)' }} exit={{ opacity: 0 }} className="flex flex-col gap-6 max-w-5xl mx-auto h-full">
                
                {/* Top Status Bar */}
                <div className="flex items-center justify-between px-2 mb-2">
                  <h2 className="text-3xl font-black text-white tracking-tighter">SİSTEM <span className="text-[#00D1FF]">DURUMU</span></h2>
                  
                  {/* Bot Aktif Indicator */}
                  {durum.telegramBagliMi && (
                    <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-4 py-2 rounded-full">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#10b981] animate-pulse"></div>
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Bot Aktif</span>
                    </div>
                  )}
                </div>

                {/* Dynamic Status Panel */}
                <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-10 flex flex-col items-center justify-center min-h-[300px] relative overflow-hidden backdrop-blur-3xl shadow-2xl">
                   <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,209,255,0.03)_0%,transparent_70%)]"></div>
                   
                   <AnimatePresence mode="wait">
                    {durum.acikMi && durum.odaktaMi && durum.calisiyorMu ? (
                      <motion.div key="active" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center z-10">
                        <div className="relative mb-8">
                          <div className="absolute -inset-8 bg-[#00D1FF]/20 rounded-full blur-3xl animate-pulse"></div>
                          <div className="w-32 h-32 rounded-full border border-[#00D1FF]/50 bg-[#00D1FF]/10 flex items-center justify-center shadow-[0_0_60px_rgba(0,209,255,0.5)] relative z-10 backdrop-blur-md">
                            <CheckBadgeIcon className="w-16 h-16 text-[#00D1FF] drop-shadow-[0_0_15px_#00D1FF]" />
                          </div>
                        </div>
                        <h2 className="text-3xl font-black text-white tracking-widest drop-shadow-md uppercase text-center mb-3">
                          <span className="text-[#00D1FF]">{durum.aktifEditor}</span> HAZIR
                        </h2>
                        <p className="text-emerald-400 text-sm font-bold tracking-widest uppercase bg-emerald-500/10 px-5 py-2 rounded-full border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)] flex items-center gap-3">
                           <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_#10b981]"></span> YAZMAYA HAZIR
                        </p>
                      </motion.div>
                    ) : durum.acikMi && durum.calisiyorMu ? (
                      <motion.div key="found" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center z-10">
                        <div className="relative mb-8">
                          <div className="absolute -inset-8 bg-amber-500/10 rounded-full blur-3xl animate-pulse"></div>
                          <div className="w-32 h-32 rounded-full border border-amber-500/40 bg-amber-500/5 flex items-center justify-center shadow-[0_0_60px_rgba(245,158,11,0.2)] relative z-10 backdrop-blur-md">
                            <ComputerDesktopIcon className="w-14 h-14 text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.8)]" />
                          </div>
                        </div>
                        <h2 className="text-2xl font-black text-white tracking-widest drop-shadow-md uppercase text-center mb-4 flex items-center gap-3">
                          <CheckCircleIcon className="w-8 h-8 text-amber-400" /> KOD EDİTÖRÜ BULUNDU
                        </h2>
                        <p className="text-amber-200/90 text-sm font-medium tracking-wide bg-amber-500/10 px-6 py-4 rounded-2xl border border-amber-500/30 text-center max-w-sm shadow-[0_0_20px_rgba(245,158,11,0.1)]">
                           Otomatik yazım için lütfen <strong>{durum.aktifEditor}</strong> uygulamasını öne getiriniz.
                        </p>
                      </motion.div>
                    ) : durum.calisiyorMu ? (
                      <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center z-10">
                        <div className="relative flex items-center justify-center mb-10 w-40 h-40">
                           {/* Pulsing Neon Ring */}
                           <div className="absolute inset-0 border-2 border-[#00D1FF]/40 rounded-full animate-ping shadow-[0_0_30px_rgba(0,209,255,0.3)] duration-[3s]"></div>
                           <div className="absolute inset-4 border border-[#00D1FF]/20 rounded-full animate-[spin_4s_linear_infinite] border-t-[#00D1FF] shadow-[0_0_20px_rgba(0,209,255,0.2)]"></div>
                           <div className="w-20 h-20 rounded-full bg-[#0B0E14] border-2 border-white/5 shadow-inner flex items-center justify-center z-10">
                              <div className="w-6 h-6 rounded-full bg-[#00D1FF] shadow-[0_0_20px_#00D1FF] animate-pulse"></div>
                           </div>
                        </div>
                        <h2 className="text-xl font-black tracking-widest text-gray-300 uppercase drop-shadow-sm">
                          Yapay Zeka Editörü Arıyor...
                        </h2>
                        <p className="text-gray-600 mt-3 text-sm font-bold tracking-widest uppercase">{ayarlar.hedefEditorIsimleri.join(' • ')}</p>
                      </motion.div>
                    ) : (
                      <motion.div key="stopped" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center z-10">
                         <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6 opacity-50 grayscale">
                            <StopIcon className="w-10 h-10 text-gray-500" />
                         </div>
                         <h2 className="text-xl font-black tracking-widest text-gray-500 uppercase">Motor Devredışı</h2>
                      </motion.div>
                    )}
                   </AnimatePresence>
                </div>

                {/* Manual Entry */}
                <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-8 flex flex-col shadow-2xl relative mt-4">
                  <h3 className="text-[10px] font-black tracking-[0.2em] text-[#00D1FF] uppercase flex items-center gap-2 mb-4">
                     Manuel Komut Girişi
                  </h3>
                  <textarea 
                      value={yeniPrompt} onChange={e => setYeniPrompt(e.target.value)}
                      placeholder="Uygulamaya doğrudan işlem eklemek için burayı kullanın..."
                      className="w-full h-32 bg-black/40 border border-white/5 rounded-2xl p-5 text-sm leading-relaxed text-gray-200 focus:outline-none focus:border-[#00D1FF]/50 focus:ring-1 focus:ring-[#00D1FF]/50 transition-all resize-none"
                  />
                  <div className="flex justify-end mt-4">
                    <button onClick={promptEkle} disabled={!yeniPrompt.trim()} className="bg-[#00D1FF]/10 leading-none h-12 hover:bg-[#00D1FF]/20 disabled:opacity-30 disabled:cursor-not-allowed border border-[#00D1FF]/30 rounded-xl px-8 flex items-center justify-center gap-2 font-black tracking-widest text-xs uppercase transition-all text-[#00D1FF] shadow-[0_0_15px_rgba(0,209,255,0.1)] hover:shadow-[0_0_25px_rgba(0,209,255,0.2)]">
                      <PaperAirplaneIcon className="w-4 h-4 -rotate-45" /> GÖNDER
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {mevcutSayfa === 'kurulum' && (
              <motion.div key="kurulum" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-6 max-w-4xl mx-auto h-full pb-10">
                <div className="flex items-center justify-between px-2 mb-2">
                  <h2 className="text-3xl font-black text-white tracking-tighter">KURULUM <span className="text-[#00D1FF]">REHBERİ</span></h2>
                  <span className="text-xs font-black tracking-widest text-gray-500 uppercase">Telegram Entegrasyon Dokümantasyonu</span>
                </div>

                <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-10 flex flex-col gap-8 shadow-2xl relative backdrop-blur-3xl overflow-y-auto w-full max-w-full custom-scrollbar">
                  
                  {/* Adım 1: Bot Oluşturma */}
                  <div className="relative p-8 rounded-2xl bg-black/40 border border-white/5 hover:border-[#00D1FF]/20 transition-all flex flex-col gap-4 group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-[#00D1FF]/20 group-hover:bg-[#00D1FF] transition-colors shadow-[0_0_15px_#00D1FF]"></div>
                    <div className="flex items-center gap-4">
                       <span className="w-10 h-10 rounded-xl bg-[#00D1FF]/10 text-[#00D1FF] border border-[#00D1FF]/30 flex items-center justify-center font-black text-lg">1</span>
                       <h3 className="text-sm font-black tracking-[0.2em] text-white uppercase">Bot Oluşturma</h3>
                    </div>
                    <p className="text-gray-400 text-sm leading-relaxed pl-14">
                      Telegram'da <strong className="text-white">@BotFather</strong> hesabına gidin ve <kbd className="bg-white/10 px-2 py-1 rounded text-[#00D1FF] border border-white/5 font-mono text-xs">/newbot</kbd> komutunu verin. Süreci takip ederek botunuza bir isim ve benzersiz bir kullanıcı adı belirleyin. İşlem sonunda size bir HTTP API Token verilecektir.
                    </p>
                  </div>

                  {/* Adım 2: Token Girişi */}
                  <div className="relative p-8 rounded-2xl bg-black/40 border border-white/5 hover:border-[#00D1FF]/20 transition-all flex flex-col gap-4 group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-[#00D1FF]/20 group-hover:bg-[#00D1FF] transition-colors shadow-[0_0_15px_#00D1FF]"></div>
                    <div className="flex items-center gap-4">
                       <span className="w-10 h-10 rounded-xl bg-[#00D1FF]/10 text-[#00D1FF] border border-[#00D1FF]/30 flex items-center justify-center font-black text-lg">2</span>
                       <h3 className="text-sm font-black tracking-[0.2em] text-white uppercase">Token Girişi</h3>
                    </div>
                    <p className="text-gray-400 text-sm leading-relaxed pl-14">
                      BotFather'dan aldığınız API Token'ı bu uygulamada sol menüdeki <strong>"Sistem Ayarları"</strong> sayfasına gidin. "Telegram Bot Token" alanına yapıştırın ve ayarları kaydedin. Chat ID alanını şimdilik boş bırakabilirsiniz, sistem otomatik algılayacaktır.
                    </p>
                  </div>

                  {/* Adım 3: Bağlantı Kurma */}
                  <div className="relative p-8 rounded-2xl bg-black/40 border border-white/5 hover:border-[#00D1FF]/20 transition-all flex flex-col gap-4 group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-[#00D1FF]/20 group-hover:bg-[#00D1FF] transition-colors shadow-[0_0_15px_#00D1FF]"></div>
                    <div className="flex items-center gap-4">
                       <span className="w-10 h-10 rounded-xl bg-[#00D1FF]/10 text-[#00D1FF] border border-[#00D1FF]/30 flex items-center justify-center font-black text-lg">3</span>
                       <h3 className="text-sm font-black tracking-[0.2em] text-white uppercase">Bağlantı Kurma</h3>
                    </div>
                    <p className="text-gray-400 text-sm leading-relaxed pl-14">
                      Sistemi "Motoru Başlat" diyerek aktif ettikten sonra, Telegram'da oluşturduğunuz <strong>kendi botunuza gidin</strong> ve "Başlat" (Start) düğmesine basın veya herhangi bir mesaj atın (Örn: "Selam"). MobilePrompt, ilk mesajı atan kişinin kimliğini (Chat ID) okuyup o cihaza kenetlenecektir.
                    </p>
                  </div>

                  {/* Adım 4: Komutları Tanımlama */}
                  <div className="relative p-8 rounded-2xl bg-black/40 border border-white/5 hover:border-[#00D1FF]/20 transition-all flex flex-col gap-4 group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-[#00D1FF]/20 group-hover:bg-[#00D1FF] transition-colors shadow-[0_0_15px_#00D1FF]"></div>
                    <div className="flex items-center gap-4">
                       <span className="w-10 h-10 rounded-xl bg-[#00D1FF]/10 text-[#00D1FF] border border-[#00D1FF]/30 flex items-center justify-center font-black text-lg">4</span>
                       <h3 className="text-sm font-black tracking-[0.2em] text-white uppercase">Komutları Tanımlama</h3>
                    </div>
                    <p className="text-gray-400 text-sm leading-relaxed pl-14">
                      Tekrar BotFather'a dönün ve <kbd className="bg-white/10 px-2 py-1 rounded text-[#00D1FF] border border-white/5 font-mono text-xs">/setcommands</kbd> komutunu girin. Botunuzu seçtikten sonra aşağıdaki komut paketini kopyalayıp gönderin. Bu sayede botunuzda şık bir menü açılacaktır.
                    </p>
                    <div className="relative group/copy mt-2 ml-14">
                       <textarea readOnly className="w-full h-32 bg-black/60 border border-white/10 rounded-2xl p-6 text-gray-300 text-xs focus:outline-none font-mono resize-none leading-relaxed tracking-wide shadow-inner" 
                        value={`durum - 📊 Sistem & kuyruk durumu\nkur - 📁 Yeni proje çalışma alanı kur\nkod - 🖥️ Editörü çalışma alanında aç\nyaz - ⚡ Editöre kod/metin dikte et\nincele - 🔍 Dosyayı bağlam olarak gönder\nekran - 📸 Ekran görüntüsü al\nsonraki - ⏭️ Kuyruktaki sıradaki işleme geç\nozet - 📈 İşlem özeti\ntemizle - 🗑️ İşlem kuyruğunu boşalt\ndurdur - ⏸️ Motoru durdur\ndevam - ▶️ Motoru başlat\nguvenlik - 🛡️ Güvenlik tarayıcı durumu\nkapat - ☠️ Tüm sistemi kapat`}
                       />
                       <button onClick={() => {
                          navigator.clipboard.writeText(`durum - 📊 Sistem & kuyruk durumu\nkur - 📁 Yeni proje çalışma alanı kur\nkod - 🖥️ Editörü çalışma alanında aç\nyaz - ⚡ Editöre kod/metin dikte et\nincele - 🔍 Dosyayı bağlam olarak gönder\nekran - 📸 Ekran görüntüsü al\nsonraki - ⏭️ Kuyruktaki sıradaki işleme geç\nozet - 📈 İşlem özeti\ntemizle - 🗑️ İşlem kuyruğunu boşalt\ndurdur - ⏸️ Motoru durdur\ndevam - ▶️ Motoru başlat\nguvenlik - 🛡️ Güvenlik tarayıcı durumu\nkapat - ☠️ Tüm sistemi kapat`);
                          if(window.runtime) window.runtime.EventsEmit('sistem_bildirimi', {tip:'basari', mesaj:'Komutlar Kopyalandı!'})
                       }} className="absolute top-4 right-4 bg-white/10 hover:bg-[#00D1FF]/20 text-gray-400 hover:text-[#00D1FF] p-3 rounded-xl transition-colors border border-transparent hover:border-[#00D1FF]/30">
                          <ClipboardDocumentCheckIcon className="w-5 h-5" />
                       </button>
                    </div>
                  </div>

                  {/* Adım 5: İlk Kullanım */}
                  <div className="relative p-8 rounded-2xl bg-black/40 border border-white/5 hover:border-[#00D1FF]/20 transition-all flex flex-col gap-4 group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-[#00D1FF]/20 group-hover:bg-[#00D1FF] transition-colors shadow-[0_0_15px_#00D1FF]"></div>
                    <div className="flex items-center gap-4">
                       <span className="w-10 h-10 rounded-xl bg-[#00D1FF]/10 text-[#00D1FF] border border-[#00D1FF]/30 flex items-center justify-center font-black text-lg">5</span>
                       <h3 className="text-sm font-black tracking-[0.2em] text-white uppercase">İlk Kullanım</h3>
                    </div>
                    <p className="text-gray-400 text-sm leading-relaxed pl-14 pb-2">
                      Sistem aktifken Telegram üzerinden hızlıca proje inşa etmeye başlayabilirsiniz.
                      <br/><br/>
                      1. <kbd className="bg-white/10 px-2 py-1 rounded text-[#00D1FF] border border-white/5 font-mono text-xs">/kur "Proje Adı"</kbd> ile bir çalışma alanı tanımlayın.<br/>
                      2. <kbd className="bg-white/10 px-2 py-1 rounded text-[#00D1FF] border border-white/5 font-mono text-xs">/kod</kbd> komutunu kullanarak, seçili editörünüzün o klasörde otomatik açılmasını sağlayın.<br/>
                      3. Editörünüz odaktayken (örneğin ekranda açıksa), Telegram'a herhangi bir şey yazdığınızda (komut değilse) bu otomatik olarak editöre anında iletilecektir!
                    </p>
                  </div>

                </div>
              </motion.div>
            )}

            {mevcutSayfa === 'kuyruk' && (
              <motion.div key="kuyruk" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-6 max-w-5xl mx-auto h-full">
                <div className="flex items-center justify-between px-2 mb-2">
                  <h2 className="text-3xl font-black text-white tracking-tighter">İŞLEM <span className="text-[#00D1FF]">KUYRUĞU</span></h2>
                  <span className="text-xs font-black tracking-widest bg-[#00D1FF]/10 text-[#00D1FF] border border-[#00D1FF]/30 px-4 py-2 rounded-xl">
                    {kuyruk.maddeler.length} BEKLEYEN
                  </span>
                </div>
                
                <div className="bg-white/[0.02] border border-white/5 rounded-3xl flex-1 flex flex-col overflow-hidden relative shadow-2xl">
                  <div className="flex-1 overflow-y-auto p-6 relative">
                    <Reorder.Group axis="y" values={kuyruk.maddeler} onReorder={siralamayiGuncelle} className="flex flex-col gap-4 min-h-full">
                      <AnimatePresence>
                        {kuyruk.maddeler.map((madde, index) => {
                          const aktif = index === kuyruk.gecerliSira && durum.calisiyorMu;
                          const gecmis = index < kuyruk.gecerliSira;
                          
                          return (
                            <Reorder.Item key={madde.metin + index} value={madde} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                              className={`group relative p-6 rounded-2xl border flex gap-4 cursor-grab active:cursor-grabbing transition-all duration-300 ${
                                aktif ? 'bg-[#00D1FF]/5 border-[#00D1FF]/40 shadow-[0_0_30px_rgba(0,209,255,0.1)]' 
                                : gecmis ? 'bg-black/20 border-white/5 opacity-50' 
                                : 'bg-black/40 border-white/5 hover:bg-black/60 hover:border-white/10'
                              }`}
                            >
                              {aktif && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#00D1FF] rounded-l-2xl shadow-[0_0_15px_#00D1FF]"></div>}
                              
                              <div className="flex flex-col flex-1 shrink-0 overflow-hidden">
                                  <div className="flex items-center justify-between mb-3 w-full">
                                    <div className="flex items-center gap-3">
                                       {madde.kaynak === 'Telegram' ? (
                                          <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                                            <DevicePhoneMobileIcon className="w-4 h-4" title="Telefondan Gönderildi" />
                                          </div>
                                       ) : (
                                          <div className="w-8 h-8 rounded-full bg-[#00D1FF]/10 border border-[#00D1FF]/20 flex items-center justify-center text-[#00D1FF]">
                                            <ComputerDesktopIcon className="w-4 h-4" title="PC'den Gönderildi" />
                                          </div>
                                       )}
                                       <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-md ${aktif ? 'bg-[#00D1FF]/20 text-[#00D1FF]' : gecmis ? 'bg-gray-800 text-gray-500' : 'bg-white/10 text-gray-400'}`}>
                                           TX-{index + 1} {aktif ? 'YAZILIYOR' : gecmis ? 'BİTTİ' : 'SIRADA'}
                                       </span>
                                    </div>
                                    {durum.yaziyorMu && aktif && (
                                        <span className="text-[10px] font-black text-[#00D1FF] animate-pulse tracking-widest border border-[#00D1FF]/30 px-3 py-1 rounded-full">İŞLENİYOR</span>
                                    )}
                                  </div>
                                  <div className={`text-sm leading-relaxed whitespace-pre-wrap select-text pl-11 line-clamp-3 ${aktif ? 'text-white font-medium' : 'text-gray-400'}`}>
                                    {madde.metin}
                                  </div>
                              </div>
                              <button onClick={(e) => { e.stopPropagation(); sil(index); }} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity bg-black p-3 rounded-xl border border-white/5 hover:border-rose-500/30">
                                <TrashIcon className="w-5 h-5" />
                              </button>
                            </Reorder.Item>
                          );
                        })}
                      </AnimatePresence>
                      {kuyruk.maddeler.length === 0 && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600 font-black tracking-widest text-lg uppercase opacity-30">
                          Kuyruk Boş
                        </div>
                      )}
                    </Reorder.Group>
                  </div>
                </div>
              </motion.div>
            )}
            {mevcutSayfa === 'export' && (
              <motion.div key="export" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-6 max-w-5xl mx-auto h-full pb-10">
                <div className="flex items-center justify-between px-2 mb-2">
                  <h2 className="text-3xl font-black text-white tracking-tighter">DIŞA <span className="text-[#00D1FF]">AKTAR</span></h2>
                  <span className="text-xs font-black tracking-widest text-gray-500 uppercase">Derleme & Dağıtım Merkezi</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Windows Card */}
                  <div className="bg-white/[0.02] border border-white/10 hover:border-[#00D1FF]/40 rounded-3xl p-8 flex flex-col items-center gap-4 transition-all hover:bg-white/[0.04] group relative overflow-hidden">
                    <div className="absolute top-0 w-full h-1 bg-[#00D1FF]/20 group-hover:bg-[#00D1FF] transition-colors shadow-[0_0_15px_#00D1FF]"></div>
                    <ComputerDesktopIcon className="w-16 h-16 text-[#00D1FF] drop-shadow-[0_0_15px_rgba(0,209,255,0.4)]" />
                    <h3 className="text-lg font-black tracking-[0.2em] text-white uppercase">Windows</h3>
                    <p className="text-xs text-center text-gray-400 font-medium leading-relaxed mb-4">Uygulamayı .exe formatında masaüstünüze çıkartır. Wails projesini yerel bilgisayarda derler.</p>
                    <button 
                      disabled={isExporting} 
                      onClick={() => { setExportLog([]); setIsExporting(true); BuildApp('windows'); }}
                      className="w-full bg-[#00D1FF]/10 text-[#00D1FF] hover:bg-[#00D1FF]/20 border border-[#00D1FF]/30 hover:border-[#00D1FF]/50 uppercase tracking-widest text-xs font-black py-4 rounded-xl transition-all disabled:opacity-50"
                    >
                      {isExporting ? 'Derleniyor...' : 'EXE OLUŞTUR'}
                    </button>
                  </div>

                  {/* Linux Card */}
                  <div className="bg-white/[0.02] border border-white/10 hover:border-amber-500/40 rounded-3xl p-8 flex flex-col items-center gap-4 transition-all hover:bg-white/[0.04] group relative overflow-hidden">
                    <div className="absolute top-0 w-full h-1 bg-amber-500/20 group-hover:bg-amber-500 transition-colors shadow-[0_0_15px_#f59e0b]"></div>
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-black text-3xl text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.4)]">L</div>
                    <h3 className="text-lg font-black tracking-[0.2em] text-white uppercase">Linux</h3>
                    <p className="text-xs text-center text-gray-400 font-medium leading-relaxed mb-4">Bağımsız binary dosyasını (.bin) masaüstüne çıkartır. (Not: WSL veya Docker gerektirir).</p>
                    <button 
                      disabled={isExporting}
                      onClick={() => { setExportLog([]); setIsExporting(true); BuildApp('linux'); }}
                      className="w-full bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-500/50 uppercase tracking-widest text-xs font-black py-4 rounded-xl transition-all disabled:opacity-50"
                    >
                      {isExporting ? 'Derleniyor...' : 'BİNARY OLUŞTUR'}
                    </button>
                  </div>

                  {/* macOS Card */}
                  <div className="bg-white/[0.02] border border-white/10 hover:border-white/30 rounded-3xl p-8 flex flex-col items-center gap-4 transition-all hover:bg-white/[0.04] group relative overflow-hidden">
                    <div className="absolute top-0 w-full h-1 bg-white/10 group-hover:bg-white transition-colors shadow-[0_0_15px_rgba(255,255,255,0.5)]"></div>
                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-3xl text-white">⌘</div>
                    <h3 className="text-lg font-black tracking-[0.2em] text-white uppercase">macOS</h3>
                    <p className="text-xs text-center text-gray-400 font-medium leading-relaxed mb-4">Windows üzerinden doğrudan macOS (.app / .dmg) derlemesi Apple kısıtlamaları nedeniyle yapılamaz.</p>
                    <div className="flex gap-2 w-full">
                      <button 
                        disabled={isExporting}
                        onClick={() => { setExportLog([]); setIsExporting(true); BuildApp('mac'); }}
                        className="w-1/2 bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10 hover:border-white/30 uppercase tracking-widest text-[10px] font-black py-4 rounded-xl transition-all disabled:opacity-50"
                      >
                        BİLGİ
                      </button>
                      <button 
                        onClick={() => window.open('https://wails.io/docs/guides/manual-builds', '_blank')}
                        className="w-1/2 bg-[#00D1FF]/10 text-[#00D1FF] hover:bg-[#00D1FF]/20 border border-[#00D1FF]/30 uppercase tracking-widest text-[10px] font-black py-4 rounded-xl transition-all"
                      >
                        GİTHUB ACTIONS
                      </button>
                    </div>
                  </div>
                </div>

                {/* Build Progress Terminal */}
                {(exportLog.length > 0 || isExporting) && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 bg-[#05070A]/80 border border-white/10 rounded-3xl p-6 flex flex-col shadow-inner backdrop-blur-3xl relative mt-4">
                    <div className="flex items-center gap-3 mb-4 sticky top-0 bg-[#05070A]/80 pt-2 pb-4 z-10 border-b border-white/5">
                      <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                      <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                      <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                      <span className="ml-2 font-mono text-[10px] text-gray-500 tracking-widest uppercase">MobilePrompt Otonom Derleyici - wails build v2</span>
                      {isExporting && <span className="ml-auto flex items-center gap-2 text-[#00D1FF] font-black text-[10px] tracking-widest uppercase animate-pulse"><Cog6ToothIcon className="w-4 h-4 animate-spin"/> Derleme İşlemi Devam Ediyor...</span>}
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar font-mono text-[11px] leading-relaxed text-gray-400 flex flex-col gap-1 pr-4">
                      {exportLog.map((log, i) => (
                        <div key={i} className="break-words px-3 py-1.5 bg-black/40 border border-white/5 rounded-lg mb-1">
                           <span className="text-[#00D1FF]/50 mr-3">[{new Date().toLocaleTimeString().split(' ')[0]}]</span> 
                           <span className={log.includes('❌') || log.includes('[ERR]') ? 'text-rose-400 font-bold' : log.includes('✅') ? 'text-emerald-400 font-bold' : log.includes('⚠️') ? 'text-amber-400 font-bold' : 'text-gray-300'}>{log}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

              </motion.div>
            )}

            {mevcutSayfa === 'ayarlar' && (
              <motion.div key="ayarlar" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-6 max-w-3xl mx-auto h-full pb-10">
                
                <h2 className="text-3xl font-black text-white tracking-tighter mb-2 px-2">SİSTEM <span className="text-[#00D1FF]">AYARLARI</span></h2>
                
                <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-10 flex flex-col gap-8 shadow-2xl relative backdrop-blur-3xl overflow-y-auto w-full max-w-full">
                  
                  {/* Glowing Input Sections */}
                  <div className="flex flex-col gap-3 group w-full relative">
                     <label className="text-[10px] font-black tracking-[0.2em] text-[#00D1FF] uppercase flex items-center gap-2">
                        <Cog6ToothIcon className="w-4 h-4" /> Telegram Bot Token
                     </label>
                     <input type="password" value={tgToken} onChange={e => setTgToken(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-5 text-gray-200 text-sm focus:outline-none focus:border-[#00D1FF] focus:ring-2 focus:ring-[#00D1FF]/30 transition-all font-mono shadow-inner"
                        placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                     />
                  </div>

                  <div className="flex flex-col gap-3 group w-full relative">
                     <label className="text-[10px] font-black tracking-[0.2em] text-[#00D1FF] uppercase flex items-center gap-2">
                        <Cog6ToothIcon className="w-4 h-4" /> Chat ID (Sohbet Numarası)
                     </label>
                     <input type="text" value={tgChatID} onChange={e => setTgChatID(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-5 text-gray-200 text-sm focus:outline-none focus:border-[#00D1FF] focus:ring-2 focus:ring-[#00D1FF]/30 transition-all font-mono shadow-inner"
                        placeholder="-100123456789"
                     />
                  </div>
                  
                  <div className="flex gap-4">
                    <button onClick={baglantiyiTestEt} disabled={!tgToken} className="bg-white/5 text-[11px] font-black disabled:opacity-50 disabled:cursor-not-allowed tracking-[0.1em] uppercase hover:bg-white/10 text-white border border-white/10 hover:border-white/30 rounded-xl px-8 py-4 transition-colors flex items-center gap-2">
                      <PlayIcon className="w-4 h-4" /> Bağlantıyı Test Et
                    </button>
                    {testSonucu && (
                      <div className={`px-6 py-4 rounded-xl text-[11px] font-black tracking-[0.1em] uppercase border shadow-lg flex items-center h-12 box-border ${
                         testSonucu.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                         testSonucu.type === 'error' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' :
                         'bg-[#00D1FF]/10 border-[#00D1FF]/30 text-[#00D1FF]'
                      }`}>
                        {testSonucu.msg}
                      </div>
                    )}
                  </div>

                  <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent my-2"></div>

                  <div className="flex flex-col gap-3 w-full relative">
                     <label className="text-[10px] font-black tracking-[0.2em] text-gray-400 uppercase">Taranacak Editörler (Virgülle Ayırın)</label>
                     <input type="text" value={editorlerStr} onChange={e => setEditorlerStr(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-5 text-gray-200 text-sm focus:outline-none focus:border-white/30 transition-all shadow-inner"
                     />
                  </div>

                  {/* Switches */}
                  <div className="flex gap-6 items-center justify-between p-6 bg-black/40 rounded-2xl border border-white/10 hover:border-white/20 transition-colors cursor-pointer w-full" onClick={() => setEkranIzni(!ekranIzni)}>
                     <div className="flex flex-col gap-1 w-2/3">
                        <span className="text-white font-black text-sm tracking-wide">Uzaktan Ekran İzni</span>
                        <span className="text-gray-500 text-xs truncate whitespace-normal">/ekran komutu ile masaüstü görüntüsü yollanmasına izin ver.</span>
                     </div>
                     <div className={`w-14 h-7 rounded-full transition-colors relative duration-300 flex-shrink-0 ${ekranIzni ? 'bg-[#00D1FF] shadow-[0_0_15px_rgba(0,209,255,0.4)]' : 'bg-gray-800'}`}>
                        <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all duration-300 ${ekranIzni ? 'left-8' : 'left-1'}`}></div>
                     </div>
                  </div>


                  <div className="pt-6 border-t border-white/5 w-full">
                    <button onClick={ayarlariKaydetIslemi} className="bg-[#00D1FF] text-[#0B0E14] hover:bg-cyan-400 text-[11px] font-black tracking-[0.2em] uppercase rounded-xl px-8 py-5 transition-colors w-full shadow-[0_0_30px_rgba(0,209,255,0.3)] hover:shadow-[0_0_40px_rgba(0,209,255,0.5)]">
                       AYARLARI KAYDET VE UYGULA
                    </button>
                  </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
