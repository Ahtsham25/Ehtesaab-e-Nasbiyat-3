import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Initialize PDF.js worker
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  } catch {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
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
 * Fetch PDF with automated fallback through reliable CORS proxies if direct download is restricted
 */
export async function fetchPdfArrayBuffer(url: string, onProgress?: (pct: number) => void): Promise<ArrayBuffer> {
  const sources = [
    // 1. Direct fetch
    url,
    // 2. CORS Proxy via corsproxy.io
    `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
    // 3. CORS Proxy via allorigins
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  ];

  let lastError: Error | null = null;

  for (let i = 0; i < sources.length; i++) {
    const targetUrl = sources[i];
    try {
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/pdf,*/*',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }

      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;

      if (!response.body) {
        const buffer = await response.arrayBuffer();
        if (onProgress) onProgress(100);
        return buffer;
      }

      // Stream read with progress
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          received += value.length;
          if (total > 0 && onProgress) {
            onProgress(Math.min(99, Math.round((received / total) * 100)));
          }
        }
      }

      // Combine chunks into single ArrayBuffer
      const combined = new Uint8Array(received);
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }

      if (onProgress) onProgress(100);
      return combined.buffer;
    } catch (err: any) {
      lastError = err;
      // Try next fallback
      continue;
    }
  }

  throw lastError || new Error('پی ڈی ایف فائل ڈاؤن لوڈ نہیں ہو سکی۔ برائے مہربانی انٹرنیٹ چیک کریں۔');
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
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/',
      cMapPacked: true,
    });
    return await loadingTask.promise;
  }

  if (!source.url) {
    throw new Error('پی ڈی ایف کا کوئی لنک یا فائل فراہم نہیں کی گئی۔');
  }

  // Check cache
  if (docCache.has(source.url)) {
    if (onProgress) onProgress(100);
    return docCache.get(source.url)!;
  }

  // If local blob URL or data URL, pass directly to getDocument
  if (source.url.startsWith('blob:') || source.url.startsWith('data:')) {
    const loadingTask = pdfjsLib.getDocument({
      url: source.url,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/',
      cMapPacked: true,
    });
    const doc = await loadingTask.promise;
    return doc;
  }

  // Fetch as ArrayBuffer with CORS proxy support & progress
  const arrayBuffer = await fetchPdfArrayBuffer(source.url, onProgress);

  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer,
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/',
    cMapPacked: true,
  });

  const doc = await loadingTask.promise;
  docCache.set(source.url, doc);
  return doc;
}
