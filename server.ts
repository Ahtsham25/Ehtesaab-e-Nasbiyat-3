import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIRECT_US_MAP: Record<string, string> = {
  // 12 Volumes of Ehtisab-e-Nasbiyat
  'ehtesabe-nasbiat-by-allah-wasaya-deobandi-1': 'https://ia800903.us.archive.org/2/items/ehtesabe-nasbiat-by-allah-wasaya-deobandi-1/ehtesabe-nasbiat-by-allah-wasaya-deobandi-1.pdf',
  'ehtesabe-nasbiat-by-allah-wasaya-deobandi-2': 'https://ia801804.us.archive.org/4/items/ehtesabe-nasbiat-by-allah-wasaya-deobandi-2/ehtesabe-nasbiat-by-allah-wasaya-deobandi-2.pdf',
  'ehtesabe-nasbiat-by-allah-wasaya-deobandi-3': 'https://ia801608.us.archive.org/35/items/ehtesabe-nasbiat-by-allah-wasaya-deobandi-3/ehtesabe-nasbiat-by-allah-wasaya-deobandi-3.pdf',
  'ehtesabe-nasbiat-by-allah-wasaya-deobandi-4': 'https://ia601600.us.archive.org/25/items/ehtesabe-nasbiat-by-allah-wasaya-deobandi-4/ehtesabe-nasbiat-by-allah-wasaya-deobandi-4.pdf',
  'ehtesabe-nasbiat-by-allah-wasaya-deobandi-5': 'https://ia800806.us.archive.org/9/items/ehtesabe-nasbiat-by-allah-wasaya-deobandi-5/ehtesabe-nasbiat-by-allah-wasaya-deobandi-5.pdf',
  'ehtesabe-nasbiat-by-allah-wasaya-deobandi-6': 'https://ia803106.us.archive.org/26/items/ehtesabe-nasbiat-by-allah-wasaya-deobandi-6/ehtesabe-nasbiat-by-allah-wasaya-deobandi-6.pdf',
  'ehtesabe-nasbiat-by-allah-wasaya-deobandi-7': 'https://ia803108.us.archive.org/23/items/ehtesabe-nasbiat-by-allah-wasaya-deobandi-7/ehtesabe-nasbiat-by-allah-wasaya-deobandi-7.pdf',
  'ehtesabe-nasbiat-by-allah-wasaya-deobandi-8': 'https://ia600901.us.archive.org/34/items/ehtesabe-nasbiat-by-allah-wasaya-deobandi-8/ehtesabe-nasbiat-by-allah-wasaya-deobandi-8.pdf',
  'ehtesabe-nasbiat-by-allah-wasaya-deobandi-9': 'https://ia801607.us.archive.org/11/items/ehtesabe-nasbiat-by-allah-wasaya-deobandi-9/ehtesabe-nasbiat-by-allah-wasaya-deobandi-9.pdf',
  'ehtesabe-nasbiat-by-allah-wasaya-deobandi-10': 'https://ia903107.us.archive.org/0/items/ehtesabe-nasbiat-by-allah-wasaya-deobandi-10/ehtesabe-nasbiat-by-allah-wasaya-deobandi-10.pdf',
  'ehtesabe-nasbiat-by-allah-wasaya-deobandi-11': 'https://ia600103.us.archive.org/30/items/ehtesabe-nasbiat-by-allah-wasaya-deobandi-11/ehtesabe-nasbiat-by-allah-wasaya-deobandi-11.pdf',
  'ehtesabe-nasbiat-by-allah-wasaya-deobandi-12': 'https://ia803105.us.archive.org/11/items/ehtesabe-nasbiat-by-allah-wasaya-deobandi-12/ehtesabe-nasbiat-by-allah-wasaya-deobandi-12.pdf',
  // Verified Response Books (احتساب ناصبیت پر اعتراضات کے جوابات)
  '20261003_20261003_2332': 'https://ia801801.us.archive.org/21/items/20261003_20261003_2332/%D8%A7%D8%AD%D8%AA%D8%B3%D8%A7%D8%A8%20%D9%86%D8%A7%D8%B5%D8%A8%DB%8C%D8%AA%20%D9%BE%D8%B1%20%D8%A7%D8%B9%D8%AA%D8%B1%D8%A7%D8%B6%D8%A7%D8%AA%20%DA%A9%D8%A7%20%D8%AC%D9%88%D8%A7%D8%A8.pdf',
  '20261003_20261003_0649': 'https://ia800701.us.archive.org/1/items/20261003_20261003_0649/%D8%A7%D8%AD%D8%AA%D8%B3%D8%A7%D8%A8%20%D9%86%D8%A7%D8%B5%D8%A8%DB%8C%D8%AA%20%D8%B3%DB%92%20%D9%85%D8%AA%D8%B9%D9%84%D9%82%20%D8%A7%DB%81%D9%85%20%D9%88%D8%B6%D8%A7%D8%AD%D8%AA.pdf',
  '20261009_20261009_2214': 'https://ia801404.us.archive.org/7/items/20261009_20261009_2214/%D9%85%D9%81%D8%AA%DB%8C%20%D8%B9%D8%A8%D8%AF%20%D8%A7%D9%84%D9%88%D8%A7%D8%AD%D8%AF%20%D9%82%D8%B1%DB%8C%D8%B4%DB%8C%20%D8%B5%D8%A7%D8%AD%D8%A8%20%DA%A9%D8%A7%20%D8%A7%D8%AD%D8%AA%D8%B3%D8%A7%D8%A8%20%D9%86%D8%A7%D8%B5%D8%A8%DB%8C%D8%AA%20%D9%BE%D8%B1%20%D8%AF%D9%88%D8%B3%D8%B1%D8%A7%20%D8%A7%D8%B9%D8%AA%D8%B1%D8%A7%D8%B6%20%D8%A7%D9%88%D8%B1%20%D8%A7%D8%B3%20%DA%A9%D8%A7%20%D8%AC%D9%88%D8%A7%D8%A8%20.pdf',
};

