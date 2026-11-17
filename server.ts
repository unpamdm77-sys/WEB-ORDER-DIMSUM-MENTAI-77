import http from 'node:http';
import path from 'node:path';
import express from 'express';
import { createApiApp } from './api/index.ts';

const PORT = Number(process.env.PORT) || 3000;
const ROOT_DIR = process.cwd();

async function startServer() {
  const app = createApiApp();
  const httpServer = http.createServer(app);

  // Vite dev middleware or static production serving
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const disableHmr = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: disableHmr ? false : { server: httpServer },
        watch: disableHmr ? null : {},
      },
      plugins: disableHmr
        ? [
            {
              name: 'disable-vite-client-ws',
              transform(code, id) {
                if (
                  id.endsWith('/vite/dist/client/client.mjs') ||
                  id.endsWith('\\vite\\dist\\client\\client.mjs')
                ) {
                  return code.replace(
                    'transport.connect(createHMRHandler(handleMessage));',
                    '/* HMR disabled: WebSocket connect skipped */'
                  );
                }
              },
            },
          ]
        : [],
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(ROOT_DIR, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distDir, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Dimsum Mentai 77 UNPAM server running on port ${PORT}`);
  });
}

void startServer();
