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
 * Fetch PDF with automated fallback through reliable CORS proxies if direct download is restricted
 */
export async function fetchPdfArrayBuffer(url: string, onProgress?: (pct: number) => void): Promise<ArrayBuffer> {
  // If it's a relative local URL like /data/sample-preview.pdf
  if (url.startsWith('/') || url.startsWith('./')) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`مقامی فائل نہیں مل سکی (${res.status})`);
    if (onProgress) onProgress(100);
    return await res.arrayBuffer();
  }

  const sources = [
    // 1. Server-side streaming proxy (fastest, zero CORS restrictions)
    `/api/pdf-proxy?url=${encodeURIComponent(url)}`,
    // 2. Direct fetch
    url,
    // 3. CORS Proxy via corsproxy.io
    `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
    // 4. CORS Proxy via allorigins
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  ];

  let lastError: Error | null = null;

  for (let i = 0; i < sources.length; i++) {
    const targetUrl = sources[i];
    try {
      // Use AbortController with generous timeout for full PDF book streaming
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000);

      const response = await fetch(targetUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          Accept: 'application/pdf,*/*',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        lastError = new Error(`سرور کا جواب: ${response.status} (${response.statusText})`);
        continue;
      }

      // Check if response is actually HTML error page instead of PDF
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/html') || contentType.includes('application/json')) {
        // Not a PDF, server returned an HTML error page (e.g. 503 or 404 from Archive.org)
        lastError = new Error('فراہم کردہ لنک پر پی ڈی ایف فائل موجود نہیں ہے (سرور نے ایرر پیج واپس کیا)۔');
        continue;
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
      continue;
    }
  }

  throw lastError || new Error('پی ڈی ایف فائل ڈاؤن لوڈ نہیں ہو سکی۔ برائے مہربانی اپنا انٹرنیٹ چیک کریں یا ڈیوائس سے فائل منتخب کریں۔');
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

  // Check cache
  if (docCache.has(source.url)) {
    if (onProgress) onProgress(100);
    return docCache.get(source.url)!;
  }

  // If local blob URL or data URL, pass directly to getDocument
  if (source.url.startsWith('blob:') || source.url.startsWith('data:')) {
    const loadingTask = pdfjsLib.getDocument({
      url: source.url,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
      cMapPacked: true,
    });
    const doc = await loadingTask.promise;
    return doc;
  }

  // Fetch as ArrayBuffer with CORS proxy support & progress
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
