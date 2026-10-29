import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  Download,
  Bookmark,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  ArrowRight,
  Share2,
  Camera,
  Scissors,
  PenTool,
  RotateCw,
  MoreVertical,
  BookOpen,
  AlertCircle,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { VolumeData, HighlightItem } from '../types/book';
import { resolveVolumeArchiveId, resolveVolumePdfUrl, VERIFIED_ARCHIVE_VOLUMES } from '../utils/archiveUtils';
import { loadPdfDocument, fetchPdfArrayBuffer } from '../utils/pdfLoader';
import { CanvasDrawer } from './CanvasDrawer';
import { DualPageEditorModal } from './DualPageEditorModal';
import { recordRecentRead } from '../utils/readingHistory';
import {
  triggerDirectDownload,
  saveSnapshotToStorage,
  saveBookToInternalStorage,
  getBookFromInternalStorage
} from '../utils/offlineStorage';
import { getDrawingForPage } from '../utils/drawingStorage';

interface ReaderModalProps {
  volume: VolumeData | null;
  onClose: () => void;
  onDownload: (volume: VolumeData) => void;
  isBookmarked: boolean;
  onToggleBookmark: (volumeId: number) => void;
  onUpdateProgress: (volumeId: number, page: number) => void;
  onAddHighlight?: (highlight: HighlightItem) => void;
  highlights?: HighlightItem[];
}

export type ReaderTheme = 'day' | 'sepia' | 'night';

