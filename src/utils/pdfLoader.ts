import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.js?url';

// Initialize PDF.js worker
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  } catch {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
  }
}

export interface PdfDocumentSource {
  url?: string;
  data?: ArrayBuffer | Uint8Array;
}

// In-memory cache for loaded documents by URL / ID to avoid re-downloading
const docCache = new Map<string, pdfjsLib.PDFDocumentProxy>();

export function normalizePdfUrl(url: string): string {
  if (!url) return '';
  return url.trim();
}

/**
 * Detect if running inside an installed mobile APK / Capacitor standalone environment
 */
export function isNativeMobileApp(): boolean {
  if (typeof window === 'undefined') return false;
  const win = window as any;
  if (win.Capacitor?.isNativePlatform?.()) return true;
  if (win.Capacitor?.getPlatform?.() === 'android') return true;
  if (window.location.protocol === 'capacitor:' || window.location.protocol === 'file:') return true;
  // In Capacitor Android, the app is loaded from https://localhost with no port
  if (window.location.hostname === 'localhost' && (!window.location.port || window.location.port === '')) {
    return true;
  }
  return false;
}

/**
 * Verify if an ArrayBuffer contains valid PDF magic bytes (%PDF)
 */
export function isValidPdfBuffer(buf: ArrayBuffer | null | undefined): boolean {
  if (!buf || buf.byteLength < 5000) return false;
  const header = new Uint8Array(buf.slice(0, 5));
  // Standard PDF magic header: %PDF- (0x25, 0x50, 0x44, 0x46)
  return header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46;
}

/**
 * Fetch PDF as ArrayBuffer with progress tracking, APK Capacitor detection, and automatic fallbacks
 */
export async function fetchPdfArrayBuffer(url: string, onProgress?: (pct: number) => void): Promise<ArrayBuffer> {
  const cleanUrl = normalizePdfUrl(url);
  if (!cleanUrl) {
    throw new Error('پی ڈی ایف کا لنک دستیاب نہیں ہے۔');
  }

  // If it's a blob URL
  if (cleanUrl.startsWith('blob:') || cleanUrl.startsWith('data:')) {
    const res = await fetch(cleanUrl);
    if (!res.ok) throw new Error(`مقامی فائل نہیں مل سکی (${res.status})`);
    const buf = await res.arrayBuffer();
    if (isValidPdfBuffer(buf)) {
      if (onProgress) onProgress(100);
      return buf;
    }
  }

  const isNative = isNativeMobileApp();

  // Build candidate URLs in priority order
  const candidateUrls: string[] = [];

  if (isNative) {
    // In mobile APK, NEVER query /api/pdf-proxy on localhost because no Node server runs on the phone!
    // 1. Direct Archive URL (CapacitorHttp handles direct requests natively with no CORS)
    if (cleanUrl.startsWith('http')) {
      candidateUrls.push(cleanUrl);
    }
    // 2. High-speed public CORS proxy fallbacks (in case mobile ISP restricts archive.org direct IPs)
    if (cleanUrl.startsWith('http')) {
      candidateUrls.push(`https://corsproxy.io/?url=${encodeURIComponent(cleanUrl)}`);
      candidateUrls.push(`https://api.allorigins.win/raw?url=${encodeURIComponent(cleanUrl)}`);
    }
  } else {
    // In Web browser preview:
    // 1. Express backend proxy (runs alongside Vite)
    if (cleanUrl.startsWith('/api/pdf-proxy')) {
      candidateUrls.push(cleanUrl);
    } else {
      candidateUrls.push(`/api/pdf-proxy?url=${encodeURIComponent(cleanUrl)}`);
    }
    // 2. Direct Archive URL
    if (cleanUrl.startsWith('http')) {
      candidateUrls.push(cleanUrl);
    }
    // 3. Public CORS proxies
    if (cleanUrl.startsWith('http')) {
      candidateUrls.push(`https://corsproxy.io/?url=${encodeURIComponent(cleanUrl)}`);
      candidateUrls.push(`https://api.allorigins.win/raw?url=${encodeURIComponent(cleanUrl)}`);
    }
  }

  let lastError: any = null;

  for (let i = 0; i < candidateUrls.length; i++) {
    const targetUrl = candidateUrls[i];
    try {
      if (onProgress) onProgress(Math.min(15 + i * 15, 60));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000); // 90s timeout for large books

      const response = await fetch(targetUrl, {
        headers: { Accept: 'application/pdf,*/*' },
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (!response.ok) {
        continue;
      }

      // Check if response is HTML error page (e.g. index.html or 404 page) instead of PDF
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/html') || contentType.includes('application/json')) {
        continue;
      }

      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 14 * 1024 * 1024;

      // Stream with live progress
      if (response.body) {
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let received = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value && value.length > 0) {
            chunks.push(value);
            received += value.length;
            if (onProgress && total > 0) {
              const pct = Math.min(99, Math.max(1, Math.round((received / total) * 100)));
              onProgress(pct);
            }
          }
        }

        if (received > 10000) {
          const combined = new Uint8Array(received);
          let offset = 0;
          for (const chunk of chunks) {
            combined.set(chunk, offset);
            offset += chunk.length;
          }
          if (isValidPdfBuffer(combined.buffer)) {
            if (onProgress) onProgress(100);
            return combined.buffer;
          }
        }
      }

      // Direct arrayBuffer fallback on this response
      const buf = await response.arrayBuffer();
      if (isValidPdfBuffer(buf)) {
        if (onProgress) onProgress(100);
        return buf;
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`Attempt ${i + 1} failed for ${targetUrl}:`, err);
    }
  }

  throw new Error(
    lastError?.message?.toLowerCase().includes('abort') || lastError?.message?.toLowerCase().includes('network')
      ? 'انٹرنیٹ کنکشن سست ہونے کی وجہ سے تاخیر ہوئی۔ برائے مہربانی "دوبارہ کوشش فرمائیں" دبائیں۔'
      : 'کتاب لوڈ کرنے میں دشواری پیش آئی۔ برائے مہربانی "دوبارہ کوشش فرمائیں" دبائیں۔'
  );
}

