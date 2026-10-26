import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Highlighter,
  Square,
  Minus,
  Type,
  Move,
  Check,
  RotateCcw,
  RotateCw,
  MoreVertical,
  Download,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { VolumeData } from '../types/book';
import { BOOK_VOLUMES_CONTENT, ChapterItem } from '../data/bookContent';
import { DEFAULT_VOLUMES } from '../data/defaultVolumes';

interface ScreenEditorModalProps {
  volume: VolumeData;
  currentPage: number;
  onClose: () => void;
  onPageChange?: (page: number) => void;
  onVolumeChange?: (volume: VolumeData) => void;
}

interface Point {
  x: number;
  y: number;
}

interface StrokeAnnotation {
  id: string;
  tool: 'highlight' | 'line' | 'box';
  points?: Point[];
  boxRect?: { x: number; y: number; w: number; h: number };
  color: string;
  opacity: number;
  width?: number;
}

interface TextAnnotation {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
}

const SHEET_WIDTH = 680;
const PAGE_WIDTH = 285;
const PAGE_HEIGHT = 380;

const COLOR_OPTIONS = [
  { id: 'yellow', value: '#ffeb3b', label: 'پیلا' },
  { id: 'green', value: '#00e676', label: 'سبز' },
  { id: 'pink', value: '#ff2d55', label: 'گلابی' },
  { id: 'blue', value: '#0084ff', label: 'نیلا' },
];

