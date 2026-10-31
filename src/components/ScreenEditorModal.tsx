import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Highlighter,
  Square,
  Minus,
  Type,
  RotateCcw,
  RotateCw,
  Download,
  Trash2,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Plus,
  BookOpen,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  Loader2,
  Check,
  Edit3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Sliders,
  Eraser,
  Sparkles
} from 'lucide-react';
import { VolumeData } from '../types/book';
import { DEFAULT_VOLUMES } from '../data/defaultVolumes';
import { resolveVolumeArchiveId, resolveVolumePdfUrl } from '../utils/archiveUtils';
import { loadPdfDocument, renderPageToDataUrl } from '../utils/pdfLoader';

interface ScreenEditorModalProps {
  volume: VolumeData;
  currentPage: number;
  initialPageImage?: string;
  pdfDoc?: any;
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
  x: number; // left in pixels relative to 680px sheet
  y: number; // top in pixels relative to 680px sheet
  width: number; // resizable width in pixels
  height: number; // resizable height in pixels
  fontSize: number;
  color: string;
  bgColor: string; // 'transparent', '#ffffffdd', '#000000bb', '#fef3c7dd', '#065f46dd'
  isBold: boolean;
  textAlign: 'center' | 'right' | 'left';
}

const SHEET_WIDTH = 680;
const PAGE_WIDTH = 295;
const PAGE_HEIGHT = 410;

// Horizontally scrollable color lists
const HIGHLIGHT_COLOR_LIST = [
  { id: 'yellow', value: '#ffeb3b', label: 'پیلا' },
  { id: 'green', value: '#00e676', label: 'سبز' },
  { id: 'pink', value: '#ff2d55', label: 'گلابی' },
  { id: 'cyan', value: '#00e5ff', label: 'ہلکا نیلا' },
  { id: 'gold', value: '#f59e0b', label: 'سنہری' },
  { id: 'orange', value: '#ff9100', label: 'نارنجی' },
  { id: 'purple', value: '#b388ff', label: 'جامنی' },
  { id: 'white', value: '#ffffff', label: 'سفید' },
];

const TEXT_COLOR_LIST = [
  { id: 'emerald', value: '#065f46', label: 'گہرا سبز' },
  { id: 'gold', value: '#d97706', label: 'سنہری' },
  { id: 'red', value: '#dc2626', label: 'سرخ' },
  { id: 'black', value: '#1c1917', label: 'سیاہ' },
  { id: 'white', value: '#ffffff', label: 'سفید' },
  { id: 'blue', value: '#2563eb', label: 'نیلا' },
  { id: 'purple', value: '#7c3aed', label: 'جامنی' },
  { id: 'teal', value: '#0d9488', label: 'فیروزی' },
];

const SHAPE_COLOR_LIST = [
  { id: 'red', value: '#dc2626', label: 'سرخ' },
  { id: 'gold', value: '#f59e0b', label: 'سنہری' },
  { id: 'green', value: '#10b981', label: 'سبز' },
  { id: 'blue', value: '#3b82f6', label: 'نیلا' },
  { id: 'black', value: '#1c1917', label: 'سیاہ' },
  { id: 'white', value: '#ffffff', label: 'سفید' },
];

export type EditorToolMode = 'text' | 'highlight' | 'box' | 'line' | 'eraser';

