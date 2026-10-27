import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  FileUp,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  BookOpen,
  Columns2,
  Sliders,
  Layers,
  ArrowRight,
  Search,
  ExternalLink,
  Download
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
  theme: 'sepia' | 'night' | 'emerald' | 'day';
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
  totalExpectedPages = 100,
  onPageChange,
  onTotalPagesLoaded,
  theme,
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
  const [isFitWidth, setIsFitWidth] = useState<boolean>(false);

  // Custom URL / File picker modal
  const [showSourceModal, setShowSourceModal] = useState<boolean>(false);
  const [customUrlInput, setCustomUrlInput] = useState<string>('');
  const [localFileName, setLocalFileName] = useState<string | null>(null);

  // Thumbnails drawer
  const [showThumbnails, setShowThumbnails] = useState<boolean>(false);

  // DOM References
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasDualRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const renderTaskDualRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

        // Keep page in valid bounds
        const targetPage = Math.min(Math.max(1, currentPage), count);
        setCurrentPage(targetPage);
        setPageInput(String(targetPage));
        setIsLoading(false);
      } catch (err: any) {
        console.error('Failed to load PDF document:', err);
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
        const pixelRatio = window.devicePixelRatio || 1;

        // Base viewport at 1.0 scale
        const unscaledViewport = page.getViewport({ scale: 1.0, rotation });

        let computedScale = (zoomPercent / 100) * 1.5;

        // Auto Fit Width if enabled
        if (isFitWidth && containerRef.current) {
          const containerWidth = containerRef.current.clientWidth - (isDualPage ? 60 : 40);
          const targetWidth = isDualPage ? containerWidth / 2 : containerWidth;
          computedScale = (targetWidth / unscaledViewport.width) * 0.95;
        }

        const viewport = page.getViewport({ scale: computedScale, rotation });

        // Set high-DPI canvas dimensions
        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        // High quality smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        const transform = pixelRatio !== 1 ? [pixelRatio, 0, 0, pixelRatio, 0, 0] : undefined;

        const renderContext = {
          canvasContext: ctx,
          canvas: canvas,
          viewport: viewport,
          transform: transform,
        };

        // Cancel previous rendering if any
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
          console.error('Error rendering PDF page:', err);
        }
        if (!isSecondary) setIsPageRendering(false);
      }
    },
    [doc, rotation, zoomPercent, isFitWidth, isDualPage]
  );

  // Trigger page render when page, zoom, rotation, or doc changes
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
    const step = isDualPage ? 2 : 1;
    goToPage(currentPage + step);
  };

  const handlePrevPage = () => {
    const step = isDualPage ? 2 : 1;
    goToPage(currentPage - step);
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(pageInput, 10);
    if (!isNaN(parsed)) {
      goToPage(parsed);
    }
  };

  // Zoom handlers
  const handleZoomIn = () => {
    setIsFitWidth(false);
    setZoomPercent((prev) => Math.min(300, prev + 20));
  };

  const handleZoomOut = () => {
    setIsFitWidth(false);
    setZoomPercent((prev) => Math.max(50, prev - 20));
  };

  const handleResetZoom = () => {
    setIsFitWidth(false);
    setZoomPercent(100);
  };

  const handleToggleFitWidth = () => {
    setIsFitWidth((prev) => !prev);
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
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
  };

  // Theme Canvas styling filter
  const getCanvasFilter = () => {
    switch (theme) {
      case 'sepia':
        return 'sepia(0.25) contrast(1.05) brightness(0.98)';
      case 'night':
        return 'invert(0.92) hue-rotate(180deg) contrast(1.1) brightness(0.9)';
      case 'emerald':
        return 'sepia(0.15) hue-rotate(90deg) contrast(1.05)';
      case 'day':
      default:
        return 'none';
    }
  };

  return (
    <div className="w-full h-full flex flex-col relative select-none bg-stone-950 text-stone-100 overflow-hidden">
      {/* TOP PDF ACTION & CONTROL BAR */}
      <div className="px-3 py-2 bg-stone-900/95 border-b border-stone-800 flex flex-wrap items-center justify-between gap-2 z-20 backdrop-blur-md">
        {/* Left: Source, Mode & View Tools */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setShowSourceModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-600/40 text-xs font-sans cursor-pointer transition-colors"
            title="پی ڈی ایف کا لنک تبدیل کریں یا ڈیوائس سے فائل منتخب کریں"
          >
            <FileUp className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {localFileName ? `فائل: ${localFileName.slice(0, 15)}...` : 'پی ڈی ایف تبدیل کریں / اپلوڈ'}
            </span>
            <span className="sm:hidden">فائل</span>
          </button>

          {/* Fit Width toggle */}
          <button
            onClick={handleToggleFitWidth}
            className={`px-2 py-1 rounded-xl text-xs border cursor-pointer transition-colors ${
              isFitWidth
                ? 'bg-amber-600 text-stone-950 font-bold border-amber-500'
                : 'bg-stone-800 text-stone-300 border-stone-700 hover:text-white'
            }`}
            title="چوڑائی کے مطابق فٹ کریں"
          >
            فٹ اسکرین
          </button>

          {/* Dual Page Mode (Tablets & Desktops) */}
          <button
            onClick={() => setIsDualPage(!isDualPage)}
            className={`hidden md:flex items-center gap-1 px-2 py-1 rounded-xl text-xs border cursor-pointer transition-colors ${
              isDualPage
                ? 'bg-amber-600 text-stone-950 font-bold border-amber-500'
                : 'bg-stone-800 text-stone-300 border-stone-700 hover:text-white'
            }`}
            title="دو صفحاتی موڈ (کتابی انداز)"
          >
            <Columns2 className="w-3.5 h-3.5" />
            <span>دو صفحات</span>
          </button>

          {/* Rotation */}
          <button
            onClick={handleRotate}
            className="p-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl cursor-pointer"
            title="صفحہ گھمائیں (90° Rotate)"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Center: Zoom Controls */}
        <div className="flex items-center gap-1 bg-stone-950/80 border border-stone-800 rounded-xl p-0.5">
          <button
            onClick={handleZoomOut}
            disabled={zoomPercent <= 50 || isFitWidth}
            className="p-1 text-stone-300 hover:text-amber-400 disabled:opacity-30 rounded-lg cursor-pointer"
            title="زوم کم کریں"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleResetZoom}
            className="px-2 py-0.5 text-xs font-mono font-bold text-amber-400 hover:bg-stone-800 rounded cursor-pointer"
            title="۱۰۰٪ پر ری سیٹ"
          >
            {isFitWidth ? 'آٹو' : `${zoomPercent}%`}
          </button>

          <button
            onClick={handleZoomIn}
            disabled={zoomPercent >= 300 || isFitWidth}
            className="p-1 text-stone-300 hover:text-amber-400 disabled:opacity-30 rounded-lg cursor-pointer"
            title="زوم بڑھائیں"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Quick Page Jumper */}
        <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1.5">
          <span className="text-[11px] text-stone-400 font-sans">ص:</span>
          <input
            type="number"
            min="1"
            max={totalPages}
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            className="w-14 text-center text-xs font-mono font-bold text-amber-300 bg-stone-950 border border-stone-700 rounded-lg px-1.5 py-1 focus:outline-none focus:border-amber-500"
          />
          <span className="text-xs text-stone-400 font-mono">/ {totalPages}</span>
          <button
            type="submit"
            className="bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold px-2 py-1 rounded-lg text-xs cursor-pointer"
          >
            جائیں
          </button>
        </form>
      </div>

      {/* MAIN VIEWPORT CANVAS CONTAINER */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto relative p-4 flex justify-center items-start bg-stone-950"
      >
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-30 bg-stone-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
            <div className="relative w-16 h-16 mb-4">
              <div className="w-16 h-16 border-4 border-amber-600/20 border-t-amber-500 rounded-full animate-spin"></div>
              <BookOpen className="w-6 h-6 text-amber-400 absolute inset-0 m-auto animate-pulse" />
            </div>
            <h3 className="font-nastaliq text-xl font-bold text-amber-300 mb-2">
              پی ڈی ایف کے اوراق تیار ہو رہے ہیں...
            </h3>
            <p className="text-xs text-stone-400 font-sans max-w-sm mb-4">
              کتاب کے اعلیٰ ریزولوشن اوراق لوڈ کیے جا رہے ہیں۔ برائے مہربانی چند لمحے انتظار فرمائیں۔
            </p>
            {loadingProgress > 0 && (
              <div className="w-64 max-w-full">
                <div className="w-full h-2 bg-stone-800 rounded-full overflow-hidden border border-stone-700 mb-1">
                  <div
                    className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-300 rounded-full"
                    style={{ width: `${loadingProgress}%` }}
                  ></div>
                </div>
                <div className="text-[11px] text-amber-400 font-mono text-center">{loadingProgress}%</div>
              </div>
            )}
          </div>
        )}

        {/* Error Fallback Banner */}
        {loadError && !isLoading && (
          <div className="my-auto max-w-lg bg-stone-900 border border-red-500/40 rounded-2xl p-6 text-center shadow-2xl z-20">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
            <h3 className="font-nastaliq text-2xl font-bold text-rose-400 mb-2">
              پی ڈی ایف لوڈ کرنے میں دقت پیش آئی
            </h3>
            <p className="text-xs text-stone-300 font-sans leading-relaxed mb-6">
              {loadError}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <FileUp className="w-4 h-4" />
                <span>ڈیوائس سے پی ڈی ایف فائل منتخب کریں</span>
              </button>

              <button
                onClick={() => loadDocumentFromSource({ url: currentUrl })}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>دوبارہ کوشش کریں</span>
              </button>
            </div>

            <div className="mt-4 pt-4 border-t border-stone-800 text-[11px] text-stone-400">
              اگر فائل انٹرنیٹ آرکائیو پر ہے تو ڈاؤن لوڈ کر کے "ڈیوائس سے منتخب کریں" دبائیں۔
            </div>
          </div>
        )}

        {/* Page Rendering Spinner (during page flips) */}
        {isPageRendering && !isLoading && (
          <div className="absolute top-4 left-4 z-20 bg-stone-900/90 border border-amber-500/50 text-amber-300 px-3 py-1 rounded-full text-xs flex items-center gap-2 shadow-lg backdrop-blur-md">
            <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
            <span>صفحہ بن رہا ہے...</span>
          </div>
        )}

        {/* CANVAS DISPLAY WRAPPER */}
        <div
          className={`flex items-center justify-center gap-6 transition-all duration-200 ${
            isLoading || loadError ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          {/* Dual Page (Left side in RTL = Page N+1) */}
          {isDualPage && currentPage + 1 <= totalPages && (
            <div className="relative shadow-2xl rounded-xl overflow-hidden border border-stone-800 bg-white">
              <canvas
                ref={canvasDualRef}
                style={{ filter: getCanvasFilter() }}
                className="max-w-full block"
              />
              <div className="absolute bottom-2 left-2 bg-stone-900/80 text-amber-300 font-mono text-[10px] px-2 py-0.5 rounded backdrop-blur-sm border border-stone-800">
                ص {currentPage + 1}
              </div>
            </div>
          )}

          {/* Primary Page Canvas (Right side in RTL = Page N) */}
          <div className="relative shadow-2xl rounded-xl overflow-hidden border border-stone-800 bg-white">
            <canvas
              ref={canvasRef}
              style={{ filter: getCanvasFilter() }}
              className="max-w-full block"
            />
            <div className="absolute bottom-2 right-2 bg-stone-900/80 text-amber-300 font-mono text-[10px] px-2 py-0.5 rounded backdrop-blur-sm border border-stone-800">
              ص {currentPage}
            </div>

            {/* In-app Freehand Canvas Note Drawer overlay synced to this PDF page */}
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

      {/* BOTTOM FLOATING PAGE STEPPER & CONTROLS */}
      <div className="px-4 py-2.5 bg-stone-900/95 border-t border-stone-800 flex items-center justify-between gap-3 text-xs z-20 backdrop-blur-md">
        {/* Previous Page Button (In RTL reading, Right is Previous) */}
        <button
          onClick={handlePrevPage}
          disabled={currentPage <= 1 || isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 disabled:opacity-30 cursor-pointer transition-colors"
          title="پچھلا صفحہ"
        >
          <ChevronRight className="w-4 h-4 text-amber-400" />
          <span className="font-nastaliq text-sm">پچھلا صفحہ</span>
        </button>

        {/* Center Page Slider */}
        <div className="flex-1 max-w-xs sm:max-w-md flex items-center gap-2">
          <span className="text-[10px] text-stone-500 font-mono">۱</span>
          <input
            type="range"
            min="1"
            max={totalPages}
            value={currentPage}
            onChange={(e) => goToPage(parseInt(e.target.value, 10))}
            className="w-full h-1.5 bg-stone-950 rounded-lg appearance-none cursor-pointer accent-amber-500"
            title={`صفحہ: ${currentPage} / ${totalPages}`}
          />
          <span className="text-xs font-mono font-bold text-amber-400 whitespace-nowrap">
            ص {currentPage} / {totalPages}
          </span>
        </div>

        {/* Next Page Button (In RTL reading, Left is Next) */}
        <button
          onClick={handleNextPage}
          disabled={currentPage >= totalPages || isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold disabled:opacity-30 cursor-pointer transition-colors shadow-md"
          title="اگلا صفحہ"
        >
          <span className="font-nastaliq text-sm">اگلا صفحہ</span>
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

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
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-stone-800 mb-4">
              <div className="flex items-center gap-2">
                <FileUp className="w-5 h-5 text-amber-400" />
                <h3 className="font-nastaliq text-xl font-bold text-amber-300">
                  پی ڈی ایف کا ذریعہ تبدیل کریں
                </h3>
              </div>
              <button
                onClick={() => setShowSourceModal(false)}
                className="text-stone-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Option 1: Pick from Device (Best for Mobile & Instant Offline) */}
            <div className="mb-6 bg-stone-950 border border-amber-600/30 rounded-2xl p-4">
              <span className="text-xs font-bold text-amber-400 block mb-1">
                آپشن ۱: اپنے فون / کمپیوٹر سے فائل منتخب کریں (سفارش کردہ)
              </span>
              <p className="text-[11px] text-stone-400 mb-3 leading-relaxed">
                اگر آپ کے پاس اس جلد کی پی ڈی ایف موجود ہے تو اسے براہ راست منتخب کریں، یہ بغیر انٹرنیٹ کے فوراً کھلے گی۔
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <FileUp className="w-4 h-4" />
                <span>ڈیوائس سے پی ڈی ایف فائل منتخب کریں</span>
              </button>
            </div>

            {/* Option 2: Enter Custom URL */}
            <form onSubmit={handleApplyCustomUrl} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-stone-300 block mb-1">
                  آپشن ۲: آن لائن پی ڈی ایف کا لنک (URL) درج کریں:
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/ehtisab-vol.pdf"
                  value={customUrlInput}
                  onChange={(e) => setCustomUrlInput(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-xl text-xs text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSourceModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-stone-400 hover:text-stone-200"
                >
                  منسوخ کریں
                </button>
                <button
                  type="submit"
                  disabled={!customUrlInput.trim()}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-stone-950 font-bold text-xs cursor-pointer shadow-md"
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
