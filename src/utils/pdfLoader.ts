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
 * Fetch PDF as ArrayBuffer with progress tracking and automatic reliable fallbacks
 */
export async function fetchPdfArrayBuffer(url: string, onProgress?: (pct: number) => void): Promise<ArrayBuffer> {
  const cleanUrl = normalizePdfUrl(url);

  // If it's a relative local URL
  if (cleanUrl.startsWith('/') || cleanUrl.startsWith('./')) {
    const res = await fetch(cleanUrl);
    if (!res.ok) throw new Error(`مقامی فائل نہیں مل سکی (${res.status})`);
    if (onProgress) onProgress(100);
    return await res.arrayBuffer();
  }

  // Construct sources ordered by speed and reliability
  const sources: string[] = [];

  // 1. Direct proxy route via local Express server
  sources.push(`/api/pdf-proxy?url=${encodeURIComponent(cleanUrl)}`);

  // 2. Direct client fetch (works great on mobile / client if CORS allowed)
  sources.push(cleanUrl);

  // 3. Fallback to ia800903 if different
  if (cleanUrl.includes('archive.org') && !cleanUrl.includes('ia800903')) {
    const match = cleanUrl.match(/archive\.org\/(?:download|items)\/([^\/\?#]+)(?:\/([^\?#]+))?/i);
    if (match && match[1]) {
      const fn = match[2] ? decodeURIComponent(match[2]) : `${match[1]}.pdf`;
      sources.push(`/api/pdf-proxy?url=${encodeURIComponent(`https://ia800903.us.archive.org/2/items/${match[1]}/${fn}`)}`);
    }
  }

  let lastError: Error | null = null;

  for (let i = 0; i < sources.length; i++) {
    const targetUrl = sources[i];
    try {
      const controller = new AbortController();
      // 30 seconds per attempt
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(targetUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          Accept: 'application/pdf,*/*',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok && response.status !== 206) {
        lastError = new Error(`سرور جواب: ${response.status} (${response.statusText})`);
        continue;
      }

      // Verify content type isn't HTML error page
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        lastError = new Error('پی ڈی ایف دستیاب نہیں (سرور نے ایرر پیج واپس کیا)');
        continue;
      }

      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 14 * 1024 * 1024;

      if (!response.body) {
        const buffer = await response.arrayBuffer();
        if (onProgress) onProgress(100);
        return buffer;
      }

      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          received += value.length;
          if (onProgress) {
            const pct = Math.min(99, Math.max(5, Math.round((received / total) * 100)));
            onProgress(pct);
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

  throw lastError || new Error('کتاب ڈاؤن لوڈ نہیں ہو سکی۔ برائے مہربانی انٹرنیٹ چیک فرمائیں یا دوبارہ کوشش کریں۔');
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
