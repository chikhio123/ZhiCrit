const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('zhicrit', {
  getConfig: () => ipcRenderer.invoke('config:get'),
  setConfig: (config) => ipcRenderer.invoke('config:set', config),
  startAnalysis: (articleText, mode, outputMode, prevSteps) => ipcRenderer.invoke('analyze:start', articleText, mode, outputMode, prevSteps),
  saveReport: (markdown) => ipcRenderer.invoke('report:save', markdown),
  showMessage: (options) => ipcRenderer.invoke('dialog:message', options),
  onProgress: (callback) => {
    const handler = (_event, payload) => callback(payload)
    ipcRenderer.on('analyze:progress', handler)
    return () => ipcRenderer.removeListener('analyze:progress', handler)
  },
  onChunk: (callback) => {
    const handler = (_event, payload) => callback(payload)
    ipcRenderer.on('analyze:chunk', handler)
    return () => ipcRenderer.removeListener('analyze:chunk', handler)
  },
  listHistory: () => ipcRenderer.invoke('history:list'),
  getHistory: (id) => ipcRenderer.invoke('history:get', id),
  getHistoryAnnotations: (id) => ipcRenderer.invoke('history:getAnnotations', id),
  deleteHistory: (id) => ipcRenderer.invoke('history:delete', id)
})
