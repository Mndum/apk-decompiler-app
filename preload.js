const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('apkApp', {
  chooseApk: () => ipcRenderer.invoke('dialog:apk'),
  chooseOutput: () => ipcRenderer.invoke('dialog:output'),
  detectTools: () => ipcRenderer.invoke('tools:detect'),
  decompile: (apkPath, outputDir) => ipcRenderer.invoke('decompile:start', { apkPath, outputDir }),
  onLog: (callback) => {
    const listener = (_event, message) => callback(message);
    ipcRenderer.on('decompile:log', listener);
    return () => ipcRenderer.removeListener('decompile:log', listener);
  }
});
