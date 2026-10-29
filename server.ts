import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // CORS headers for all API requests
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

  // Helper to ensure Unicode characters in URLs (e.g. Urdu filenames) are properly escaped for Node fetch
  const toSafeUrl = (raw: string): string => {
    try {
      return new URL(raw).href;
    } catch {
      return encodeURI(raw);
    }
  };

  // Fast streaming PDF proxy endpoint
  app.get('/api/pdf-proxy', async (req, res) => {
    const rawUrl = req.query.url as string;
    if (!rawUrl) {
      return res.status(400).json({ error: 'Missing url query param' });
    }

    const targetUrl = toSafeUrl(rawUrl);

    try {
      const response = await fetch(targetUrl, {
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/pdf,*/*',
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: `Remote returned status ${response.status}` });
      }

      res.setHeader('Content-Type', 'application/pdf');
      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        res.setHeader('Content-Length', contentLength);
      }
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=86400');

      if (response.body) {
        const reader = response.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            res.write(value);
          }
        }
        res.end();
      } else {
        const buffer = await response.arrayBuffer();
        res.send(Buffer.from(buffer));
      }
    } catch (err: any) {
      console.warn('Proxy error for URL:', targetUrl, err.message);
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

    const targetUrl = toSafeUrl(rawUrl);

    try {
      const response = await fetch(targetUrl, {
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/pdf,*/*',
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: `Remote returned status ${response.status}` });
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        res.setHeader('Content-Length', contentLength);
      }

      if (response.body) {
        const reader = response.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            res.write(value);
          }
        }
        res.end();
      } else {
        const buffer = await response.arrayBuffer();
        res.send(Buffer.from(buffer));
      }
    } catch (err: any) {
      console.warn('Download endpoint error:', targetUrl, err.message);
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
