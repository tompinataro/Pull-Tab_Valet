const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const desktopDb = require('./db');

const APP_NAME = 'Pull Tab Valet';
let mainWindow = null;

function log(level, event, details) {
  const ts = new Date().toISOString();
  const prefix = `[${ts}] [${APP_NAME}] [${level.toUpperCase()}] ${event}`;
  const printer = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  if (details !== undefined) printer(prefix, details);
  else printer(prefix);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildBootShell({ title, message, diagnostics }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${APP_NAME}</title>
    <style>
      :root {
        color-scheme: light;
        background: #f3f4f6;
        color: #111827;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial;
      }
      * { box-sizing: border-box; }
      html, body { height: 100%; margin: 0; }
      body {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        background:
          radial-gradient(circle at top left, rgba(255,255,255,0.96), rgba(243,244,246,0.92) 36%, rgba(229,231,235,1) 100%);
      }
      .card {
        width: min(100%, 560px);
        border: 1px solid #d1d5db;
        border-radius: 24px;
        background: rgba(255,255,255,0.96);
        padding: 28px;
        box-shadow: 0 24px 70px rgba(15, 23, 42, 0.14);
      }
      .eyebrow {
        margin: 0 0 10px;
        color: #6b7280;
        font-size: 12px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
      }
      h1 { margin: 0 0 10px; font-size: 28px; line-height: 1.1; }
      p { margin: 0; color: #374151; font-size: 14px; line-height: 1.7; }
      .actions { display: flex; gap: 12px; margin-top: 18px; flex-wrap: wrap; }
      button { border: 0; border-radius: 999px; padding: 12px 16px; cursor: pointer; font: inherit; }
      .primary { background: #111827; color: #fff; }
      .secondary { background: #e5e7eb; color: #111827; }
      .diag { margin-top: 14px; color: #6b7280; font-size: 12px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
    </style>
  </head>
  <body>
    <main class="card">
      <p class="eyebrow">${APP_NAME} Desktop</p>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(message)}</p>
      <div class="actions">
        <button type="button" class="primary" onclick="window.location.reload()">Retry</button>
        <button type="button" class="secondary" onclick="window.location.href='about:blank'">Close</button>
      </div>
      <div class="diag">${escapeHtml(diagnostics || '')}</div>
    </main>
  </body>
</html>`;
}

async function loadShell(win, details) {
  const html = buildBootShell(details);
  await win.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(html)}`);
}

async function resolveStartUrl(win) {
  if (process.env.ELECTRON_START_URL) {
    log('info', 'loading ELECTRON_START_URL', { url: process.env.ELECTRON_START_URL });
    return process.env.ELECTRON_START_URL;
  }

  if (app.isPackaged) {
    const rootDir = path.join(process.resourcesPath, 'web');
    const indexFile = path.join(rootDir, 'index.html');

    log('info', 'packaged web root', { rootDir });

    if (!fs.existsSync(indexFile)) {
      await loadShell(win, {
        title: 'App content is unavailable',
        message: 'The packaged web content could not be found. This screen is shown so the app never launches blank.',
        diagnostics: `Missing file: ${indexFile}`
      });
      return null;
    }

    return pathToFileURL(indexFile).toString();
  }

  const localIndex = path.join(__dirname, '..', 'mobile', 'dist', 'index.html');
  log('info', 'dev/local renderer path', { localIndex });
  return pathToFileURL(localIndex).toString();
}

function attachWindowLogging(win) {
  win.on('ready-to-show', () => log('info', 'window ready-to-show'));
  win.on('unresponsive', () => log('warn', 'window unresponsive'));

  win.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    log(level >= 2 ? 'error' : 'info', 'renderer console-message', { message, line, sourceId, level });
  });

  win.webContents.on('did-finish-load', () => {
    log('info', 'renderer did-finish-load', { url: win.webContents.getURL() });
  });

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    log('error', 'renderer did-fail-load', { errorCode, errorDescription, validatedURL, isMainFrame });
  });

  win.webContents.on('render-process-gone', (_event, details) => {
    log('error', 'render-process-gone', details);
  });
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1080,
    minHeight: 700,
    autoHideMenuBar: false,
    backgroundColor: '#f3f4f6',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow = win;

  attachWindowLogging(win);

  win.on('closed', () => {
    if (mainWindow === win) {
      mainWindow = null;
    }
  });

  const url = await resolveStartUrl(win);
  if (!url) {
    return;
  }

  try {
    await win.loadURL(url);
  } catch (e) {
    await loadShell(win, {
      title: 'Unable to load app content',
      message: 'The app failed to open the main UI, so it showed this fallback instead of launching blank.',
      diagnostics: e instanceof Error ? e.message : String(e)
    });
  }

  return win;
}

function getMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    return mainWindow;
  }

  const [existingWindow] = BrowserWindow.getAllWindows();
  if (existingWindow && !existingWindow.isDestroyed()) {
    mainWindow = existingWindow;
    return existingWindow;
  }

  return null;
}

async function showMainWindow() {
  const existingWindow = getMainWindow();
  if (existingWindow) {
    if (existingWindow.isMinimized()) {
      existingWindow.restore();
    }
    if (!existingWindow.isVisible()) {
      existingWindow.show();
    }
    existingWindow.focus();
    return existingWindow;
  }

  return createWindow();
}

function buildAppMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              {
                label: 'Show Main Window',
                accelerator: 'CmdOrCtrl+0',
                click: () => {
                  showMainWindow().catch((e) => {
                    log('error', 'failed to show main window from app menu', e instanceof Error ? { message: e.message, stack: e.stack } : e);
                  });
                },
              },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
        ]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Show Main Window',
          accelerator: 'CmdOrCtrl+0',
          click: () => {
            showMainWindow().catch((e) => {
              log('error', 'failed to show main window from file menu', e instanceof Error ? { message: e.message, stack: e.stack } : e);
            });
          },
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac ? [{ role: 'pasteAndMatchStyle' }, { role: 'delete' }, { role: 'selectAll' }] : [{ role: 'delete' }, { type: 'separator' }, { role: 'selectAll' }]),
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      role: 'window',
      submenu: [
        { label: 'Show Main Window', accelerator: 'CmdOrCtrl+0', click: () => showMainWindow().catch((e) => log('error', 'failed to show main window from window menu', e instanceof Error ? { message: e.message, stack: e.stack } : e)) },
        { type: 'separator' },
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [{ type: 'separator' }, { role: 'front' }] : [{ role: 'close' }]),
      ],
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Show Main Window',
          click: () => {
            showMainWindow().catch((e) => {
              log('error', 'failed to show main window from help menu', e instanceof Error ? { message: e.message, stack: e.stack } : e);
            });
          },
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
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
    console.log('[PTV_SMOKE_TEST]', { r1, r2, r3, dbPath: desktopDb.getDbPath() });
  } catch (e) {
    console.error('[PTV_SMOKE_TEST] failed', e);
    process.exitCode = 1;
  } finally {
    app.quit();
  }
}

app.whenReady().then(() => {
  registerIpc();
  buildAppMenu();

  if (process.env.PTV_SMOKE_TEST === '1') {
    runSmokeTestAndQuit();
    return;
  }

  showMainWindow().catch((e) => {
    log('error', 'failed to create window', e instanceof Error ? { message: e.message, stack: e.stack } : e);
    app.quit();
  });

  app.on('activate', () => {
    showMainWindow().catch((e) => {
      log('error', 'failed to create window on activate', e instanceof Error ? { message: e.message, stack: e.stack } : e);
    });
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

process.on('uncaughtException', (error) => {
  log('error', 'main uncaughtException', { message: error.message, stack: error.stack });
});

process.on('unhandledRejection', (reason) => {
  log('error', 'main unhandledRejection', reason);
});