export const ScreenEditorModal: React.FC<ScreenEditorModalProps> = ({
  volume: initialVolume,
  currentPage: initialPage,
  initialPageImage,
  pdfDoc,
  onClose,
  onPageChange,
  onVolumeChange,
}) => {
  const [activeVolume, setActiveVolume] = useState<VolumeData>(initialVolume || DEFAULT_VOLUMES[0]);
  const [currentPage, setCurrentPage] = useState<number>(initialPage || 1);

  // Real rendered page image for the target page
  const [refPageImage, setRefPageImage] = useState<string>(initialPageImage || '');
  const [isRenderingRefPage, setIsRenderingRefPage] = useState<boolean>(!initialPageImage);

  // Cover image mode: Archive Cover ('archive_cover') or Page 1 Title Page ('title_page')
  const [coverMode, setCoverMode] = useState<'archive_cover' | 'title_page'>('archive_cover');
  const [titlePageImage, setTitlePageImage] = useState<string>('');
  const [isRenderingCover, setIsRenderingCover] = useState<boolean>(false);

  // Cached active PDF document proxy
  const docProxyRef = useRef<any>(pdfDoc || null);

  // Active Tool: 'text' | 'highlight' | 'box' | 'line' | 'eraser'
  const [activeTool, setActiveTool] = useState<EditorToolMode>('text');
  const [selectedColor, setSelectedColor] = useState<string>('#ffeb3b');
  const [shapeWidth, setShapeWidth] = useState<number>(3); // 2, 4, 6

  // Dedicated Highlighter Opacity & Thickness Controls
  const [highlighterOpacity, setHighlighterOpacity] = useState<number>(40); // 20% - 100%
  const [highlighterWidth, setHighlighterWidth] = useState<number>(24); // 14, 24, 36

  // Canvas Top Space (for custom text headers)
  const [topSpacePx, setTopSpacePx] = useState<number>(55); // 15, 55, 95
  const bottomSpacePx = 20;
  const totalSheetHeight = PAGE_HEIGHT + topSpacePx + bottomSpacePx;

  // Viewport container measurement for responsive auto-fitting
  const [viewportSize, setViewportSize] = useState<{ width: number; height: number }>({
    width: 800,
    height: 600,
  });

  // Free-form drawings
  const [strokes, setStrokes] = useState<StrokeAnnotation[]>([]);
  const [redoStrokes, setRedoStrokes] = useState<StrokeAnnotation[]>([]);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [activeStroke, setActiveStroke] = useState<StrokeAnnotation | null>(null);

  // Stretchable & Draggable Text Elements
  const [textList, setTextList] = useState<DraggableText[]>([
    {
      id: 'txt-main-title',
      text: `کتاب "احتسابِ ناصبیت" — جلد ${initialVolume?.volumeNumber || 1} (ص ${initialPage || 1})`,
      x: 40,
      y: 10,
      width: 600,
      height: 42,
      fontSize: 16,
      color: '#065f46',
      bgColor: '#ffffffdd',
      isBold: true,
      textAlign: 'center',
    },
  ]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>('txt-main-title');
  const [editingTextItem, setEditingTextItem] = useState<DraggableText | null>(null);
  const [editTextValue, setEditTextValue] = useState<string>('');

  // Dragging and Stretching (Resizing) State
  const [isDraggingText, setIsDraggingText] = useState<boolean>(false);
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });
  const [resizingTextId, setResizingTextId] = useState<string | null>(null);
  const [resizeHandle, setResizeHandle] = useState<'e' | 'w' | 's' | 'se' | 'sw' | null>(null);
  const [resizeStart, setResizeStart] = useState<{
    startX: number;
    startY: number;
    initW: number;
    initH: number;
    initX: number;
    initY: number;
  }>({ startX: 0, startY: 0, initW: 0, initH: 0, initX: 0, initY: 0 });

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showVolumePicker, setShowVolumePicker] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  // Archive Identifier & Real Book Cover Image
  const archiveId = resolveVolumeArchiveId(activeVolume.volumeNumber, activeVolume.archiveItemId);
  const rawCoverUrl = activeVolume.coverImageUrl || `https://archive.org/services/img/${archiveId}`;
  const proxiedCoverUrl = `/api/image-proxy?url=${encodeURIComponent(rawCoverUrl)}`;

  // Render Target Reading Page
  useEffect(() => {
    let isCancelled = false;

    async function getDocumentProxy() {
      if (docProxyRef.current) return docProxyRef.current;
      if (pdfDoc && activeVolume.id === initialVolume?.id) {
        docProxyRef.current = pdfDoc;
        return pdfDoc;
      }
      try {
        const pdfUrl = resolveVolumePdfUrl(activeVolume.volumeNumber, activeVolume.pdfUrl);
        const loaded = await loadPdfDocument({ url: pdfUrl });
        if (!isCancelled) {
          docProxyRef.current = loaded;
        }
        return loaded;
      } catch (err) {
        console.warn('Failed to load PDF in editor:', err);
        return null;
      }
    }

    async function renderPage() {
      if (initialPageImage && activeVolume.id === initialVolume?.id && currentPage === initialPage) {
        setRefPageImage(initialPageImage);
        setIsRenderingRefPage(false);
        return;
      }

      setIsRenderingRefPage(true);
      try {
        const doc = await getDocumentProxy();
        if (doc && !isCancelled) {
          const renderedUrl = await renderPageToDataUrl(doc, currentPage, 800);
          if (!isCancelled) {
            setRefPageImage(renderedUrl);
          }
        }
      } catch (err) {
        console.warn('Error rendering page:', err);
      } finally {
        if (!isCancelled) {
          setIsRenderingRefPage(false);
        }
      }
    }

    renderPage();

    return () => {
      isCancelled = true;
    };
  }, [activeVolume, currentPage, initialPageImage, initialPage, initialVolume, pdfDoc]);

  // Render Title Page (Page 1) when requested
  useEffect(() => {
    let isCancelled = false;
    if (coverMode === 'title_page' && !titlePageImage) {
      setIsRenderingCover(true);
      (async () => {
        try {
          let doc = docProxyRef.current;
          if (!doc) {
            const pdfUrl = resolveVolumePdfUrl(activeVolume.volumeNumber, activeVolume.pdfUrl);
            doc = await loadPdfDocument({ url: pdfUrl });
            if (!isCancelled) docProxyRef.current = doc;
          }
          if (doc && !isCancelled) {
            const p1 = await renderPageToDataUrl(doc, 1, 800);
            if (!isCancelled) {
              setTitlePageImage(p1);
            }
          }
        } catch (err) {
          console.warn('Error rendering title page:', err);
        } finally {
          if (!isCancelled) {
            setIsRenderingCover(false);
          }
        }
      })();
    }
    return () => {
      isCancelled = true;
    };
  }, [coverMode, activeVolume, titlePageImage]);

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

  const availW = Math.max(200, viewportSize.width - 20);
  const availH = Math.max(200, viewportSize.height - 20);
  const autoFitScale = Math.min(availW / SHEET_WIDTH, availH / totalSheetHeight, 1);
  const effectiveScale = autoFitScale;

  // Redraw Canvas
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
        ctx.lineWidth = s.width || 24;
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
        ctx.globalAlpha = alpha * 0.15;
        ctx.fillRect(s.boxRect.x, s.boxRect.y, s.boxRect.w, s.boxRect.h);
      }
      ctx.restore();
    });

    // Draw active stroke
    if (activeStroke) {
      ctx.save();
      const alpha = activeStroke.opacity / 100;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = activeStroke.color;
      ctx.fillStyle = activeStroke.color;

      if (activeStroke.tool === 'highlight' && activeStroke.points) {
        ctx.lineWidth = activeStroke.width || 24;
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
        ctx.strokeRect(activeStroke.boxRect.x, activeStroke.boxRect.y, activeStroke.boxRect.w, activeStroke.boxRect.h);
        ctx.globalAlpha = alpha * 0.15;
        ctx.fillRect(activeStroke.boxRect.x, activeStroke.boxRect.y, activeStroke.boxRect.w, activeStroke.boxRect.h);
      }
      ctx.restore();
    }
  }, [strokes, activeStroke, totalSheetHeight]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Coordinate mapper from screen to 680px sheet space
  const getSheetCoords = (e: React.MouseEvent | React.TouchEvent): Point => {
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

  // Stroke removal helper
  const eraseStrokeAt = (pt: Point) => {
    setStrokes((prev) => {
      const remaining = prev.filter((s) => {
        if (s.boxRect) {
          const b = s.boxRect;
          const minX = Math.min(b.x, b.x + b.w) - 16;
          const maxX = Math.max(b.x, b.x + b.w) + 16;
          const minY = Math.min(b.y, b.y + b.h) - 16;
          const maxY = Math.max(b.y, b.y + b.h) + 16;
          return !(pt.x >= minX && pt.x <= maxX && pt.y >= minY && pt.y <= maxY);
        }
        if (s.points) {
          return !s.points.some((p) => Math.hypot(p.x - pt.x, p.y - pt.y) < 24);
        }
        return true;
      });
      if (remaining.length !== prev.length) {
        showToast('نشان مٹا دیا گیا');
        return remaining;
      }
      return prev;
    });
  };

  // Drawing and Erasing event handlers
  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (activeTool === 'text') return;
    const pt = getSheetCoords(e);

    if (activeTool === 'eraser') {
      setIsDrawing(true);
      eraseStrokeAt(pt);
      return;
    }

    setIsDrawing(true);
    setRedoStrokes([]);

    if (activeTool === 'highlight') {
      setActiveStroke({
        id: `stroke-${Date.now()}`,
        tool: 'highlight',
        points: [pt],
        color: selectedColor,
        opacity: highlighterOpacity,
        width: highlighterWidth,
      });
    } else if (activeTool === 'line') {
      setActiveStroke({
        id: `stroke-${Date.now()}`,
        tool: 'line',
        points: [pt],
        color: selectedColor,
        opacity: 100,
        width: shapeWidth,
      });
    } else if (activeTool === 'box') {
      setActiveStroke({
        id: `box-${Date.now()}`,
        tool: 'box',
        boxRect: { x: pt.x, y: pt.y, w: 0, h: 0 },
        color: selectedColor,
        opacity: 100,
        width: shapeWidth,
      });
    }
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const pt = getSheetCoords(e);

    if (activeTool === 'eraser') {
      eraseStrokeAt(pt);
      return;
    }

    if (!activeStroke) return;

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
    if (activeTool === 'eraser') {
      setIsDrawing(false);
      return;
    }
    if (isDrawing && activeStroke) {
      setStrokes((prev) => [...prev, activeStroke]);
      setActiveStroke(null);
      setIsDrawing(false);
    }
  };

  // Text Box Move & Stretch Handlers
  const handleTextMouseDown = (id: string, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setSelectedTextId(id);
    setIsDraggingText(true);

    const pt = getSheetCoords(e);
    const item = textList.find((t) => t.id === id);
    if (item) {
      setDragOffset({
        x: pt.x - item.x,
        y: pt.y - item.y,
      });
    }
  };

  const handleResizeStart = (
    id: string,
    handle: 'e' | 'w' | 's' | 'se' | 'sw',
    e: React.MouseEvent | React.TouchEvent
  ) => {
    e.stopPropagation();
    setSelectedTextId(id);
    setResizingTextId(id);
    setResizeHandle(handle);

    const pt = getSheetCoords(e);
    const item = textList.find((t) => t.id === id);
    if (item) {
      setResizeStart({
        startX: pt.x,
        startY: pt.y,
        initW: item.width,
        initH: item.height,
        initX: item.x,
        initY: item.y,
      });
    }
  };

  const handleSheetPointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    const pt = getSheetCoords(e);

    // 1. Moving text box
    if (isDraggingText && selectedTextId && !resizingTextId) {
      const newX = Math.round(pt.x - dragOffset.x);
      const newY = Math.round(pt.y - dragOffset.y);

      setTextList((prev) =>
        prev.map((t) =>
          t.id === selectedTextId
            ? {
                ...t,
                x: Math.max(0, Math.min(SHEET_WIDTH - t.width, newX)),
                y: Math.max(0, Math.min(totalSheetHeight - t.height, newY)),
              }
            : t
        )
      );
    }

    // 2. Stretching / Resizing text box freely
    if (resizingTextId && resizeHandle) {
      const deltaX = pt.x - resizeStart.startX;
      const deltaY = pt.y - resizeStart.startY;

      setTextList((prev) =>
        prev.map((t) => {
          if (t.id !== resizingTextId) return t;

          let newW = t.width;
          let newH = t.height;
          let newX = t.x;

          if (resizeHandle === 'e' || resizeHandle === 'se') {
            newW = Math.max(80, Math.min(SHEET_WIDTH - t.x, resizeStart.initW + deltaX));
          }
          if (resizeHandle === 'w' || resizeHandle === 'sw') {
            const potentialW = resizeStart.initW - deltaX;
            if (potentialW >= 80) {
              newW = Math.min(SHEET_WIDTH, potentialW);
              newX = resizeStart.initX + deltaX;
            }
          }
          if (resizeHandle === 's' || resizeHandle === 'se' || resizeHandle === 'sw') {
            newH = Math.max(30, Math.min(totalSheetHeight - t.y, resizeStart.initH + deltaY));
          }

          return { ...t, width: Math.round(newW), height: Math.round(newH), x: Math.round(newX) };
        })
      );
    }
  };

  const handleSheetPointerUp = () => {
    setIsDraggingText(false);
    setResizingTextId(null);
    setResizeHandle(null);
  };

  // Text modification functions
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

  const toggleSelectedTextBold = () => {
    if (!selectedTextId) return;
    setTextList((prev) =>
      prev.map((t) => (t.id === selectedTextId ? { ...t, isBold: !t.isBold } : t))
    );
  };

  const updateSelectedTextAlign = (align: 'center' | 'right' | 'left') => {
    if (!selectedTextId) return;
    setTextList((prev) =>
      prev.map((t) => (t.id === selectedTextId ? { ...t, textAlign: align } : t))
    );
  };

  const deleteSelectedText = () => {
    if (!selectedTextId) return;
    setTextList((prev) => prev.filter((t) => t.id !== selectedTextId));
    setSelectedTextId(null);
    showToast('تحریر حذف کر دی گئی');
  };

  const handleAddNewText = () => {
    const newId = `txt-${Date.now()}`;
    const newText: DraggableText = {
      id: newId,
      text: 'یہاں اپنی تحریر، حوالہ یا سند درج فرمائیں',
      x: 100,
      y: Math.max(10, topSpacePx - 30),
      width: 480,
      height: 44,
      fontSize: 16,
      color: '#065f46',
      bgColor: '#ffffffdd',
      isBold: true,
      textAlign: 'center',
    };
    setTextList((prev) => [...prev, newText]);
    setSelectedTextId(newId);
    setEditingTextItem(newText);
    setEditTextValue(newText.text);
    showToast('نئی تحریر شامل ہو گئی! دونوں طرف سے سٹریچ کر کے بڑا چھوٹا کر سکتے ہیں۔');
  };

  const handleSaveEditText = () => {
    if (editingTextItem) {
      setTextList((prev) =>
        prev.map((t) => (t.id === editingTextItem.id ? { ...t, text: editTextValue } : t))
      );
      setEditingTextItem(null);
    }
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

  // High resolution composite image export (No extra clutter or boilerplate)
  const handleExportImage = async () => {
    try {
      showToast('تصویر تیار ہو رہی ہے...');
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = SHEET_WIDTH * 2;
      exportCanvas.height = totalSheetHeight * 2;
      const ctx = exportCanvas.getContext('2d');
      if (!ctx) return;

      ctx.scale(2, 2);

      // 1. Background clean white sheet
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, SHEET_WIDTH, totalSheetHeight);

      // Helper function to load image
      const loadImage = (url: string): Promise<HTMLImageElement> =>
        new Promise((resolve, reject) => {
          if (!url) {
            reject(new Error('Empty image URL'));
            return;
          }
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('Image load failed'));
          img.src = url;
        });

      const targetRefUrl = refPageImage;
      const targetCoverUrl = coverMode === 'title_page' && titlePageImage ? titlePageImage : proxiedCoverUrl;

      // Draw real book images
      try {
        const [imgRef, imgCover] = await Promise.all([
          loadImage(targetRefUrl),
          loadImage(targetCoverUrl),
        ]);

        // Draw Reference Page (Right in RTL: x: 355, y: topSpacePx)
        ctx.drawImage(imgRef, 355, topSpacePx, PAGE_WIDTH, PAGE_HEIGHT);
        ctx.strokeStyle = '#d1d5db';
        ctx.lineWidth = 1;
        ctx.strokeRect(355, topSpacePx, PAGE_WIDTH, PAGE_HEIGHT);

        // Draw Title / Cover Page (Left in RTL: x: 30, y: topSpacePx)
        ctx.drawImage(imgCover, 30, topSpacePx, PAGE_WIDTH, PAGE_HEIGHT);
        ctx.strokeRect(30, topSpacePx, PAGE_WIDTH, PAGE_HEIGHT);
      } catch (e) {
        console.warn('Some images could not be loaded together:', e);
        try {
          if (targetRefUrl) {
            const imgRef = await loadImage(targetRefUrl);
            ctx.drawImage(imgRef, 355, topSpacePx, PAGE_WIDTH, PAGE_HEIGHT);
            ctx.strokeRect(355, topSpacePx, PAGE_WIDTH, PAGE_HEIGHT);
          }
        } catch {}
        try {
          if (targetCoverUrl) {
            const imgCover = await loadImage(targetCoverUrl);
            ctx.drawImage(imgCover, 30, topSpacePx, PAGE_WIDTH, PAGE_HEIGHT);
            ctx.strokeRect(30, topSpacePx, PAGE_WIDTH, PAGE_HEIGHT);
          }
        } catch {}
      }

      // 2. Draw canvas drawing strokes (with exact opacity)
      const drawingCanvas = canvasRef.current;
      if (drawingCanvas) {
        ctx.drawImage(drawingCanvas, 0, 0, SHEET_WIDTH, totalSheetHeight);
      }

      // 3. Draw all custom stretchable text boxes with clean multi-line wrapping
      textList.forEach((t) => {
        ctx.save();
        ctx.font = `${t.isBold ? 'bold ' : ''}${t.fontSize}px 'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', serif`;
        ctx.textBaseline = 'top';

        // Draw background box if not transparent
        if (t.bgColor && t.bgColor !== 'transparent') {
          ctx.fillStyle = t.bgColor;
          ctx.beginPath();
          ctx.roundRect(t.x, t.y, t.width, t.height, 6);
          ctx.fill();
        }

        // Text drawing with wrapping inside t.width
        ctx.fillStyle = t.color;
        const lineHeight = t.fontSize * 1.5;
        const padX = 10;
        const padY = 8;
        const maxTextW = t.width - padX * 2;

        const lines = t.text.split('\n');
        let currentY = t.y + padY;

        for (const line of lines) {
          const words = line.split(' ');
          let currentLine = '';

          for (let n = 0; n < words.length; n++) {
            const testLine = currentLine ? `${currentLine} ${words[n]}` : words[n];
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxTextW && n > 0) {
              let drawX = t.x + padX;
              if (t.textAlign === 'center') {
                drawX = t.x + t.width / 2;
                ctx.textAlign = 'center';
              } else if (t.textAlign === 'right') {
                drawX = t.x + t.width - padX;
                ctx.textAlign = 'right';
              } else {
                ctx.textAlign = 'left';
              }
              ctx.fillText(currentLine, drawX, currentY);
              currentLine = words[n];
              currentY += lineHeight;
            } else {
              currentLine = testLine;
            }
          }
          if (currentLine) {
            let drawX = t.x + padX;
            if (t.textAlign === 'center') {
              drawX = t.x + t.width / 2;
              ctx.textAlign = 'center';
            } else if (t.textAlign === 'right') {
              drawX = t.x + t.width - padX;
              ctx.textAlign = 'right';
            } else {
              ctx.textAlign = 'left';
            }
            ctx.fillText(currentLine, drawX, currentY);
            currentY += lineHeight;
          }
        }
        ctx.restore();
      });

      // 4. Download Trigger
      const dataUrl = exportCanvas.toDataURL('image/jpeg', 0.95);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `Ehtisab-Sanad-Vol${activeVolume.volumeNumber}-Page${currentPage}.jpg`;
      link.click();
      showToast('سند تصویر کامیابی سے محفوظ ہو گئی!');
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
      {/* 1. TOP HEADER: Back + Volume/Page Info + Save Button */}
      <header className="h-12 bg-stone-900 border-b border-stone-800 px-2 sm:px-4 flex items-center justify-between z-30 shrink-0 gap-2">
        {/* Back Button */}
        <button
          onClick={onClose}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 font-bold text-xs cursor-pointer transition-colors shrink-0"
          title="بند کریں اور واپس جائیں"
        >
          <ArrowRight className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
          <span className="font-nastaliq text-xs">واپس</span>
        </button>

        {/* Center: Volume Selector Dropdown + Page Stepper */}
        <div className="flex items-center gap-1.5 bg-stone-950 border border-stone-800 rounded-xl px-2 py-1 text-xs shrink-0 relative">
          <button
            onClick={() => setShowVolumePicker(!showVolumePicker)}
            className="text-emerald-400 font-bold hover:text-emerald-300 font-nastaliq flex items-center gap-1 cursor-pointer text-xs"
          >
            <span>جلد {activeVolume.volumeNumber}</span>
            <span className="text-[10px] text-stone-500 font-sans">▼</span>
          </button>

          {showVolumePicker && (
            <div className="absolute top-full left-0 mt-1 w-60 bg-stone-900 border border-stone-700 rounded-2xl shadow-2xl p-2 z-50 max-h-72 overflow-y-auto">
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

          <span className="text-stone-700">|</span>

          {/* Page Stepper */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => {
                const nextP = Math.max(1, currentPage - 1);
                setCurrentPage(nextP);
                if (onPageChange) onPageChange(nextP);
              }}
              disabled={currentPage <= 1}
              className="p-0.5 text-stone-400 hover:text-white disabled:opacity-30 cursor-pointer"
              title="پچھلا صفحہ"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] text-stone-200 font-mono font-bold px-0.5">
              ص {currentPage}
            </span>
            <button
              onClick={() => {
                const nextP = Math.min(activeVolume.pageCount || 476, currentPage + 1);
                setCurrentPage(nextP);
                if (onPageChange) onPageChange(nextP);
              }}
              disabled={currentPage >= (activeVolume.pageCount || 476)}
              className="p-0.5 text-stone-400 hover:text-white disabled:opacity-30 cursor-pointer"
              title="اگلا صفحہ"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right: Save Button */}
        <button
          onClick={handleExportImage}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-stone-950 font-bold text-xs shadow-md cursor-pointer shrink-0 transition-all active:scale-95 whitespace-nowrap"
          title="سند و حوالہ تصویر محفوظ کریں"
        >
          <Download className="w-3.5 h-3.5 stroke-[2.5]" />
          <span className="font-nastaliq text-xs">سند محفوظ کریں</span>
        </button>
      </header>

      {/* 2. PRIMARY TOOL TABS: صرف بنیادی ٹولز (ٹیکسٹ، ہائی لائٹر، باکس/لکیر، اریزر) */}
      <div className="bg-stone-900 border-b border-stone-800 px-2 py-1.5 flex items-center justify-between gap-1 z-20 shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          {/* Text Tool */}
          <button
            onClick={() => {
              setActiveTool('text');
              if (textList.length === 0) {
                handleAddNewText();
              } else if (!selectedTextId) {
                setSelectedTextId(textList[0].id);
              }
            }}
            className={`px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer font-sans text-xs whitespace-nowrap ${
              activeTool === 'text'
                ? 'bg-emerald-600 text-white font-bold shadow-md ring-1 ring-emerald-400'
                : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>ٹیکسٹ (تحریر)</span>
          </button>

          {/* Highlighter Tool */}
          <button
            onClick={() => setActiveTool('highlight')}
            className={`px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer font-sans text-xs whitespace-nowrap ${
              activeTool === 'highlight'
                ? 'bg-amber-500 text-stone-950 font-bold shadow-md ring-1 ring-amber-300'
                : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
            }`}
          >
            <Highlighter className="w-3.5 h-3.5" />
            <span>ہائی لائٹر</span>
          </button>

          {/* Box / Line Tool */}
          <button
            onClick={() => {
              if (activeTool !== 'box' && activeTool !== 'line') {
                setActiveTool('box');
              }
            }}
            className={`px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer font-sans text-xs whitespace-nowrap ${
              activeTool === 'box' || activeTool === 'line'
                ? 'bg-sky-600 text-white font-bold shadow-md ring-1 ring-sky-400'
                : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
            }`}
          >
            <Square className="w-3.5 h-3.5" />
            <span>باکس / لکیر</span>
          </button>

          {/* Eraser Tool */}
          <button
            onClick={() => setActiveTool('eraser')}
            className={`px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer font-sans text-xs whitespace-nowrap ${
              activeTool === 'eraser'
                ? 'bg-rose-600 text-white font-bold shadow-md ring-1 ring-rose-400'
                : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
            }`}
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>اریزر (مٹائیں)</span>
          </button>
        </div>

        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5 bg-stone-950 border border-stone-800 rounded-xl p-0.5 shrink-0">
          <button
            onClick={handleUndo}
            disabled={strokes.length === 0}
            className="p-1.5 text-stone-400 hover:text-white disabled:opacity-25 rounded-lg cursor-pointer"
            title="واپس (Undo)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleRedo}
            disabled={redoStrokes.length === 0}
            className="p-1.5 text-stone-400 hover:text-white disabled:opacity-25 rounded-lg cursor-pointer"
            title="دوبارہ (Redo)"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3. CONTEXTUAL SUB-TOOLBAR: صرف اور صرف منتخب ٹول کے فردر آپشنز */}
      {/* CASE A: TEXT TOOL OPTIONS */}
      {activeTool === 'text' && (
        <div className="bg-stone-900/95 border-b border-emerald-900/40 px-2 py-1.5 flex items-center gap-2 text-xs z-20 shrink-0 overflow-x-auto no-scrollbar scroll-smooth">
          {/* Add Text Button */}
          <button
            onClick={handleAddNewText}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow shrink-0 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>نئی تحریر</span>
          </button>

          {selectedTextItem && (
            <>
              {/* Edit Text Button */}
              <button
                onClick={() => {
                  setEditingTextItem(selectedTextItem);
                  setEditTextValue(selectedTextItem.text);
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-stone-800 hover:bg-stone-700 text-emerald-400 font-bold border border-emerald-600/40 text-xs cursor-pointer shrink-0 whitespace-nowrap"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>تحریر بدلیں</span>
              </button>

              {/* Font Size (+/-) */}
              <div className="flex items-center gap-1 bg-stone-950 px-2 py-1 rounded-xl border border-stone-800 shrink-0">
                <button
                  onClick={() => updateSelectedTextFontSize(-2)}
                  className="text-stone-400 hover:text-white font-bold px-1"
                  title="چھوٹا کریں"
                >
                  A-
                </button>
                <span className="font-mono text-emerald-400 font-bold text-[11px]">
                  {selectedTextItem.fontSize}
                </span>
                <button
                  onClick={() => updateSelectedTextFontSize(2)}
                  className="text-stone-400 hover:text-white font-bold px-1"
                  title="بڑا کریں"
                >
                  A+
                </button>
              </div>

              {/* Bold Toggle */}
              <button
                onClick={toggleSelectedTextBold}
                className={`p-1.5 rounded-xl border text-xs cursor-pointer shrink-0 ${
                  selectedTextItem.isBold
                    ? 'bg-amber-500 text-stone-950 font-bold border-amber-400'
                    : 'bg-stone-950 text-stone-400 border-stone-800'
                }`}
                title="بولڈ"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>

              {/* Alignment */}
              <div className="flex items-center bg-stone-950 rounded-xl border border-stone-800 p-0.5 shrink-0">
                <button
                  onClick={() => updateSelectedTextAlign('right')}
                  className={`p-1 rounded-lg ${selectedTextItem.textAlign === 'right' ? 'bg-emerald-600 text-white' : 'text-stone-400'}`}
                  title="دائیں"
                >
                  <AlignRight className="w-3 h-3" />
                </button>
                <button
                  onClick={() => updateSelectedTextAlign('center')}
                  className={`p-1 rounded-lg ${selectedTextItem.textAlign === 'center' ? 'bg-emerald-600 text-white' : 'text-stone-400'}`}
                  title="درمیان"
                >
                  <AlignCenter className="w-3 h-3" />
                </button>
                <button
                  onClick={() => updateSelectedTextAlign('left')}
                  className={`p-1 rounded-lg ${selectedTextItem.textAlign === 'left' ? 'bg-emerald-600 text-white' : 'text-stone-400'}`}
                  title="بائیں"
                >
                  <AlignLeft className="w-3 h-3" />
                </button>
              </div>

              {/* SCROLLABLE COLOR PALETTE FOR TEXT */}
              <div className="flex items-center gap-1.5 bg-stone-950 px-2 py-1 rounded-xl border border-stone-800 shrink-0">
                <span className="text-[10px] text-stone-400 font-sans whitespace-nowrap">رنگ:</span>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-[130px] sm:max-w-none py-0.5">
                  {TEXT_COLOR_LIST.map((col) => (
                    <button
                      key={col.id}
                      onClick={() => updateSelectedTextColor(col.value)}
                      style={{ backgroundColor: col.value }}
                      className={`w-5 h-5 rounded-full border-2 transition-transform cursor-pointer shrink-0 ${
                        selectedTextItem.color === col.value
                          ? 'border-white scale-110 shadow'
                          : 'border-stone-700 hover:border-stone-500'
                      }`}
                      title={col.label}
                    />
                  ))}
                </div>
              </div>

              {/* Background Color Presets */}
              <div className="flex items-center gap-1 bg-stone-950 px-2 py-1 rounded-xl border border-stone-800 shrink-0">
                <span className="text-[10px] text-stone-400 font-sans whitespace-nowrap">پس منظر:</span>
                {[
                  { label: 'سفید', val: '#ffffffdd' },
                  { label: 'سنہری', val: '#fef3c7dd' },
                  { label: 'شفاف', val: 'transparent' },
                  { label: 'سیاہ', val: '#000000bb' },
                ].map((bg) => (
                  <button
                    key={bg.label}
                    onClick={() => updateSelectedTextBg(bg.val)}
                    className={`px-1.5 py-0.5 rounded text-[10px] cursor-pointer whitespace-nowrap ${
                      selectedTextItem.bgColor === bg.val
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    {bg.label}
                  </button>
                ))}
              </div>

              {/* Delete Text */}
              <button
                onClick={deleteSelectedText}
                className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/60 rounded-xl cursor-pointer shrink-0 border border-rose-900/40"
                title="تحریر مٹائیں"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {/* Top Space Setting for Text Area */}
          <div className="flex items-center gap-1 bg-stone-950 px-2 py-1 rounded-xl border border-stone-800 shrink-0 mr-auto">
            <span className="text-[10px] text-stone-400 font-sans whitespace-nowrap">اوپر جگہ:</span>
            {[
              { label: 'عام', px: 55 },
              { label: 'کشادہ', px: 95 },
              { label: 'بغیر جگہ', px: 15 },
            ].map((sp) => (
              <button
                key={sp.px}
                onClick={() => setTopSpacePx(sp.px)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-sans transition-colors cursor-pointer whitespace-nowrap ${
                  topSpacePx === sp.px
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                {sp.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* CASE B: HIGHLIGHTER OPTIONS */}
      {activeTool === 'highlight' && (
        <div className="bg-stone-900/95 border-b border-amber-900/40 px-2 py-1.5 flex items-center gap-2 text-xs z-20 shrink-0 overflow-x-auto no-scrollbar scroll-smooth">
          {/* SCROLLABLE COLOR PALETTE FOR HIGHLIGHTER */}
          <div className="flex items-center gap-1.5 bg-stone-950 px-2.5 py-1 rounded-xl border border-stone-800 shrink-0">
            <span className="text-[11px] text-stone-400 font-sans whitespace-nowrap">رنگ (سکرول کریں):</span>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 max-w-[140px] sm:max-w-none">
              {HIGHLIGHT_COLOR_LIST.map((col) => (
                <button
                  key={col.id}
                  onClick={() => setSelectedColor(col.value)}
                  style={{ backgroundColor: col.value }}
                  className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer shrink-0 ${
                    selectedColor === col.value ? 'border-white scale-110 shadow-lg' : 'border-stone-700'
                  }`}
                  title={col.label}
                />
              ))}
            </div>
          </div>

          {/* HIGHLIGHTER OPACITY PERCENTAGE SELECTOR */}
          <div className="flex items-center gap-1.5 bg-stone-950 px-2.5 py-1 rounded-xl border border-amber-500/40 shrink-0">
            <span className="text-[11px] text-amber-300 font-bold font-sans whitespace-nowrap">
              شفافیت (Opacity):
            </span>
            <div className="flex items-center gap-1">
              {[20, 40, 60, 80, 100].map((pct) => (
                <button
                  key={pct}
                  onClick={() => setHighlighterOpacity(pct)}
                  className={`px-2 py-0.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
                    highlighterOpacity === pct
                      ? 'bg-amber-500 text-stone-950 shadow'
                      : 'text-stone-400 hover:text-white bg-stone-900'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* HIGHLIGHTER STROKE THICKNESS */}
          <div className="flex items-center gap-1 bg-stone-950 px-2.5 py-1 rounded-xl border border-stone-800 shrink-0">
            <span className="text-[11px] text-stone-400 whitespace-nowrap">موٹائی:</span>
            {[
              { label: 'باریک', w: 14 },
              { label: 'درمیانہ', w: 24 },
              { label: 'چوڑا', w: 36 },
            ].map((th) => (
              <button
                key={th.w}
                onClick={() => setHighlighterWidth(th.w)}
                className={`px-2 py-0.5 rounded-lg text-xs cursor-pointer whitespace-nowrap ${
                  highlighterWidth === th.w ? 'bg-amber-500 text-stone-950 font-bold' : 'text-stone-400 hover:text-white'
                }`}
              >
                {th.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* CASE C: BOX & LINE (SHAPES) OPTIONS */}
      {(activeTool === 'box' || activeTool === 'line') && (
        <div className="bg-stone-900/95 border-b border-sky-900/40 px-2 py-1.5 flex items-center gap-2 text-xs z-20 shrink-0 overflow-x-auto no-scrollbar scroll-smooth">
          {/* Switch between Box and Line */}
          <div className="flex items-center bg-stone-950 rounded-xl border border-stone-800 p-0.5 shrink-0">
            <button
              onClick={() => setActiveTool('box')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-sans cursor-pointer whitespace-nowrap ${
                activeTool === 'box' ? 'bg-sky-600 text-white font-bold' : 'text-stone-400 hover:text-white'
              }`}
            >
              <Square className="w-3.5 h-3.5" />
              <span>مستطیل باکس</span>
            </button>
            <button
              onClick={() => setActiveTool('line')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-sans cursor-pointer whitespace-nowrap ${
                activeTool === 'line' ? 'bg-sky-600 text-white font-bold' : 'text-stone-400 hover:text-white'
              }`}
            >
              <Minus className="w-3.5 h-3.5" />
              <span>سیدھی لکیر</span>
            </button>
          </div>

          {/* SCROLLABLE COLOR PALETTE FOR SHAPES */}
          <div className="flex items-center gap-1.5 bg-stone-950 px-2.5 py-1 rounded-xl border border-stone-800 shrink-0">
            <span className="text-[11px] text-stone-400 font-sans whitespace-nowrap">رنگ:</span>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 max-w-[140px] sm:max-w-none">
              {SHAPE_COLOR_LIST.map((col) => (
                <button
                  key={col.id}
                  onClick={() => setSelectedColor(col.value)}
                  style={{ backgroundColor: col.value }}
                  className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer shrink-0 ${
                    selectedColor === col.value ? 'border-white scale-110 shadow-lg' : 'border-stone-700'
                  }`}
                  title={col.label}
                />
              ))}
            </div>
          </div>

          {/* SHAPE BORDER WIDTH */}
          <div className="flex items-center gap-1 bg-stone-950 px-2 py-1 rounded-xl border border-stone-800 shrink-0">
            <span className="text-[11px] text-stone-400 whitespace-nowrap">موٹائی:</span>
            {[
              { label: 'باریک', w: 2 },
              { label: 'درمیانی', w: 4 },
              { label: 'موٹی', w: 6 },
            ].map((th) => (
              <button
                key={th.w}
                onClick={() => setShapeWidth(th.w)}
                className={`px-2 py-0.5 rounded-lg text-xs cursor-pointer whitespace-nowrap ${
                  shapeWidth === th.w ? 'bg-sky-600 text-white font-bold' : 'text-stone-400 hover:text-white'
                }`}
              >
                {th.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* CASE D: ERASER OPTIONS */}
      {activeTool === 'eraser' && (
        <div className="bg-stone-900/95 border-b border-rose-900/40 px-2 py-1.5 flex items-center gap-2 text-xs z-20 shrink-0 overflow-x-auto no-scrollbar scroll-smooth">
          <button
            onClick={handleUndo}
            disabled={strokes.length === 0}
            className="flex items-center gap-1 px-3 py-1 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 cursor-pointer disabled:opacity-30 whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>آخری نشان مٹائیں</span>
          </button>

          <button
            onClick={() => {
              if (strokes.length > 0) {
                setStrokes([]);
                setRedoStrokes([]);
                showToast('تمام لکیریں و ہائی لائٹس صاف کر دی گئیں');
              }
            }}
            disabled={strokes.length === 0}
            className="flex items-center gap-1 px-3 py-1 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-700/50 cursor-pointer disabled:opacity-30 whitespace-nowrap shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>تمام لکیریں و ہائی لائٹس صاف کریں</span>
          </button>

          <button
            onClick={() => {
              if (textList.length > 0) {
                setTextList([]);
                setSelectedTextId(null);
                showToast('تمام تحریریں مٹا دی گئیں');
              }
            }}
            disabled={textList.length === 0}
            className="flex items-center gap-1 px-3 py-1 rounded-xl bg-stone-800 hover:bg-stone-700 text-rose-400 border border-stone-700 cursor-pointer disabled:opacity-30 whitespace-nowrap shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>تمام تحریریں حذف کریں</span>
          </button>

          <span className="text-[11px] text-stone-400 mr-auto whitespace-nowrap">
            (کینوس پر کسی بھی لکیر پر کلک کر کے بھی مٹا سکتے ہیں)
          </span>
        </div>
      )}

      {/* 4. MAIN CENTER CANVAS VIEWPORT (CLEAN & CLUTTER-FREE) */}
      <div
        ref={viewportRef}
        className="flex-1 relative overflow-hidden bg-stone-950 flex items-center justify-center p-2"
        dir="ltr"
      >
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
            {/* REAL DUAL PAGES: (Side 1: Real Reference Page) + (Side 2: Real Volume Cover / Title Page) */}
            <div className="flex items-center justify-center gap-4 px-4 my-auto relative z-10">
              {/* PAGE 1: Reference Content Page (Right Side in RTL) */}
              <div
                style={{ width: `${PAGE_WIDTH}px`, height: `${PAGE_HEIGHT}px` }}
                className="bg-white rounded p-1 border border-stone-300 shadow-md flex flex-col justify-between overflow-hidden shrink-0 relative"
              >
                {/* Scanned / Rendered Book Page Image */}
                <div className="flex-1 w-full relative overflow-hidden bg-white flex items-center justify-center">
                  {isRenderingRefPage ? (
                    <div className="flex flex-col items-center justify-center gap-2 p-4 text-center">
                      <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
                      <span className="text-[11px] text-stone-500 font-nastaliq">صفحہ لوڈ ہو رہا ہے...</span>
                    </div>
                  ) : refPageImage ? (
                    <img
                      src={refPageImage}
                      alt={`صفحہ ${currentPage}`}
                      crossOrigin="anonymous"
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <div className="text-center p-3 text-stone-400 text-xs font-nastaliq">
                      صفحہ دستیاب نہیں ہے
                    </div>
                  )}
                </div>
              </div>

              {/* PAGE 2: Official Volume Title / Cover Page (Left Side in RTL) */}
              <div
                style={{ width: `${PAGE_WIDTH}px`, height: `${PAGE_HEIGHT}px` }}
                className="bg-white rounded p-1 border border-stone-300 shadow-md flex flex-col justify-between overflow-hidden shrink-0 relative"
              >
                {/* Subtle Toggle for Cover vs Title Page 1 */}
                <div className="text-[10px] text-stone-500 font-sans px-2 py-0.5 flex justify-between items-center border-b border-stone-100 bg-stone-50">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCoverMode('archive_cover')}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer transition-colors ${
                        coverMode === 'archive_cover'
                          ? 'bg-emerald-700 text-white'
                          : 'text-stone-600 hover:bg-stone-200'
                      }`}
                      title="آرکائیو پر موجود اصل سرورق"
                    >
                      سرورقِ جلد
                    </button>
                    <button
                      onClick={() => setCoverMode('title_page')}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer transition-colors ${
                        coverMode === 'title_page'
                          ? 'bg-emerald-700 text-white'
                          : 'text-stone-600 hover:bg-stone-200'
                      }`}
                      title="کتاب کا پہلا ٹائٹل صفحہ"
                    >
                      صفحہ اول
                    </button>
                  </div>
                  <span className="font-mono text-emerald-800 font-bold">
                    {coverMode === 'archive_cover' ? `جلد ${activeVolume.volumeNumber}` : `ص ۱`}
                  </span>
                </div>

                {/* Scanned / Proxied Title / Cover Image */}
                <div className="flex-1 w-full relative overflow-hidden bg-white flex items-center justify-center">
                  {isRenderingCover ? (
                    <div className="flex flex-col items-center justify-center gap-2 p-4 text-center">
                      <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
                      <span className="text-[11px] text-stone-500 font-nastaliq">سرورق تیار ہو رہا ہے...</span>
                    </div>
                  ) : (
                    <img
                      src={coverMode === 'title_page' && titlePageImage ? titlePageImage : proxiedCoverUrl}
                      alt="سرورق کتاب"
                      crossOrigin="anonymous"
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/app-logo.png';
                      }}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* 5. Canvas Drawing Layer (For highlighters, boxes, and underlines) */}
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
                activeTool === 'text'
                  ? 'pointer-events-none'
                  : activeTool === 'eraser'
                  ? 'cursor-cell'
                  : 'cursor-crosshair'
              }`}
            />

            {/* 6. RESIZABLE & STRETCHABLE DRAGGABLE TEXT BOXES (User Requirement 2) */}
            <div className="absolute inset-0 z-30 pointer-events-none">
              {textList.map((item) => {
                const isSelected = item.id === selectedTextId;
                return (
                  <div
                    key={item.id}
                    onMouseDown={(e) => handleTextMouseDown(item.id, e)}
                    onTouchStart={(e) => handleTextMouseDown(item.id, e)}
                    onDoubleClick={() => {
                      setEditingTextItem(item);
                      setEditTextValue(item.text);
                    }}
                    style={{
                      left: `${item.x}px`,
                      top: `${item.y}px`,
                      width: `${item.width}px`,
                      minHeight: `${item.height}px`,
                      fontSize: `${item.fontSize}px`,
                      color: item.color,
                      backgroundColor: item.bgColor,
                      textAlign: item.textAlign,
                    }}
                    className={`absolute pointer-events-auto cursor-move p-2 rounded-lg font-nastaliq leading-relaxed transition-shadow ${
                      isSelected
                        ? 'ring-2 ring-emerald-500 ring-offset-2 shadow-2xl bg-white/95'
                        : 'hover:ring-1 hover:ring-stone-400'
                    }`}
                  >
                    <div className="break-words whitespace-pre-wrap select-none pointer-events-none">
                      {item.text}
                    </div>

                    {/* Resizing & Stretch Handles (Active when item is selected) */}
                    {isSelected && (
                      <>
                        {/* Right Stretch Handle (East) */}
                        <div
                          onMouseDown={(e) => handleResizeStart(item.id, 'e', e)}
                          onTouchStart={(e) => handleResizeStart(item.id, 'e', e)}
                          className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-7 bg-emerald-600 border border-white rounded shadow cursor-ew-resize flex items-center justify-center z-40"
                          title="چوڑائی بڑھائیں / سٹریچ کریں"
                        >
                          <div className="w-0.5 h-3 bg-white rounded" />
                        </div>

                        {/* Left Stretch Handle (West) */}
                        <div
                          onMouseDown={(e) => handleResizeStart(item.id, 'w', e)}
                          onTouchStart={(e) => handleResizeStart(item.id, 'w', e)}
                          className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-7 bg-emerald-600 border border-white rounded shadow cursor-ew-resize flex items-center justify-center z-40"
                          title="چوڑائی بڑھائیں / سٹریچ کریں"
                        >
                          <div className="w-0.5 h-3 bg-white rounded" />
                        </div>

                        {/* Bottom Stretch Handle (South) */}
                        <div
                          onMouseDown={(e) => handleResizeStart(item.id, 's', e)}
                          onTouchStart={(e) => handleResizeStart(item.id, 's', e)}
                          className="absolute bottom-[-8px] left-1/2 -translate-x-1/2 w-7 h-4 bg-emerald-600 border border-white rounded shadow cursor-ns-resize flex items-center justify-center z-40"
                          title="لمبائی بڑھائیں"
                        >
                          <div className="w-3 h-0.5 bg-white rounded" />
                        </div>

                        {/* Corner Stretch Handle (Bottom-Right) */}
                        <div
                          onMouseDown={(e) => handleResizeStart(item.id, 'se', e)}
                          onTouchStart={(e) => handleResizeStart(item.id, 'se', e)}
                          className="absolute -right-2.5 -bottom-2.5 w-5 h-5 bg-amber-500 border-2 border-white rounded-full shadow-lg cursor-nwse-resize z-50 flex items-center justify-center"
                          title="دونوں طرف سے سٹریچ کریں"
                        >
                          <div className="w-1.5 h-1.5 bg-white rounded-full" />
                        </div>

                        {/* Corner Stretch Handle (Bottom-Left) */}
                        <div
                          onMouseDown={(e) => handleResizeStart(item.id, 'sw', e)}
                          onTouchStart={(e) => handleResizeStart(item.id, 'sw', e)}
                          className="absolute -left-2.5 -bottom-2.5 w-5 h-5 bg-amber-500 border-2 border-white rounded-full shadow-lg cursor-nesw-resize z-50 flex items-center justify-center"
                          title="دونوں طرف سے سٹریچ کریں"
                        >
                          <div className="w-1.5 h-1.5 bg-white rounded-full" />
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 5. INLINE TEXT EDIT MODAL (When editing text) */}
      {editingTextItem && (
        <div
          onClick={() => setEditingTextItem(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-stone-900 border border-stone-800 rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95"
            dir="rtl"
          >
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <h4 className="font-nastaliq text-xl font-bold text-amber-300">
                تحریر میں ترمیم فرمائیں
              </h4>
              <button
                onClick={() => setEditingTextItem(null)}
                className="p-1 text-stone-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1 font-sans">
                تحریر / سند / عنوان لکھیں:
              </label>
              <textarea
                rows={3}
                value={editTextValue}
                onChange={(e) => setEditTextValue(e.target.value)}
                className="w-full bg-stone-950 border border-stone-700 rounded-2xl p-3 text-sm text-stone-100 font-nastaliq text-lg leading-relaxed focus:outline-none focus:border-amber-400"
                placeholder="تحریر یہاں لکھیں..."
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-800">
              <button
                type="button"
                onClick={() => setEditingTextItem(null)}
                className="px-4 py-2 rounded-xl text-xs text-stone-400 hover:bg-stone-800 font-sans cursor-pointer"
              >
                منسوخ
              </button>
              <button
                type="button"
                onClick={handleSaveEditText}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs font-sans cursor-pointer shadow-lg"
              >
                محفوظ کریں
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-50 bg-stone-900 text-emerald-400 border border-emerald-600 px-4 py-2 rounded-2xl text-xs font-nastaliq shadow-2xl flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
};
