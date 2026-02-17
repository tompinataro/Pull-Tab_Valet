const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('desktopMeta', {
  appName: 'Pull Tab Valet',
});
