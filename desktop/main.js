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

app.whenReady().then(() => {
  registerIpc();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
