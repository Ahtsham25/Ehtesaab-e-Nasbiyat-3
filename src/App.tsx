import React, { useState, useEffect } from 'react';
import { VolumeData, ActiveTab, HighlightItem } from './types/book';
import { DEFAULT_VOLUMES, STORAGE_KEY } from './data/defaultVolumes';
import { SplashScreen } from './components/SplashScreen';
import { Header } from './components/Header';
import { BottomNavBar } from './components/BottomNavBar';
import { VolumeCard } from './components/VolumeCard';
import { ReaderModal } from './components/ReaderModal';
import { DownloadsTab } from './components/DownloadsTab';
import { HighlightsTab } from './components/HighlightsTab';
import { BookmarksTab } from './components/BookmarksTab';
import { AboutTab } from './components/AboutTab';
import { PrivacyPolicyTab } from './components/PrivacyPolicyTab';
import { AdminPanel } from './components/AdminPanel';
import { RecentlyOpenedCarousel } from './components/RecentlyOpenedCarousel';
import { ScreenEditorModal } from './components/ScreenEditorModal';
import { ResponsesTab } from './components/ResponsesTab';
import { BookOpen, Sparkles, Download, Check, Filter, Palette, Cloud, ArrowRight, HelpCircle } from 'lucide-react';
import { Language, TRANSLATIONS, ENGLISH_VOLUME_DATA } from './i18n/translations';
import { getAllDrawings } from './utils/drawingStorage';
import { getRecentReads, recordRecentRead, RecentReadItem, RECENT_READS_EVENT } from './utils/readingHistory';
import { fetchVolumesFromGithub } from './utils/githubSync';
import { resolveVolumeArchiveId, resolveVolumePdfUrl } from './utils/archiveUtils';
import { ResponseBook } from './types/book';
import { getStoredResponseBooks, saveResponseBooks } from './utils/responseBooksStorage';
import { triggerDirectDownload, saveBookToInternalStorage, getUploadedPdfBlob, deleteUploadedPdfBlob } from './utils/offlineStorage';
import { fetchPdfArrayBuffer } from './utils/pdfLoader';

const HIGHLIGHTS_STORAGE_KEY = 'ehtisab_highlights_v1';

