import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  ArrowRight,
  BookOpen,
  MoreVertical,
  Share2,
  Camera,
  Download,
  Scissors,
  FileText,
  ChevronUp,
  ChevronDown,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Columns2,
  FileUp,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X
} from 'lucide-react';
import { loadPdfDocument, normalizePdfUrl } from '../utils/pdfLoader';
import { CanvasDrawer } from './CanvasDrawer';

interface InternalPdfViewerProps {
  pdfUrl: string;
  archiveItemId?: string;
  initialPage: number;
  totalExpectedPages?: number;
  onPageChange: (page: number) => void;
  onTotalPagesLoaded?: (total: number) => void;
  onSwitchToTextMode?: () => void;
  onClose?: () => void;
  theme?: 'sepia' | 'night' | 'emerald' | 'day';
  volumeTitle: string;
  volumeId: number;
  volumeNumber: number;
  isDrawMode: boolean;
  onCloseDrawMode: () => void;
}

export const InternalPdfViewer: React.FC<InternalPdfViewerProps> = ({
  pdfUrl: initialPdfUrl,
  archiveItemId,
  initialPage,
  totalExpectedPages = 476,
  onPageChange,
  onTotalPagesLoaded,
  onSwitchToTextMode,
  onClose,
  theme = 'day',
  volumeTitle,
  volumeId,
  volumeNumber,
  isDrawMode,
  onCloseDrawMode,
}) => {
  // Document state
  const [currentUrl, setCurrentUrl] = useState<string>(initialPdfUrl);
  const [doc, setDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [totalPages, setTotalPages] = useState<number>(totalExpectedPages);
  const [currentPage, setCurrentPage] = useState<number>(initialPage || 1);
  const [pageInput, setPageInput] = useState<string>(String(initialPage || 1));

  // Loading & Error states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isPageRendering, setIsPageRendering] = useState<boolean>(false);

  // Viewport & Zoom controls
  const [zoomPercent, setZoomPercent] = useState<number>(100);
  const [rotation, setRotation] = useState<number>(0);
  const [isDualPage, setIsDualPage] = useState<boolean>(false);
  const [isFitWidth, setIsFitWidth] = useState<boolean>(true);

  // Dropdown menus & Toast
  const [showOptionsMenu, setShowOptionsMenu] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Custom URL / File picker modal
  const [showSourceModal, setShowSourceModal] = useState<boolean>(false);
  const [customUrlInput, setCustomUrlInput] = useState<string>('');
  const [localFileName, setLocalFileName] = useState<string | null>(null);

  // DOM References
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasDualRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const renderTaskDualRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Sync initialPage from outside when it changes externally
  useEffect(() => {
    if (initialPage && initialPage !== currentPage) {
      setCurrentPage(initialPage);
      setPageInput(String(initialPage));
    }
  }, [initialPage]);

  // Load document when currentUrl changes
  const loadDocumentFromSource = useCallback(
    async (source: { url?: string; data?: ArrayBuffer }) => {
      setIsLoading(true);
      setLoadError(null);
      setLoadingProgress(10);

      try {
        const loadedDoc = await loadPdfDocument(source, (pct) => {
          setLoadingProgress(pct);
        });

        setDoc(loadedDoc);
        const count = loadedDoc.numPages;
        setTotalPages(count);
        if (onTotalPagesLoaded) onTotalPagesLoaded(count);

        const targetPage = Math.min(Math.max(1, currentPage), count);
        setCurrentPage(targetPage);
        setPageInput(String(targetPage));
        setIsLoading(false);
      } catch (err: any) {
        console.warn('PDF source could not be fetched:', err?.message || err);
        setLoadError(
          err.message || 'پی ڈی ایف فائل لوڈ نہیں ہو سکی۔ برائے مہربانی اپنا انٹرنیٹ چیک کریں یا براہ راست فائل اپلوڈ کریں۔'
        );
        setIsLoading(false);
      }
    },
    [currentPage, onTotalPagesLoaded]
  );

  useEffect(() => {
    if (currentUrl) {
      loadDocumentFromSource({ url: currentUrl });
    }
  }, [currentUrl, loadDocumentFromSource]);

  // Render Page to Canvas
  const renderPage = useCallback(
    async (pageNum: number, canvas: HTMLCanvasElement | null, isSecondary = false) => {
      if (!doc || !canvas) return;

      try {
        const page = await doc.getPage(pageNum);
        const pixelRatio = window.devicePixelRatio || 1.5;

        const unscaledViewport = page.getViewport({ scale: 1.0, rotation });

        let computedScale = (zoomPercent / 100) * 1.35;

        // Auto Fit Width if enabled
        if (isFitWidth && containerRef.current) {
          const containerWidth = containerRef.current.clientWidth - (isDualPage ? 50 : 30);
          const targetWidth = isDualPage ? containerWidth / 2 : containerWidth;
          computedScale = Math.min(2.5, (targetWidth / unscaledViewport.width));
        }

        const viewport = page.getViewport({ scale: computedScale, rotation });

        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        const transform = pixelRatio !== 1 ? [pixelRatio, 0, 0, pixelRatio, 0, 0] : undefined;

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
          transform: transform,
        };

        if (isSecondary) {
          if (renderTaskDualRef.current) {
            renderTaskDualRef.current.cancel();
          }
          const task = page.render(renderContext);
          renderTaskDualRef.current = task;
          await task.promise;
          renderTaskDualRef.current = null;
        } else {
          if (renderTaskRef.current) {
            renderTaskRef.current.cancel();
          }
          setIsPageRendering(true);
          const task = page.render(renderContext);
          renderTaskRef.current = task;
          await task.promise;
          renderTaskRef.current = null;
          setIsPageRendering(false);
        }
      } catch (err: any) {
        if (err.name !== 'RenderingCancelledException') {
          console.warn('Error rendering PDF page:', err);
        }
        if (!isSecondary) setIsPageRendering(false);
      }
    },
    [doc, rotation, zoomPercent, isFitWidth, isDualPage]
  );

  useEffect(() => {
    if (doc && currentPage >= 1 && currentPage <= totalPages) {
      renderPage(currentPage, canvasRef.current, false);

      if (isDualPage && currentPage + 1 <= totalPages) {
        renderPage(currentPage + 1, canvasDualRef.current, true);
      }
    }
  }, [doc, currentPage, zoomPercent, rotation, isFitWidth, isDualPage, totalPages, renderPage]);

  // Page Navigation Handlers
  const goToPage = (target: number) => {
    const validPage = Math.max(1, Math.min(target, totalPages));
    setCurrentPage(validPage);
    setPageInput(String(validPage));
    onPageChange(validPage);
  };

  const handleNextPage = () => {
    goToPage(currentPage + (isDualPage ? 2 : 1));
  };

  const handlePrevPage = () => {
    goToPage(currentPage - (isDualPage ? 2 : 1));
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(pageInput, 10);
    if (!isNaN(parsed)) {
      goToPage(parsed);
    }
  };

  // Action Bar Handlers matching screenshot
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `احتساب ناصبیت - ${volumeTitle}`,
        text: `مطالعہ احتساب ناصبیت ${volumeTitle} - صفحہ نمبر ${currentPage}`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href);
      showToast('لنک کاپی ہو گیا ہے!');
    }
  };

  const handleSnapshot = () => {
    if (!canvasRef.current) return;
    try {
      const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.95);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `Ehtisab-${volumeTitle}-Page-${currentPage}.jpg`;
      link.click();
      showToast('صفحہ کا اسکرین شاٹ ڈاؤن لوڈ ہو گیا!');
    } catch {
      showToast('تصویر محفوظ نہیں ہو سکی۔');
    }
  };

  const handleDownloadPdf = () => {
    const link = document.createElement('a');
    link.href = currentUrl;
    link.download = `Ehtisab-e-Nasbiyat-${volumeTitle}.pdf`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.click();
    showToast('پی ڈی ایف ڈاؤن لوڈ شروع ہو چکا ہے...');
  };

  // Local File Upload Handler
  const handleLocalFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      alert('برائے مہربانی صرف درست پی ڈی ایف (.pdf) فائل منتخب کریں۔');
      return;
    }

    setLocalFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        loadDocumentFromSource({ data: reader.result });
        setShowSourceModal(false);
        showToast('مقامی فائل کامیابی سے لوڈ ہو گئی!');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Custom URL Submit
  const handleApplyCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrlInput.trim()) return;
    const clean = normalizePdfUrl(customUrlInput);
    setCurrentUrl(clean);
    setLocalFileName(null);
    setShowSourceModal(false);
    showToast('نیا لنک لاگو کر دیا گیا!');
  };

  return (
    <div className="w-full h-full flex flex-col relative select-none bg-white text-stone-900 overflow-hidden font-sans">
      {/* 1. TOP TITLE HEADER (Matches Screenshot) */}
      <header className="h-14 px-4 bg-white border-b border-stone-200 flex items-center justify-between z-30 shrink-0">
        {/* Left: Green Document / Book Icon */}
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors">
            <BookOpen className="w-6 h-6 stroke-[2.2]" />
          </div>
        </div>

        {/* Center: Title in Green Nastaliq Font */}
        <div className="text-center">
          <h1 className="font-nastaliq text-xl sm:text-2xl font-bold text-emerald-700 tracking-wide">
            احتساب ناصبیت — {volumeTitle}
          </h1>
        </div>

        {/* Right: Back Arrow */}
        <div className="flex items-center">
          <button
            onClick={onClose}
            title="بند کریں / واپس جائیں"
            className="p-2 text-stone-800 hover:text-emerald-700 hover:bg-stone-100 rounded-full transition-colors cursor-pointer"
          >
            <ArrowRight className="w-6 h-6 stroke-[2.2]" />
          </button>
        </div>
      </header>

      {/* 2. SUB-TOOLBAR (Matches Screenshot Icons) */}
      <div className="h-12 px-3 sm:px-4 bg-white border-b border-stone-200/90 flex items-center justify-between gap-1 sm:gap-2 z-20 shrink-0 shadow-xs">
        {/* Left Icon Cluster: Menu, Share, Camera, Download, Scissors, Notes */}
        <div className="flex items-center gap-1 sm:gap-2 relative">
          {/* More options menu */}
          <button
            onClick={() => setShowOptionsMenu(!showOptionsMenu)}
            title="مزید ترتیبات"
            className="p-1.5 text-stone-700 hover:text-emerald-700 hover:bg-stone-100 rounded-lg cursor-pointer transition-colors"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {/* Options Dropdown */}
          {showOptionsMenu && (
            <div className="absolute top-10 right-0 sm:left-0 z-50 w-56 bg-white border border-stone-200 rounded-2xl shadow-2xl p-2 text-xs space-y-1 animate-in fade-in duration-150">
              <button
                onClick={() => {
                  setIsFitWidth(!isFitWidth);
                  setShowOptionsMenu(false);
                }}
                className="w-full text-right px-3 py-2 rounded-xl hover:bg-stone-100 flex items-center justify-between cursor-pointer"
              >
                <span>چوڑائی کے مطابق فٹ کریں</span>
                <span className="text-[10px] text-emerald-600 font-bold">{isFitWidth ? 'فعال' : 'غیر فعال'}</span>
              </button>

              <button
                onClick={() => {
                  setIsDualPage(!isDualPage);
                  setShowOptionsMenu(false);
                }}
                className="w-full text-right px-3 py-2 rounded-xl hover:bg-stone-100 flex items-center justify-between cursor-pointer"
              >
                <span>دو صفحاتی موڈ (Dual Page)</span>
                <Columns2 className="w-4 h-4 text-stone-600" />
              </button>

              <button
                onClick={() => {
                  setRotation((prev) => (prev + 90) % 360);
                  setShowOptionsMenu(false);
                }}
                className="w-full text-right px-3 py-2 rounded-xl hover:bg-stone-100 flex items-center justify-between cursor-pointer"
              >
                <span>صفحہ گھمائیں (90° Rotate)</span>
                <RotateCw className="w-4 h-4 text-stone-600" />
              </button>

              <button
                onClick={() => {
                  setShowSourceModal(true);
                  setShowOptionsMenu(false);
                }}
                className="w-full text-right px-3 py-2 rounded-xl hover:bg-emerald-50 text-emerald-700 font-bold flex items-center justify-between cursor-pointer"
              >
                <span>پی ڈی ایف تبدیل کریں / اپلوڈ</span>
                <FileUp className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Share */}
          <button
            onClick={handleShare}
            title="اشتراک کریں (Share)"
            className="p-1.5 text-stone-700 hover:text-emerald-700 hover:bg-stone-100 rounded-lg cursor-pointer transition-colors"
          >
            <Share2 className="w-5 h-5" />
          </button>

          {/* Snapshot / Camera */}
          <button
            onClick={handleSnapshot}
            title="صفحہ کا اسکرین شاٹ محفوظ کریں"
            className="p-1.5 text-stone-700 hover:text-emerald-700 hover:bg-stone-100 rounded-lg cursor-pointer transition-colors"
          >
            <Camera className="w-5 h-5" />
          </button>

          {/* Download */}
          <button
            onClick={handleDownloadPdf}
            title="مکمل پی ڈی ایف ڈاؤن لوڈ کریں"
            className="p-1.5 text-stone-700 hover:text-emerald-700 hover:bg-stone-100 rounded-lg cursor-pointer transition-colors"
          >
            <Download className="w-5 h-5" />
          </button>

          {/* Scissors (Crop / Pen Draw Mode) */}
          <button
            onClick={() => {
              if (isDrawMode) {
                onCloseDrawMode();
              } else {
                showToast('قلمی یادداشت و مارکنگ موڈ فعال!');
              }
            }}
            title="قلمی یادداشت و تراش خراش موڈ"
            className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
              isDrawMode
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-stone-700 hover:text-emerald-700 hover:bg-stone-100'
            }`}
          >
            <Scissors className="w-5 h-5" />
          </button>

          {/* FileText (Switch to Unicode Text) */}
          {onSwitchToTextMode && (
            <button
              onClick={onSwitchToTextMode}
              title="تحریری فصول و متن موڈ میں دیکھیں"
              className="p-1.5 text-stone-700 hover:text-emerald-700 hover:bg-stone-100 rounded-lg cursor-pointer transition-colors"
            >
              <FileText className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Right Icon Cluster: Page Down, Page Up, 'من 476', Editable Input [ 2 ] */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Next Page Arrow (Down Arrow in screenshot) */}
          <button
            onClick={handleNextPage}
            disabled={currentPage >= totalPages || isLoading}
            title="اگلا صفحہ"
            className="p-1.5 text-stone-700 hover:text-emerald-700 hover:bg-stone-100 disabled:opacity-30 rounded-lg cursor-pointer transition-colors"
          >
            <ChevronDown className="w-5 h-5" />
          </button>

          {/* Previous Page Arrow (Up Arrow in screenshot) */}
          <button
            onClick={handlePrevPage}
            disabled={currentPage <= 1 || isLoading}
            title="پچھلا صفحہ"
            className="p-1.5 text-stone-700 hover:text-emerald-700 hover:bg-stone-100 disabled:opacity-30 rounded-lg cursor-pointer transition-colors"
          >
            <ChevronUp className="w-5 h-5" />
          </button>

          {/* 'من 476' Label */}
          <span className="text-xs sm:text-sm font-nastaliq font-bold text-stone-600 whitespace-nowrap">
            من {totalPages}
          </span>

          {/* Editable Page Number Input Box [ 2 ] */}
          <form onSubmit={handlePageInputSubmit} className="flex items-center">
            <input
              type="text"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              className="w-10 sm:w-12 h-8 text-center text-xs sm:text-sm font-mono font-bold text-stone-800 bg-white border border-stone-300 rounded-md focus:outline-none focus:border-emerald-600 shadow-2xs"
            />
          </form>
        </div>
      </div>

      {/* 3. MAIN CANVAS PAGE CONTAINER */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto relative p-2 sm:p-6 flex justify-center items-start bg-stone-100/70"
      >
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-30 bg-white/95 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
            <div className="relative w-16 h-16 mb-4">
              <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
              <BookOpen className="w-6 h-6 text-emerald-600 absolute inset-0 m-auto animate-pulse" />
            </div>
            <h3 className="font-nastaliq text-xl font-bold text-emerald-800 mb-1">
              آرکائیو سے پی ڈی ایف لوڈ ہو رہی ہے...
            </h3>
            <p className="text-xs text-stone-500 font-sans max-w-sm mb-4">
              صفحات کی اصل عکسی کاپی تیار کی جا رہی ہے۔
            </p>
            {loadingProgress > 0 && (
              <div className="w-64 max-w-full">
                <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden mb-1">
                  <div
                    className="h-full bg-emerald-600 transition-all duration-200 rounded-full"
                    style={{ width: `${loadingProgress}%` }}
                  ></div>
                </div>
                <div className="text-[11px] text-emerald-700 font-mono text-center font-bold">{loadingProgress}%</div>
              </div>
            )}
          </div>
        )}

        {/* Error Fallback Card */}
        {loadError && !isLoading && (
          <div className="my-auto max-w-lg bg-white border border-stone-200 rounded-3xl p-6 text-center shadow-xl z-20">
            <AlertCircle className="w-12 h-12 text-amber-600 mx-auto mb-3" />
            <h3 className="font-nastaliq text-2xl font-bold text-stone-800 mb-2">
              پی ڈی ایف لوڈ کرنے میں دقت پیش آئی
            </h3>
            <p className="text-xs text-stone-600 font-sans leading-relaxed mb-6">
              {loadError}
            </p>

            <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-2.5">
              <button
                onClick={() => {
                  setCurrentUrl('/data/sample-preview.pdf');
                  setLocalFileName('نمونہ پیش منظر (Intro Preview)');
                  loadDocumentFromSource({ url: '/data/sample-preview.pdf' });
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                <BookOpen className="w-4 h-4" />
                <span>نمونہ پیش منظر دیکھیں</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                <FileUp className="w-4 h-4" />
                <span>ڈیوائس سے فائل منتخب کریں</span>
              </button>

              {onSwitchToTextMode && (
                <button
                  onClick={onSwitchToTextMode}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>تحریری فصول و متن پڑھیں</span>
                </button>
              )}

              <button
                onClick={() => loadDocumentFromSource({ url: currentUrl })}
                className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>دوبارہ کوشش</span>
              </button>
            </div>
          </div>
        )}

        {/* Page Rendering Spinner */}
        {isPageRendering && !isLoading && (
          <div className="absolute top-4 left-4 z-20 bg-white/95 border border-emerald-500/50 text-emerald-700 px-3 py-1 rounded-full text-xs flex items-center gap-2 shadow-md backdrop-blur-xs font-sans">
            <div className="w-3 h-3 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            <span>صفحہ بن رہا ہے...</span>
          </div>
        )}

        {/* CANVAS DISPLAY WRAPPER (Pure White Book Pages Exactly Matching Screenshot) */}
        <div
          className={`flex items-center justify-center gap-4 transition-all duration-200 ${
            isLoading || loadError ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          {/* Dual Page Mode (Left Page) */}
          {isDualPage && currentPage + 1 <= totalPages && (
            <div className="relative shadow-xl rounded-sm overflow-hidden border border-stone-300/80 bg-white">
              <canvas
                ref={canvasDualRef}
                className="max-w-full block"
              />
              <div className="absolute bottom-2 left-2 bg-black/60 text-white font-mono text-[10px] px-2 py-0.5 rounded">
                ص {currentPage + 1}
              </div>
            </div>
          )}

          {/* Primary Page Canvas (Matches user's screenshot page display) */}
          <div className="relative shadow-xl rounded-sm overflow-hidden border border-stone-300/80 bg-white">
            <canvas
              ref={canvasRef}
              className="max-w-full block"
            />

            {/* In-app Freehand Note Drawer */}
            <CanvasDrawer
              volumeId={volumeId}
              volumeNumber={volumeNumber}
              volumeTitleUrdu={volumeTitle}
              currentPage={currentPage}
              isDrawMode={isDrawMode}
              onCloseDrawMode={onCloseDrawMode}
            />
          </div>
        </div>
      </div>

      {/* 4. BOTTOM GREEN SLIDER BAR (Matches Screenshot) */}
      <footer className="h-14 px-4 bg-white border-t border-stone-200 flex items-center justify-between gap-4 z-20 shrink-0">
        {/* Full-width Green Slider */}
        <div className="flex-1 flex items-center">
          <input
            type="range"
            min="1"
            max={totalPages}
            value={currentPage}
            onChange={(e) => goToPage(parseInt(e.target.value, 10))}
            className="w-full h-2 bg-emerald-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            title={`صفحہ: ${currentPage} / ${totalPages}`}
          />
        </div>

        {/* Right Label (e.g. 476 / 250 as in screenshot) */}
        <div className="whitespace-nowrap text-right pl-2 font-mono text-sm font-semibold text-stone-700">
          <span>{totalPages} / {currentPage}</span>
        </div>
      </footer>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-18 left-1/2 -translate-x-1/2 z-50 bg-stone-900 text-white text-xs px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hidden File Input for Device PDF Picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={handleLocalFileUpload}
      />

      {/* CHANGE PDF SOURCE / LOCAL UPLOAD MODAL */}
      {showSourceModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200 mb-4">
              <div className="flex items-center gap-2">
                <FileUp className="w-5 h-5 text-emerald-600" />
                <h3 className="font-nastaliq text-xl font-bold text-stone-800">
                  پی ڈی ایف کا ذریعہ تبدیل کریں
                </h3>
              </div>
              <button
                onClick={() => setShowSourceModal(false)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Option 1: Pick from Device */}
            <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
              <span className="text-xs font-bold text-emerald-900 block mb-1">
                آپشن ۱: اپنے فون / کمپیوٹر سے فائل منتخب کریں
              </span>
              <p className="text-[11px] text-stone-600 mb-3 leading-relaxed">
                اگر آپ کے پاس اس جلد کی پی ڈی ایف موجود ہے تو اسے براہ راست منتخب کریں، یہ بغیر انٹرنیٹ کے فوراً کھلے گی۔
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <FileUp className="w-4 h-4" />
                <span>ڈیوائس سے پی ڈی ایف فائل منتخب کریں</span>
              </button>
            </div>

            {/* Option 2: Enter Custom URL */}
            <form onSubmit={handleApplyCustomUrl} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  آپشن ۲: آن لائن پی ڈی ایف کا لنک درج کریں:
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/ehtisab-vol.pdf"
                  value={customUrlInput}
                  onChange={(e) => setCustomUrlInput(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSourceModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-stone-500 hover:text-stone-700"
                >
                  منسوخ کریں
                </button>
                <button
                  type="submit"
                  disabled={!customUrlInput.trim()}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs cursor-pointer shadow-md"
                >
                  لنک لاگو کریں
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
