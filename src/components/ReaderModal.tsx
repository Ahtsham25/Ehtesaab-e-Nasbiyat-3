import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Maximize2,
  Minimize2,
  Download,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  BookOpen,
  CheckCircle2,
  RotateCcw,
  Sun,
  Moon,
  Coffee,
  Sparkles,
  ArrowRight,
  Share2,
  ZoomIn,
  ZoomOut,
  Highlighter,
  MoreVertical,
  Camera,
  Scissors,
  FileText,
  PenTool,
  Columns2,
  RefreshCw,
  FileUp,
  RotateCw,
  List
} from 'lucide-react';
import { VolumeData, getReadingProgress, HighlightItem } from '../types/book';
import { BOOK_VOLUMES_CONTENT, ChapterItem } from '../data/bookContent';
import { CanvasDrawer } from './CanvasDrawer';
import { DualPageEditorModal } from './DualPageEditorModal';
import { InternalPdfViewer } from './InternalPdfViewer';
import { recordRecentRead } from '../utils/readingHistory';

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
  onAddHighlight,
  highlights = [],
}) => {
  // Mode: 'archive-page' (direct scanned book pages as in user screenshot) vs 'text' (Unicode chapters) vs 'local-pdf'
  const [activeMode, setActiveMode] = useState<'archive-page' | 'text' | 'local-pdf'>('archive-page');
  const [theme, setTheme] = useState<ReaderTheme>('day');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isDrawMode, setIsDrawMode] = useState<boolean>(false);
  const [showDualEditor, setShowDualEditor] = useState<boolean>(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState<boolean>(false);
  const [showToc, setShowToc] = useState<boolean>(false);
  const [showVolumeHighlights, setShowVolumeHighlights] = useState<boolean>(false);

  // Page tracking
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageInput, setPageInput] = useState<string>('1');
  const [imageLoading, setImageLoading] = useState<boolean>(true);
  const [imageError, setImageError] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [rotation, setRotation] = useState<number>(0);

  // Toast notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Text selection & Highlight popup state (in text mode)
  const [selectedText, setSelectedText] = useState<string>('');
  const [highlightCoords, setHighlightCoords] = useState<{ x: number; y: number } | null>(null);
  const [highlightColor, setHighlightColor] = useState<string>('#f59e0b');
  const [highlightNote, setHighlightNote] = useState<string>('');
  const [showNoteInput, setShowNoteInput] = useState(false);

  // Swipe & Touch Gestures
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derive total pages and archive item ID
  const archiveId = volume?.archiveItemId || '1_20261016_20261016_1311';
  const totalPages = volume?.pageCount && volume.pageCount > 0 ? volume.pageCount : 476;
  const progressPct = getReadingProgress(currentPage, totalPages);

  const volumeContent = volume ? (BOOK_VOLUMES_CONTENT[volume.volumeNumber] || BOOK_VOLUMES_CONTENT[1]) : BOOK_VOLUMES_CONTENT[1];
  const chapters = volumeContent.chapters || [];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Sync initial page
  useEffect(() => {
    if (volume) {
      const initialPage = volume.lastReadPage && volume.lastReadPage > 0 ? volume.lastReadPage : 1;
      setCurrentPage(initialPage);
      setPageInput(String(initialPage));
      try {
        recordRecentRead(volume, initialPage);
      } catch {}
    }
  }, [volume]);

  // Preload adjacent pages for instant flipping
  useEffect(() => {
    if (archiveId && activeMode === 'archive-page') {
      const nextP = currentPage + 1;
      const prevP = currentPage - 1;
      if (nextP <= totalPages) {
        const imgNext = new Image();
        imgNext.src = `https://archive.org/download/${archiveId}/page/n${nextP}_w1200.jpg`;
      }
      if (prevP >= 1) {
        const imgPrev = new Image();
        imgPrev.src = `https://archive.org/download/${archiveId}/page/n${prevP}_w1200.jpg`;
      }
    }
  }, [archiveId, currentPage, totalPages, activeMode]);

  if (!volume) return null;

  // Handle page navigation
  const handlePageChange = (newPage: number) => {
    const clamped = Math.max(1, Math.min(newPage, totalPages));
    setCurrentPage(clamped);
    setPageInput(String(clamped));
    setImageLoading(true);
    setImageError(false);
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

  // Swipe handlers (RTL: swipe left = next page, swipe right = previous page)
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null || touchStartY === null) return;
    const diffX = touchStartX - e.changedTouches[0].clientX;
    const diffY = touchStartY - e.changedTouches[0].clientY;

    if (Math.abs(diffX) > 45 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX > 0) {
        // Swiped left -> Next page
        handleNextPage();
      } else {
        // Swiped right -> Previous page
        handlePrevPage();
      }
    }
    setTouchStartX(null);
    setTouchStartY(null);
  };

  // Screenshot / Snapshot capture
  const handleTakeSnapshot = () => {
    const pageUrl = `https://archive.org/download/${archiveId}/page/n${currentPage}_w1200.jpg`;
    window.open(pageUrl, '_blank');
    showToast('صفحہ کی تصویر الگ ٹیب میں کھل گئی!');
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

  // Snip / Crop reference
  const handleSnipTool = () => {
    setShowDualEditor(true);
  };

  // Local PDF file picker
  const handleLocalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setActiveMode('local-pdf');
      setShowOptionsMenu(false);
      showToast('مقامی فائل لوڈ ہو رہی ہے...');
    }
  };

  const currentArchiveImageUrl = `https://archive.org/download/${archiveId}/page/n${currentPage}_w1200.jpg`;

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
      {/* 1. TOP MAIN HEADER (Matches user screenshot: Green title + document icon + back arrow) */}
      <header className="h-14 bg-white border-b border-stone-200 px-4 flex items-center justify-between z-30 shrink-0">
        {/* Left: Green Document / Book Icon */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowToc(!showToc)}
            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
            title="فہرستِ ابواب و فصول"
          >
            <BookOpen className="w-5 h-5 text-emerald-600" />
          </button>
        </div>

        {/* Center: Urdu Book Title in Emerald Green */}
        <div className="flex-1 text-center px-2">
          <h1 className="font-nastaliq text-xl sm:text-2xl font-bold text-emerald-600 tracking-wide inline-flex items-center gap-2">
            <span>احتساب ناصبیت</span>
            <span className="text-emerald-700/80 font-normal">—</span>
            <span className="text-emerald-700">{volume.volumeTitleUrdu}</span>
          </h1>
        </div>

        {/* Right: Back Arrow Button (RTL back arrow) */}
        <button
          onClick={onClose}
          className="p-2 text-stone-700 hover:text-stone-950 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
          title="بند کریں اور واپس جائیں"
        >
          <ArrowRight className="w-6 h-6" />
        </button>
      </header>

      {/* 2. SECONDARY TOOLBAR STRIP (Matches user screenshot icons and page jumper) */}
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
              title="مزید آپشنز"
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
                    fileInputRef.current?.click();
                  }}
                  className="w-full text-right px-2.5 py-1.5 rounded-lg hover:bg-stone-50 flex items-center justify-between cursor-pointer"
                >
                  <span className="font-sans">ڈیوائس سے پی ڈی ایف کھولیں</span>
                  <FileUp className="w-3.5 h-3.5 text-stone-500" />
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

          {/* Camera / Snapshot */}
          <button
            onClick={handleTakeSnapshot}
            className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
            title="صفحہ کی تصویر کیپچر کریں"
          >
            <Camera className="w-4 h-4" />
          </button>

          {/* Download */}
          <button
            onClick={() => onDownload(volume)}
            className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
            title="پی ڈی ایف ڈاؤن لوڈ کریں"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Scissors / Snip Editor */}
          <button
            onClick={handleSnipTool}
            className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
            title="سند ساز و صفحہ ایڈیٹر کھولیں"
          >
            <Scissors className="w-4 h-4" />
          </button>

          {/* Document / Unicode Chapters Mode Toggle */}
          <button
            onClick={() => setActiveMode(activeMode === 'text' ? 'archive-page' : 'text')}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              activeMode === 'text' ? 'bg-emerald-600 text-white' : 'hover:bg-stone-100'
            }`}
            title={activeMode === 'text' ? 'اصل صفحہ موڈ' : 'تحریری فصول و متن'}
          >
            <FileText className="w-4 h-4" />
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

      {/* 3. MAIN CENTER READING SCREEN */}
      <main
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

        {/* Active View: Scanned Book Page (Default as in screenshot) */}
        {activeMode === 'archive-page' && (
          <div
            className="relative flex justify-center items-center max-w-full my-auto transition-transform duration-200"
            style={{
              transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
              transformOrigin: 'top center',
            }}
          >
            {/* Loading Spinner */}
            {imageLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-20 min-h-[400px]">
                <div className="w-8 h-8 border-3 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin mb-2"></div>
                <span className="text-xs text-stone-500 font-sans">صفحہ لوڈ ہو رہا ہے...</span>
              </div>
            )}

            {/* Error Fallback */}
            {imageError && (
              <div className="text-center p-8 bg-stone-50 border border-stone-200 rounded-2xl max-w-md my-8 shadow-sm">
                <BookOpen className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                <h3 className="font-nastaliq text-lg font-bold text-stone-800 mb-1">
                  صفحہ لوڈ کرنے میں تاخیر
                </h3>
                <p className="text-xs text-stone-500 font-sans mb-4">
                  انٹرنیٹ آرکائیو سے رابطہ دوبارہ استوار کیا جا رہا ہے۔ آپ ٹیکسٹ موڈ میں بھی پڑھ سکتے ہیں۔
                </p>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => {
                      setImageLoading(true);
                      setImageError(false);
                    }}
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-sans cursor-pointer"
                  >
                    دوبارہ کوشش
                  </button>
                  <button
                    onClick={() => setActiveMode('text')}
                    className="px-3 py-1.5 bg-stone-200 text-stone-800 rounded-lg text-xs font-sans cursor-pointer"
                  >
                    تحریری فصول دیکھیں
                  </button>
                </div>
              </div>
            )}

            {/* Clean Book Page Image (Exact match to screenshot) */}
            <img
              key={`page-${archiveId}-${currentPage}`}
              src={currentArchiveImageUrl}
              alt={`صفحہ ${currentPage}`}
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageLoading(false);
                setImageError(true);
              }}
              style={{ filter: getImageFilter() }}
              className={`max-w-full sm:max-w-2xl md:max-w-3xl h-auto object-contain shadow-md rounded bg-white transition-opacity duration-150 ${
                imageLoading ? 'opacity-0' : 'opacity-100'
              }`}
            />

            {/* Freehand Notes / Canvas Overlay on top of the authentic book page */}
            <CanvasDrawer
              volumeId={volume.id}
              volumeNumber={volume.volumeNumber}
              volumeTitleUrdu={volume.volumeTitleUrdu}
              currentPage={currentPage}
              isDrawMode={isDrawMode}
              onCloseDrawMode={() => setIsDrawMode(false)}
            />
          </div>
        )}

        {/* Local PDF Canvas Viewer Mode */}
        {activeMode === 'local-pdf' && (
          <div className="w-full h-full flex flex-col">
            <InternalPdfViewer
              pdfUrl={volume.pdfUrl}
              archiveItemId={volume.archiveItemId}
              initialPage={currentPage}
              totalExpectedPages={totalPages}
              onPageChange={handlePageChange}
              onSwitchToTextMode={() => setActiveMode('text')}
              theme={theme === 'sepia' ? 'sepia' : theme === 'night' ? 'night' : 'day'}
              volumeTitle={volume.volumeTitleUrdu}
              volumeId={volume.id}
              volumeNumber={volume.volumeNumber}
              isDrawMode={isDrawMode}
              onCloseDrawMode={() => setIsDrawMode(false)}
            />
          </div>
        )}

        {/* Transcribed Text Chapters Mode */}
        {activeMode === 'text' && (
          <article className="w-full max-w-3xl bg-white border border-stone-200 rounded-2xl p-6 sm:p-10 shadow-sm my-auto font-nastaliq leading-relaxed">
            <div className="text-center pb-4 mb-6 border-b border-stone-100">
              <div className="text-sm font-arabic text-emerald-700 mb-1">
                بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
              </div>
              <h2 className="text-2xl font-bold text-stone-900">احتساب ناصبیت</h2>
              <p className="text-xs text-stone-500 font-sans mt-0.5">{volume.volumeTitleUrdu}</p>
            </div>

            {chapters.length > 0 && (
              <div className="space-y-4 text-justify">
                <div className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold mb-3 border border-emerald-200">
                  {chapters[0]?.title}
                </div>
                {chapters[0]?.content.map((p, idx) => (
                  <p key={idx} className="indent-4 leading-loose text-stone-800">
                    {p}
                  </p>
                ))}
              </div>
            )}
          </article>
        )}

        {/* Table of Contents Drawer */}
        {showToc && (
          <aside className="fixed inset-y-0 left-0 w-72 sm:w-80 bg-white border-r border-stone-200 p-4 shadow-2xl z-40 overflow-y-auto animate-in slide-in-from-left duration-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-stone-200 mb-3">
                <span className="font-nastaliq text-base font-bold text-emerald-700">
                  فہرستِ ابواب و فصول
                </span>
                <button
                  onClick={() => setShowToc(false)}
                  className="p-1 text-stone-400 hover:text-stone-900 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1.5">
                {chapters.map((ch, idx) => (
                  <button
                    key={ch.id || idx}
                    onClick={() => {
                      handlePageChange(ch.page || 1);
                      setShowToc(false);
                    }}
                    className="w-full text-right p-2.5 rounded-xl text-xs transition-colors flex items-start justify-between gap-2 hover:bg-emerald-50 text-stone-800 cursor-pointer"
                  >
                    <span className="font-nastaliq">{ch.title}</span>
                    <span className="text-[10px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded border border-stone-200 font-mono">
                      ص {ch.page}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-stone-100 text-[11px] text-stone-400 text-center font-sans">
              کل صفحات: {totalPages}
            </div>
          </aside>
        )}
      </main>

      {/* 4. BOTTOM PROGRESS SLIDER BAR (Matches user screenshot: full green slider + 476 / 2 on right) */}
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

      {/* Hidden local file picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={handleLocalFileChange}
      />

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