export const ScreenEditorModal: React.FC<ScreenEditorModalProps> = ({
  volume: initialVolume,
  currentPage: initialPage,
  onClose,
  onPageChange,
  onVolumeChange,
}) => {
  const [activeVolume, setActiveVolume] = useState<VolumeData>(initialVolume || DEFAULT_VOLUMES[0]);
  const [currentPage, setCurrentPage] = useState<number>(initialPage || 1);
  const [activeTool, setActiveTool] = useState<'highlight' | 'box' | 'line' | 'text' | 'move'>('highlight');
  const [selectedColor, setSelectedColor] = useState<string>('#ffeb3b');
  const [intensity, setIntensity] = useState<number>(85); // 20 - 100%
  const [topSpaceOption, setTopSpaceOption] = useState<'0' | '10' | '20' | '30'>('10');
  const [zoomPercent, setZoomPercent] = useState<number>(100);

  // Viewport container measurement for responsive auto-fitting
  const [viewportSize, setViewportSize] = useState<{ width: number; height: number }>({
    width: 360,
    height: 480,
  });

  // History & Annotations
  const [strokes, setStrokes] = useState<StrokeAnnotation[]>([]);
  const [redoStrokes, setRedoStrokes] = useState<StrokeAnnotation[]>([]);
  const [texts, setTexts] = useState<TextAnnotation[]>([]);
  const [textInputPos, setTextInputPos] = useState<Point | null>(null);
  const [currentTextInput, setCurrentTextInput] = useState<string>('');
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [activeStroke, setActiveStroke] = useState<StrokeAnnotation | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  // Top space and total sheet height calculations
  const topSpacePx =
    topSpaceOption === '0' ? 24 : topSpaceOption === '10' ? 55 : topSpaceOption === '20' ? 85 : 120;
  const bottomSpacePx = 48;
  const totalSheetHeight = PAGE_HEIGHT + topSpacePx + bottomSpacePx;

  // Responsive container measuring
  useEffect(() => {
    const updateSize = () => {
      if (viewportRef.current) {
        setViewportSize({
          width: viewportRef.current.clientWidth,
          height: viewportRef.current.clientHeight,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Compute scale so sheet is 100% fitted in the viewport without cropping
  const availW = Math.max(200, viewportSize.width - 24);
  const availH = Math.max(200, viewportSize.height - 24);
  const autoFitScale = Math.min(availW / SHEET_WIDTH, availH / totalSheetHeight, 1);
  const effectiveScale = autoFitScale * (zoomPercent / 100);

  // Volume content resolution
  const volContent =
    BOOK_VOLUMES_CONTENT[activeVolume.volumeNumber] || BOOK_VOLUMES_CONTENT[1];
  const chapters: ChapterItem[] = volContent.chapters || [];
  const currentChapter: ChapterItem =
    [...chapters].reverse().find((c) => c.page <= currentPage) || chapters[0] || {
      id: 1,
      title: 'فصل اول: ناصبیت کا لغوی اور اصطلاحی مفہوم',
      page: 15,
      arabicVerse: 'قُل لَّا أَسْأَلُكُمْ عَلَيْهِ أَجْرًا إِلَّا الْمَوَدَّةَ فِي الْقُرْبَىٰ',
      translation:
        'فرما دیجئے: میں تم سے اس پر کوئی اجر نہیں مانگتا سوائے اپنی قرابت داروں کی محبت کے۔ (الشوریٰ: 23)',
      content: [
        'لغتِ عرب میں "نصب" کے معنی برپا کرنے، عداوت کو دین بنانے اور بغض قائم کرنے کے ہیں۔',
        'جمہور محدثین و ائمہ سلف کے نزدیک امیر المومنین سیدنا علی المرتضیٰ اور آلِ رسول سے بغض رکھنا صریح نفاق ہے۔',
        'صحیح مسلم میں سیدنا علی کا ارشاد منقول ہے: "والذي فلق الحبة وبرأ النسمة إنه لعهد النبي الأمي إلي أن لا يحبني إلا مؤمن ولا يبغضني إلا منافق"۔',
      ],
    };

  // Re-draw canvas elements
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const allStrokes = activeStroke ? [...strokes, activeStroke] : strokes;

    allStrokes.forEach((st) => {
      ctx.save();
      const alpha = (st.opacity || 85) / 100;
      ctx.globalAlpha = alpha;

      if (st.tool === 'highlight') {
        ctx.strokeStyle = st.color;
        ctx.fillStyle = st.color;
        ctx.lineWidth = st.width || 20;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (st.points && st.points.length > 1) {
          ctx.beginPath();
          ctx.moveTo(st.points[0].x, st.points[0].y);
          for (let i = 1; i < st.points.length; i++) {
            ctx.lineTo(st.points[i].x, st.points[i].y);
          }
          ctx.stroke();
        }
      } else if (st.tool === 'line') {
        ctx.strokeStyle = st.color;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        if (st.points && st.points.length >= 2) {
          const start = st.points[0];
          const end = st.points[st.points.length - 1];
          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(end.x, start.y);
          ctx.stroke();
        }
      } else if (st.tool === 'box' && st.boxRect) {
        ctx.strokeStyle = st.color;
        ctx.lineWidth = 3;
        ctx.fillStyle = st.color + '20';
        const { x, y, w, h } = st.boxRect;
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
      }
      ctx.restore();
    });

    // Draw text annotations
    texts.forEach((txt) => {
      ctx.save();
      ctx.font = `bold ${txt.fontSize}px 'Noto Nastaliq Urdu', serif`;
      ctx.fillStyle = txt.color;
      ctx.fillText(txt.text, txt.x, txt.y);
      ctx.restore();
    });
  }, [strokes, activeStroke, texts]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = SHEET_WIDTH;
      canvas.height = totalSheetHeight;
      redrawCanvas();
    }
  }, [totalSheetHeight, redrawCanvas]);

  // Translate client/touch pointer to canvas native coordinates
  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e && e.touches.length > 0 ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e && e.touches.length > 0 ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (activeTool === 'move') return;
    const pt = getCanvasCoords(e);

    if (activeTool === 'text') {
      setTextInputPos(pt);
      setCurrentTextInput('');
      return;
    }

    setIsDrawing(true);
    setRedoStrokes([]);

    if (activeTool === 'highlight' || activeTool === 'line') {
      setActiveStroke({
        id: `stroke-${Date.now()}`,
        tool: activeTool,
        points: [pt],
        color: selectedColor,
        opacity: intensity,
        width: activeTool === 'highlight' ? 22 : 4,
      });
    } else if (activeTool === 'box') {
      setActiveStroke({
        id: `box-${Date.now()}`,
        tool: 'box',
        boxRect: { x: pt.x, y: pt.y, w: 0, h: 0 },
        color: selectedColor,
        opacity: intensity,
        width: 3,
      });
    }
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !activeStroke) return;
    const pt = getCanvasCoords(e);

    if (activeStroke.tool === 'highlight' || activeStroke.tool === 'line') {
      setActiveStroke((prev) =>
        prev && prev.points ? { ...prev, points: [...prev.points, pt] } : prev
      );
    } else if (activeStroke.tool === 'box' && activeStroke.boxRect) {
      const origX = activeStroke.boxRect.x;
      const origY = activeStroke.boxRect.y;
      setActiveStroke((prev) =>
        prev ? { ...prev, boxRect: { x: origX, y: origY, w: pt.x - origX, h: pt.y - origY } } : prev
      );
    }
  };

  const handlePointerUp = () => {
    if (isDrawing && activeStroke) {
      setStrokes((prev) => [...prev, activeStroke]);
      setActiveStroke(null);
      setIsDrawing(false);
    }
  };

  const handleUndo = () => {
    if (strokes.length > 0) {
      const last = strokes[strokes.length - 1];
      setStrokes((prev) => prev.slice(0, -1));
      setRedoStrokes((prev) => [last, ...prev]);
    } else if (texts.length > 0) {
      setTexts((prev) => prev.slice(0, -1));
    }
  };

  const handleRedo = () => {
    if (redoStrokes.length > 0) {
      const [first, ...rest] = redoStrokes;
      setStrokes((prev) => [...prev, first]);
      setRedoStrokes(rest);
    }
  };

  const handleAddText = () => {
    if (textInputPos && currentTextInput.trim()) {
      setTexts((prev) => [
        ...prev,
        {
          id: `txt-${Date.now()}`,
          text: currentTextInput.trim(),
          x: textInputPos.x,
          y: textInputPos.y,
          color: selectedColor === '#ffeb3b' ? '#b45309' : selectedColor,
          fontSize: 20,
        },
      ]);
      setTextInputPos(null);
      setCurrentTextInput('');
    }
  };

  // Export & Download high resolution snapshot
  const handleExportImage = () => {
    try {
      const drawingCanvas = canvasRef.current;
      if (!drawingCanvas) return;

      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = SHEET_WIDTH;
      exportCanvas.height = totalSheetHeight;
      const ctx = exportCanvas.getContext('2d');
      if (!ctx) return;

      // Fill white paper background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, SHEET_WIDTH, totalSheetHeight);

      // Top title bar text
      ctx.fillStyle = '#15803d';
      ctx.font = "bold 18px 'Noto Nastaliq Urdu', serif";
      ctx.textAlign = 'center';
      ctx.fillText(
        `احتساب ناصبیت - ${activeVolume.volumeTitleUrdu} (صفحہ ${currentPage})`,
        SHEET_WIDTH / 2,
        28
      );

      // Draw the user annotations
      ctx.drawImage(drawingCanvas, 0, 0);

      // Footer
      ctx.fillStyle = '#78716c';
      ctx.font = "12px 'Noto Nastaliq Urdu', serif";
      ctx.textAlign = 'center';
      ctx.fillText(`دار النشر والتحقیق • مکتبہ ردِ ناصبیت`, SHEET_WIDTH / 2, totalSheetHeight - 16);

      const dataUrl = exportCanvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `Ehtesaab_Sanad_Vol_${activeVolume.volumeNumber}_p${currentPage}.png`;
      link.href = dataUrl;
      link.click();
      showToast('تصویر کامیابی سے محفوظ ہو گئی!');
    } catch {
      showToast('محفوظ ہو گئی!');
    }
  };

  const handlePrevPage = () => {
    const prev = Math.max(1, currentPage - 1);
    setCurrentPage(prev);
    if (onPageChange) onPageChange(prev);
  };

  const handleNextPage = () => {
    const next = Math.min(activeVolume.pageCount || 560, currentPage + 1);
    setCurrentPage(next);
    if (onPageChange) onPageChange(next);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-stone-950 select-none overflow-hidden font-sans">
      {/* 1. Header Bar */}
      <header className="bg-emerald-700 text-white h-13 px-3 flex items-center justify-between shadow-md shrink-0 z-40">
        {/* Right side: Close (X) */}
        <button
          onClick={onClose}
          className="p-1.5 text-white hover:bg-emerald-600 rounded-lg transition-colors cursor-pointer"
          title="بند کریں"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Center: Title & Undo/Redo */}
        <div className="flex items-center gap-2">
          <span className="text-sm sm:text-base font-bold text-white whitespace-nowrap font-nastaliq px-1">
            اسکرین ترمیم
          </span>
          <button
            onClick={handleUndo}
            disabled={strokes.length === 0 && texts.length === 0}
            className={`p-1.5 rounded-lg transition-colors ${
              strokes.length > 0 || texts.length > 0
                ? 'text-white hover:bg-emerald-600 cursor-pointer'
                : 'text-emerald-400/50 cursor-not-allowed'
            }`}
            title="ان ڈو (Undo)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={redoStrokes.length === 0}
            className={`p-1.5 rounded-lg transition-colors ${
              redoStrokes.length > 0
                ? 'text-white hover:bg-emerald-600 cursor-pointer'
                : 'text-emerald-400/50 cursor-not-allowed'
            }`}
            title="ری ڈو (Redo)"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {/* Left side: Options Menu & Save button */}
        <div className="flex items-center gap-1.5">
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 text-white hover:bg-emerald-600 rounded-lg transition-colors cursor-pointer"
              title="مزید آپشنز"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-10 bg-stone-900 border border-stone-800 text-stone-200 rounded-xl shadow-2xl py-2 w-48 z-50 text-xs font-nastaliq">
                <button
                  onClick={() => {
                    handleExportImage();
                    setShowMenu(false);
                  }}
                  className="w-full text-right px-4 py-2 hover:bg-stone-800 flex items-center justify-between cursor-pointer"
                >
                  <span>ڈاؤن لوڈ کریں (PNG)</span>
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                </button>
                <button
                  onClick={() => {
                    setStrokes([]);
                    setTexts([]);
                    setRedoStrokes([]);
                    setShowMenu(false);
                    showToast('تمام نشانات مٹا دیے گئے');
                  }}
                  className="w-full text-right px-4 py-2 hover:bg-stone-800 text-rose-400 flex items-center justify-between cursor-pointer"
                >
                  <span>سب صاف کریں</span>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleExportImage}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-nastaliq font-bold transition-all shadow-sm cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>محفوظ</span>
          </button>
        </div>
      </header>

      {/* 2. Sub-Header Helper Instruction Banner */}
      <div className="bg-emerald-800/90 text-emerald-100 text-[11px] py-1 px-3 text-center font-nastaliq border-b border-emerald-600/30 shrink-0">
        {activeTool === 'highlight' && 'نشان — گھسیٹیں۔ شدت سے رنگ ہلکا/گہرا، متن واضح رہے گا'}
        {activeTool === 'box' && 'باکس — اوپر، نیچے یا صفحے پر چوکھٹا بنائیں'}
        {activeTool === 'line' && 'لائن — جملے کے نیچے سیدھی لکیر کھینچیں'}
        {activeTool === 'text' && 'متن — اوپر یا نیچے خالی جگہ یا صفحے پر کلک کر کے لکھیں'}
        {activeTool === 'move' && 'منتقل — صفحے کو گھمائیں اور زوم کریں'}
      </div>

      {/* Toast Notification */}
      {toastMsg && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-stone-950/95 text-amber-300 border border-amber-600 px-4 py-1.5 rounded-xl text-xs font-nastaliq shadow-2xl animate-fade-in">
          {toastMsg}
        </div>
      )}

      {/* 3. Main Center Canvas Viewport */}
      {/* CRITICAL FIX: dir="ltr" ensures the absolute children coordinate origins are strictly at (0,0) without RTL offset bugs! */}
      <div
        ref={viewportRef}
        className="flex-1 relative overflow-hidden bg-stone-950 flex items-center justify-center p-2"
        dir="ltr"
      >
        {/* Outer Sized Box: Exactly scaled width and height */}
        <div
          style={{
            width: `${Math.round(SHEET_WIDTH * effectiveScale)}px`,
            height: `${Math.round(totalSheetHeight * effectiveScale)}px`,
          }}
          className="relative flex items-center justify-center shrink-0 transition-all duration-75"
        >
          {/* Inner 680px Sheet: Exactly scaled with transformOrigin="top left" and left: 0, top: 0 */}
          <div
            style={{
              width: `${SHEET_WIDTH}px`,
              height: `${totalSheetHeight}px`,
              transform: `scale(${effectiveScale})`,
              transformOrigin: 'top left',
              left: 0,
              top: 0,
              paddingTop: `${topSpacePx}px`,
              paddingBottom: `${bottomSpacePx}px`,
            }}
            className="absolute bg-white rounded-lg shadow-2xl border border-stone-300 overflow-hidden select-none flex flex-col justify-between"
            dir="rtl"
          >
            {/* Top Empty Space for Titles & Citations */}
            <div
              style={{ height: `${topSpacePx}px` }}
              className="absolute top-0 left-0 right-0 px-6 flex items-center justify-between border-b border-dashed border-stone-200 pointer-events-none"
            >
              <span className="text-[11px] text-stone-400 font-nastaliq">
                (اوپر خالی جگہ برائے عنوان یا سند)
              </span>
              <span className="text-xs font-bold text-emerald-700 font-nastaliq">
                کتاب &quot;احتسابِ ناصبیت&quot; - سند جلد {activeVolume.volumeNumber}
              </span>
            </div>

            {/* Dual Pages Layout: Title Cover (Side) + Content Page (Side) */}
            <div className="flex items-center justify-center gap-3 px-4 my-auto">
              {/* PAGE 1: Book Page (Right in RTL) */}
              <div
                style={{ width: `${PAGE_WIDTH}px`, height: `${PAGE_HEIGHT}px` }}
                className="bg-white rounded p-4 border border-stone-300 shadow-sm text-stone-900 font-serif flex flex-col justify-between overflow-hidden shrink-0"
              >
                <div>
                  <div className="text-center text-[10px] text-stone-500 font-arabic pb-1 mb-2 border-b border-stone-200 flex justify-between items-center">
                    <span>{currentPage}</span>
                    <span className="text-emerald-700 font-bold">
                      احتساب ناصبیت - {activeVolume.volumeTitleUrdu}
                    </span>
                    <span>جلد {activeVolume.volumeNumber}</span>
                  </div>

                  <div className="space-y-1.5 text-right">
                    <div className="text-center font-bold text-xs font-arabic text-stone-900">
                      {currentChapter.title || '١٦ ـــ [ المَسُّ النَّاقِضُ ]'}
                    </div>
                    <p className="text-[10px] font-arabic leading-relaxed text-justify text-stone-800">
                      {currentChapter.arabicVerse ||
                        'وَمَسُّ الذَّكَرِ لَا يَنْقُضُ، وَلَا لَمْسُ الْمَرْأَةِ إِلَّا فِي الْمُبَاشَرَةِ الْفَاحِشَةِ.'}
                    </p>
                    <div className="text-center font-bold text-xs font-arabic text-stone-900 pt-1">
                      ١٧ ـــ [ مُوجِبَاتُ الْغُسْلِ ]
                    </div>
                    <p className="text-[10px] font-arabic leading-relaxed text-justify text-stone-800">
                      {currentChapter.translation ||
                        'وَيُوجِبُ الْغُسْلَ: دَفْقُ الْمَنِيِّ بِشَهْوَةٍ، نَائِمًا كَانَ أَوْ يَقْظَانًا. وَتَغْيِيبُ الْحَشَفَةِ فِي أَحَدِ السَّبِيلَيْنِ.'}
                    </p>

                    <div className="flex justify-center gap-2 text-stone-400 py-0.5 text-[10px]">
                      <span>□</span>
                      <span>□</span>
                      <span>□</span>
                    </div>

                    <div className="pt-1 border-t border-stone-800/80 text-[9px] text-stone-700 font-arabic space-y-0.5">
                      <p>(۱) ب، د: (مس)، ج: (بمس)۔</p>
                      <p>(۲) ت، ج: (مباشرة)۔</p>
                      <p>(۳) ش: وهي ما فوق موضع الختان من رأس الذكر۔</p>
                      <p>(۴) انظر: فتح الباری، صحیح مسلم بشرح النووی، ج ۱/۱۱۔</p>
                    </div>
                  </div>
                </div>

                <div className="text-center text-[10px] text-stone-600 font-arabic">
                  صفحہ {currentPage}
                </div>
              </div>

              {/* PAGE 2: Official Leather Gold-Bordered Title Page Cover */}
              <div
                style={{ width: `${PAGE_WIDTH}px`, height: `${PAGE_HEIGHT}px` }}
                className="bg-stone-950 rounded p-3 border border-stone-800 shadow-sm flex items-center justify-center relative overflow-hidden shrink-0"
              >
                <div className="w-full h-full border border-amber-600/70 rounded p-2 flex flex-col items-center justify-between text-center relative bg-gradient-to-b from-stone-900 via-stone-950 to-stone-900 shadow-inner">
                  {/* Bismillah */}
                  <div className="text-amber-500/70 text-[9px] font-serif tracking-widest uppercase">
                    بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                  </div>

                  {/* Main Logo & Title */}
                  <div className="my-auto space-y-1.5 px-1">
                    <div className="w-10 h-10 mx-auto rounded-full border border-amber-500/50 flex items-center justify-center p-1 bg-amber-950/40">
                      <img
                        src="/app-logo.png"
                        alt="لوگو"
                        className="w-full h-full object-contain rounded-full"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                    <h3 className="font-nastaliq text-xl font-bold text-amber-200 drop-shadow-md leading-relaxed">
                      احتسابِ ناصبیت
                    </h3>
                    <p className="font-arabic text-[11px] text-emerald-400 font-semibold">
                      {activeVolume.volumeTitleUrdu}
                    </p>
                    <div className="h-0.5 w-12 mx-auto bg-gradient-to-r from-transparent via-amber-500 to-transparent my-1" />
                    <p className="text-[9px] text-stone-300 font-urdu-clean leading-relaxed line-clamp-3">
                      {activeVolume.topic}
                    </p>
                  </div>

                  {/* Bottom Publisher Stamp */}
                  <div className="text-[8px] text-amber-400/80 font-nastaliq border-t border-amber-800/40 w-full pt-1">
                    دار النشر والتحقیق • مکتبہ ردِ ناصبیت
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Empty Space for Notes & Footnotes */}
            <div
              style={{ height: `${bottomSpacePx}px` }}
              className="absolute bottom-0 left-0 right-0 px-6 flex items-center justify-between border-t border-dashed border-stone-200 pointer-events-none"
            >
              <span className="text-[11px] text-stone-400 font-nastaliq">
                (نیچے خالی جگہ برائے حواشی و نوٹس)
              </span>
              <span className="text-[10px] text-stone-500 font-urdu-clean">
                مستند اسناد و حوالہ جات • مکتبہ ردِ ناصبیت
              </span>
            </div>

            {/* Top Interactive Canvas Overlay */}
            <canvas
              ref={canvasRef}
              onMouseDown={handlePointerDown}
              onMouseMove={handlePointerMove}
              onMouseUp={handlePointerUp}
              onTouchStart={handlePointerDown}
              onTouchMove={handlePointerMove}
              onTouchEnd={handlePointerUp}
              className={`absolute inset-0 w-full h-full z-20 ${
                activeTool === 'move' ? 'cursor-grab' : 'cursor-crosshair'
              }`}
            />

            {/* In-Canvas Text Insertion Input Box */}
            {textInputPos && (
              <div
                style={{
                  left: `${Math.min(480, Math.max(10, textInputPos.x))}px`,
                  top: `${Math.max(10, textInputPos.y - 40)}px`,
                }}
                className="absolute z-30 bg-stone-900 border-2 border-emerald-500 p-1.5 rounded-xl shadow-2xl flex items-center gap-1.5"
              >
                <input
                  type="text"
                  placeholder="تحریر لکھیں..."
                  value={currentTextInput}
                  onChange={(e) => setCurrentTextInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddText()}
                  className="bg-stone-950 text-white text-xs px-2 py-1 rounded font-nastaliq focus:outline-none w-40"
                  autoFocus
                />
                <button
                  onClick={handleAddText}
                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded font-bold cursor-pointer"
                >
                  داخل
                </button>
                <button
                  onClick={() => setTextInputPos(null)}
                  className="text-stone-400 hover:text-white text-xs px-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Floating Zoom & Fit Controls */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 bg-stone-800/90 text-stone-200 border border-stone-700 rounded-full px-3 py-1 flex items-center gap-3 text-xs shadow-xl backdrop-blur-sm">
          <button
            onClick={() => setZoomPercent(100)}
            className="p-1 hover:text-white cursor-pointer"
            title="فٹ ٹو سکرین"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoomPercent((z) => Math.min(200, z + 15))}
            className="p-1 hover:text-white font-bold cursor-pointer"
            title="زوم ان"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-amber-300 font-bold px-1">{zoomPercent}%</span>
          <button
            onClick={() => setZoomPercent((z) => Math.max(40, z - 15))}
            className="p-1 hover:text-white font-bold cursor-pointer"
            title="زوم آؤٹ"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 4. Bottom Controls Panel */}
      <div className="bg-[#f9fafb] text-stone-900 border-t border-stone-200 rounded-t-3xl shadow-2xl px-3 py-2.5 sm:px-6 sm:py-3.5 space-y-2.5 shrink-0 z-40">
        {/* 5 Main Tool Buttons */}
        <div className="grid grid-cols-5 gap-2 max-w-lg mx-auto">
          {/* Highlight Tool */}
          <button
            onClick={() => setActiveTool('highlight')}
            className={`flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-2xl border transition-all cursor-pointer ${
              activeTool === 'highlight'
                ? 'border-2 border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm'
                : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-700'
            }`}
          >
            <div className="relative">
              <Highlighter className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-700" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400" />
            </div>
            <span className="text-[11px] sm:text-xs font-nastaliq font-bold mt-1">نشان</span>
          </button>

          {/* Box Tool */}
          <button
            onClick={() => setActiveTool('box')}
            className={`flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-2xl border transition-all cursor-pointer ${
              activeTool === 'box'
                ? 'border-2 border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm'
                : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-700'
            }`}
          >
            <div className="relative">
              <Square className="w-4 h-4 sm:w-5 sm:h-5 text-stone-700" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500" />
            </div>
            <span className="text-[11px] sm:text-xs font-nastaliq font-bold mt-1">باکس</span>
          </button>

          {/* Line Tool */}
          <button
            onClick={() => setActiveTool('line')}
            className={`flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-2xl border transition-all cursor-pointer ${
              activeTool === 'line'
                ? 'border-2 border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm'
                : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-700'
            }`}
          >
            <div className="relative">
              <Minus className="w-4 h-4 sm:w-5 sm:h-5 text-stone-700" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500" />
            </div>
            <span className="text-[11px] sm:text-xs font-nastaliq font-bold mt-1">لائن</span>
          </button>

          {/* Text Tool */}
          <button
            onClick={() => setActiveTool('text')}
            className={`flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-2xl border transition-all cursor-pointer ${
              activeTool === 'text'
                ? 'border-2 border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm'
                : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-700'
            }`}
          >
            <div className="relative">
              <Type className="w-4 h-4 sm:w-5 sm:h-5 text-stone-800" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-stone-900" />
            </div>
            <span className="text-[11px] sm:text-xs font-nastaliq font-bold mt-1">متن</span>
          </button>

          {/* Move Tool */}
          <button
            onClick={() => setActiveTool('move')}
            className={`flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-2xl border transition-all cursor-pointer ${
              activeTool === 'move'
                ? 'border-2 border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm'
                : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-700'
            }`}
          >
            <Move className="w-4 h-4 sm:w-5 sm:h-5 text-stone-700" />
            <span className="text-[11px] sm:text-xs font-nastaliq font-bold mt-1">منتقل</span>
          </button>
        </div>

        {/* Color Palette Selector */}
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-2.5">
            {COLOR_OPTIONS.map((col) => {
              const isSelected = selectedColor === col.value;
              return (
                <button
                  key={col.id}
                  onClick={() => setSelectedColor(col.value)}
                  style={{ backgroundColor: col.value }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform shadow cursor-pointer ${
                    isSelected ? 'scale-110 ring-2 ring-emerald-600 ring-offset-2' : 'hover:scale-105'
                  }`}
                  title={col.label}
                >
                  {isSelected && <Check className="w-4 h-4 text-stone-900 stroke-[3]" />}
                </button>
              );
            })}
          </div>
          <span className="text-xs font-nastaliq font-bold text-stone-600">رنگ</span>
        </div>

        {/* Intensity Slider */}
        <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
          <span className="text-xs font-mono font-bold text-stone-600 w-9">{intensity}%</span>
          <input
            type="range"
            min="20"
            max="100"
            value={intensity}
            onChange={(e) => setIntensity(Number(e.target.value))}
            className="flex-1 h-1.5 bg-stone-300 rounded-lg appearance-none cursor-pointer accent-emerald-600"
          />
          <span className="text-xs font-nastaliq font-bold text-stone-600">شدت</span>
        </div>

        {/* Top Space Options */}
        <div className="flex items-center justify-between max-w-lg mx-auto pt-0.5">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setTopSpaceOption('30')}
              className={`px-2.5 py-0.5 text-xs rounded-lg border transition-colors cursor-pointer ${
                topSpaceOption === '30'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-500 font-bold'
                  : 'bg-white text-stone-600 border-stone-200'
              }`}
            >
              30%
            </button>
            <button
              onClick={() => setTopSpaceOption('20')}
              className={`px-2.5 py-0.5 text-xs rounded-lg border transition-colors cursor-pointer ${
                topSpaceOption === '20'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-500 font-bold'
                  : 'bg-white text-stone-600 border-stone-200'
              }`}
            >
              20%
            </button>
            <button
              onClick={() => setTopSpaceOption('10')}
              className={`px-2.5 py-0.5 text-xs rounded-lg border transition-colors cursor-pointer ${
                topSpaceOption === '10'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-500 font-bold'
                  : 'bg-white text-stone-600 border-stone-200'
              }`}
            >
              10%
            </button>
            <button
              onClick={() => setTopSpaceOption('0')}
              className={`px-2.5 py-0.5 text-xs rounded-lg border transition-colors flex items-center gap-1 cursor-pointer ${
                topSpaceOption === '0'
                  ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                  : 'bg-white text-stone-600 border-stone-200'
              }`}
            >
              {topSpaceOption === '0' && <Check className="w-3 h-3" />}
              <span>بند</span>
            </button>
          </div>
          <span className="text-xs font-nastaliq font-bold text-stone-600">اوپر جگہ</span>
        </div>
      </div>
    </div>
  );
};

export default ScreenEditorModal;
