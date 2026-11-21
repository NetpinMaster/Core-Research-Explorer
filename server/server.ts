import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { executeCoreWorksSearch } from './core-proxy.js';

const PORT = Number(process.env['PORT'] ?? 3000);
const DIST_BROWSER_DIR = path.resolve(process.cwd(), 'dist', 'core-research-explorer', 'browser');

function ensureAngularBuildExists(): void {
  const indexPath = path.join(DIST_BROWSER_DIR, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.log('Angular build output not found; running ng build --configuration development...');
    execFileSync('npx', ['ng', 'build', '--configuration', 'development'], {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
  }
}

export function createApp(): express.Express {
  const app = express();
  app.disable('x-powered-by');
  app.use((_req: Request, res: Response, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'core-research-explorer-proxy',
      authenticated: Boolean(process.env['CORE_API_KEY']?.trim()),
    });
  });

  app.get('/api/core/search', async (req: Request, res: Response) => {
    const result = await executeCoreWorksSearch(
      {
        q: req.query['q'],
        limit: req.query['limit'],
        offset: req.query['offset'],
        sort: req.query['sort'],
      },
      {
        apiKey: process.env['CORE_API_KEY'],
      }
    );

    for (const [header, value] of Object.entries(result.headers)) {
      res.setHeader(header, value);
    }

    res.status(result.status).json(result.body);
  });

  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        status: 404,
        message: 'Requested API route does not exist.',
      },
    });
  });

  app.use(
    express.static(DIST_BROWSER_DIR, {
      index: false,
      maxAge: process.env['NODE_ENV'] === 'production' ? '1y' : 0,
    })
  );

  app.get('*', (_req: Request, res: Response) => {
    const indexPath = path.join(DIST_BROWSER_DIR, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(503).send('Angular application bundle has not been built yet.');
    }
  });

  return app;
}

ensureAngularBuildExists();
const app = createApp();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`CORE Research Explorer listening on http://0.0.0.0:${PORT}`);
});
