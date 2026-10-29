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
  ArrowRight,
  Plus,
  Palette,
  BookOpen,
  ArrowUp,
  ArrowDown,
  ArrowLeft
} from 'lucide-react';
import { VolumeData } from '../types/book';
import { DEFAULT_VOLUMES } from '../data/defaultVolumes';
import {
  resolveVolumeArchiveId,
  getArchivePageImageUrl
} from '../utils/archiveUtils';

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

export interface DraggableText {
  id: string;
  text: string;
  x: number; // in pixels relative to 680px sheet
  y: number;
  fontSize: number;
  color: string;
  bgColor: string; // 'transparent', '#000000bb', '#ffffffdd', '#f59e0b', '#065f46'
  isBold: boolean;
}

const SHEET_WIDTH = 680;
const PAGE_WIDTH = 295;
const PAGE_HEIGHT = 410;

const COLOR_OPTIONS = [
  { id: 'yellow', value: '#ffeb3b', label: 'پیلا' },
  { id: 'green', value: '#00e676', label: 'سبز' },
  { id: 'pink', value: '#ff2d55', label: 'گلابی' },
  { id: 'blue', value: '#0084ff', label: 'نیلا' },
  { id: 'gold', value: '#f59e0b', label: 'سنہری' },
  { id: 'black', value: '#1c1917', label: 'سیاہ' },
  { id: 'white', value: '#ffffff', label: 'سفید' },
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
  const [titlePageNumber, setTitlePageNumber] = useState<number>(1);

  // Active Tool: 'highlight' | 'box' | 'line' | 'text' | 'move'
  const [activeTool, setActiveTool] = useState<'highlight' | 'box' | 'line' | 'text' | 'move'>('text');
  const [selectedColor, setSelectedColor] = useState<string>('#ffeb3b');
  const [intensity, setIntensity] = useState<number>(85); // 20 - 100%
  const [topSpaceOption, setTopSpaceOption] = useState<'0' | '10' | '20' | '30'>('10');
  const [customCitationTitle, setCustomCitationTitle] = useState<string>('');
  const [zoomPercent, setZoomPercent] = useState<number>(100);

  // Viewport container measurement for responsive auto-fitting
  const [viewportSize, setViewportSize] = useState<{ width: number; height: number }>({
    width: 360,
    height: 480,
  });

  // Annotations
  const [strokes, setStrokes] = useState<StrokeAnnotation[]>([]);
  const [redoStrokes, setRedoStrokes] = useState<StrokeAnnotation[]>([]);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [activeStroke, setActiveStroke] = useState<StrokeAnnotation | null>(null);

  // Draggable Texts (Requirement 2: freely movable text boxes)
  const [textList, setTextList] = useState<DraggableText[]>([
    {
      id: 'txt-default-title',
      text: `کتاب "احتسابِ ناصبیت" - جلد ${initialVolume?.volumeNumber || 1}`,
      x: 340,
      y: 28,
      fontSize: 16,
      color: '#065f46',
      bgColor: 'transparent',
      isBold: true,
    },
    {
      id: 'txt-default-page',
      text: `صفحہ نمبر: ${initialPage || 1}`,
      x: 520,
      y: 470,
      fontSize: 13,
      color: '#1f2937',
      bgColor: '#f3f4f6dd',
      isBold: true,
    }
  ]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [newTextInput, setNewTextInput] = useState<string>('');
  const [showAddTextModal, setShowAddTextModal] = useState<boolean>(false);
  const [isDraggingText, setIsDraggingText] = useState<boolean>(false);
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showVolumePicker, setShowVolumePicker] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  // Archive Identifier & Real Book Page Images
  const archiveId = resolveVolumeArchiveId(activeVolume.volumeNumber, activeVolume.archiveItemId);
  const titlePageImgUrl = getArchivePageImageUrl(archiveId, titlePageNumber);
  const refPageImgUrl = getArchivePageImageUrl(archiveId, currentPage);

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

  // Sync initial volume
  useEffect(() => {
    if (initialVolume) {
      setActiveVolume(initialVolume);
    }
    if (initialPage) {
      setCurrentPage(initialPage);
    }
  }, [initialVolume, initialPage]);

  // Update default text when volume or page changes
  useEffect(() => {
    setTextList((prev) =>
      prev.map((item) => {
        if (item.id === 'txt-default-title') {
          return {
            ...item,
            text: customCitationTitle || `کتاب "احتسابِ ناصبیت" - ${activeVolume.volumeTitleUrdu}`,
          };
        }
        if (item.id === 'txt-default-page') {
          return {
            ...item,
            text: `صفحہ: ${currentPage} / ${activeVolume.pageCount || 476}`,
          };
        }
        return item;
      })
    );
  }, [activeVolume, currentPage, customCitationTitle]);

  // Canvas Drawing & Re-draw logic
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, SHEET_WIDTH, totalSheetHeight);

    // Draw saved strokes
    strokes.forEach((s) => {
      ctx.save();
      const alpha = s.opacity / 100;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = s.color;
      ctx.fillStyle = s.color;

      if (s.tool === 'highlight' && s.points && s.points.length > 0) {
        ctx.lineWidth = s.width || 22;
        ctx.lineCap = 'square';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(s.points[0].x, s.points[0].y);
        for (let i = 1; i < s.points.length; i++) {
          ctx.lineTo(s.points[i].x, s.points[i].y);
        }
        ctx.stroke();
      } else if (s.tool === 'line' && s.points && s.points.length > 0) {
        ctx.lineWidth = s.width || 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(s.points[0].x, s.points[0].y);
        for (let i = 1; i < s.points.length; i++) {
          ctx.lineTo(s.points[i].x, s.points[i].y);
        }
        ctx.stroke();
      } else if (s.tool === 'box' && s.boxRect) {
        ctx.lineWidth = s.width || 3;
        ctx.strokeRect(s.boxRect.x, s.boxRect.y, s.boxRect.w, s.boxRect.h);
        ctx.globalAlpha = alpha * 0.18;
        ctx.fillRect(s.boxRect.x, s.boxRect.y, s.boxRect.w, s.boxRect.h);
      }
      ctx.restore();
    });

    // Draw active stroke in progress
    if (activeStroke) {
      ctx.save();
      const alpha = activeStroke.opacity / 100;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = activeStroke.color;
      ctx.fillStyle = activeStroke.color;

      if (activeStroke.tool === 'highlight' && activeStroke.points) {
        ctx.lineWidth = activeStroke.width || 22;
        ctx.lineCap = 'square';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(activeStroke.points[0].x, activeStroke.points[0].y);
        for (let i = 1; i < activeStroke.points.length; i++) {
          ctx.lineTo(activeStroke.points[i].x, activeStroke.points[i].y);
        }
        ctx.stroke();
      } else if (activeStroke.tool === 'line' && activeStroke.points) {
        ctx.lineWidth = activeStroke.width || 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(activeStroke.points[0].x, activeStroke.points[0].y);
        for (let i = 1; i < activeStroke.points.length; i++) {
          ctx.lineTo(activeStroke.points[i].x, activeStroke.points[i].y);
        }
        ctx.stroke();
      } else if (activeStroke.tool === 'box' && activeStroke.boxRect) {
        ctx.lineWidth = activeStroke.width || 3;
        ctx.strokeRect(
          activeStroke.boxRect.x,
          activeStroke.boxRect.y,
          activeStroke.boxRect.w,
          activeStroke.boxRect.h
        );
        ctx.globalAlpha = alpha * 0.18;
        ctx.fillRect(
          activeStroke.boxRect.x,
          activeStroke.boxRect.y,
          activeStroke.boxRect.w,
          activeStroke.boxRect.h
        );
      }
      ctx.restore();
    }
  }, [strokes, activeStroke, totalSheetHeight]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Coordinate mapper from screen to 680px sheet space
  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const scaleX = SHEET_WIDTH / rect.width;
    const scaleY = totalSheetHeight / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  // Pointer event handlers for drawing tools
  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (activeTool === 'move' || activeTool === 'text') return;
    const pt = getCanvasCoords(e);

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

  // Draggable text mouse/touch handlers
  const handleTextMouseDown = (id: string, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setSelectedTextId(id);
    setIsDraggingText(true);

    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const item = textList.find((t) => t.id === id);
    if (item && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const scaleX = SHEET_WIDTH / rect.width;
      const scaleY = totalSheetHeight / rect.height;
      const currentCanvasX = (clientX - rect.left) * scaleX;
      const currentCanvasY = (clientY - rect.top) * scaleY;
      setDragOffset({
        x: currentCanvasX - item.x,
        y: currentCanvasY - item.y,
      });
    }
  };

  const handleSheetPointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (isDraggingText && selectedTextId) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

      const scaleX = SHEET_WIDTH / rect.width;
      const scaleY = totalSheetHeight / rect.height;
      const canvasX = (clientX - rect.left) * scaleX;
      const canvasY = (clientY - rect.top) * scaleY;

      const newX = Math.round(canvasX - dragOffset.x);
      const newY = Math.round(canvasY - dragOffset.y);

      setTextList((prev) =>
        prev.map((t) =>
          t.id === selectedTextId
            ? { ...t, x: Math.max(10, Math.min(SHEET_WIDTH - 20, newX)), y: Math.max(10, Math.min(totalSheetHeight - 10, newY)) }
            : t
        )
      );
    }
  };

  const handleSheetPointerUp = () => {
    if (isDraggingText) {
      setIsDraggingText(false);
    }
  };

  // Nudge selected text with directional buttons
  const nudgeText = (dx: number, dy: number) => {
    if (!selectedTextId) return;
    setTextList((prev) =>
      prev.map((t) =>
        t.id === selectedTextId
          ? {
              ...t,
              x: Math.max(10, Math.min(SHEET_WIDTH - 20, t.x + dx)),
              y: Math.max(10, Math.min(totalSheetHeight - 10, t.y + dy)),
            }
          : t
      )
    );
  };

  const updateSelectedTextFontSize = (delta: number) => {
    if (!selectedTextId) return;
    setTextList((prev) =>
      prev.map((t) =>
        t.id === selectedTextId ? { ...t, fontSize: Math.max(10, Math.min(48, t.fontSize + delta)) } : t
      )
    );
  };

  const updateSelectedTextColor = (col: string) => {
    if (!selectedTextId) return;
    setTextList((prev) =>
      prev.map((t) => (t.id === selectedTextId ? { ...t, color: col } : t))
    );
  };

  const updateSelectedTextBg = (bg: string) => {
    if (!selectedTextId) return;
    setTextList((prev) =>
      prev.map((t) => (t.id === selectedTextId ? { ...t, bgColor: bg } : t))
    );
  };

  const deleteSelectedText = () => {
    if (!selectedTextId) return;
    setTextList((prev) => prev.filter((t) => t.id !== selectedTextId));
    setSelectedTextId(null);
    showToast('تحریر حذف کر دی گئی');
  };

  const handleAddNewTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTextInput.trim()) return;

    const newId = `txt-${Date.now()}`;
    const newText: DraggableText = {
      id: newId,
      text: newTextInput.trim(),
      x: 340,
      y: topSpacePx > 20 ? 30 : 60,
      fontSize: 16,
      color: selectedColor === '#ffeb3b' ? '#065f46' : selectedColor,
      bgColor: '#ffffffdd',
      isBold: true,
    };
    setTextList((prev) => [...prev, newText]);
    setSelectedTextId(newId);
    setNewTextInput('');
    setShowAddTextModal(false);
    showToast('نئی تحریر شامل ہو گئی! آپ اسے انگلی سے کہیں بھی لے جا سکتے ہیں۔');
  };

  const handleUndo = () => {
    if (strokes.length > 0) {
      const last = strokes[strokes.length - 1];
      setStrokes((prev) => prev.slice(0, -1));
      setRedoStrokes((prev) => [last, ...prev]);
    }
  };

  const handleRedo = () => {
    if (redoStrokes.length > 0) {
      const [first, ...rest] = redoStrokes;
      setStrokes((prev) => [...prev, first]);
      setRedoStrokes(rest);
    }
  };

  // High resolution composite image export
  const handleExportImage = async () => {
    try {
      showToast('تصویر تیار ہو رہی ہے...');
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = SHEET_WIDTH * 2;
      exportCanvas.height = totalSheetHeight * 2;
      const ctx = exportCanvas.getContext('2d');
      if (!ctx) return;

      ctx.scale(2, 2);

      // 1. Background white sheet
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, SHEET_WIDTH, totalSheetHeight);

      // Helper function to load image
      const loadImage = (url: string): Promise<HTMLImageElement> =>
        new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('Image load failed'));
          img.src = url;
        });

      // Try loading real book images
      try {
        const [imgRef, imgTitle] = await Promise.all([
          loadImage(refPageImgUrl),
          loadImage(titlePageImgUrl),
        ]);

        // Draw Reference Page (Right in RTL: x: 350, y: topSpacePx)
        ctx.drawImage(imgRef, 355, topSpacePx, PAGE_WIDTH, PAGE_HEIGHT);
        ctx.strokeStyle = '#d1d5db';
        ctx.lineWidth = 1;
        ctx.strokeRect(355, topSpacePx, PAGE_WIDTH, PAGE_HEIGHT);

        // Draw Title Page (Left in RTL: x: 30, y: topSpacePx)
        ctx.drawImage(imgTitle, 30, topSpacePx, PAGE_WIDTH, PAGE_HEIGHT);
        ctx.strokeRect(30, topSpacePx, PAGE_WIDTH, PAGE_HEIGHT);
      } catch {
        // Fallback placeholder borders
        ctx.fillStyle = '#f9fafb';
        ctx.fillRect(355, topSpacePx, PAGE_WIDTH, PAGE_HEIGHT);
        ctx.fillRect(30, topSpacePx, PAGE_WIDTH, PAGE_HEIGHT);
      }

      // 2. Draw canvas drawing strokes
      const drawingCanvas = canvasRef.current;
      if (drawingCanvas) {
        ctx.drawImage(drawingCanvas, 0, 0, SHEET_WIDTH, totalSheetHeight);
      }

      // 3. Draw all Draggable Text elements
      textList.forEach((t) => {
        ctx.save();
        ctx.font = `${t.isBold ? 'bold ' : ''}${t.fontSize}px 'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const textMetrics = ctx.measureText(t.text);
        const padX = 10;
        const padY = 6;
        const boxW = textMetrics.width + padX * 2;
        const boxH = t.fontSize * 1.5 + padY * 2;

        if (t.bgColor && t.bgColor !== 'transparent') {
          ctx.fillStyle = t.bgColor;
          ctx.beginPath();
          ctx.roundRect(t.x - boxW / 2, t.y - boxH / 2, boxW, boxH, 6);
          ctx.fill();
        }

        ctx.fillStyle = t.color;
        ctx.fillText(t.text, t.x, t.y);
        ctx.restore();
      });

      // 4. Download Trigger
      const dataUrl = exportCanvas.toDataURL('image/jpeg', 0.95);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `Ehtisab-Sanad-Vol${activeVolume.volumeNumber}-Page${currentPage}.jpg`;
      link.click();
      showToast('سند و حوالہ تصویر کامیابی سے ڈاؤن لوڈ ہو گئی!');
    } catch {
      showToast('تصویر برآمد کرنے میں دشواری پیش آئی۔');
    }
  };

  const selectedTextItem = textList.find((t) => t.id === selectedTextId);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-stone-950 text-stone-100 select-none overflow-hidden font-sans"
      onMouseMove={handleSheetPointerMove}
      onTouchMove={handleSheetPointerMove}
      onMouseUp={handleSheetPointerUp}
      onTouchEnd={handleSheetPointerUp}
    >
      {/* 1. TOP HEADER: Back Button + Title + Page Switchers + Download */}
      <header className="h-14 bg-stone-900 border-b border-stone-800 px-3 sm:px-4 flex items-center justify-between z-30 shrink-0">
        {/* Left: Volume & Page Selectors */}
        <div className="flex items-center gap-2">
          {/* Back Button */}
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 font-bold text-xs sm:text-sm cursor-pointer transition-colors"
            title="بند کریں اور واپس جائیں"
          >
            <ArrowRight className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
            <span className="font-nastaliq text-sm">واپس</span>
          </button>

          {/* Volume Dropdown Button */}
          <div className="relative">
            <button
              onClick={() => setShowVolumePicker(!showVolumePicker)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/80 text-emerald-300 border border-emerald-600/50 text-xs font-bold cursor-pointer hover:bg-emerald-900/80"
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
              <span>جلد {activeVolume.volumeNumber} ({activeVolume.volumeTitleUrdu})</span>
            </button>

            {showVolumePicker && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-stone-900 border border-stone-700 rounded-2xl shadow-2xl p-2 z-50 max-h-72 overflow-y-auto">
                <div className="text-[11px] font-bold text-stone-400 px-2 py-1 border-b border-stone-800 mb-1">
                  جلد منتخب فرمائیں:
                </div>
                {DEFAULT_VOLUMES.map((vol) => (
                  <button
                    key={vol.id}
                    onClick={() => {
                      setActiveVolume(vol);
                      setShowVolumePicker(false);
                      if (onVolumeChange) onVolumeChange(vol);
                    }}
                    className={`w-full text-right px-3 py-1.5 rounded-xl text-xs transition-colors flex items-center justify-between ${
                      vol.id === activeVolume.id
                        ? 'bg-emerald-600 text-stone-950 font-bold'
                        : 'text-stone-300 hover:bg-stone-800'
                    }`}
                  >
                    <span>{vol.volumeTitleUrdu}</span>
                    <span className="font-mono text-[10px] opacity-75">جلد {vol.volumeNumber}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Page Stepper */}
          <div className="flex items-center gap-1 bg-stone-950 border border-stone-800 rounded-xl px-2 py-1">
            <button
              onClick={() => {
                const nextP = Math.max(1, currentPage - 1);
                setCurrentPage(nextP);
                if (onPageChange) onPageChange(nextP);
              }}
              disabled={currentPage <= 1}
              className="p-1 text-stone-400 hover:text-white disabled:opacity-30 cursor-pointer"
              title="پچھلا صفحہ"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <span className="text-xs text-stone-300 font-mono font-bold px-1">
              ص {currentPage} / {activeVolume.pageCount || 476}
            </span>

            <button
              onClick={() => {
                const nextP = Math.min(activeVolume.pageCount || 476, currentPage + 1);
                setCurrentPage(nextP);
                if (onPageChange) onPageChange(nextP);
              }}
              disabled={currentPage >= (activeVolume.pageCount || 476)}
              className="p-1 text-stone-400 hover:text-white disabled:opacity-30 cursor-pointer"
              title="اگلا صفحہ"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Center / Right: Export Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportImage}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-stone-950 font-bold text-xs sm:text-sm shadow-xl cursor-pointer transition-all active:scale-95"
            title="سند و حوالہ کارڈ محفوظ کریں"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span className="font-nastaliq text-sm sm:text-base">سند محفوظ کریں</span>
          </button>
        </div>
      </header>

      {/* 2. SECONDARY TOOLBAR: Tool Selectors + Draggable Text Manager */}
      <div className="h-12 bg-stone-900/90 border-b border-stone-800 px-3 flex flex-wrap items-center justify-between gap-2 z-20 text-xs shrink-0">
        {/* Drawing & Text Tools */}
        <div className="flex items-center gap-1.5">
          {/* Highlighter */}
          <button
            onClick={() => setActiveTool('highlight')}
            className={`p-2 rounded-xl flex items-center gap-1 transition-colors cursor-pointer ${
              activeTool === 'highlight'
                ? 'bg-amber-600 text-stone-950 font-bold shadow'
                : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
            }`}
            title="ہائی لائٹر"
          >
            <Highlighter className="w-4 h-4" />
            <span className="hidden sm:inline">ہائی لائٹر</span>
          </button>

          {/* Box Tool */}
          <button
            onClick={() => setActiveTool('box')}
            className={`p-2 rounded-xl flex items-center gap-1 transition-colors cursor-pointer ${
              activeTool === 'box'
                ? 'bg-amber-600 text-stone-950 font-bold shadow'
                : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
            }`}
            title="چوکھٹا (Box)"
          >
            <Square className="w-4 h-4" />
            <span className="hidden sm:inline">باکس</span>
          </button>

          {/* Line Tool */}
          <button
            onClick={() => setActiveTool('line')}
            className={`p-2 rounded-xl flex items-center gap-1 transition-colors cursor-pointer ${
              activeTool === 'line'
                ? 'bg-amber-600 text-stone-950 font-bold shadow'
                : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
            }`}
            title="لائن مارکر"
          >
            <Minus className="w-4 h-4" />
            <span className="hidden sm:inline">لائن</span>
          </button>

          {/* Text Tool */}
          <button
            onClick={() => {
              setActiveTool('text');
              setShowAddTextModal(true);
            }}
            className={`p-2 rounded-xl flex items-center gap-1 transition-colors cursor-pointer ${
              activeTool === 'text'
                ? 'bg-emerald-600 text-stone-950 font-bold shadow'
                : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
            }`}
            title="نئی تحریر شامل کریں"
          >
            <Type className="w-4 h-4" />
            <span className="hidden sm:inline">تحریر لکھیں</span>
          </button>

          {/* Undo / Redo */}
          <div className="flex items-center gap-1 bg-stone-950 border border-stone-800 rounded-xl p-0.5 ml-1">
            <button
              onClick={handleUndo}
              disabled={strokes.length === 0}
              className="p-1.5 text-stone-400 hover:text-white disabled:opacity-30 rounded-lg cursor-pointer"
              title="Undo"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleRedo}
              disabled={redoStrokes.length === 0}
              className="p-1.5 text-stone-400 hover:text-white disabled:opacity-30 rounded-lg cursor-pointer"
              title="Redo"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Selected Text Manipulator (Move / Font / Color / Delete) */}
        {selectedTextItem && (
          <div className="flex items-center gap-1.5 bg-stone-950 border border-emerald-600/50 rounded-2xl px-2 py-1 shadow-md animate-in fade-in">
            <span className="text-[11px] text-emerald-400 font-bold hidden md:inline">
              منتخب تحریر موو کریں:
            </span>

            {/* Nudge Buttons (▲ ▼ ◄ ►) */}
            <div className="flex items-center gap-0.5 bg-stone-900 p-0.5 rounded-lg border border-stone-800">
              <button
                onClick={() => nudgeText(0, -10)}
                className="p-1 text-stone-300 hover:text-white hover:bg-stone-800 rounded"
                title="اوپر موو کریں"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => nudgeText(0, 10)}
                className="p-1 text-stone-300 hover:text-white hover:bg-stone-800 rounded"
                title="نیچے موو کریں"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => nudgeText(-15, 0)}
                className="p-1 text-stone-300 hover:text-white hover:bg-stone-800 rounded"
                title="بائیں موو کریں"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => nudgeText(15, 0)}
                className="p-1 text-stone-300 hover:text-white hover:bg-stone-800 rounded"
                title="دائیں موو کریں"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Font Size (+ / -) */}
            <div className="flex items-center gap-1 bg-stone-900 px-1.5 py-0.5 rounded-lg border border-stone-800 text-[11px]">
              <button
                onClick={() => updateSelectedTextFontSize(-2)}
                className="text-stone-400 hover:text-white font-bold px-1"
              >
                A-
              </button>
              <span className="font-mono">{selectedTextItem.fontSize}</span>
              <button
                onClick={() => updateSelectedTextFontSize(2)}
                className="text-stone-400 hover:text-white font-bold px-1"
              >
                A+
              </button>
            </div>

            {/* Color switcher */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => updateSelectedTextColor('#065f46')}
                className="w-4 h-4 rounded-full bg-emerald-800 border border-white/40 cursor-pointer"
                title="سبز"
              />
              <button
                onClick={() => updateSelectedTextColor('#f59e0b')}
                className="w-4 h-4 rounded-full bg-amber-500 border border-white/40 cursor-pointer"
                title="سنہری"
              />
              <button
                onClick={() => updateSelectedTextColor('#1c1917')}
                className="w-4 h-4 rounded-full bg-stone-900 border border-white/40 cursor-pointer"
                title="سیاہ"
              />
              <button
                onClick={() => updateSelectedTextColor('#dc2626')}
                className="w-4 h-4 rounded-full bg-red-600 border border-white/40 cursor-pointer"
                title="سرخ"
              />
            </div>

            {/* Delete button */}
            <button
              onClick={deleteSelectedText}
              className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-950/60 rounded"
              title="تحریر مٹائیں"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Top Space Adjuster */}
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-stone-400 font-sans hidden sm:inline">اوپر جگہ:</span>
          <div className="flex items-center bg-stone-950 p-0.5 rounded-xl border border-stone-800 text-[11px]">
            {(['0', '10', '20', '30'] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setTopSpaceOption(opt)}
                className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
                  topSpaceOption === opt
                    ? 'bg-emerald-600 text-stone-950 font-bold'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                {opt}%
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMsg && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-50 bg-stone-900 text-emerald-400 border border-emerald-600 px-4 py-2 rounded-2xl text-xs font-nastaliq shadow-2xl flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 3. MAIN CENTER CANVAS VIEWPORT */}
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
          {/* Inner 680px Sheet */}
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
            {/* Top Space with dashed guideline */}
            <div
              style={{ height: `${topSpacePx}px` }}
              className="absolute top-0 left-0 right-0 px-4 flex items-center justify-between border-b border-dashed border-stone-200 pointer-events-none"
            >
              <span className="text-[10px] text-stone-400 font-nastaliq">
                (اوپر جگہ برائے عنوان، سند و حوالہ)
              </span>
              <span className="text-xs font-bold text-emerald-800 font-nastaliq">
                کتاب &quot;احتسابِ ناصبیت&quot; — جلد {activeVolume.volumeNumber}
              </span>
            </div>

            {/* REAL DUAL PAGES: (Side 1: Real Reference Page) + (Side 2: Real Volume Title Page) */}
            <div className="flex items-center justify-center gap-4 px-4 my-auto relative z-10">
              {/* PAGE 1: Reference Content Page (Right Side in RTL) */}
              <div
                style={{ width: `${PAGE_WIDTH}px`, height: `${PAGE_HEIGHT}px` }}
                className="bg-white rounded p-1 border border-stone-300 shadow-md flex flex-col justify-between overflow-hidden shrink-0 relative"
              >
                <div className="text-[10px] text-stone-500 font-sans px-2 py-0.5 flex justify-between items-center border-b border-stone-100 bg-stone-50">
                  <span className="font-bold text-emerald-700">مطلوبہ صفحہ (سند)</span>
                  <span className="font-mono">ص {currentPage}</span>
                </div>

                {/* Scanned Book Page Image directly from Archive.org */}
                <div className="flex-1 w-full relative overflow-hidden bg-white flex items-center justify-center">
                  <img
                    src={refPageImgUrl}
                    alt={`صفحہ ${currentPage}`}
                    crossOrigin="anonymous"
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/app-logo.png';
                    }}
                  />
                </div>

                <div className="text-center text-[10px] text-stone-600 font-mono py-0.5 bg-stone-50 border-t border-stone-100">
                  احتساب ناصبیت جلد {activeVolume.volumeNumber} — ص {currentPage}
                </div>
              </div>

              {/* PAGE 2: Official Volume Title / Cover Page (Left Side in RTL) */}
              <div
                style={{ width: `${PAGE_WIDTH}px`, height: `${PAGE_HEIGHT}px` }}
                className="bg-white rounded p-1 border border-stone-300 shadow-md flex flex-col justify-between overflow-hidden shrink-0 relative"
              >
                <div className="text-[10px] text-stone-500 font-sans px-2 py-0.5 flex justify-between items-center border-b border-stone-100 bg-stone-50">
                  <span className="font-bold text-emerald-700">ٹائٹل / سرورق</span>
                  <span className="font-mono">ص {titlePageNumber}</span>
                </div>

                {/* Scanned Title Page Image directly from Archive.org */}
                <div className="flex-1 w-full relative overflow-hidden bg-white flex items-center justify-center">
                  <img
                    src={titlePageImgUrl}
                    alt="ٹائٹل پیج"
                    crossOrigin="anonymous"
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/app-logo.png';
                    }}
                  />
                </div>

                <div className="text-center text-[10px] text-stone-600 font-mono py-0.5 bg-stone-50 border-t border-stone-100">
                  سرورقِ کتاب — {activeVolume.volumeTitleUrdu}
                </div>
              </div>
            </div>

            {/* Bottom Watermark / Citation Banner */}
            <div className="absolute bottom-0 left-0 right-0 h-10 px-4 flex items-center justify-between border-t border-stone-200 bg-stone-50/90 pointer-events-none">
              <span className="text-[10px] text-stone-500 font-sans">
                آفیشل ڈیجیٹل ایڈیشن برائے محققین
              </span>
              <span className="text-xs font-bold font-nastaliq text-emerald-800">
                مجموعہ کتب &quot;احتسابِ ناصبیت&quot; مکمل ۱۲ جلدیں
              </span>
            </div>

            {/* 4. Canvas Drawing Layer (For highlighters, boxes, and underlines) */}
            <canvas
              ref={canvasRef}
              width={SHEET_WIDTH}
              height={totalSheetHeight}
              onMouseDown={handlePointerDown}
              onMouseMove={handlePointerMove}
              onMouseUp={handlePointerUp}
              onTouchStart={handlePointerDown}
              onTouchMove={handlePointerMove}
              onTouchEnd={handlePointerUp}
              className={`absolute inset-0 z-20 ${
                activeTool === 'move' ? 'pointer-events-none' : 'cursor-crosshair'
              }`}
            />

            {/* 5. Draggable Movable Text Elements (Requirement 2) */}
            <div className="absolute inset-0 z-30 pointer-events-none">
              {textList.map((item) => {
                const isSelected = item.id === selectedTextId;
                return (
                  <div
                    key={item.id}
                    onMouseDown={(e) => handleTextMouseDown(item.id, e)}
                    onTouchStart={(e) => handleTextMouseDown(item.id, e)}
                    style={{
                      left: `${item.x}px`,
                      top: `${item.y}px`,
                      transform: 'translate(-50%, -50%)',
                      fontSize: `${item.fontSize}px`,
                      color: item.color,
                      backgroundColor: item.bgColor,
                    }}
                    className={`absolute pointer-events-auto cursor-move px-2.5 py-1 rounded-md transition-shadow font-nastaliq leading-normal text-center ${
                      isSelected
                        ? 'ring-2 ring-emerald-500 ring-offset-2 shadow-xl'
                        : 'hover:ring-1 hover:ring-stone-400'
                    }`}
                  >
                    <span>{item.text}</span>
                    {isSelected && (
                      <div className="absolute -top-3 -right-3 w-5 h-5 bg-emerald-600 text-white rounded-full flex items-center justify-center text-[10px] shadow pointer-events-none">
                        <Move className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 4. BOTTOM BAR: Page Jumper & Quick Text Insertion */}
      <footer className="h-14 bg-stone-900 border-t border-stone-800 px-4 flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-stone-400 font-sans text-xs">صفحہ تبدیل کریں:</span>
          <input
            type="number"
            min="1"
            max={activeVolume.pageCount || 476}
            value={currentPage}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val)) {
                setCurrentPage(Math.max(1, Math.min(activeVolume.pageCount || 476, val)));
              }
            }}
            className="w-16 h-8 text-center bg-stone-950 border border-stone-700 rounded-lg text-emerald-400 font-mono font-bold"
          />
          <span className="text-stone-400 font-sans text-xs">/ {activeVolume.pageCount || 476}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddTextModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-emerald-400 border border-stone-700 cursor-pointer font-sans"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>نئی تحریر شامل کریں</span>
          </button>
        </div>
      </footer>

      {/* ADD NEW TEXT MODAL */}
      {showAddTextModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-stone-900 border border-stone-700 rounded-2xl p-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800 mb-3">
              <h3 className="font-nastaliq text-lg font-bold text-amber-300">
                سند پر نئی تحریر شامل کریں
              </h3>
              <button
                onClick={() => setShowAddTextModal(false)}
                className="text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddNewTextSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-stone-300 block mb-1 font-sans">
                  تحریر / نوٹ / عنوان لکھیں:
                </label>
                <textarea
                  rows={2}
                  placeholder="مثلاً: اہم حوالہ در تحقیق و اثبات شہادت امام حسین..."
                  value={newTextInput}
                  onChange={(e) => setNewTextInput(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-stone-100 placeholder-stone-500 focus:outline-none focus:border-emerald-500 font-nastaliq text-sm"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs text-stone-300 block mb-1 font-sans">
                  رنگ منتخب فرمائیں:
                </label>
                <div className="flex items-center gap-2">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedColor(c.value)}
                      style={{ backgroundColor: c.value }}
                      className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
                        selectedColor === c.value ? 'scale-110 border-white' : 'border-transparent'
                      }`}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setShowAddTextModal(false)}
                  className="px-4 py-1.5 rounded-xl bg-stone-800 text-stone-300 text-xs"
                >
                  منسوخ کریں
                </button>
                <button
                  type="submit"
                  disabled={!newTextInput.trim()}
                  className="px-5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-stone-950 font-bold text-xs shadow-lg cursor-pointer"
                >
                  تحریر شامل کریں
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
