import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Type,
  Download,
  Share2,
  Copy,
  RotateCcw,
  Sparkles,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Grid,
  Check,
  Plus,
  Trash2,
  Palette,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  Sliders,
  Move,
  Save,
  Eye,
  EyeOff,
  Sun,
  Moon,
  AlignRight,
  AlignCenter,
  AlignLeft,
  AlignJustify,
  Bold,
  Italic,
  FolderOpen
} from 'lucide-react';
import { VolumeData } from '../types/book';
import { BOOK_VOLUMES_CONTENT, ChapterItem } from '../data/bookContent';
import { DEFAULT_VOLUMES } from '../data/defaultVolumes';

export interface CanvasTextLayer {
  id: string;
  text: string;
  x: number; // percentage (0 to 100)
  y: number; // percentage (0 to 100)
  fontSize: number; // px
  fontFamily: 'nastaliq' | 'amiri' | 'sans' | 'nastaliq-bold';
  color: string;
  gradient?: string;
  strokeWidth: number; // px
  strokeColor: string;
  shadowBlur: number;
  shadowColor: string;
  align: 'right' | 'center' | 'left' | 'justify';
  isBold?: boolean;
  isItalic?: boolean;
  bgColor?: string;
  bgPadding?: number;
  bgRadius?: number;
  rotation: number; // degrees
}

export type AspectRatio = '16:9' | '1:1' | '9:16' | 'a4';
export type CanvasTheme = 'charcoal' | 'emerald' | 'sepia' | 'dark-islamic';

interface PixelLabEditorModalProps {
  volume: VolumeData;
  currentPage: number;
  onClose: () => void;
  onPageChange?: (page: number) => void;
  onVolumeChange?: (volume: VolumeData) => void;
}

const COLOR_PALETTE = [
  { name: 'سنہری زرد', value: '#f59e0b' },
  { name: 'روشن سونا', value: '#fbbf24' },
  { name: 'زمردی سبز', value: '#10b981' },
  { name: 'سفید خالص', value: '#ffffff' },
  { name: 'عنبر نارنجی', value: '#ea580c' },
  { name: 'فیروزی نیلا', value: '#06b6d4' },
  { name: 'یاقوتی سرخ', value: '#f43f5e' },
  { name: 'گہرا سرمئی', value: '#334155' },
  { name: 'سیاہ کوئلہ', value: '#09090b' },
];

const STROKE_COLORS = [
  { name: 'سیاہ آؤٹ لائن', value: '#000000' },
  { name: 'سنہری چمک', value: '#d97706' },
  { name: 'زمردی بارڈر', value: '#064e3b' },
  { name: 'سفید حاشیہ', value: '#ffffff' },
  { name: 'کوئی اسٹروک نہیں', value: 'transparent' },
];