export default function App() {
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [volumes, setVolumes] = useState<VolumeData[]>(DEFAULT_VOLUMES);
  const [responseBooks, setResponseBooks] = useState<ResponseBook[]>(() => {
    try {
      return getStoredResponseBooks();
    } catch {
      return [];
    }
  });
  const [highlights, setHighlights] = useState<HighlightItem[]>([]);
  const [recentReads, setRecentReads] = useState<RecentReadItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedVolumeForReading, setSelectedVolumeForReading] = useState<VolumeData | null>(null);
  const [selectedVolumeForEditor, setSelectedVolumeForEditor] = useState<VolumeData | null>(null);
  const [editorPage, setEditorPage] = useState<number>(1);
  const [volumeFilter, setVolumeFilter] = useState<'all' | '1-4' | '5-8' | '9-12'>('all');
  const [lang, setLang] = useState<Language>('ur');
  const [downloadToast, setDownloadToast] = useState<{ show: boolean; title: string }>({
    show: false,
    title: '',
  });
  const [drawingsCount, setDrawingsCount] = useState<number>(0);

  // Response books CRUD
  const handleAddResponseBook = (newBook: ResponseBook) => {
    const updated = [newBook, ...responseBooks];
    setResponseBooks(updated);
    saveResponseBooks(updated);
  };

  const handleUpdateResponseBook = (updatedBook: ResponseBook) => {
    const updated = responseBooks.map((b) => (b.id === updatedBook.id ? updatedBook : b));
    setResponseBooks(updated);
    saveResponseBooks(updated);
  };

  const handleDeleteResponseBook = async (id: string) => {
    const updated = responseBooks.filter((b) => b.id !== id);
    setResponseBooks(updated);
    saveResponseBooks(updated);
    try {
      await deleteUploadedPdfBlob(id);
    } catch {}
  };

  const handleReadResponseBook = async (book: ResponseBook) => {
    let finalPdfUrl = book.pdfUrl;

    // Check if this book has an uploaded PDF blob in IndexedDB
    try {
      const storedBlob = await getUploadedPdfBlob(book.id);
      if (storedBlob && storedBlob.size > 50000) {
        finalPdfUrl = URL.createObjectURL(storedBlob);
      }
    } catch {}

    const vol: VolumeData = {
      id: 9000 + Math.abs(book.id.split('').reduce((acc, char) => ((acc << 5) - acc) + char.charCodeAt(0), 0) % 1000),
      volumeNumber: 0,
      volumeTitleUrdu: book.titleUrdu,
      topic: book.topic || book.author || 'ردِ اعتراضات و جوابات',
      archiveItemId: book.archiveItemId || '',
      coverImageUrl: book.coverImageUrl || '/app-logo.png',
      pdfUrl: finalPdfUrl,
      pageCount: book.pageCount || 100,
      fileSize: book.fileSize || '15 MB',
      description: book.description || '',
      year: book.year,
      lastReadPage: book.lastReadPage || 1,
      isBookmarked: book.isBookmarked,
    };
    setSelectedVolumeForReading(vol);
  };

  const handleOpenEditor = (volume?: VolumeData, page?: number) => {
    const target = volume || selectedVolumeForReading || volumes[0];
    setSelectedVolumeForEditor(target);
    setEditorPage(page || target.lastReadPage || 1);
    setActiveTab('editor');
  };

  // Sync drawings count from LocalStorage
  const refreshDrawingsCount = () => {
    try {
      setDrawingsCount(getAllDrawings().length);
    } catch {}
  };

  useEffect(() => {
    refreshDrawingsCount();
  }, [activeTab, selectedVolumeForReading]);

  // Load highlights from LocalStorage on mount
  useEffect(() => {
    try {
      const storedHl = localStorage.getItem(HIGHLIGHTS_STORAGE_KEY);
      if (storedHl) {
        const parsed = JSON.parse(storedHl);
        if (Array.isArray(parsed)) {
          setHighlights(parsed);
        }
      }
    } catch {}

    // Load initial recent reads
    setRecentReads(getRecentReads());

    const handleRecentReadsChange = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setRecentReads(e.detail);
      } else {
        setRecentReads(getRecentReads());
      }
    };
    window.addEventListener(RECENT_READS_EVENT, handleRecentReadsChange);
    return () => window.removeEventListener(RECENT_READS_EVENT, handleRecentReadsChange);
  }, []);

  // Load language preference from LocalStorage
  useEffect(() => {
    try {
      const savedLang = localStorage.getItem('ehtisab_app_lang') as Language;
      if (savedLang && (savedLang === 'ur' || savedLang === 'en')) {
        setLang(savedLang);
        document.documentElement.dir = savedLang === 'en' ? 'ltr' : 'rtl';
      }
    } catch {}
  }, []);

  const handleToggleLang = () => {
    const nextLang: Language = lang === 'ur' ? 'en' : 'ur';
    setLang(nextLang);
    document.documentElement.dir = nextLang === 'en' ? 'ltr' : 'rtl';
    try {
      localStorage.setItem('ehtisab_app_lang', nextLang);
    } catch {}
  };

  // Load volumes from LocalStorage on mount and upgrade any outdated placeholder URLs
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const upgraded = parsed.map((v: VolumeData) => ({
            ...v,
            archiveItemId: resolveVolumeArchiveId(v.volumeNumber, v.archiveItemId),
            pdfUrl: resolveVolumePdfUrl(v.volumeNumber, v.pdfUrl),
          }));
          setVolumes(upgraded);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(upgraded));
          } catch {}
          return;
        }
      }
    } catch {
      // Use defaults if error
    }
    setVolumes(DEFAULT_VOLUMES);
  }, []);

  // Background Cloud Sync with GitHub Repository
  const [isCloudSyncing, setIsCloudSyncing] = useState<boolean>(false);
  const [cloudSyncToast, setCloudSyncToast] = useState<{ show: boolean; msg: string; isError?: boolean }>({
    show: false,
    msg: '',
    isError: false,
  });

  const syncWithGithubCloud = async (showNotice = false) => {
    setIsCloudSyncing(true);
    try {
      const res = await fetchVolumesFromGithub();
      if (res.success && res.volumes && res.volumes.length > 0) {
        setVolumes(res.volumes);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(res.volumes));
        } catch {}
        if (showNotice) {
          setCloudSyncToast({
            show: true,
            msg: `✓ گٹ ہب کلاؤڈ سے تمام کتب کا تازہ ڈیٹا (${res.volumes.length} جلدیں) اپ ڈیٹ ہو گیا!`,
            isError: false,
          });
          setTimeout(() => setCloudSyncToast({ show: false, msg: '', isError: false }), 4500);
        }
      } else if (showNotice && res.error) {
        setCloudSyncToast({
          show: true,
          msg: res.error,
          isError: true,
        });
        setTimeout(() => setCloudSyncToast({ show: false, msg: '', isError: false }), 4500);
      }
    } catch {
      if (showNotice) {
        setCloudSyncToast({
          show: true,
          msg: 'گٹ ہب سے رابطہ نہ ہو سکا۔',
          isError: true,
        });
        setTimeout(() => setCloudSyncToast({ show: false, msg: '', isError: false }), 4000);
      }
    } finally {
      setIsCloudSyncing(false);
    }
  };

  // Run silent background sync on launch
  useEffect(() => {
    const timer = setTimeout(() => {
      syncWithGithubCloud(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  // Save volumes state
  const saveVolumesState = (newVolumes: VolumeData[]) => {
    setVolumes(newVolumes);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newVolumes));
    } catch {}
  };

  const handleResetVolumes = () => {
    saveVolumesState(DEFAULT_VOLUMES);
  };

  const handleToggleBookmark = (volumeId: number) => {
    const updated = volumes.map((v) =>
      v.id === volumeId ? { ...v, isBookmarked: !v.isBookmarked } : v
    );
    saveVolumesState(updated);
  };

  const handleUpdateProgress = (volumeId: number, page: number) => {
    const updated = volumes.map((v) =>
      v.id === volumeId ? { ...v, lastReadPage: page } : v
    );
    saveVolumesState(updated);
    const target = volumes.find((v) => v.id === volumeId);
    if (target) {
      recordRecentRead(target, page);
    }
    if (selectedVolumeForReading && selectedVolumeForReading.id === volumeId) {
      setSelectedVolumeForReading((prev) => (prev ? { ...prev, lastReadPage: page } : null));
    }
  };

  const handleDownload = async (volume: VolumeData) => {
    const filename = `Ihtisab_Nasbiyat_Jild_${volume.volumeNumber}.pdf`;
    const targetUrl = resolveVolumePdfUrl(volume.volumeNumber, volume.pdfUrl);

    setDownloadToast({
      show: true,
      title: `${volume.volumeTitleUrdu}: ایپ کے اندر محفوظ ہو رہی ہے...`,
    });

    try {
      // 1. Fetch real PDF buffer with live progress
      const buffer = await fetchPdfArrayBuffer(targetUrl, (pct) => {
        setDownloadToast({
          show: true,
          title: `${volume.volumeTitleUrdu}: ڈاؤن لوڈنگ ${pct}% (ایپ میں محفوظ ہو رہی ہے)...`,
        });
      });

      // 2. Save full Blob in IndexedDB internal folder
      const blob = new Blob([buffer], { type: 'application/pdf' });
      await saveBookToInternalStorage({
        volumeId: volume.id,
        volumeNumber: volume.volumeNumber,
        titleUrdu: volume.volumeTitleUrdu,
        fileSize: `${(blob.size / (1024 * 1024)).toFixed(1)} MB`,
        downloadedAt: new Date().toLocaleDateString('ur-PK'),
        blob,
      });

      // 3. Mark as downloaded in app state
      const updated = volumes.map((v) =>
        v.id === volume.id ? { ...v, isDownloaded: true } : v
      );
      saveVolumesState(updated);

      // 4. Save directly into device / browser downloads too
      triggerDirectDownload(blob, filename);

      setDownloadToast({
        show: true,
        title: `کامیابی! ${volume.volumeTitleUrdu} ایپ کے انٹرنل فولڈر اور ڈیوائس میں محفوظ ہو چکی ہے۔`,
      });
      setTimeout(() => {
        setDownloadToast({ show: false, title: '' });
      }, 4500);
    } catch (err: any) {
      console.warn('Failed to download book buffer, triggering direct stream fallback:', err);
      // Fallback: trigger stream download
      const directApiDownloadUrl = `/api/download?url=${encodeURIComponent(targetUrl)}&filename=${encodeURIComponent(filename)}`;
      triggerDirectDownload(directApiDownloadUrl, filename);
      setDownloadToast({
        show: true,
        title: `${volume.volumeTitleUrdu}: ڈاؤن لوڈ کا عمل جاری ہے...`,
      });
      setTimeout(() => {
        setDownloadToast({ show: false, title: '' });
      }, 4000);
    }
  };

  const handleDeleteInternalBook = (volumeId: number) => {
    const updated = volumes.map((v) =>
      v.id === volumeId ? { ...v, isDownloaded: false } : v
    );
    saveVolumesState(updated);
  };

  const handleDownloadResponseBook = async (book: ResponseBook) => {
    const filename = `${book.titleUrdu.replace(/\s+/g, '_')}.pdf`;
    setDownloadToast({
      show: true,
      title: `${book.titleUrdu}: ایپ کے اندر محفوظ ہو رہی ہے...`,
    });

    try {
      let blob: Blob | null = null;
      if (book.pdfUrl.startsWith('uploaded:')) {
        blob = await getUploadedPdfBlob(book.id);
      }

      if (!blob) {
        const buffer = await fetchPdfArrayBuffer(book.pdfUrl, (pct) => {
          setDownloadToast({
            show: true,
            title: `${book.titleUrdu}: ڈاؤن لوڈنگ ${pct}% (ایپ میں محفوظ ہو رہی ہے)...`,
          });
        });
        blob = new Blob([buffer], { type: 'application/pdf' });
      }

      const pseudoVolId =
        9000 +
        Math.abs(book.id.split('').reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0) % 1000);

      await saveBookToInternalStorage({
        volumeId: pseudoVolId,
        volumeNumber: 0,
        titleUrdu: book.titleUrdu,
        fileSize: `${(blob.size / (1024 * 1024)).toFixed(1)} MB`,
        downloadedAt: new Date().toLocaleDateString('ur-PK'),
        blob,
      });

      triggerDirectDownload(blob, filename);

      setDownloadToast({
        show: true,
        title: `کامیابی! "${book.titleUrdu}" ایپ کے اندر اور ڈیوائس میں محفوظ ہو چکی ہے۔`,
      });
      setTimeout(() => {
        setDownloadToast({ show: false, title: '' });
      }, 4500);
    } catch (err: any) {
      console.warn('Failed to download response book internally, fallback:', err);
      const downloadApiUrl = `/api/download?url=${encodeURIComponent(book.pdfUrl)}&filename=${encodeURIComponent(filename)}`;
      triggerDirectDownload(downloadApiUrl, filename);
      setDownloadToast({
        show: true,
        title: `کتاب "${book.titleUrdu}" کا ڈاؤن لوڈ شروع ہو گیا ہے۔`,
      });
      setTimeout(() => setDownloadToast({ show: false, title: '' }), 4000);
    }
  };

  const saveHighlightsState = (newHighlights: HighlightItem[]) => {
    setHighlights(newHighlights);
    try {
      localStorage.setItem(HIGHLIGHTS_STORAGE_KEY, JSON.stringify(newHighlights));
    } catch {}
  };

  const handleAddHighlight = (highlight: HighlightItem) => {
    const updated = [highlight, ...highlights];
    saveHighlightsState(updated);
  };

  const handleDeleteHighlight = (id: string) => {
    const updated = highlights.filter((h) => h.id !== id);
    saveHighlightsState(updated);
  };

  const handleClearAllHighlights = () => {
    saveHighlightsState([]);
  };

  const handleOpenInReader = (volumeId: number, page: number) => {
    const vol = volumes.find((v) => v.id === volumeId);
    if (vol) {
      const updated = { ...vol, lastReadPage: page };
      setSelectedVolumeForReading(updated);
      try {
        recordRecentRead(vol, page);
      } catch {}
    }
  };

  const t = TRANSLATIONS[lang];
  const isEn = lang === 'en';

  // Filter volumes based on search and range
  const filteredVolumes = volumes.filter((vol) => {
    const query = searchQuery.trim().toLowerCase();
    const enData = ENGLISH_VOLUME_DATA[vol.volumeNumber];

    const matchesSearch =
      !query ||
      vol.volumeTitleUrdu.toLowerCase().includes(query) ||
      vol.topic.toLowerCase().includes(query) ||
      vol.description.toLowerCase().includes(query) ||
      vol.volumeNumber.toString() === query ||
      `جلد ${vol.volumeNumber}`.includes(query) ||
      (enData &&
        (enData.title.toLowerCase().includes(query) ||
          enData.topic.toLowerCase().includes(query) ||
          enData.description.toLowerCase().includes(query)));

    // Group filter
    let matchesGroup = true;
    if (volumeFilter === '1-4') matchesGroup = vol.volumeNumber >= 1 && vol.volumeNumber <= 4;
    else if (volumeFilter === '5-8') matchesGroup = vol.volumeNumber >= 5 && vol.volumeNumber <= 8;
    else if (volumeFilter === '9-12') matchesGroup = vol.volumeNumber >= 9 && vol.volumeNumber <= 12;

    return matchesSearch && matchesGroup;
  });

  const downloadedCount = volumes.filter((v) => v.isDownloaded).length;
  const bookmarkCount = volumes.filter((v) => v.isBookmarked).length;

  return (
    <div
      dir={isEn ? 'ltr' : 'rtl'}
      className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-amber-600 selection:text-white"
    >
      {/* Splash Screen */}
      {showSplash && (
        <SplashScreen
          onDismiss={() => setShowSplash(false)}
          lang={lang}
          onToggleLang={handleToggleLang}
        />
      )}

      {/* Header */}
      <Header
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onShowSplash={() => setShowSplash(true)}
        lang={lang}
        onToggleLang={handleToggleLang}
        onSyncCloud={() => syncWithGithubCloud(true)}
        isSyncingCloud={isCloudSyncing}
      />

      {/* Cloud Sync Alert Toast */}
      {cloudSyncToast.show && (
        <div
          className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-top-4 border ${
            cloudSyncToast.isError
              ? 'bg-rose-900/95 border-rose-500 text-rose-200'
              : 'bg-emerald-950/95 border-emerald-500 text-emerald-200'
          }`}
        >
          <Cloud className="w-4 h-4 text-emerald-400" />
          <span>{cloudSyncToast.msg}</span>
        </div>
      )}

      {/* Download Alert Toast */}
      {downloadToast.show && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-stone-900 border border-amber-500/50 text-amber-300 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-top-4">
          <Download className="w-4 h-4 text-amber-400 animate-bounce" />
          <span>{downloadToast.title}</span>
        </div>
      )}

      {/* Main Content Areas */}
      <main className="flex-1">
        {/* UNIVERSAL TOP BACK BUTTON WHEN ANY TAB/PAGE IS OPEN */}
        {activeTab !== 'home' && (
          <div className="max-w-5xl mx-auto px-4 pt-4 pb-2">
            <button
              onClick={() => setActiveTab('home')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-stone-900/90 hover:bg-emerald-950/80 text-emerald-400 hover:text-emerald-300 border border-emerald-500/40 text-xs sm:text-sm font-bold shadow-lg cursor-pointer transition-all active:scale-95"
              title="فہرست کتب / ہوم پیج پر واپس جائیں"
            >
              <ArrowRight className="w-5 h-5 text-emerald-400 stroke-[2.5]" />
              <span className="font-nastaliq text-sm sm:text-base">فہرست کتب (ہوم پیج) پر واپس جائیں</span>
            </button>
          </div>
        )}

        {/* HOME TAB: 12 Volumes View */}
        {activeTab === 'home' && (
          <div className="max-w-5xl mx-auto px-4 py-5 pb-24 space-y-6">
            {/* Banner Section */}
            <div className="relative rounded-3xl overflow-hidden border border-amber-900/40 bg-gradient-to-r from-emerald-950 via-stone-900 to-amber-950/80 p-5 sm:p-7 shadow-2xl islamic-pattern-bg flex flex-col-reverse sm:flex-row items-center justify-between gap-5">
              <div className="relative z-10 max-w-xl">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-xs mb-2 font-sans">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t.volumesAvailable}</span>
                </div>
                <h2 className="font-nastaliq text-3xl sm:text-4xl font-bold text-amber-300 leading-tight">
                  {t.appTitle}
                </h2>
                <p className={`text-base sm:text-lg text-emerald-300 mt-1 ${isEn ? 'font-sans font-semibold' : 'font-nastaliq'}`}>
                  {t.appSubtitle}
                </p>
                <p className="text-xs sm:text-sm text-stone-300 mt-2.5 leading-relaxed font-sans">
                  {t.heroDesc}
                </p>

                {/* PixelLab Photo Editor Launcher Button */}
                <div className="mt-4 flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={() => handleOpenEditor()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 hover:from-amber-500 hover:to-amber-300 text-stone-950 font-bold text-xs sm:text-sm shadow-xl transition-all cursor-pointer font-sans"
                  >
                    <Palette className="w-4 h-4" />
                    <span>{isEn ? 'Screen Editor & Sanad Maker' : 'اسکرین ترمیم (سند و حوالہ ساز)'}</span>
                  </button>
                </div>
              </div>

              {/* Official Logo Display */}
              <div className="relative z-10 shrink-0">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl p-1 bg-gradient-to-tr from-amber-500/60 via-emerald-600/40 to-amber-400/80 shadow-2xl border border-amber-400/40">
                  <img
                    src="/app-logo.png"
                    alt="احتساب ناصبیت آفیشل لوگو"
                    className="w-full h-full object-cover rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* PROMINENT JALI/BOLD TAB & CARD: احتساب ناصبیت پر اعتراضات کے جوابات */}
            <div
              onClick={() => setActiveTab('responses')}
              className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-950 via-stone-900 to-emerald-950 border-2 border-amber-500/80 p-5 sm:p-6 shadow-2xl hover:border-amber-400 transition-all cursor-pointer group active:scale-[0.99]"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/15 rounded-full blur-3xl pointer-events-none group-hover:bg-amber-500/25 transition-all" />
              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
                <div className="space-y-2.5 max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs font-bold font-sans">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                    <span>خصوصی تحقیقی سلسلہ</span>
                  </div>
                  <h3 className="font-nastaliq text-2xl sm:text-3xl lg:text-4xl font-extrabold text-amber-300 leading-snug drop-shadow-md">
                    احتسابِ ناصبیت پر اعتراضات کے جوابات
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-200 font-sans leading-relaxed">
                    کتاب "احتسابِ ناصبیت" پر معترضین کے اٹھائے گئے تمام شبہات، الزامات اور اعتراضات کے نصوص و اسناد کی روشنی میں مدلل و مسکت علمی جوابات کا جامع مجموعہ۔
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1 font-sans">
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 font-semibold">
                      مجموعی کتب: {responseBooks.length}
                    </span>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-stone-800 text-amber-300 border border-amber-500/30">
                      آن لائن مطالعہ + پی ڈی ایف ڈاؤن لوڈ
                    </span>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-900/40 text-emerald-300 border border-emerald-500/30">
                      مستند مراجع و اسناد
                    </span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2 self-stretch md:self-center justify-end w-full md:w-auto">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTab('responses');
                    }}
                    className="w-full md:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-stone-950 font-extrabold text-sm sm:text-base shadow-xl transition-all cursor-pointer font-nastaliq"
                  >
                    <span>کتب کی فہرست و مطالعہ فرمائیں</span>
                    <ArrowRight className="w-5 h-5 text-stone-950 stroke-[3]" />
                  </button>
                </div>
              </div>
            </div>

            {/* Recently Opened Carousel (Top of Home Tab, 1-Tap Resumption) */}
            <RecentlyOpenedCarousel
              recentReads={recentReads}
              onOpenVolume={handleOpenInReader}
              lang={lang}
            />

            {/* Quick Filter Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-900/60 p-2.5 rounded-2xl border border-stone-800">
              <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                <span className="text-xs text-stone-400 flex items-center gap-1 font-sans font-medium">
                  <Filter className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isEn ? 'Filter:' : 'جلدیں:'}</span>
                </span>
                <button
                  onClick={() => setVolumeFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-sans transition-colors cursor-pointer ${
                    volumeFilter === 'all'
                      ? 'bg-amber-600 text-stone-950 font-bold shadow'
                      : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                  }`}
                >
                  {t.allVolumes}
                </button>
                <button
                  onClick={() => setVolumeFilter('1-4')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-sans transition-colors cursor-pointer ${
                    volumeFilter === '1-4'
                      ? 'bg-amber-600 text-stone-950 font-bold shadow'
                      : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                  }`}
                >
                  {t.vol1to4}
                </button>
                <button
                  onClick={() => setVolumeFilter('5-8')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-sans transition-colors cursor-pointer ${
                    volumeFilter === '5-8'
                      ? 'bg-amber-600 text-stone-950 font-bold shadow'
                      : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                  }`}
                >
                  {t.vol5to8}
                </button>
                <button
                  onClick={() => setVolumeFilter('9-12')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-sans transition-colors cursor-pointer ${
                    volumeFilter === '9-12'
                      ? 'bg-amber-600 text-stone-950 font-bold shadow'
                      : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                  }`}
                >
                  {t.vol9to12}
                </button>
              </div>

              <div className="text-xs text-stone-400 font-sans px-2">
                {t.availableCount} <span className="text-amber-400 font-bold font-mono">{filteredVolumes.length}</span>
              </div>
            </div>

            {/* Grid of 12 Volumes */}
            {filteredVolumes.length === 0 ? (
              <div className="bg-stone-900/60 border border-stone-800 rounded-3xl p-12 text-center text-stone-400">
                <BookOpen className="w-12 h-12 text-stone-600 mx-auto mb-3" />
                <h3 className="font-nastaliq text-xl text-amber-300 mb-1">
                  {isEn ? 'No volumes found' : 'کوئی جلد نہیں ملی'}
                </h3>
                <p className="text-xs font-sans">
                  {isEn ? 'Please try searching for another term' : 'برائے مہربانی تلاش کا لفظ تبدیل فرمائیں۔'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                {filteredVolumes.map((vol) => (
                  <VolumeCard
                    key={vol.id}
                    volume={vol}
                    onRead={(volume) => handleOpenInReader(volume.id, volume.lastReadPage || 1)}
                    onDownload={(volume) => handleDownload(volume)}
                    onToggleBookmark={handleToggleBookmark}
                    onOpenEditor={(volume) => handleOpenEditor(volume, volume.lastReadPage || 1)}
                    isBookmarked={!!vol.isBookmarked}
                    lang={lang}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* RESPONSES TAB: Unlimited response books catalog */}
        {activeTab === 'responses' && (
          <ResponsesTab
            books={responseBooks}
            onReadBook={handleReadResponseBook}
            onDownloadBook={handleDownloadResponseBook}
            onNavigateHome={() => setActiveTab('home')}
          />
        )}

        {/* SCREEN EDITOR & DUAL PAGE CITATION MAKER */}
        {activeTab === 'editor' && (
          <ScreenEditorModal
            volume={selectedVolumeForEditor || volumes[0]}
            currentPage={editorPage}
            onClose={() => setActiveTab('home')}
            onPageChange={(p) => setEditorPage(p)}
            onVolumeChange={(v) => setSelectedVolumeForEditor(v)}
          />
        )}

        {/* DOWNLOADS TAB */}
        {activeTab === 'downloads' && (
          <DownloadsTab
            volumes={volumes}
            onDownload={handleDownload}
            onRead={(volume) => setSelectedVolumeForReading(volume)}
            onNavigateHome={() => setActiveTab('home')}
            onDeleteInternalBook={handleDeleteInternalBook}
            responseBooks={responseBooks}
          />
        )}

        {/* HIGHLIGHTS TAB */}
        {activeTab === 'highlights' && (
          <HighlightsTab
            highlights={highlights}
            onDeleteHighlight={handleDeleteHighlight}
            onClearAllHighlights={handleClearAllHighlights}
            onOpenInReader={handleOpenInReader}
            onNavigateHome={() => setActiveTab('home')}
            lang={lang}
          />
        )}

        {/* BOOKMARKS TAB */}
        {activeTab === 'bookmarks' && (
          <BookmarksTab
            volumes={volumes}
            onRead={(volume) => setSelectedVolumeForReading(volume)}
            onDownload={handleDownload}
            onToggleBookmark={handleToggleBookmark}
            onNavigateHome={() => setActiveTab('home')}
          />
        )}

        {/* ABOUT TAB */}
        {activeTab === 'about' && (
          <AboutTab
            volumes={volumes}
            lang={lang}
            onNavigateAdmin={() => setActiveTab('admin')}
          />
        )}

        {/* PRIVACY POLICY TAB */}
        {activeTab === 'privacy' && <PrivacyPolicyTab />}

        {/* ADMIN TAB */}
        {activeTab === 'admin' && (
          <AdminPanel
            volumes={volumes}
            onSaveVolumes={saveVolumesState}
            onResetVolumes={handleResetVolumes}
            onSyncGithub={() => syncWithGithubCloud(true)}
            responseBooks={responseBooks}
            onAddResponseBook={handleAddResponseBook}
            onUpdateResponseBook={handleUpdateResponseBook}
            onDeleteResponseBook={handleDeleteResponseBook}
            onReadResponseBook={handleReadResponseBook}
          />
        )}
      </main>

      {/* In-App PDF / Archive Reader Modal */}
      {selectedVolumeForReading && (
        <ReaderModal
          volume={selectedVolumeForReading}
          onClose={() => setSelectedVolumeForReading(null)}
          onDownload={handleDownload}
          isBookmarked={!!selectedVolumeForReading.isBookmarked}
          onToggleBookmark={handleToggleBookmark}
          onUpdateProgress={handleUpdateProgress}
          onAddHighlight={handleAddHighlight}
          highlights={highlights}
        />
      )}

      {/* Bottom Navigation Bar */}
      <BottomNavBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        downloadCount={downloadedCount}
        bookmarkCount={bookmarkCount}
        highlightCount={highlights.length + drawingsCount}
        lang={lang}
      />
    </div>
  );
}
