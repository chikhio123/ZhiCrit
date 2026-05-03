const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('zhicrit', {
  getConfig: () => ipcRenderer.invoke('config:get'),
  setConfig: (config) => ipcRenderer.invoke('config:set', config),
  startAnalysis: (articleText, mode, outputMode) => ipcRenderer.invoke('analyze:start', articleText, mode, outputMode),
  saveReport: (markdown) => ipcRenderer.invoke('report:save', markdown),
  onProgress: (callback) => {
    const handler = (_event, payload) => callback(payload)
    ipcRenderer.on('analyze:progress', handler)
    return () => ipcRenderer.removeListener('analyze:progress', handler)
  }
})
