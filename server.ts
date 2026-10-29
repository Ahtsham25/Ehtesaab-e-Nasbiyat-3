import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIRECT_US_MAP: Record<string, string> = {
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
};

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

  // Helper to resolve the best direct URL for an Archive.org request
  function resolveBestUrl(rawUrl: string): string {
    const trimmed = (rawUrl || '').trim();

    // Check if URL is or contains an ID in DIRECT_US_MAP
    for (const [id, directUrl] of Object.entries(DIRECT_US_MAP)) {
      if (trimmed.includes(id)) {
        return directUrl;
      }
    }

    // If it's already a direct us.archive.org URL
    if (trimmed.includes('.us.archive.org')) {
      return trimmed;
    }

    // If it's an archive.org/download/ITEM_ID/FILE URL, route via fast ia800903 node
    const match = trimmed.match(/archive\.org\/(?:download|details|items)\/([^\/\?#]+)(?:\/([^\?#]+))?/i);
    if (match && match[1]) {
      const itemId = match[1];
      const filename = match[2] ? decodeURIComponent(match[2]) : `${itemId}.pdf`;
      return `https://ia800903.us.archive.org/2/items/${itemId}/${filename}`;
    }

    return trimmed;
  }

  // Fast streaming PDF proxy endpoint with Range support
  app.get('/api/pdf-proxy', async (req, res) => {
    const rawUrl = req.query.url as string;
    if (!rawUrl) {
      return res.status(400).json({ error: 'Missing url query param' });
    }

    const targetUrl = resolveBestUrl(rawUrl);
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    const reqHeaders: Record<string, string> = {
      'User-Agent': userAgent,
      'Accept': 'application/pdf,*/*',
    };
    if (req.headers.range) {
      reqHeaders['Range'] = req.headers.range;
    }

    const abortController = new AbortController();
    req.on('close', () => {
      abortController.abort();
    });

    try {
      // First attempt: direct or resolved fast node
      let response = await fetch(targetUrl, {
        method: 'GET',
        headers: reqHeaders,
        redirect: 'follow',
        signal: abortController.signal,
      });

      // If resolved failed and differed from original, fallback to original
      if (!response.ok && targetUrl !== rawUrl) {
        response = await fetch(rawUrl, {
          method: 'GET',
          headers: reqHeaders,
          redirect: 'follow',
          signal: abortController.signal,
        });
      }

      if (!response.ok && response.status !== 206) {
        return res.status(response.status).json({ error: `Remote returned status ${response.status}` });
      }

      res.status(response.status);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=86400');

      const contentLength = response.headers.get('content-length');
      if (contentLength) res.setHeader('Content-Length', contentLength);

      const contentRange = response.headers.get('content-range');
      if (contentRange) res.setHeader('Content-Range', contentRange);

      if (response.body) {
        Readable.fromWeb(response.body as any).pipe(res);
      } else {
        const buffer = await response.arrayBuffer();
        res.send(Buffer.from(buffer));
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.warn('PDF Proxy error:', rawUrl, err.message);
      if (!res.headersSent) {
        res.status(502).json({ error: err.message || 'Failed to proxy PDF' });
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

    const targetUrl = resolveBestUrl(rawUrl);
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    const abortController = new AbortController();
    req.on('close', () => {
      abortController.abort();
    });

    try {
      let response = await fetch(targetUrl, {
        headers: {
          'User-Agent': userAgent,
          'Accept': 'application/pdf,*/*',
        },
        redirect: 'follow',
        signal: abortController.signal,
      });

      if (!response.ok && targetUrl !== rawUrl) {
        response = await fetch(rawUrl, {
          headers: {
            'User-Agent': userAgent,
            'Accept': 'application/pdf,*/*',
          },
          redirect: 'follow',
          signal: abortController.signal,
        });
      }

      if (!response.ok) {
        return res.status(response.status).json({ error: `Remote returned status ${response.status}` });
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      res.setHeader('Accept-Ranges', 'bytes');

      const contentLength = response.headers.get('content-length');
      if (contentLength) res.setHeader('Content-Length', contentLength);

      if (response.body) {
        Readable.fromWeb(response.body as any).pipe(res);
      } else {
        const buffer = await response.arrayBuffer();
        res.send(Buffer.from(buffer));
      }
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
  });
}

startServer();