const FONTS_LIST = [
  { id: 'nastaliq', name: 'خط نستعلیق شاہانہ', family: "'Noto Nastaliq Urdu', serif", sample: 'احتساب ناصبیت' },
  { id: 'amiri', name: 'خط قرآنی و عربی', family: "'Amiri', serif", sample: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ' },
  { id: 'sans', name: 'خط نسخ جلی', family: "'Noto Sans Arabic', sans-serif", sample: 'علمی و تحقیقی انسائیکلوپیڈیا' },
  { id: 'nastaliq-bold', name: 'نستعلیق کلاسک بولڈ', family: "'Noto Nastaliq Urdu', serif", isBold: true, sample: 'سندِ صحیح' },
];

export const PixelLabEditorModal: React.FC<PixelLabEditorModalProps> = ({
  volume: initialVolume,
  currentPage: initialPage,
  onClose,
  onPageChange,
  onVolumeChange,
}) => {
  // Current Active Volume & Page
  const [activeVolume, setActiveVolume] = useState<VolumeData>(initialVolume);
  const [currentPage, setCurrentPage] = useState<number>(initialPage || 1);

  // PixelLab Aspect Ratio & Canvas View
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9'); // Default landscape mode ("لیٹس کے موڈ میں چلے جائیں")
  const [canvasTheme, setCanvasTheme] = useState<CanvasTheme>('dark-islamic');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [showLayersPanel, setShowLayersPanel] = useState<boolean>(false);

  // Dual Page Book View Options
  const [showDualPages, setShowDualPages] = useState<boolean>(true); // One side title page, other side target page
  const [titleViewMode, setTitleViewMode] = useState<'cover' | 'page1'>('cover');
  const [showArchivalSeal, setShowArchivalSeal] = useState<boolean>(true);

  // Layers & Text Elements
  const [layers, setLayers] = useState<CanvasTextLayer[]>([
    {
      id: 'header_citation',
      text: `سند و حوالہ — کتاب احتساب ناصبیت (${initialVolume.volumeTitleUrdu}) صفحہ ${initialPage || 1}`,
      x: 50,
      y: 6,
      fontSize: 18,
      fontFamily: 'nastaliq',
      color: '#fbbf24',
      strokeWidth: 2,
      strokeColor: '#000000',
      shadowBlur: 6,
      shadowColor: '#000000',
      align: 'center',
      isBold: true,
      bgColor: '#171411',
      bgPadding: 8,
      bgRadius: 8,
      rotation: 0,
    },
    {
      id: 'quote_stamp',
      text: 'مستند و متفقہ تاریخی حوالہ برائے مناظرہ و تحقیق',
      x: 50,
      y: 93,
      fontSize: 14,
      fontFamily: 'sans',
      color: '#6ee7b7',
      strokeWidth: 0,
      strokeColor: 'transparent',
      shadowBlur: 4,
      shadowColor: '#000000',
      align: 'center',
      bgColor: '#064e3b',
      bgPadding: 6,
      bgRadius: 20,
      rotation: 0,
    }
  ]);

  // Selected Layer
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>('header_citation');
  const [activeBottomTab, setActiveBottomTab] = useState<'text' | 'font' | 'color' | 'size' | 'stroke' | 'shadow' | 'align' | 'bg' | 'layers' | 'book'>('text');

  // Status & Notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Canvas DOM reference
  const canvasStageRef = useRef<HTMLDivElement | null>(null);

  const selectedLayer = layers.find((l) => l.id === selectedLayerId) || null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Content for active volume & page
  const volumeContent = BOOK_VOLUMES_CONTENT[activeVolume.volumeNumber] || BOOK_VOLUMES_CONTENT[1];
  const chapters: ChapterItem[] = volumeContent.chapters || [];
  const foundChapter = [...chapters].reverse().find((c: ChapterItem) => c.page <= currentPage) || chapters[0];
  const totalPages = activeVolume.pageCount > 0 ? activeVolume.pageCount : 560;

  // Sync active volume if prop changes
  useEffect(() => {
    setActiveVolume(initialVolume);
    setCurrentPage(initialPage);
  }, [initialVolume, initialPage]);

  // Update selected layer attributes
  const updateSelectedLayer = (updates: Partial<CanvasTextLayer>) => {
    if (!selectedLayerId) return;
    setLayers((prev) =>
      prev.map((l) => (l.id === selectedLayerId ? { ...l, ...updates } : l))
    );
  };

  // Add new custom text layer
  const handleAddNewText = () => {
    const newId = 'text_' + Date.now();
    const newLayer: CanvasTextLayer = {
      id: newId,
      text: 'یہاں اپنا اردو متن یا تحقیقی حوالہ درج فرمائیں...',
      x: 50,
      y: 50,
      fontSize: 20,
      fontFamily: 'nastaliq',
      color: '#ffffff',
      strokeWidth: 2,
      strokeColor: '#000000',
      shadowBlur: 8,
      shadowColor: '#000000',
      align: 'center',
      bgColor: '#1c1917',
      bgPadding: 10,
      bgRadius: 10,
      rotation: 0,
    };
    setLayers((prev) => [...prev, newLayer]);
    setSelectedLayerId(newId);
    setActiveBottomTab('text');
    showToast('نیا ٹیکسٹ لیئر شامل کر دیا گیا!');
  };

  // Add Bismillah Calligraphy Layer
  const handleAddBismillah = () => {
    const newId = 'bismillah_' + Date.now();
    const newLayer: CanvasTextLayer = {
      id: newId,
      text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
      x: 50,
      y: 12,
      fontSize: 26,
      fontFamily: 'amiri',
      color: '#fbbf24',
      strokeWidth: 1,
      strokeColor: '#78350f',
      shadowBlur: 10,
      shadowColor: '#000000',
      align: 'center',
      isBold: true,
      rotation: 0,
    };
    setLayers((prev) => [...prev, newLayer]);
    setSelectedLayerId(newId);
    showToast('بسم اللہ مبارک شامل ہو گئی!');
  };

  // Insert standard academic citation into active layer
  const handleInsertAcademicCitation = () => {
    const citation = `[سند و حوالہ: کتاب احتساب ناصبیت، جلد ${activeVolume.volumeNumber} (${activeVolume.volumeTitleUrdu})، صفحہ نمبر ${currentPage}]`;
    if (selectedLayer) {
      updateSelectedLayer({ text: `${selectedLayer.text} ${citation}` });
    } else {
      const newId = 'cit_' + Date.now();
      setLayers((prev) => [
        ...prev,
        {
          id: newId,
          text: citation,
          x: 50,
          y: 85,
          fontSize: 15,
          fontFamily: 'nastaliq',
          color: '#fde047',
          strokeWidth: 1,
          strokeColor: '#000000',
          shadowBlur: 4,
          shadowColor: '#000000',
          align: 'center',
          bgColor: '#291b00',
          bgPadding: 6,
          bgRadius: 8,
          rotation: 0,
        }
      ]);
      setSelectedLayerId(newId);
    }
    showToast('سند و حوالہ درج ہو گیا!');
  };

  // Delete layer
  const handleDeleteLayer = (id: string) => {
    setLayers((prev) => prev.filter((l) => l.id !== id));
    if (selectedLayerId === id) {
      setSelectedLayerId(null);
    }
    showToast('لیئر خارج کر دی گئی');
  };

  // Duplicate layer
  const handleDuplicateLayer = (id: string) => {
    const target = layers.find((l) => l.id === id);
    if (!target) return;
    const dup: CanvasTextLayer = {
      ...target,
      id: 'text_' + Date.now(),
      y: Math.min(90, target.y + 6),
      x: Math.min(90, target.x + 3),
    };
    setLayers((prev) => [...prev, dup]);
    setSelectedLayerId(dup.id);
    showToast('لیئر کاپی ہو گئی!');
  };

  // Page Navigation
  const handlePageChange = (newPage: number) => {
    const clamped = Math.min(Math.max(1, newPage), totalPages);
    setCurrentPage(clamped);
    if (onPageChange) {
      onPageChange(clamped);
    }
    // Update citation layer text if it exists
    setLayers((prev) =>
      prev.map((l) =>
        l.id === 'header_citation'
          ? {
              ...l,
              text: `سند و حوالہ — کتاب احتساب ناصبیت (${activeVolume.volumeTitleUrdu}) صفحہ ${clamped}`,
            }
          : l
      )
    );
  };

  // Volume Switcher
  const handleVolumeSelect = (volNum: number) => {
    const found = DEFAULT_VOLUMES.find((v) => v.volumeNumber === volNum);
    if (found) {
      setActiveVolume(found);
      setCurrentPage(1);
      if (onVolumeChange) {
        onVolumeChange(found);
      }
      setLayers((prev) =>
        prev.map((l) =>
          l.id === 'header_citation'
            ? {
                ...l,
                text: `سند و حوالہ — کتاب احتساب ناصبیت (${found.volumeTitleUrdu}) صفحہ 1`,
              }
            : l
        )
      );
      showToast(`${found.volumeTitleUrdu} لوڈ ہو گئی!`);
    }
  };

  // High-Resolution Export Engine (PNG / JPG / Copy / Share)
  const handleExportImage = async (mode: 'download' | 'copy' | 'share' = 'download') => {
    setIsExporting(true);
    showToast('اعلیٰ ریزولوشن سند امیج تیار ہو رہی ہے...');

    try {
      const exportCanvas = document.createElement('canvas');
      const ctx = exportCanvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');

      // Determine dimensions based on Aspect Ratio
      let width = 1920;
      let height = 1080; // 16:9 Landscape default
      if (aspectRatio === '1:1') {
        width = 1600;
        height = 1600;
      } else if (aspectRatio === '9:16') {
        width = 1080;
        height = 1920;
      } else if (aspectRatio === 'a4') {
        width = 1754;
        height = 1240;
      }

      exportCanvas.width = width;
      exportCanvas.height = height;

      // 1. Theme Background
      if (canvasTheme === 'emerald') {
        const bgGrad = ctx.createLinearGradient(0, 0, width, height);
        bgGrad.addColorStop(0, '#042f2e');
        bgGrad.addColorStop(0.5, '#064e3b');
        bgGrad.addColorStop(1, '#022c22');
        ctx.fillStyle = bgGrad;
      } else if (canvasTheme === 'sepia') {
        const bgGrad = ctx.createLinearGradient(0, 0, width, height);
        bgGrad.addColorStop(0, '#2b221a');
        bgGrad.addColorStop(1, '#1b1510');
        ctx.fillStyle = bgGrad;
      } else if (canvasTheme === 'charcoal') {
        ctx.fillStyle = '#0f172a';
      } else {
        // dark-islamic
        const bgGrad = ctx.createLinearGradient(0, 0, width, height);
        bgGrad.addColorStop(0, '#1c1917');
        bgGrad.addColorStop(0.5, '#0c0a09');
        bgGrad.addColorStop(1, '#1c1917');
        ctx.fillStyle = bgGrad;
      }
      ctx.fillRect(0, 0, width, height);

      // Outer Ornate Gold Border
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 5;
      ctx.strokeRect(20, 20, width - 40, height - 40);

      // Inner Delicate Border
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(30, 30, width - 60, height - 60);

      // 2. DUAL-VIEW WORKSPACE: Side 1 (Title Page / Cover) & Side 2 (Target Page)
      if (showDualPages && (aspectRatio === '16:9' || aspectRatio === 'a4')) {
        const sideWidth = (width - 120) / 2;
        const sideHeight = height - 190;
        const contentY = 105;

        // --- SIDE 1: BOOK TITLE PAGE & AUTHENTIC COVER ---
        const leftX = 45;
        ctx.fillStyle = '#141210';
        ctx.fillRect(leftX, contentY, sideWidth, sideHeight);
        ctx.strokeStyle = '#3d2e20';
        ctx.lineWidth = 2;
        ctx.strokeRect(leftX, contentY, sideWidth, sideHeight);

        // Ribbon Badge
        ctx.fillStyle = '#064e3b';
        ctx.fillRect(leftX + 25, contentY + 20, 250, 40);
        ctx.fillStyle = '#6ee7b7';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('کتاب کا ٹائٹل پیج (سندِ ثبوت)', leftX + 150, contentY + 46);

        // Load and draw cover image
        const coverImg = new Image();
        coverImg.crossOrigin = 'anonymous';
        await new Promise<void>((resolve) => {
          coverImg.onload = () => resolve();
          coverImg.onerror = () => resolve();
          coverImg.src = activeVolume.coverImageUrl;
        });

        if (coverImg.naturalWidth) {
          ctx.drawImage(coverImg, leftX + 40, contentY + 80, 290, 420);
          ctx.strokeStyle = '#d97706';
          ctx.lineWidth = 3;
          ctx.strokeRect(leftX + 40, contentY + 80, 290, 420);
        }

        // Metadata Text
        ctx.textAlign = 'right';
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText(`کتاب: احتساب ناصبیت`, leftX + sideWidth - 30, contentY + 120);

        ctx.fillStyle = '#e7e5e4';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText(`جلد نمبر: ${activeVolume.volumeTitleUrdu} (جلد ${activeVolume.volumeNumber})`, leftX + sideWidth - 30, contentY + 165);

        ctx.font = '17px sans-serif';
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText(`موضوع: ${activeVolume.topic.substring(0, 32)}...`, leftX + sideWidth - 30, contentY + 210);
        ctx.fillText(`کل صفحات: ${totalPages} صفحات`, leftX + sideWidth - 30, contentY + 250);
        ctx.fillText(`آرکائیو شناختی کوڈ: ${activeVolume.archiveItemId}`, leftX + sideWidth - 30, contentY + 290);

        // Verification Stamp Box
        if (showArchivalSeal) {
          ctx.fillStyle = '#1c1917';
          ctx.fillRect(leftX + 30, contentY + 530, sideWidth - 60, 200);
          ctx.strokeStyle = '#b45309';
          ctx.lineWidth = 2;
          ctx.strokeRect(leftX + 30, contentY + 530, sideWidth - 60, 200);

          ctx.fillStyle = '#f59e0b';
          ctx.font = 'bold 22px sans-serif';
          ctx.fillText('تصدیق نامہ و سندِ قطعی', leftX + sideWidth - 50, contentY + 575);

          ctx.fillStyle = '#a8a29e';
          ctx.font = '16px sans-serif';
          ctx.fillText('یہ حوالہ احتساب ناصبیت کے مستند علمی ایڈیشن کے اصل سرورق اور متن پر مبنی ہے۔', leftX + sideWidth - 50, contentY + 615);
          ctx.fillText('مناظرے و علمی مباحثے میں بطور مستند حوالہ پیش کرنے کے لیے مکمل سند ہے۔', leftX + sideWidth - 50, contentY + 655);
          ctx.fillText(`تاریخِ تصدیق: ${new Date().toLocaleDateString('ur-PK')}`, leftX + sideWidth - 50, contentY + 695);
        }

        // --- SIDE 2: TARGET CONTENT PAGE ("دوسری طرف وہ ورق جس کا لگانا ہے خود بخود آ جائے") ---
        const rightX = leftX + sideWidth + 30;
        ctx.fillStyle = '#141210';
        ctx.fillRect(rightX, contentY, sideWidth, sideHeight);
        ctx.strokeStyle = '#3d2e20';
        ctx.lineWidth = 2;
        ctx.strokeRect(rightX, contentY, sideWidth, sideHeight);

        // Page Number Ribbon
        ctx.fillStyle = '#78350f';
        ctx.fillRect(rightX + sideWidth - 250, contentY + 20, 220, 40);
        ctx.fillStyle = '#fef3c7';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`اصل صفحہ نمبر: ${currentPage}`, rightX + sideWidth - 140, contentY + 46);

        // Bismillah Header
        ctx.fillStyle = '#d97706';
        ctx.font = 'bold 24px serif';
        ctx.textAlign = 'center';
        ctx.fillText('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', rightX + sideWidth / 2, contentY + 60);

        // Chapter title
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 22px sans-serif';
        ctx.fillText(foundChapter.title, rightX + sideWidth / 2, contentY + 110);

        // Quran / Hadith quote
        if (foundChapter.arabicVerse) {
          ctx.fillStyle = '#fef08a';
          ctx.font = 'italic 19px serif';
          ctx.fillText(`"${foundChapter.arabicVerse}"`, rightX + sideWidth / 2, contentY + 160);
        }

        // Paragraph lines
        ctx.textAlign = 'right';
        ctx.fillStyle = '#f1f5f9';
        ctx.font = '18px sans-serif';
        let textY = contentY + 215;
        const paragraphs = foundChapter.content || [];
        for (let i = 0; i < Math.min(4, paragraphs.length); i++) {
          const line = paragraphs[i].substring(0, 75);
          ctx.fillText(line, rightX + sideWidth - 40, textY);
          textY += 36;
          const line2 = paragraphs[i].substring(75, 150);
          if (line2) {
            ctx.fillText(line2, rightX + sideWidth - 40, textY);
            textY += 36;
          }
        }
      }

      // 3. DRAW ALL CUSTOM USER TEXT LAYERS ON TOP
      for (const layer of layers) {
        ctx.save();
        const posX = (layer.x / 100) * width;
        const posY = (layer.y / 100) * height;

        ctx.translate(posX, posY);
        if (layer.rotation) {
          ctx.rotate((layer.rotation * Math.PI) / 180);
        }

        ctx.font = `${layer.isBold ? 'bold ' : ''}${layer.isItalic ? 'italic ' : ''}${layer.fontSize * 1.5}px ${
          layer.fontFamily === 'nastaliq' || layer.fontFamily === 'nastaliq-bold'
            ? "'Noto Nastaliq Urdu', serif"
            : layer.fontFamily === 'amiri'
            ? "'Amiri', serif"
            : "'Noto Sans Arabic', sans-serif"
        }`;
        ctx.textAlign = layer.align as CanvasTextAlign;
        ctx.textBaseline = 'middle';

        // Background box
        if (layer.bgColor && layer.bgColor !== 'transparent') {
          const metrics = ctx.measureText(layer.text);
          const pad = (layer.bgPadding || 6) * 1.5;
          const bgW = metrics.width + pad * 2;
          const bgH = layer.fontSize * 1.5 + pad * 1.5;
          let boxX = -pad;
          if (layer.align === 'center') boxX = -metrics.width / 2 - pad;
          else if (layer.align === 'left') boxX = -pad;
          else if (layer.align === 'right') boxX = -metrics.width - pad;

          ctx.fillStyle = layer.bgColor;
          ctx.fillRect(boxX, -bgH / 2, bgW, bgH);
          ctx.strokeStyle = '#d97706';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(boxX, -bgH / 2, bgW, bgH);
        }

        // Shadow
        if (layer.shadowBlur > 0) {
          ctx.shadowColor = layer.shadowColor || '#000000';
          ctx.shadowBlur = layer.shadowBlur * 1.5;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;
        }

        // Stroke
        if (layer.strokeWidth > 0 && layer.strokeColor !== 'transparent') {
          ctx.strokeStyle = layer.strokeColor;
          ctx.lineWidth = layer.strokeWidth * 1.5;
          ctx.strokeText(layer.text, 0, 0);
        }

        // Fill Text
        ctx.fillStyle = layer.color;
        ctx.fillText(layer.text, 0, 0);

        ctx.restore();
      }

      // 4. Handle Action (Download / Copy / Share)
      const dataUrl = exportCanvas.toDataURL('image/png', 0.95);

      if (mode === 'download') {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `PixelLab_Ehtesaab_e_nasbiyat_Vol_${activeVolume.volumeNumber}_Page_${currentPage}.png`;
        link.click();
        showToast('تصویر کامیابی سے ڈاؤن لوڈ ہو گئی!');
      } else if (mode === 'copy') {
        exportCanvas.toBlob(async (blob) => {
          if (blob && navigator.clipboard && (window as any).ClipboardItem) {
            try {
              await navigator.clipboard.write([
                new (window as any).ClipboardItem({ 'image/png': blob }),
              ]);
              showToast('تصویر کلپ بورڈ پر کاپی ہو گئی!');
            } catch {
              showToast('براؤزر کلپ بورڈ کاپی کی اجازت نہیں دے رہا۔ ڈاؤن لوڈ کریں۔');
            }
          }
        });
      } else if (mode === 'share') {
        exportCanvas.toBlob(async (blob) => {
          if (blob && typeof navigator.canShare === 'function') {
            try {
              const file = new File([blob], `Ehtesaab_Vol_${activeVolume.volumeNumber}_p${currentPage}.png`, {
                type: 'image/png',
              });
              await navigator.share({
                title: `احتساب ناصبیت - سند جلد ${activeVolume.volumeNumber}`,
                text: `کتاب احتساب ناصبیت سے مستند حوالہ و سند (جلد ${activeVolume.volumeNumber}، صفحہ ${currentPage})`,
                files: [file],
              });
              showToast('شیئر مکمل!');
            } catch {
              showToast('تصویر شیئر نہیں ہو سکی۔ ڈاؤن لوڈ استعمال کریں۔');
            }
          } else {
            showToast('اس براؤزر میں براہ راست شیئر معاون نہیں ہے۔');
          }
        });
      }
    } catch (err) {
      console.error('Export failed', err);
      showToast('تصویر بنانے میں مسئلہ پیش آیا۔');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 bg-[#121316] text-stone-100 flex flex-col font-sans select-none overflow-hidden"
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-60 bg-stone-900 border border-amber-500/80 text-amber-300 px-5 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-4">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* TOP PIXELLAB APP BAR */}
      {/* ======================================================== */}
      <header className="flex-none bg-[#1a1b1f] border-b border-stone-800/80 px-3 sm:px-5 py-2 flex items-center justify-between gap-2 shadow-lg z-30">
        {/* Left: PixelLab Logo & Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            title="ایڈیٹر بند کریں"
            className="p-2 text-stone-400 hover:text-rose-400 hover:bg-stone-800 rounded-xl cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 text-stone-950 font-bold shadow-md">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-nastaliq text-base sm:text-lg font-bold text-amber-300 leading-tight">
                  پکسل لیب — فوٹو و سند ایڈیٹر
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-[10px]">
                  لینڈسکیپ سند ساز
                </span>
              </div>
              <p className="text-[10px] text-stone-400 font-sans">
                {activeVolume.volumeTitleUrdu} (جلد {activeVolume.volumeNumber}) • صفحہ{' '}
                <span className="font-mono text-amber-400 font-bold">{currentPage}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Center: Aspect Ratio & Layout Mode ("لیٹس کے موڈ میں چلے جائیں") */}
        <div className="hidden md:flex items-center gap-1 bg-stone-950/90 rounded-xl p-1 border border-stone-800 text-xs">
          <button
            onClick={() => setAspectRatio('16:9')}
            title="لینڈسکیپ وائیڈ سکرین موڈ (دونوں صفحات آمنے سامنے)"
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 font-sans ${
              aspectRatio === '16:9'
                ? 'bg-amber-600 text-stone-950 font-bold shadow'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>لینڈسکیپ (16:9)</span>
          </button>
          <button
            onClick={() => setAspectRatio('1:1')}
            title="مربع موڈ (انسٹاگرام و واٹس ایپ پوسٹ)"
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer font-sans ${
              aspectRatio === '1:1'
                ? 'bg-amber-600 text-stone-950 font-bold shadow'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            مربع (1:1)
          </button>
          <button
            onClick={() => setAspectRatio('9:16')}
            title="پورٹریٹ موڈ (موبائل سٹوری)"
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer font-sans ${
              aspectRatio === '9:16'
                ? 'bg-amber-600 text-stone-950 font-bold shadow'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            پورٹریٹ (9:16)
          </button>
          <button
            onClick={() => setAspectRatio('a4')}
            title="A4 دستاویز سائز"
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer font-sans ${
              aspectRatio === 'a4'
                ? 'bg-amber-600 text-stone-950 font-bold shadow'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            A4 پرنٹ
          </button>
        </div>

        {/* Right: Studio Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Add Layer (+) Button */}
          <button
            onClick={handleAddNewText}
            title="نیا ٹیکسٹ شامل کریں"
            className="flex items-center gap-1 px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-amber-300 rounded-xl text-xs font-semibold border border-stone-700 cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">نیا ٹیکسٹ</span>
          </button>

          {/* Grid Toggle */}
          <button
            onClick={() => setShowGrid(!showGrid)}
            title={showGrid ? 'گرڈ لائنز چھپائیں' : 'گرڈ لائنز دکھائیں'}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              showGrid
                ? 'bg-amber-600/20 text-amber-300 border-amber-500/50'
                : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
            }`}
          >
            <Grid className="w-4 h-4" />
          </button>

          {/* Layers Panel Toggle */}
          <button
            onClick={() => setShowLayersPanel(!showLayersPanel)}
            title="لیئرز پینل"
            className={`p-2 rounded-xl border transition-colors cursor-pointer relative ${
              showLayersPanel
                ? 'bg-amber-600/20 text-amber-300 border-amber-500/50'
                : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            {layers.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-stone-950 text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {layers.length}
              </span>
            )}
          </button>

          {/* Copy Image Button */}
          <button
            onClick={() => handleExportImage('copy')}
            title="کلپ بورڈ پر کاپی کریں"
            className="hidden sm:flex p-2 bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-amber-300 rounded-xl border border-stone-800 cursor-pointer"
          >
            <Copy className="w-4 h-4" />
          </button>

          {/* Share Button */}
          <button
            onClick={() => handleExportImage('share')}
            title="تصویر شیئر کریں"
            className="hidden sm:flex p-2 bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-amber-300 rounded-xl border border-stone-800 cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Main Save / Download Button */}
          <button
            onClick={() => handleExportImage('download')}
            disabled={isExporting}
            title="سند و امیج ڈاؤن لوڈ کریں"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-950/40 cursor-pointer transition-all disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">تصویر محفوظ کریں</span>
          </button>
        </div>
      </header>

      {/* ======================================================== */}
      {/* SECONDARY TOOLBAR: Volume, Page Jumper, Dual View Toggle */}
      {/* ======================================================== */}
      <div className="flex-none bg-[#16171b] border-b border-stone-800/60 px-3 sm:px-5 py-1.5 flex items-center justify-between gap-3 text-xs overflow-x-auto">
        {/* Volume Selector */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-stone-400 font-sans flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>جلد:</span>
          </span>
          <select
            value={activeVolume.volumeNumber}
            onChange={(e) => handleVolumeSelect(Number(e.target.value))}
            className="bg-stone-900 border border-stone-700 text-amber-300 font-nastaliq rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            {DEFAULT_VOLUMES.map((v) => (
              <option key={v.volumeNumber} value={v.volumeNumber}>
                جلد {v.volumeNumber}: {v.volumeTitleUrdu}
              </option>
            ))}
          </select>
        </div>

        {/* Page Switcher */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            title="پچھلا صفحہ"
            className="p-1 rounded bg-stone-900 border border-stone-800 text-stone-300 hover:text-amber-400 disabled:opacity-30 cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <span className="text-stone-400 font-sans">صفحہ:</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={currentPage}
            onChange={(e) => handlePageChange(Number(e.target.value))}
            className="w-14 bg-stone-900 border border-stone-700 rounded px-1.5 py-0.5 text-center text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-500"
          />
          <span className="text-stone-500 font-mono">/ {totalPages}</span>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            title="اگلا صفحہ"
            className="p-1 rounded bg-stone-900 border border-stone-800 text-stone-300 hover:text-amber-400 disabled:opacity-30 cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick Presets: Title View & Seal */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setTitleViewMode(titleViewMode === 'cover' ? 'page1' : 'cover')}
            className={`px-2 py-1 rounded-lg border text-[11px] font-sans transition-colors cursor-pointer ${
              titleViewMode === 'cover'
                ? 'bg-amber-950/40 text-amber-300 border-amber-600/40'
                : 'bg-stone-900 text-stone-400 border-stone-800'
            }`}
          >
            {titleViewMode === 'cover' ? 'سرورق (Cover)' : 'مقدمہ (Page 1)'}
          </button>

          <button
            onClick={() => setShowArchivalSeal(!showArchivalSeal)}
            className={`px-2 py-1 rounded-lg border text-[11px] font-sans transition-colors cursor-pointer ${
              showArchivalSeal
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-600/40'
                : 'bg-stone-900 text-stone-400 border-stone-800'
            }`}
          >
            {showArchivalSeal ? '✓ مہرِ تصدیق' : '+ مہر لگائیں'}
          </button>

          {/* Canvas Theme Selector */}
          <div className="flex items-center gap-1 bg-stone-950 rounded-lg p-0.5 border border-stone-800">
            <button
              onClick={() => setCanvasTheme('dark-islamic')}
              title="تاریک اسلامی تھیم"
              className={`w-4 h-4 rounded-full bg-[#1c1917] border ${
                canvasTheme === 'dark-islamic' ? 'border-amber-400 scale-110' : 'border-stone-700'
              }`}
            />
            <button
              onClick={() => setCanvasTheme('emerald')}
              title="شاہانہ زمردی تھیم"
              className={`w-4 h-4 rounded-full bg-[#064e3b] border ${
                canvasTheme === 'emerald' ? 'border-emerald-400 scale-110' : 'border-stone-700'
              }`}
            />
            <button
              onClick={() => setCanvasTheme('sepia')}
              title="قدیم سیپیا کاغذ تھیم"
              className={`w-4 h-4 rounded-full bg-[#3d2e20] border ${
                canvasTheme === 'sepia' ? 'border-amber-400 scale-110' : 'border-stone-700'
              }`}
            />
            <button
              onClick={() => setCanvasTheme('charcoal')}
              title="کوئلہ سلیٹ تھیم"
              className={`w-4 h-4 rounded-full bg-[#0f172a] border ${
                canvasTheme === 'charcoal' ? 'border-sky-400 scale-110' : 'border-stone-700'
              }`}
            />
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MAIN PIXELLAB CANVAS DESK (CENTER STAGE) */}
      {/* ======================================================== */}
      <div className="flex-1 overflow-auto p-3 sm:p-6 flex items-center justify-center bg-[#0d0e11] relative">
        {/* Background Grid Pattern (PixelLab Style) */}
        {showGrid && (
          <div
            className="absolute inset-0 pointer-events-none opacity-25"
            style={{
              backgroundImage: 'linear-gradient(to right, #334155 1px, transparent 1px), linear-gradient(to bottom, #334155 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          />
        )}

        {/* The Responsive Canvas Wrapper */}
        <div
          ref={canvasStageRef}
          className={`relative shadow-[0_20px_50px_rgba(0,0,0,0.8)] border-2 border-amber-500/40 rounded-2xl overflow-hidden transition-all duration-300 ${
            aspectRatio === '16:9'
              ? 'w-full max-w-[1100px] aspect-[16/9]'
              : aspectRatio === '1:1'
              ? 'w-full max-w-[700px] aspect-square'
              : aspectRatio === '9:16'
              ? 'h-full max-h-[82vh] aspect-[9/16]'
              : 'w-full max-w-[1050px] aspect-[1.414/1]' // A4 landscape
          } ${
            canvasTheme === 'emerald'
              ? 'bg-gradient-to-br from-[#042f2e] via-[#064e3b] to-[#022c22]'
              : canvasTheme === 'sepia'
              ? 'bg-gradient-to-br from-[#2b221a] to-[#1b1510]'
              : canvasTheme === 'charcoal'
              ? 'bg-[#0f172a]'
              : 'bg-gradient-to-br from-[#1c1917] via-[#0c0a09] to-[#1c1917]'
          }`}
          onClick={(e) => {
            if (e.target === canvasStageRef.current) {
              setSelectedLayerId(null);
            }
          }}
        >
          {/* Ornate Gold Border Inner */}
          <div className="absolute inset-1.5 border border-amber-600/30 rounded-xl pointer-events-none z-10" />

          {/* DUAL-VIEW WORKSPACE CONTENT:
              Side 1: Book Title Page / Cover (کتاب کا پہلا ورقہ / سرورق)
              Side 2: Target Book Page (مطلوبہ ورقہ) */}
          {showDualPages && (aspectRatio === '16:9' || aspectRatio === 'a4') ? (
            <div className="absolute inset-3 sm:inset-5 grid grid-cols-2 gap-3 sm:gap-5 z-10 pointer-events-none">
              {/* PANE 1: BOOK TITLE PAGE / COVER (سند و ثبوت) */}
              <div className="bg-stone-950/80 border border-amber-900/40 rounded-xl p-3 sm:p-4 shadow-xl flex flex-col justify-between backdrop-blur-sm pointer-events-auto overflow-hidden">
                <div>
                  {/* Title page badge */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-800">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold">
                      کتاب کا ٹائٹل پیج (سندِ ثبوت)
                    </span>
                    <span className="text-[10px] text-stone-400 font-sans">
                      جلد {activeVolume.volumeNumber}
                    </span>
                  </div>

                  {/* Cover Image & Metadata Card */}
                  {titleViewMode === 'cover' ? (
                    <div className="flex items-center gap-3 bg-stone-900/60 p-2.5 rounded-xl border border-stone-800/80">
                      <div className="relative w-24 sm:w-28 h-34 sm:h-40 flex-none rounded-lg overflow-hidden shadow-xl border border-amber-500/50 bg-stone-950">
                        <img
                          src={activeVolume.coverImageUrl}
                          alt={activeVolume.volumeTitleUrdu}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 space-y-1 text-right">
                        <span className="text-[10px] text-amber-400/90 font-sans block">کتاب کا مکمل نام:</span>
                        <h3 className="font-nastaliq text-lg font-bold text-amber-300 leading-tight">
                          احتساب ناصبیت
                        </h3>
                        <p className="text-xs text-emerald-300 font-sans font-semibold">
                          {activeVolume.volumeTitleUrdu} (جلد {activeVolume.volumeNumber})
                        </p>
                        <p className="text-[10px] text-stone-300 line-clamp-2 font-sans">
                          {activeVolume.topic}
                        </p>
                        <div className="pt-1 flex items-center justify-between text-[10px] text-stone-400 font-sans">
                          <span>کل صفحات: <strong className="text-amber-400">{totalPages}</strong></span>
                          <span>آرکائیو: <code className="text-stone-300">{activeVolume.archiveItemId}</code></span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-stone-900/60 p-3 rounded-xl border border-stone-800 font-nastaliq text-stone-200 text-xs leading-relaxed max-h-40 overflow-hidden">
                      <p className="text-amber-400 font-arabic text-center mb-1">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
                      <h4 className="text-amber-300 font-bold text-center mb-1">مقدمہ جلد {activeVolume.volumeNumber}</h4>
                      <p className="text-justify indent-2 text-stone-300">
                        {volumeContent.foreword || 'الحمد لله رب العالمين والصلاة والسلام على رسوله الكريم۔ زیر نظر جلد ناصبیت کے تحقیقی جائزے پر مشتمل ہے۔'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Archival Verification Seal Box */}
                {showArchivalSeal && (
                  <div className="mt-2 p-2 rounded-xl bg-amber-950/30 border border-amber-600/40 flex items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <span className="text-[11px] font-bold text-amber-300 block">
                        مہرِ تصدیق و سندِ قطعی — احتساب ناصبیت
                      </span>
                      <p className="text-[9.5px] text-stone-300 leading-tight">
                        مستند ایڈیشن کے سرورق اور اصل متن پر مبنی حوالہ۔
                      </p>
                    </div>
                    <div className="w-9 h-9 rounded-full border border-amber-400/80 bg-stone-900 flex items-center justify-center text-amber-400 shrink-0 font-nastaliq text-[10px]">
                      مہر
                    </div>
                  </div>
                )}
              </div>

              {/* PANE 2: TARGET PAGE CONTENT (دوسری طرف وہ ورق جس کا لگانا ہے وہ خود بخود آ جائے) */}
              <div className="bg-stone-950/80 border border-amber-900/40 rounded-xl p-3 sm:p-4 shadow-xl flex flex-col justify-between backdrop-blur-sm pointer-events-auto overflow-hidden">
                <div>
                  {/* Page Badge & Navigation Jump */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-800">
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-950/90 border border-amber-500/40 text-amber-300 text-[11px] font-bold">
                      مطلوبہ اصل ورقہ: صفحہ {currentPage}
                    </span>
                    <span className="text-[10px] text-stone-400 font-sans">
                      (خودکار متن حوالہ)
                    </span>
                  </div>

                  {/* Page Text Area */}
                  <div className="space-y-2 bg-stone-900/50 p-3 rounded-xl border border-stone-800/80">
                    <div className="text-center font-arabic text-amber-400/90 text-xs">
                      بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                    </div>

                    <h4 className="font-nastaliq text-base font-bold text-amber-300 text-center leading-snug">
                      {foundChapter.title}
                    </h4>

                    {foundChapter.arabicVerse && (
                      <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-600/30 text-center">
                        <p className="font-arabic text-sm text-amber-200 font-bold">
                          "{foundChapter.arabicVerse}"
                        </p>
                      </div>
                    )}

                    <div className="font-nastaliq text-stone-200 text-xs leading-relaxed space-y-1 max-h-36 overflow-hidden">
                      {foundChapter.content.slice(0, 2).map((p, idx) => (
                        <p key={idx} className="indent-3 text-justify line-clamp-3">
                          {p}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-stone-800/80 flex items-center justify-between text-[10px] text-stone-400 font-sans">
                  <span>جلد {activeVolume.volumeNumber} • صفحہ {currentPage}</span>
                  <span className="text-emerald-400">سندِ کتاب مع اصل ورقہ</span>
                </div>
              </div>
            </div>
          ) : (
            /* Single Page View for 1:1 or 9:16 aspect ratios */
            <div className="absolute inset-4 z-10 pointer-events-none flex flex-col justify-between">
              <div className="bg-stone-950/80 p-4 rounded-xl border border-amber-900/40 space-y-2 text-center pointer-events-auto">
                <span className="px-3 py-1 rounded-full bg-amber-950 text-amber-300 text-xs font-bold border border-amber-500/40">
                  {activeVolume.volumeTitleUrdu} — صفحہ {currentPage}
                </span>
                <h3 className="font-nastaliq text-xl text-amber-300 font-bold">{foundChapter.title}</h3>
                {foundChapter.arabicVerse && (
                  <p className="font-arabic text-base text-amber-200">"{foundChapter.arabicVerse}"</p>
                )}
                <p className="font-nastaliq text-stone-200 text-xs leading-relaxed line-clamp-4">
                  {foundChapter.content[0]}
                </p>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* INTERACTIVE DRAGGABLE TEXT LAYERS ON CANVAS */}
          {/* ======================================================== */}
          {layers.map((layer) => {
            const isSelected = layer.id === selectedLayerId;
            return (
              <div
                key={layer.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedLayerId(layer.id);
                  setActiveBottomTab('text');
                }}
                style={{
                  left: `${layer.x}%`,
                  top: `${layer.y}%`,
                  transform: `translate(-50%, -50%) rotate(${layer.rotation || 0}deg)`,
                  fontSize: `${layer.fontSize}px`,
                  fontFamily:
                    layer.fontFamily === 'nastaliq' || layer.fontFamily === 'nastaliq-bold'
                      ? "'Noto Nastaliq Urdu', serif"
                      : layer.fontFamily === 'amiri'
                      ? "'Amiri', serif"
                      : "'Noto Sans Arabic', sans-serif",
                  color: layer.color,
                  textAlign: layer.align,
                  backgroundColor: layer.bgColor || 'transparent',
                  padding: layer.bgColor ? `${layer.bgPadding || 6}px` : 0,
                  borderRadius: `${layer.bgRadius || 6}px`,
                  WebkitTextStroke:
                    layer.strokeWidth > 0 && layer.strokeColor !== 'transparent'
                      ? `${layer.strokeWidth}px ${layer.strokeColor}`
                      : undefined,
                  textShadow:
                    layer.shadowBlur > 0
                      ? `0 0 ${layer.shadowBlur}px ${layer.shadowColor || '#000000'}`
                      : undefined,
                  fontWeight: layer.isBold ? 'bold' : 'normal',
                  fontStyle: layer.isItalic ? 'italic' : 'normal',
                }}
                className={`absolute z-20 cursor-pointer select-none transition-shadow ${
                  isSelected
                    ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-stone-900 shadow-2xl'
                    : 'hover:ring-1 hover:ring-amber-400/50'
                }`}
              >
                {layer.text}

                {/* PixelLab Selection Bounding Box Handles */}
                {isSelected && (
                  <div className="absolute -inset-1 border border-dashed border-amber-400 pointer-events-none rounded">
                    <span className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-amber-400 rounded-full" />
                    <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-amber-400 rounded-full" />
                    <span className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-amber-400 rounded-full" />
                    <span className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-amber-400 rounded-full" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* LAYERS DRAWER PANEL (POPUP FROM RIGHT / TOP) */}
      {/* ======================================================== */}
      {showLayersPanel && (
        <div className="fixed top-24 right-4 z-40 w-72 bg-stone-900/95 border border-stone-700 rounded-2xl shadow-2xl p-3 backdrop-blur-md space-y-2 animate-in fade-in slide-in-from-right-4">
          <div className="flex items-center justify-between pb-2 border-b border-stone-800">
            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>لیئرز کی فہرست ({layers.length})</span>
            </span>
            <button
              onClick={() => setShowLayersPanel(false)}
              className="p-1 text-stone-400 hover:text-white rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
            {layers.map((layer, idx) => (
              <div
                key={layer.id}
                onClick={() => setSelectedLayerId(layer.id)}
                className={`p-2 rounded-xl text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                  layer.id === selectedLayerId
                    ? 'bg-amber-950/60 border border-amber-500/50 text-amber-200'
                    : 'bg-stone-950 border border-stone-800 text-stone-300 hover:bg-stone-800'
                }`}
              >
                <div className="flex-1 truncate font-nastaliq text-[11px]">
                  {layer.text}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicateLayer(layer.id);
                    }}
                    title="ڈپلیکیٹ کریں"
                    className="p-1 text-stone-400 hover:text-amber-400"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteLayer(layer.id);
                    }}
                    title="حذف کریں"
                    className="p-1 text-stone-400 hover:text-rose-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleAddNewText}
            className="w-full py-1.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>نیا ٹیکسٹ لیئر جوڑیں</span>
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* BOTTOM PIXELLAB DOCK:
          "اور ساتھ ٹیکسٹ ایڈیٹر ہو اس کو سلیکٹ کریں تو نیچے ٹیکسٹ لکھا آئے"
      {/* ======================================================== */}
      <footer className="flex-none bg-[#18191c] border-t border-stone-800 shadow-[0_-10px_30px_rgba(0,0,0,0.6)] z-30">
        {selectedLayer ? (
          /* ====================================================== */
          /* CASE A: TEXT LAYER SELECTED -> RICH LIVE TEXT EDITOR   */
          /* ====================================================== */
          <div className="p-2 sm:p-3 space-y-2 max-w-5xl mx-auto">
            {/* Top Text Input Field (Live Typing: "نیچے ٹیکسٹ لکھا آئے") */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={selectedLayer.text}
                  onChange={(e) => updateSelectedLayer({ text: e.target.value })}
                  placeholder="یہاں منتخب ٹیکسٹ میں تبدیلی فرمائیں..."
                  className="w-full bg-stone-900 border border-amber-500/60 rounded-xl px-3 py-1.5 text-xs sm:text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-amber-400 font-nastaliq"
                />
              </div>

              {/* Quick Citation Helper */}
              <button
                onClick={handleInsertAcademicCitation}
                title="خودکار سند و حوالہ کا فقرہ شامل کریں"
                className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-amber-300 rounded-xl text-xs font-semibold border border-stone-700 cursor-pointer shrink-0 transition-colors"
              >
                + سند کا حوالہ
              </button>

              {/* Delete Layer */}
              <button
                onClick={() => handleDeleteLayer(selectedLayer.id)}
                title="منتخب ٹیکسٹ خارج کریں"
                className="p-2 bg-stone-900 hover:bg-rose-950 text-stone-400 hover:text-rose-400 rounded-xl border border-stone-800 cursor-pointer shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* PixelLab Tab Navigation */}
            <div className="flex items-center justify-between gap-1 overflow-x-auto py-1 border-t border-stone-800/80">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setActiveBottomTab('font')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-sans transition-all cursor-pointer flex items-center gap-1 ${
                    activeBottomTab === 'font'
                      ? 'bg-amber-600 text-stone-950 font-bold shadow'
                      : 'text-stone-300 hover:bg-stone-800'
                  }`}
                >
                  <Type className="w-3.5 h-3.5" />
                  <span>فانٹ</span>
                </button>

                <button
                  onClick={() => setActiveBottomTab('color')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-sans transition-all cursor-pointer flex items-center gap-1 ${
                    activeBottomTab === 'color'
                      ? 'bg-amber-600 text-stone-950 font-bold shadow'
                      : 'text-stone-300 hover:bg-stone-800'
                  }`}
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span>رنگ</span>
                </button>

                <button
                  onClick={() => setActiveBottomTab('size')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-sans transition-all cursor-pointer flex items-center gap-1 ${
                    activeBottomTab === 'size'
                      ? 'bg-amber-600 text-stone-950 font-bold shadow'
                      : 'text-stone-300 hover:bg-stone-800'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>سائز</span>
                </button>

                <button
                  onClick={() => setActiveBottomTab('stroke')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-sans transition-all cursor-pointer flex items-center gap-1 ${
                    activeBottomTab === 'stroke'
                      ? 'bg-amber-600 text-stone-950 font-bold shadow'
                      : 'text-stone-300 hover:bg-stone-800'
                  }`}
                >
                  <span>اسٹروک</span>
                </button>

                <button
                  onClick={() => setActiveBottomTab('shadow')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-sans transition-all cursor-pointer flex items-center gap-1 ${
                    activeBottomTab === 'shadow'
                      ? 'bg-amber-600 text-stone-950 font-bold shadow'
                      : 'text-stone-300 hover:bg-stone-800'
                  }`}
                >
                  <span>سایہ</span>
                </button>

                <button
                  onClick={() => setActiveBottomTab('align')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-sans transition-all cursor-pointer flex items-center gap-1 ${
                    activeBottomTab === 'align'
                      ? 'bg-amber-600 text-stone-950 font-bold shadow'
                      : 'text-stone-300 hover:bg-stone-800'
                  }`}
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                  <span>ترتیب</span>
                </button>

                <button
                  onClick={() => setActiveBottomTab('bg')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-sans transition-all cursor-pointer flex items-center gap-1 ${
                    activeBottomTab === 'bg'
                      ? 'bg-amber-600 text-stone-950 font-bold shadow'
                      : 'text-stone-300 hover:bg-stone-800'
                  }`}
                >
                  <span>پس منظر</span>
                </button>
              </div>

              {/* Duplicate & Rotate Controls */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleDuplicateLayer(selectedLayer.id)}
                  title="کاپی کریں"
                  className="p-1.5 text-stone-400 hover:text-amber-400 bg-stone-900 border border-stone-800 rounded-lg cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>

                {/* Layer Position Nudge */}
                <button
                  onClick={() => updateSelectedLayer({ y: Math.max(5, selectedLayer.y - 2) })}
                  title="اوپر کریں"
                  className="px-1.5 py-1 text-stone-400 hover:text-white bg-stone-900 border border-stone-800 rounded text-[10px]"
                >
                  ▲
                </button>
                <button
                  onClick={() => updateSelectedLayer({ y: Math.min(95, selectedLayer.y + 2) })}
                  title="نیچے کریں"
                  className="px-1.5 py-1 text-stone-400 hover:text-white bg-stone-900 border border-stone-800 rounded text-[10px]"
                >
                  ▼
                </button>
              </div>
            </div>

            {/* Active Tab Panel Content */}
            <div className="bg-stone-950/90 p-2 sm:p-2.5 rounded-xl border border-stone-800">
              {/* TAB 1: FONTS */}
              {activeBottomTab === 'font' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {FONTS_LIST.map((f) => (
                    <button
                      key={f.id}
                      onClick={() =>
                        updateSelectedLayer({
                          fontFamily: f.id as any,
                          isBold: !!f.isBold,
                        })
                      }
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                        selectedLayer.fontFamily === f.id
                          ? 'bg-amber-950/60 border-amber-500 text-amber-300 shadow-sm'
                          : 'bg-stone-900 border-stone-800 text-stone-300 hover:bg-stone-800'
                      }`}
                    >
                      <div className="text-xs font-sans font-bold mb-0.5">{f.name}</div>
                      <div className="text-sm text-stone-200" style={{ fontFamily: f.family }}>
                        {f.sample}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* TAB 2: COLOR */}
              {activeBottomTab === 'color' && (
                <div className="flex items-center gap-2 overflow-x-auto py-1">
                  <span className="text-xs text-stone-400 font-sans shrink-0">رنگ منتخب کریں:</span>
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => updateSelectedLayer({ color: c.value })}
                      title={c.name}
                      className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer shrink-0 ${
                        selectedLayer.color === c.value
                          ? 'border-white scale-125 shadow-lg'
                          : 'border-stone-700 hover:scale-110'
                      }`}
                      style={{ backgroundColor: c.value }}
                    />
                  ))}
                </div>
              )}

              {/* TAB 3: SIZE */}
              {activeBottomTab === 'size' && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-stone-400 font-sans shrink-0">
                    فونٹ سائز: <strong className="text-amber-400">{selectedLayer.fontSize}px</strong>
                  </span>
                  <button
                    onClick={() => updateSelectedLayer({ fontSize: Math.max(10, selectedLayer.fontSize - 2) })}
                    className="w-6 h-6 rounded bg-stone-900 border border-stone-700 text-xs font-bold text-stone-200 flex items-center justify-center cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="range"
                    min={10}
                    max={64}
                    value={selectedLayer.fontSize}
                    onChange={(e) => updateSelectedLayer({ fontSize: Number(e.target.value) })}
                    className="flex-1 accent-amber-500 cursor-pointer"
                  />
                  <button
                    onClick={() => updateSelectedLayer({ fontSize: Math.min(64, selectedLayer.fontSize + 2) })}
                    className="w-6 h-6 rounded bg-stone-900 border border-stone-700 text-xs font-bold text-stone-200 flex items-center justify-center cursor-pointer"
                  >
                    +
                  </button>
                </div>
              )}

              {/* TAB 4: STROKE */}
              {activeBottomTab === 'stroke' && (
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <span className="text-xs text-stone-400 font-sans shrink-0">
                      اسٹروک چوڑائی: <strong className="text-amber-400">{selectedLayer.strokeWidth}px</strong>
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={10}
                      value={selectedLayer.strokeWidth}
                      onChange={(e) => updateSelectedLayer({ strokeWidth: Number(e.target.value) })}
                      className="flex-1 accent-amber-500 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs text-stone-400 font-sans">اسٹروک رنگ:</span>
                    {STROKE_COLORS.map((sc) => (
                      <button
                        key={sc.value}
                        onClick={() => updateSelectedLayer({ strokeColor: sc.value })}
                        title={sc.name}
                        className={`w-6 h-6 rounded-full border transition-transform cursor-pointer ${
                          selectedLayer.strokeColor === sc.value
                            ? 'border-amber-400 scale-125'
                            : 'border-stone-700'
                        }`}
                        style={{ backgroundColor: sc.value }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 5: SHADOW */}
              {activeBottomTab === 'shadow' && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-stone-400 font-sans shrink-0">
                    سایہ و چمک (Shadow Glow): <strong className="text-amber-400">{selectedLayer.shadowBlur}px</strong>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={20}
                    value={selectedLayer.shadowBlur}
                    onChange={(e) => updateSelectedLayer({ shadowBlur: Number(e.target.value) })}
                    className="flex-1 accent-amber-500 cursor-pointer"
                  />
                  <button
                    onClick={() => updateSelectedLayer({ shadowBlur: selectedLayer.shadowBlur > 0 ? 0 : 8 })}
                    className="px-2 py-1 rounded bg-stone-900 border border-stone-800 text-[10px] text-stone-300 font-sans cursor-pointer"
                  >
                    {selectedLayer.shadowBlur > 0 ? 'سایہ بند کریں' : 'سایہ لگائیں'}
                  </button>
                </div>
              )}

              {/* TAB 6: ALIGNMENT */}
              {activeBottomTab === 'align' && (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-stone-400 font-sans mr-2">الائنمنٹ:</span>
                    <button
                      onClick={() => updateSelectedLayer({ align: 'right' })}
                      className={`p-1.5 rounded-lg border cursor-pointer ${
                        selectedLayer.align === 'right'
                          ? 'bg-amber-600 text-stone-950 font-bold border-amber-400'
                          : 'bg-stone-900 text-stone-300 border-stone-800'
                      }`}
                    >
                      <AlignRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => updateSelectedLayer({ align: 'center' })}
                      className={`p-1.5 rounded-lg border cursor-pointer ${
                        selectedLayer.align === 'center'
                          ? 'bg-amber-600 text-stone-950 font-bold border-amber-400'
                          : 'bg-stone-900 text-stone-300 border-stone-800'
                      }`}
                    >
                      <AlignCenter className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => updateSelectedLayer({ align: 'left' })}
                      className={`p-1.5 rounded-lg border cursor-pointer ${
                        selectedLayer.align === 'left'
                          ? 'bg-amber-600 text-stone-950 font-bold border-amber-400'
                          : 'bg-stone-900 text-stone-300 border-stone-800'
                      }`}
                    >
                      <AlignLeft className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Rotation Angle */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-stone-400 font-sans">گھماؤ (Rotate):</span>
                    <input
                      type="range"
                      min={-45}
                      max={45}
                      value={selectedLayer.rotation || 0}
                      onChange={(e) => updateSelectedLayer({ rotation: Number(e.target.value) })}
                      className="w-24 accent-amber-500 cursor-pointer"
                    />
                    <span className="text-xs font-mono text-amber-300 w-8">{selectedLayer.rotation || 0}°</span>
                  </div>
                </div>
              )}

              {/* TAB 7: BACKGROUND BOX */}
              {activeBottomTab === 'bg' && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-stone-400 font-sans shrink-0">پس منظر باکس:</span>
                  <button
                    onClick={() => updateSelectedLayer({ bgColor: '#1c1917', bgPadding: 8, bgRadius: 8 })}
                    className="px-2 py-1 rounded bg-stone-900 border border-stone-700 text-xs text-amber-300 font-sans cursor-pointer"
                  >
                    سیاہ باکس
                  </button>
                  <button
                    onClick={() => updateSelectedLayer({ bgColor: '#064e3b', bgPadding: 8, bgRadius: 8 })}
                    className="px-2 py-1 rounded bg-emerald-950 border border-emerald-600 text-xs text-emerald-300 font-sans cursor-pointer"
                  >
                    زمردی باکس
                  </button>
                  <button
                    onClick={() => updateSelectedLayer({ bgColor: '#451a03', bgPadding: 8, bgRadius: 8 })}
                    className="px-2 py-1 rounded bg-amber-950 border border-amber-600 text-xs text-amber-300 font-sans cursor-pointer"
                  >
                    سنہری باکس
                  </button>
                  <button
                    onClick={() => updateSelectedLayer({ bgColor: undefined })}
                    className="px-2 py-1 rounded bg-stone-900 border border-stone-800 text-xs text-rose-300 font-sans cursor-pointer"
                  >
                    باکس ہٹائیں
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ====================================================== */
          /* CASE B: NO TEXT LAYER SELECTED -> CANVAS STUDIO CONTROLS */
          /* ====================================================== */
          <div className="p-3 max-w-5xl mx-auto flex items-center justify-between gap-3 flex-wrap text-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={handleAddNewText}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-xl shadow cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>+ نیا ٹیکسٹ شامل کریں</span>
              </button>

              <button
                onClick={handleAddBismillah}
                className="flex items-center gap-1 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-amber-300 rounded-xl border border-stone-800 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>بسم اللہ جوڑیں</span>
              </button>

              <button
                onClick={handleInsertAcademicCitation}
                className="flex items-center gap-1 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-emerald-300 rounded-xl border border-stone-800 cursor-pointer"
              >
                <span>+ سند کا فقرہ</span>
              </button>
            </div>

            <div className="text-stone-400 text-[11px] font-sans">
              کینوس پر موجود کسی بھی ٹیکسٹ پر کلک کریں تاکہ وہ نیچے ایڈیٹر میں آ جائے۔
            </div>
          </div>
        )}
      </footer>
    </div>
  );
};
