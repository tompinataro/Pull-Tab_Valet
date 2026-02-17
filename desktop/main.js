const { app, BrowserWindow } = require('electron');
const path = require('path');

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

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
