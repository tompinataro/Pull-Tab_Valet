const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const desktopDb = require('./db');

function resolveStartUrl() {
  if (process.env.ELECTRON_START_URL) {
    return process.env.ELECTRON_START_URL;
  }

  if (app.isPackaged) {
    const packagedIndex = path.join(process.resourcesPath, 'web', 'index.html');
    return `file://${packagedIndex}`;
  }

  const localIndex = path.join(__dirname, '..', 'mobile', 'dist', 'index.html');
  return `file://${localIndex}`;
}

function createWindow() {
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

  win.loadURL(resolveStartUrl());
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

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