export const ReaderModal: React.FC<ReaderModalProps> = ({
  volume,
  onClose,
  onDownload,
  isBookmarked,
  onToggleBookmark,
  onUpdateProgress,
}) => {
  // 100% Full-Book Preloading States
  const [isBookLoaded, setIsBookLoaded] = useState<boolean>(false);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [loadingStatus, setLoadingStatus] = useState<string>('کتاب کا ڈیٹا ڈاؤن لوڈ ہو رہا ہے...');
  const [loadError, setLoadError] = useState<string | null>(null);

  // PDF Document in Memory
  const [doc, setDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [totalPages, setTotalPages] = useState<number>(476);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageInput, setPageInput] = useState<string>('1');

  // Viewer options
  const [theme, setTheme] = useState<ReaderTheme>('day');
  const [isDrawMode, setIsDrawMode] = useState<boolean>(false);
  const [showDualEditor, setShowDualEditor] = useState<boolean>(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState<boolean>(false);
  const [rotation, setRotation] = useState<number>(0);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Toast notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Swipe & Touch Gestures
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  // DOM Canvas References
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);

  // Guard against reloading when page progress updates volume object reference
  const volumeRef = useRef(volume);
  volumeRef.current = volume;
  const loadedVolumeIdRef = useRef<number | null>(null);
  const loadingInProgressRef = useRef<boolean>(false);
  const docRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);

  // Verified URL & Archive IDs
  const archiveId = volume ? resolveVolumeArchiveId(volume.volumeNumber, volume.archiveItemId) : '1_20261016_20261016_1311';
  const realPdfUrl = volume ? resolveVolumePdfUrl(volume.volumeNumber, volume.pdfUrl) : '';

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Full 100% Book Preloader & Loader: Runs ONCE per book volume
  const loadEntireBook100Percent = useCallback(async (forceReload = false) => {
    const vol = volumeRef.current;
    if (!vol) return;

    // CRITICAL: If this book volume is already fully loaded in memory, DO NOT reload or reset state!
    if (!forceReload && loadedVolumeIdRef.current === vol.id && docRef.current) {
      return;
    }

    if (loadingInProgressRef.current) return;
    loadingInProgressRef.current = true;

    setIsBookLoaded(false);
    setLoadError(null);
    setLoadingProgress(5);
    setLoadingStatus('کتاب کی فائل کا جائزہ لیا جا رہا ہے...');

    const initialP = vol.lastReadPage && vol.lastReadPage > 0 ? vol.lastReadPage : 1;
    setCurrentPage(initialP);
    setPageInput(String(initialP));

    try {
      // 1. Check if full book is already saved in internal IndexedDB
      const storedRecord = await getBookFromInternalStorage(vol.id);
      let buffer: ArrayBuffer | null = null;

      if (storedRecord && storedRecord.blob && storedRecord.blob.size > 100000) {
        setLoadingStatus('انٹرنل اسٹوریج سے کتاب کے اوراق لوڈ ہو رہے ہیں...');
        setLoadingProgress(95);
        buffer = await storedRecord.blob.arrayBuffer();
      }

      // 2. If not stored locally, download entire book 100% with live progress tracking
      if (!buffer) {
        setLoadingStatus('پوری کتاب ڈاؤن لوڈ ہو رہی ہے (100% مکمل ہونے پر کھلے گی)...');
        buffer = await fetchPdfArrayBuffer(realPdfUrl, (pct) => {
          setLoadingProgress(pct);
          setLoadingStatus(`کتاب ڈاؤن لوڈ ہو رہی ہے: ${pct}%`);
        });

        // Save downloaded blob in IndexedDB for instant future access if valid size
        if (buffer && buffer.byteLength > 100000) {
          try {
            await saveBookToInternalStorage({
              volumeId: vol.id,
              volumeNumber: vol.volumeNumber,
              titleUrdu: vol.volumeTitleUrdu,
              fileSize: vol.fileSize || `${Math.round(buffer.byteLength / (1024 * 1024))} MB`,
              downloadedAt: new Date().toLocaleDateString('ur-PK'),
              blob: new Blob([buffer], { type: 'application/pdf' }),
            });
          } catch {}
        }
      }

      // 3. Initialize PDF.js Document from 100% loaded buffer
      setLoadingProgress(100);
      setLoadingStatus('کتاب کے اوراق مکمل تیار ہو چکے ہیں...');

      const loadedDoc = await loadPdfDocument({ data: buffer });
      docRef.current = loadedDoc;
      setDoc(loadedDoc);
      loadedVolumeIdRef.current = vol.id;
      const total = loadedDoc.numPages || vol.pageCount || 476;
      setTotalPages(total);
      setIsBookLoaded(true);

      try {
        recordRecentRead(vol, initialP);
      } catch {}
    } catch (err: any) {
      console.warn('Failed to load full PDF book:', err);
      setLoadError(err.message || 'کتاب کی مکمل فائل ڈاؤن لوڈ کرنے میں دشواری پیش آئی۔ برائے مہربانی اپنا انٹرنیٹ چیک کریں یا دوبارہ کوشش فرمائیں۔');
    } finally {
      loadingInProgressRef.current = false;
    }
  }, [realPdfUrl]);

  // Initial load - ONLY executes when book volume ID changes, NEVER on page turns
  useEffect(() => {
    if (volume && loadedVolumeIdRef.current !== volume.id) {
      loadEntireBook100Percent();
    }
  }, [volume?.id, loadEntireBook100Percent]);

  // Render Page to Canvas instantly from in-memory document
  const renderCurrentPage = useCallback(
    async (pageNum: number) => {
      if (!doc || !canvasRef.current) return;

      try {
        const page = await doc.getPage(pageNum);
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // High resolution rendering for sharp Nastaliq text
        const dpr = Math.min(window.devicePixelRatio || 1.5, 2.5);
        const unscaledViewport = page.getViewport({ scale: 1.0, rotation });

        const containerWidth = containerRef.current ? containerRef.current.clientWidth - 24 : 800;
        const autoScale = Math.min(2.5, Math.max(0.7, (containerWidth / unscaledViewport.width) * (zoomLevel / 100)));
        const viewport = page.getViewport({ scale: autoScale, rotation });

        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);

        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {}
          renderTaskRef.current = null;
        }

        const task = page.render({
          canvasContext: ctx,
          viewport: viewport,
        });
        renderTaskRef.current = task;
        await task.promise;
        renderTaskRef.current = null;

        // Silent background preload of adjacent pages for instantaneous swipe transitions
        if (pageNum < totalPages) {
          doc.getPage(pageNum + 1).catch(() => {});
        }
        if (pageNum > 1) {
          doc.getPage(pageNum - 1).catch(() => {});
        }
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.warn('Page render error:', err);
        }
      }
    },
    [doc, rotation, zoomLevel, totalPages]
  );

  // Render whenever page or doc or rotation changes
  useEffect(() => {
    if (isBookLoaded && doc) {
      renderCurrentPage(currentPage);
    }
  }, [isBookLoaded, doc, currentPage, rotation, zoomLevel, renderCurrentPage]);

  // Hardware / Browser Back Button & Escape Key handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    window.history.pushState({ modal: 'reader' }, '');
    const handlePopState = () => {
      onClose();
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [onClose]);

  if (!volume) return null;

  // Handle instantaneous page navigation
  const handlePageChange = (newPage: number) => {
    const clamped = Math.max(1, Math.min(newPage, totalPages));
    setCurrentPage(clamped);
    setPageInput(String(clamped));
    onUpdateProgress(volume.id, clamped);
    try {
      recordRecentRead(volume, clamped);
    } catch {}
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      handlePageChange(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      handlePageChange(currentPage - 1);
    }
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(pageInput, 10);
    if (!isNaN(parsed)) {
      handlePageChange(parsed);
    }
  };

  // Touch Swipe (RTL: swipe left = next page, swipe right = previous page)
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null || touchStartY === null) return;
    const diffX = touchStartX - e.changedTouches[0].clientX;
    const diffY = touchStartY - e.changedTouches[0].clientY;

    if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX > 0) {
        handleNextPage();
      } else {
        handlePrevPage();
      }
    }
    setTouchStartX(null);
    setTouchStartY(null);
  };

  // Direct In-App Screenshot Capture & Download without navigating to Archive.org
  const handleTakeSnapshot = async () => {
    if (!canvasRef.current) return;
    try {
      showToast('اسکرین شاٹ تیار ہو رہا ہے...');

      // Create export canvas from the rendered canvas + drawings
      const sourceCanvas = canvasRef.current;
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = sourceCanvas.width;
      exportCanvas.height = sourceCanvas.height;
      const ctx = exportCanvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');

      // Draw base rendered page
      ctx.drawImage(sourceCanvas, 0, 0);

      // Composite any user freehand annotations drawn on this page
      try {
        const pageDrawingDataUrl = getDrawingForPage(volume.id, currentPage);
        if (pageDrawingDataUrl) {
          const drawImg = new Image();
          drawImg.src = pageDrawingDataUrl;
          await new Promise<void>((r) => {
            drawImg.onload = () => r();
            drawImg.onerror = () => r();
          });
          ctx.drawImage(drawImg, 0, 0, exportCanvas.width, exportCanvas.height);
        }
      } catch {}

      exportCanvas.toBlob((blob) => {
        if (!blob) throw new Error('Blob creation failed');
        const filename = `Ehtisab_Nasbiyat_Vol_${volume.volumeNumber}_Page_${currentPage}.jpg`;
        triggerDirectDownload(blob, filename);

        // Save to internal gallery storage
        try {
          const dataUrl = exportCanvas.toDataURL('image/jpeg', 0.85);
          saveSnapshotToStorage({
            id: `snap-${volume.volumeNumber}-${currentPage}-${Date.now()}`,
            volumeId: volume.id,
            volumeNumber: volume.volumeNumber,
            volumeTitleUrdu: volume.volumeTitleUrdu,
            page: currentPage,
            capturedAt: new Date().toLocaleDateString('ur-PK'),
            dataUrl,
          });
        } catch {}

        showToast('صفحہ کا اسکرین شاٹ ڈیوائس پر ڈاؤن لوڈ ہو گیا!');
      }, 'image/jpeg', 0.95);
    } catch {
      showToast('اسکرین شاٹ محفوظ کرنے میں دشواری پیش آئی۔');
    }
  };

  // Share handler
  const handleShare = () => {
    const text = `کتاب: احتساب ناصبیت (${volume.volumeTitleUrdu})\nصفحہ نمبر: ${currentPage}\nلنک: https://archive.org/details/${archiveId}`;
    if (navigator.share) {
      navigator.share({ title: `احتساب ناصبیت - ${volume.volumeTitleUrdu}`, text }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(text);
      showToast('صفحہ کا حوالہ کاپی ہو گیا!');
    }
  };

  const handleSnipTool = () => {
    setShowDualEditor(true);
  };

  // Reading Theme styles
  const getThemeBg = () => {
    switch (theme) {
      case 'sepia':
        return 'bg-[#f8f4ec] text-stone-900';
      case 'night':
        return 'bg-[#121212] text-stone-100';
      case 'day':
      default:
        return 'bg-white text-stone-900';
    }
  };

  const getImageFilter = () => {
    switch (theme) {
      case 'sepia':
        return 'sepia(0.2) contrast(1.05)';
      case 'night':
        return 'invert(0.92) hue-rotate(180deg) contrast(1.1)';
      case 'day':
      default:
        return 'none';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-stone-100 select-none overflow-hidden font-sans">
      {/* 1. SLIM TOP LOADING PROGRESS BAR (Visible at the very top of the reader while book loads) */}
      {!isBookLoaded && (
        <div className="w-full h-1 bg-stone-200 shrink-0 relative overflow-hidden z-40">
          <div
            className="h-full bg-gradient-to-r from-emerald-600 via-amber-500 to-emerald-500 transition-all duration-200 shadow-xs"
            style={{ width: `${Math.max(3, loadingProgress)}%` }}
          />
        </div>
      )}

      {/* 2. TOP MAIN HEADER: Centered Title + Live Loading Percentage + Prominent Back Button */}
      <header className="h-14 bg-white border-b border-stone-200 px-3 sm:px-5 flex items-center justify-between z-30 shrink-0 shadow-xs">
        {/* Left: Live Loading Percentage Badge / Indicator */}
        <div className="w-20 sm:w-36 flex items-center justify-start">
          {!isBookLoaded ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 text-[11px] sm:text-xs font-mono font-bold shadow-xs animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              <span>{loadingProgress}% لوڈنگ</span>
            </div>
          ) : (
            <div className="text-[11px] text-stone-400 font-sans hidden sm:block">
              جلد {volume.volumeNumber}
            </div>
          )}
        </div>

        {/* Center: Urdu Book Title in Emerald Green (Matches attached screenshot) */}
        <div className="flex-1 text-center px-1 truncate flex items-center justify-center gap-2">
          <h1 className="font-nastaliq text-base sm:text-xl font-bold text-emerald-700 tracking-wide inline-flex items-center gap-1 sm:gap-2">
            <span>احتساب ناصبیت</span>
            <span className="text-emerald-600 font-normal">—</span>
            <span className="text-emerald-800">{volume.volumeTitleUrdu}</span>
          </h1>
        </div>

        {/* Right: PROMINENT BACK BUTTON (Unmissable, labeled with text and arrow) */}
        <div className="flex items-center justify-end">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-emerald-50 text-stone-800 hover:text-emerald-800 border border-stone-300 font-bold text-xs sm:text-sm cursor-pointer shadow-xs transition-all active:scale-95"
            title="کتاب بند کریں اور فہرست کتب پر واپس جائیں"
          >
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-700 stroke-[2.5]" />
            <span className="font-nastaliq text-sm sm:text-base font-bold">واپس جائیں</span>
          </button>
        </div>
      </header>

      {/* 2. SECONDARY TOOLBAR STRIP (Matches screenshot icons and page jumper) */}
      <div className="h-11 bg-white border-b border-stone-200 px-3 flex items-center justify-between text-stone-700 text-xs z-20 shrink-0">
        {/* Left Icons Strip */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* 3-Dots More Options Menu */}
          <div className="relative">
            <button
              onClick={() => setShowOptionsMenu(!showOptionsMenu)}
              className={`p-1.5 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer ${
                showOptionsMenu ? 'bg-stone-200 text-stone-900' : 'text-stone-700'
              }`}
              title="مزید ترتیبات"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {/* Dropdown Menu */}
            {showOptionsMenu && (
              <div className="absolute top-full left-0 mt-1 w-52 bg-white rounded-2xl shadow-2xl border border-stone-200 p-2 z-50 text-xs space-y-1 animate-in zoom-in-95 duration-150">
                <div className="px-2 py-1 text-[11px] font-bold text-stone-400 border-b border-stone-100">
                  ریڈر تھیمز
                </div>
                <div className="flex items-center gap-1 px-2 py-1">
                  <button
                    onClick={() => {
                      setTheme('day');
                      setShowOptionsMenu(false);
                    }}
                    className={`flex-1 py-1 rounded-lg text-center font-sans border text-[11px] ${
                      theme === 'day' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-stone-50 border-stone-200'
                    }`}
                  >
                    سفید
                  </button>
                  <button
                    onClick={() => {
                      setTheme('sepia');
                      setShowOptionsMenu(false);
                    }}
                    className={`flex-1 py-1 rounded-lg text-center font-sans border text-[11px] ${
                      theme === 'sepia' ? 'bg-amber-600 text-white border-amber-600' : 'bg-[#fcf8f0] border-amber-200'
                    }`}
                  >
                    سیپیا
                  </button>
                  <button
                    onClick={() => {
                      setTheme('night');
                      setShowOptionsMenu(false);
                    }}
                    className={`flex-1 py-1 rounded-lg text-center font-sans border text-[11px] ${
                      theme === 'night' ? 'bg-stone-900 text-white border-stone-900' : 'bg-stone-100 border-stone-300'
                    }`}
                  >
                    نائٹ
                  </button>
                </div>

                <div className="border-t border-stone-100 my-1"></div>

                <button
                  onClick={() => {
                    setIsDrawMode(!isDrawMode);
                    setShowOptionsMenu(false);
                  }}
                  className="w-full text-right px-2.5 py-1.5 rounded-lg hover:bg-stone-50 flex items-center justify-between cursor-pointer"
                >
                  <span className="font-sans">قلم و ڈرائنگ موڈ</span>
                  <PenTool className="w-3.5 h-3.5 text-stone-500" />
                </button>

                <button
                  onClick={() => {
                    setRotation((prev) => (prev + 90) % 360);
                    setShowOptionsMenu(false);
                  }}
                  className="w-full text-right px-2.5 py-1.5 rounded-lg hover:bg-stone-50 flex items-center justify-between cursor-pointer"
                >
                  <span className="font-sans">صفحہ ۹۰° گھمائیں</span>
                  <RotateCw className="w-3.5 h-3.5 text-stone-500" />
                </button>

                <button
                  onClick={() => {
                    onToggleBookmark(volume.id);
                    setShowOptionsMenu(false);
                  }}
                  className="w-full text-right px-2.5 py-1.5 rounded-lg hover:bg-stone-50 flex items-center justify-between cursor-pointer"
                >
                  <span className="font-sans">{isBookmarked ? 'بُک مارک خارج کریں' : 'بُک مارک محفوظ کریں'}</span>
                  <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-amber-500 text-amber-500' : 'text-stone-500'}`} />
                </button>
              </div>
            )}
          </div>

          {/* Share */}
          <button
            onClick={handleShare}
            className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
            title="صفحہ کا حوالہ شیئر کریں"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Camera / Snapshot (Direct Device Download) */}
          <button
            onClick={handleTakeSnapshot}
            className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer text-emerald-700"
            title="صفحہ کی تصویر کیپچر اور ڈیوائس پر محفوظ کریں"
          >
            <Camera className="w-4 h-4" />
          </button>

          {/* Download Book (Direct In-App Download) */}
          <button
            onClick={() => onDownload(volume)}
            className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer text-amber-700"
            title="کتاب پی ڈی ایف براہِ راست ڈاؤن لوڈ کریں"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Scissors / Snip Editor */}
          <button
            onClick={handleSnipTool}
            className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
            title="سند ساز و حوالہ ایڈیٹر کھولیں"
          >
            <Scissors className="w-4 h-4" />
          </button>

          {/* Down Chevron (Next page) */}
          <button
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded-lg hover:bg-stone-100 disabled:opacity-30 cursor-pointer transition-colors"
            title="اگلا صفحہ"
          >
            <ChevronDown className="w-4 h-4" />
          </button>

          {/* Up Chevron (Previous page) */}
          <button
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className="p-1.5 rounded-lg hover:bg-stone-100 disabled:opacity-30 cursor-pointer transition-colors"
            title="پچھلا صفحہ"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Page Jumper Box (Matches user screenshot: "من 476" + input box "2") */}
        <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1.5">
          <span className="text-stone-500 font-sans text-xs">من {totalPages}</span>
          <input
            type="number"
            min="1"
            max={totalPages}
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            className="w-12 h-7 text-center text-xs font-mono font-bold bg-white text-stone-900 border border-stone-300 rounded px-1 focus:outline-none focus:border-emerald-600 shadow-inner"
          />
        </form>
      </div>

      {/* 3. MAIN CENTER READING SCREEN: Canvas rendering from 100% loaded document */}
      <main
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`flex-1 overflow-auto flex justify-center items-start p-2 sm:p-4 relative ${getThemeBg()}`}
      >
        {/* Toast Alert */}
        {toastMessage && (
          <div className="fixed top-28 left-1/2 -translate-x-1/2 z-50 bg-stone-900/90 backdrop-blur-md text-emerald-400 border border-emerald-500/50 px-4 py-2 rounded-2xl text-xs font-sans shadow-2xl flex items-center gap-2 animate-in fade-in zoom-in-95">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* If Book is Still Loading 100%, show Elegant In-Reader Book Page Placeholder */}
        {!isBookLoaded ? (
          <div className="w-[94vw] max-w-[650px] min-h-[520px] sm:min-h-[700px] bg-white rounded-lg shadow-xl border border-stone-300 p-6 sm:p-10 flex flex-col justify-between text-stone-800 my-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Top Page Running Header (Styled like authentic Urdu Islamic book header) */}
            <div className="border-b border-stone-300 pb-3 flex items-center justify-between text-stone-600 text-xs font-nastaliq">
              <span>مجموعہ کتب: احتسابِ ناصبیت</span>
              <span className="font-bold text-emerald-800">{volume.volumeTitleUrdu}</span>
              <span>جلد {volume.volumeNumber}</span>
            </div>

            {/* Center Loading Status & Live Percentage */}
            <div className="py-8 sm:py-12 flex flex-col items-center justify-center text-center space-y-4 sm:space-y-5 my-auto">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-inner">
                  <BookOpen className="w-10 h-10 animate-pulse text-emerald-600" />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-emerald-600 text-white text-[11px] font-mono font-bold px-2 py-0.5 rounded-full shadow">
                  {loadingProgress}%
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-4xl sm:text-5xl font-mono font-black text-emerald-700 tracking-tight">
                  {loadingProgress}%
                </div>
                <h3 className="font-nastaliq text-lg sm:text-xl font-bold text-stone-800">
                  کتاب ریڈر میں لوڈ ہو رہی ہے...
                </h3>
                <p className="text-xs text-emerald-700 font-semibold font-sans">
                  {loadingStatus}
                </p>
              </div>

              {/* Progress Line */}
              <div className="w-64 sm:w-80 h-3 bg-stone-100 rounded-full border border-stone-200 overflow-hidden p-0.5 shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-emerald-600 to-amber-400 rounded-full transition-all duration-200"
                  style={{ width: `${Math.max(4, loadingProgress)}%` }}
                />
              </div>

              <p className="text-xs text-stone-500 max-w-sm leading-relaxed font-sans px-2">
                تمام صفحات ریڈر میں یکمشت محفوظ ہو رہے ہیں تاکہ کھلنے کے بعد ورق گردانی بغیر کسی تعطل کے فوری اور رواں ہو۔
              </p>

              {loadError && (
                <div className="w-full max-w-sm p-4 bg-rose-50 border border-rose-300 rounded-2xl text-rose-800 text-xs space-y-2 text-right">
                  <p className="leading-relaxed">{loadError}</p>
                  <button
                    onClick={() => loadEntireBook100Percent(true)}
                    className="w-full py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>دوبارہ کوشش فرمائیں</span>
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Page Footer */}
            <div className="border-t border-stone-300 pt-3 flex items-center justify-between text-stone-500 text-xs font-sans">
              <span>اشاعت: دار التحقیق</span>
              <span className="font-mono font-bold text-stone-700">صفحہ {currentPage}</span>
              <span>تمام اوراق محفوظ</span>
            </div>
          </div>
        ) : null}

        {/* Clean Book Page Canvas (Matches user's screenshot page display) */}
        <div
          className={`relative flex justify-center items-center max-w-full my-auto transition-transform duration-200 ${
            !isBookLoaded ? 'hidden' : ''
          }`}
          style={{ filter: getImageFilter() }}
        >
          <canvas
            ref={canvasRef}
            className="shadow-xl rounded bg-white transition-opacity duration-150"
          />

          {/* Freehand Notes / Canvas Overlay */}
          <CanvasDrawer
            volumeId={volume.id}
            volumeNumber={volume.volumeNumber}
            volumeTitleUrdu={volume.volumeTitleUrdu}
            currentPage={currentPage}
            isDrawMode={isDrawMode}
            onCloseDrawMode={() => setIsDrawMode(false)}
          />
        </div>
      </main>

      {/* 4. BOTTOM PROGRESS SLIDER BAR (Matches Screenshot) */}
      <footer className="h-12 bg-white border-t border-stone-200 px-4 flex items-center justify-between gap-4 z-20 shrink-0">
        {/* Green Range Slider */}
        <div className="flex-1 flex items-center">
          <input
            type="range"
            min="1"
            max={totalPages}
            value={currentPage}
            onChange={(e) => handlePageChange(parseInt(e.target.value, 10))}
            className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            title={`صفحہ سلائیڈر: ${currentPage} / ${totalPages}`}
          />
        </div>

        {/* Page Counter Text on Right: Matches screenshot format `476 / 2` */}
        <div className="text-xs font-mono font-bold text-stone-800 whitespace-nowrap min-w-[70px] text-left">
          {totalPages} / {currentPage}
        </div>
      </footer>

      {/* Mobile Floating Back Button */}
      <button
        onClick={onClose}
        className="sm:hidden fixed bottom-16 right-4 z-50 bg-emerald-700 text-white shadow-2xl px-3.5 py-2 rounded-full flex items-center gap-1.5 text-xs font-bold active:scale-95 cursor-pointer border border-emerald-500"
        title="واپس جائیں"
      >
        <ArrowRight className="w-4 h-4 stroke-[2.5]" />
        <span className="font-nastaliq text-xs font-bold">واپس</span>
      </button>

      {/* Dual Page Snip / Reference Editor Modal */}
      {showDualEditor && (
        <DualPageEditorModal
          volume={volume}
          currentPage={currentPage}
          onClose={() => setShowDualEditor(false)}
        />
      )}
    </div>
  );
};
