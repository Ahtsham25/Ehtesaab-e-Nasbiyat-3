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

  // Construct sources ordered by speed and reliability
  const sources: string[] = [];
  if (cleanUrl.startsWith('/api/pdf-proxy')) {
    sources.push(cleanUrl);
  } else {
    sources.push(`/api/pdf-proxy?url=${encodeURIComponent(cleanUrl)}`);
  }

  // Fallback to direct archive download if proxy is unreachable
  if (cleanUrl.includes('archive.org')) {
    sources.push(cleanUrl);
  }

  let lastError: Error | null = null;

  for (let i = 0; i < sources.length; i++) {
    const targetUrl = sources[i];

    try {
      const chunks: Uint8Array[] = [];
      let received = 0;
      let total = 15 * 1024 * 1024;
      let resumeRetries = 0;
      const MAX_RESUME_RETRIES = 5;

      while (resumeRetries <= MAX_RESUME_RETRIES) {
        try {
          const headers: Record<string, string> = { Accept: 'application/pdf,*/*' };
          if (received > 0) {
            headers['Range'] = `bytes=${received}-`;
          }

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 90000);

          const response = await fetch(targetUrl, {
            method: 'GET',
            headers,
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok && response.status !== 206) {
            throw new Error(`سرور جواب: ${response.status} (${response.statusText})`);
          }

          // If server returned 200 instead of 206 for range request, reset received
          if (received > 0 && response.status === 200) {
            chunks.length = 0;
            received = 0;
          }

          const contentLength = response.headers.get('content-length');
          if (contentLength) {
            const parsedLength = parseInt(contentLength, 10);
            if (response.status === 206) {
              const contentRange = response.headers.get('content-range');
              if (contentRange) {
                const matchTotal = contentRange.match(/\/(\d+)/);
                if (matchTotal) total = parseInt(matchTotal[1], 10);
              } else {
                total = received + parsedLength;
              }
            } else {
              total = parsedLength;
            }
          }

          if (!response.body) {
            const buf = await response.arrayBuffer();
            if (onProgress) onProgress(100);
            return buf;
          }

          const reader = response.body.getReader();

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

          // Check if download completed fully
          if (received > 50000 && (received >= total * 0.95 || !contentLength)) {
            break;
          }

          // If connection ended before full file, retry and resume from received
          resumeRetries++;
          if (resumeRetries > MAX_RESUME_RETRIES) {
            break;
          }
          await new Promise((r) => setTimeout(r, 1000 * resumeRetries));
        } catch (streamErr: any) {
          resumeRetries++;
          lastError = streamErr;
          if (resumeRetries > MAX_RESUME_RETRIES) {
            break;
          }
          await new Promise((r) => setTimeout(r, 1200 * resumeRetries));
        }
      }

      if (received > 50000) {
        // Combine chunks into single ArrayBuffer
        const combined = new Uint8Array(received);
        let offset = 0;
        for (const chunk of chunks) {
          combined.set(chunk, offset);
          offset += chunk.length;
        }
        if (onProgress) onProgress(100);
        return combined.buffer;
      }
    } catch (chunkErr: any) {
      lastError = chunkErr;
    }

    // Direct whole ArrayBuffer fetch fallback
    try {
      const response = await fetch(targetUrl, {
        headers: { Accept: 'application/pdf,*/*' },
      });
      if (response.ok || response.status === 206) {
        const buffer = await response.arrayBuffer();
        if (buffer && buffer.byteLength > 50000) {
          if (onProgress) onProgress(100);
          return buffer;
        }
      }
    } catch (bufErr: any) {
      lastError = bufErr;
    }
  }

  const friendlyMsg =
    lastError && lastError.message?.toLowerCase().includes('fetch')
      ? 'انٹرنیٹ کنکشن کی سست روی کی وجہ سے رابطہ تعطل کا شکار ہوا۔ براہِ کرم "دوبارہ کوشش فرمائیں" دبائیں، لوڈنگ وہیں سے بحال ہو گی۔'
      : lastError?.message || 'کتاب لوڈ نہیں ہو سکی۔ برائے مہربانی اپنا انٹرنیٹ چیک فرمائیں یا دوبارہ کوشش کریں۔';

  throw new Error(friendlyMsg);
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