const archiveCache = new Map<string, string>();

async function resolveArchivePdf(rawUrl: string): Promise<string> {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) return '';

  if (archiveCache.has(trimmed)) {
    return archiveCache.get(trimmed)!;
  }

  // 1. Check known mappings
  for (const [id, directUrl] of Object.entries(DIRECT_US_MAP)) {
    if (trimmed.includes(id)) {
      archiveCache.set(trimmed, directUrl);
      return directUrl;
    }
  }

  // 2. If it's already a direct us.archive.org URL with non-generic filename
  if (trimmed.includes('.us.archive.org') && !trimmed.endsWith('/.pdf')) {
    archiveCache.set(trimmed, trimmed);
    return trimmed;
  }

  // 3. Extract Archive ID
  const match = trimmed.match(/archive\.org\/(?:download|details|items)\/([^\/\?#]+)(?:\/([^\?#]+))?/i);
  if (match && match[1]) {
    const itemId = match[1];
    const requestedFile = match[2] ? decodeURIComponent(match[2]) : '';

    // If a specific custom Urdu/English filename is requested, try that directly
    if (requestedFile && requestedFile !== `${itemId}.pdf` && requestedFile.endsWith('.pdf')) {
      const candidate = `https://ia800903.us.archive.org/2/items/${itemId}/${encodeURIComponent(requestedFile)}`;
      archiveCache.set(trimmed, candidate);
      return candidate;
    }

    // Auto-discover the real PDF filename from Archive.org metadata
    try {
      const metaRes = await fetch(`https://archive.org/metadata/${itemId}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        signal: AbortSignal.timeout(3500),
      });

      if (metaRes.ok) {
        const meta = await metaRes.json();
        const pdfFiles = (meta.files || []).filter((f: any) => f.name && f.name.toLowerCase().endsWith('.pdf'));
        if (pdfFiles.length > 0) {
          const mainPdf = pdfFiles.find((f: any) => !f.name.endsWith('_text.pdf')) || pdfFiles[0];
          const server = meta.server || 'ia800903.us.archive.org';
          const dir = meta.dir || (`/items/${itemId}`);
          const directUrl = `https://${server}${dir}/${encodeURIComponent(mainPdf.name)}`;
          archiveCache.set(trimmed, directUrl);
          return directUrl;
        }
      }
    } catch {}

    // Fallback: fast ia800903 node
    const candidate = `https://ia800903.us.archive.org/2/items/${itemId}/${requestedFile || `${itemId}.pdf`}`;
    return candidate;
  }

  return trimmed;
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // CORS headers
  app.use((_req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    next();
  });

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  const pdfMemoryCache = new Map<string, Buffer>();
  const inFlightFetches = new Map<string, Promise<Buffer>>();

  async function fetchAndCachePdfBuffer(targetUrl: string, rawUrl: string): Promise<Buffer> {
    if (pdfMemoryCache.has(targetUrl)) return pdfMemoryCache.get(targetUrl)!;
    if (pdfMemoryCache.has(rawUrl)) return pdfMemoryCache.get(rawUrl)!;

    if (inFlightFetches.has(targetUrl)) {
      return inFlightFetches.get(targetUrl)!;
    }

    const fetchPromise = (async () => {
      try {
        const userAgent =
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

        let res = await fetch(targetUrl, {
          headers: { 'User-Agent': userAgent, Accept: 'application/pdf,*/*' },
          redirect: 'follow',
          signal: AbortSignal.timeout(90000),
        });

        if (!res.ok && targetUrl !== rawUrl) {
          res = await fetch(rawUrl, {
            headers: { 'User-Agent': userAgent, Accept: 'application/pdf,*/*' },
            redirect: 'follow',
            signal: AbortSignal.timeout(90000),
          });
        }

        if (!res.ok) {
          throw new Error(`Remote returned status ${res.status}`);
        }

        const arrayBuf = await res.arrayBuffer();
        const buf = Buffer.from(arrayBuf);
        if (buf.length > 50000) {
          pdfMemoryCache.set(targetUrl, buf);
          pdfMemoryCache.set(rawUrl, buf);
        }
        return buf;
      } finally {
        inFlightFetches.delete(targetUrl);
      }
    })();

    inFlightFetches.set(targetUrl, fetchPromise);
    return fetchPromise;
  }

  // Fast streaming PDF proxy endpoint with Range support and 100% memory cache
  app.get('/api/pdf-proxy', async (req, res) => {
    const rawUrl = req.query.url as string;
    if (!rawUrl) {
      return res.status(400).json({ error: 'Missing url query param' });
    }

    const targetUrl = await resolveArchivePdf(rawUrl);

    try {
      const buffer = await fetchAndCachePdfBuffer(targetUrl, rawUrl);
      const range = req.headers.range;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=604800');

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10) || 0;
        const end = parts[1] ? parseInt(parts[1], 10) : buffer.length - 1;
        const chunk = buffer.subarray(start, end + 1);

        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${buffer.length}`);
        res.setHeader('Content-Length', chunk.length);
        return res.end(chunk);
      }

      res.status(200);
      res.setHeader('Content-Length', buffer.length);
      return res.end(buffer);
    } catch (err: any) {
      console.warn('PDF Proxy error for:', rawUrl, err.message);
      if (!res.headersSent) {
        res.status(502).json({ error: err.message || 'Failed to fetch PDF' });
      } else {
        res.end();
      }
    }
  });

  // Direct file download endpoint with Content-Disposition: attachment
  app.get('/api/download', async (req, res) => {
    const rawUrl = req.query.url as string;
    const filename = (req.query.filename as string) || 'ehtisab-nasbiyat.pdf';
    if (!rawUrl) {
      return res.status(400).json({ error: 'Missing url query param' });
    }

    const targetUrl = await resolveArchivePdf(rawUrl);
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    const abortController = new AbortController();
    req.on('close', () => {
      abortController.abort();
    });

    try {
      const buffer = await fetchAndCachePdfBuffer(targetUrl, rawUrl);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Length', buffer.length);
      return res.end(buffer);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.warn('Download endpoint error:', rawUrl, err.message);
      if (!res.headersSent) {
        res.status(502).json({ error: err.message || 'Failed to download file' });
      } else {
        res.end();
      }
    }
  });

  // Image Proxy for Archive.org covers and page images with CORS headers
  app.get('/api/image-proxy', async (req, res) => {
    const rawUrl = req.query.url as string;
    if (!rawUrl) {
      return res.status(400).json({ error: 'Missing url parameter' });
    }

    try {
      const response = await fetch(rawUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/*,*/*',
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: `Image fetch failed with status ${response.status}` });
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=604800');
      res.setHeader('Access-Control-Allow-Origin', '*');

      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));
    } catch (err: any) {
      res.status(502).json({ error: err.message || 'Failed to proxy image' });
    }
  });

  // Serve static assets in production or Vite in development
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);

    // Pre-cache Volume 1 and Volume 4 asynchronously into memory so reading is instant
    setTimeout(async () => {
      const preloadIds = [
        'ehtesabe-nasbiat-by-allah-wasaya-deobandi-1',
        'ehtesabe-nasbiat-by-allah-wasaya-deobandi-4',
        '20261003_20261003_2332',
      ];
      for (const id of preloadIds) {
        try {
          const direct = DIRECT_US_MAP[id];
          if (direct) {
            await fetchAndCachePdfBuffer(direct, direct);
            console.log(`[Cache Warmup] Ready: ${id}`);
          }
        } catch (e: any) {
          console.warn(`[Cache Warmup] Note: ${id} - ${e.message}`);
        }
      }
    }, 1500);
  });
}

startServer();
