const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  isElectron: true,
  platform: process.platform,
  version: process.versions.electron,

  // Window controls
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),

  // Notifications
  sendNotification: (title, body) => {
    new Notification(title, { body });
  },

  // File dialogs
  openFileDialog: async (options) => {
    return await ipcRenderer.invoke('open-file-dialog', options);
  },

  // App events
  onAppFocus: (callback) => ipcRenderer.on('app-focus', callback),
  onAppBlur: (callback) => ipcRenderer.on('app-blur', callback),

  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
});

// Expose versions
contextBridge.exposeInMainWorld('versions', {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron,
});
