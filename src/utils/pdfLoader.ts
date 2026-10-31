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
 * Fetch PDF as ArrayBuffer with progress tracking, Range-based reconnection, and automatic reliable fallbacks
 */
export async function fetchPdfArrayBuffer(url: string, onProgress?: (pct: number) => void): Promise<ArrayBuffer> {
  const cleanUrl = normalizePdfUrl(url);

  // If it's a relative local URL or blob
  if (cleanUrl.startsWith('/') || cleanUrl.startsWith('./') || cleanUrl.startsWith('blob:')) {
    const res = await fetch(cleanUrl);
    if (!res.ok) throw new Error(`مقامی فائل نہیں مل سکی (${res.status})`);
    if (onProgress) onProgress(100);
    return await res.arrayBuffer();
  }

  const proxyUrl = cleanUrl.startsWith('/api/pdf-proxy')
    ? cleanUrl
    : `/api/pdf-proxy?url=${encodeURIComponent(cleanUrl)}`;

  // 1. Primary Attempt: Stream with live progress
  try {
    const response = await fetch(proxyUrl, {
      headers: { Accept: 'application/pdf,*/*' },
    });

    if (!response.ok) {
      throw new Error(`سرور جواب: ${response.status} (${response.statusText})`);
    }

    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 14 * 1024 * 1024;

    if (!response.body) {
      const buf = await response.arrayBuffer();
      if (onProgress) onProgress(100);
      return buf;
    }

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
      if (onProgress) onProgress(100);
      return combined.buffer;
    }
  } catch (streamErr: any) {
    console.warn('Streaming fetch failed or stalled, trying direct buffer:', streamErr);
  }

  // 2. Direct ArrayBuffer Fallback
  try {
    if (onProgress) onProgress(75);
    const directRes = await fetch(proxyUrl, {
      headers: { Accept: 'application/pdf,*/*' },
    });
    if (directRes.ok) {
      const buf = await directRes.arrayBuffer();
      if (buf && buf.byteLength > 10000) {
        if (onProgress) onProgress(100);
        return buf;
      }
    }
    throw new Error(`سرور جواب: ${directRes.status}`);
  } catch (fallbackErr: any) {
    throw new Error(
      fallbackErr.message?.toLowerCase().includes('fetch')
        ? 'انٹرنیٹ رابطہ میں سست روی کی وجہ سے تعطل پیش آیا۔ برائے مہربانی "دوبارہ کوشش فرمائیں" دبائیں۔'
        : fallbackErr.message || 'کتاب لوڈ نہیں ہو سکی۔ برائے مہربانی دوبارہ کوشش فرمائیں۔'
    );
  }
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