/**
 * Load PDF.js Document from URL, File, or ArrayBuffer
 */
export async function loadPdfDocument(
  source: PdfDocumentSource,
  onProgress?: (pct: number) => void
): Promise<pdfjsLib.PDFDocumentProxy> {
  // If ArrayBuffer is provided directly
  if (source.data) {
    const loadingTask = pdfjsLib.getDocument({
      data: source.data,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
      cMapPacked: true,
    });
    return await loadingTask.promise;
  }

  if (!source.url) {
    throw new Error('پی ڈی ایف کا کوئی لنک یا فائل فراہم نہیں کی گئی۔');
  }

  // Check memory cache
  if (docCache.has(source.url)) {
    if (onProgress) onProgress(100);
    return docCache.get(source.url)!;
  }

  // If local blob URL or data URL
  if (source.url.startsWith('blob:') || source.url.startsWith('data:')) {
    const loadingTask = pdfjsLib.getDocument({
      url: source.url,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
      cMapPacked: true,
    });
    const doc = await loadingTask.promise;
    return doc;
  }

  // Fetch as ArrayBuffer with progress
  const arrayBuffer = await fetchPdfArrayBuffer(source.url, onProgress);

  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer,
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
    cMapPacked: true,
  });

  const doc = await loadingTask.promise;
  docCache.set(source.url, doc);
  return doc;
}

/**
 * Render a specific page of a PDF document to a JPEG data URL
 */
export async function renderPageToDataUrl(
  doc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  targetWidth = 600
): Promise<string> {
  const page = await doc.getPage(pageNumber);
  const unscaledViewport = page.getViewport({ scale: 1 });
  const scale = targetWidth / unscaledViewport.width;
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create canvas context');

  await page.render({
    canvasContext: ctx,
    viewport,
  }).promise;

  return canvas.toDataURL('image/jpeg', 0.92);
}
