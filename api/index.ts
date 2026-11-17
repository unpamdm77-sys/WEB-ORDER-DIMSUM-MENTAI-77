import type { Request, Response } from 'express';
import { createApiApp } from '../server/createApiApp';

let cachedApp: ReturnType<typeof createApiApp> | null = null;

function getApp() {
  if (!cachedApp) {
    cachedApp = createApiApp();
  }
  return cachedApp;
}

export default function handler(req: Request, res: Response) {
  try {
    const app = getApp();
    return app(req, res);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Internal serverless initialization error';
    res.status(500).json({
      error: `Terjadi kesalahan pada server API: ${message}`,
    });
  }
}
