const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

const desktopDb = require('./db');

let staticServer;

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.js') return 'text/javascript; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.json') return 'application/json; charset=utf-8';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.ico') return 'image/x-icon';
  if (ext === '.map') return 'application/json; charset=utf-8';
  if (ext === '.woff') return 'font/woff';
  if (ext === '.woff2') return 'font/woff2';
  return 'application/octet-stream';
}

function startStaticServer(rootDir) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const reqPath = decodeURIComponent((req.url || '/').split('?')[0]);
      const safePath = reqPath.replace(/\0/g, '');

      // Default route.
      const requested = safePath === '/' ? '/index.html' : safePath;
      const filePath = path.join(rootDir, requested);

      const sendFile = (p) => {
        try {
          const data = fs.readFileSync(p);
          res.writeHead(200, { 'Content-Type': contentTypeFor(p) });
          res.end(data);
        } catch (_e) {
          res.writeHead(404);
          res.end('Not found');
        }
      };

      // Serve file if it exists; otherwise fall back to index.html (SPA routing).
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        sendFile(filePath);
        return;
      }

      sendFile(path.join(rootDir, 'index.html'));
    });

    server.on('error', reject);

    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, url: `http://127.0.0.1:${port}/` });
    });
  });
}

async function resolveStartUrl() {
  if (process.env.ELECTRON_START_URL) {
    return process.env.ELECTRON_START_URL;
  }

  if (app.isPackaged) {
    const rootDir = path.join(process.resourcesPath, 'web');
    const { server, url } = await startStaticServer(rootDir);
    staticServer = server;
    return url;
  }

  const localIndex = path.join(__dirname, '..', 'mobile', 'dist', 'index.html');
  return `file://${localIndex}`;
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1080,
    minHeight: 700,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadURL(await resolveStartUrl());
}

function registerIpc() {
  ipcMain.handle('ptv.db.ensureSchema', async () => {
    return desktopDb.ensureSchema(fs);
  });
  ipcMain.handle('ptv.db.upsertScan', async (_evt, venueId, upc) => {
    return desktopDb.upsertScan(fs, venueId, upc);
  });
  ipcMain.handle('ptv.db.countQueuedForVenue', async (_evt, venueId) => {
    return desktopDb.countQueuedForVenue(fs, venueId);
  });
  ipcMain.handle('ptv.db.path', async () => {
    return { ok: true, path: desktopDb.getDbPath() };
  });
}

async function runSmokeTestAndQuit() {
  // Runs in Electron (so better-sqlite3 native module matches ABI).
  try {
    const r1 = desktopDb.ensureSchema(fs);
    const r2 = desktopDb.upsertScan(fs, 'smoke-venue', '012345678905');
    const r3 = desktopDb.countQueuedForVenue(fs, 'smoke-venue');
    // eslint-disable-next-line no-console
    console.log('[PTV_SMOKE_TEST]', { r1, r2, r3, dbPath: desktopDb.getDbPath() });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[PTV_SMOKE_TEST] failed', e);
    process.exitCode = 1;
  } finally {
    app.quit();
  }
}

app.whenReady().then(() => {
  registerIpc();

  if (process.env.PTV_SMOKE_TEST === '1') {
    runSmokeTestAndQuit();
    return;
  }

  createWindow().catch((e) => {
    // eslint-disable-next-line no-console
    console.error('[PTV] failed to create window', e);
    app.quit();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow().catch((e) => {
        // eslint-disable-next-line no-console
        console.error('[PTV] failed to create window on activate', e);
      });
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (staticServer) {
    try {
      staticServer.close();
    } catch (_e) {
      // ignore
    }
  }
});
