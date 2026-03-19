const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopMeta', {
  appName: 'Pull Tab Valet',
});

// Expose a minimal, typed-ish bridge for desktop-only local storage.
contextBridge.exposeInMainWorld('ptvDesktop', {
  db: {
    ensureSchema: () => ipcRenderer.invoke('ptv.db.ensureSchema'),
    upsertScan: (venueId, upc) => ipcRenderer.invoke('ptv.db.upsertScan', venueId, upc),
    countQueuedForVenue: (venueId) => ipcRenderer.invoke('ptv.db.countQueuedForVenue', venueId),
    path: () => ipcRenderer.invoke('ptv.db.path'),
  },
});
