const { ipcMain, dialog } = require('electron')
const fs = require('fs')

function registerHandlers({
  getMainWindow,
  userDataPath,
  loadConfig,
  saveConfig,
  loadHistory,
  saveHistory,
  getReportPath,
  getAnnotationsPath,
  deleteHistoryFiles,
  analyzeHandler
}) {

  // 1. dialog:message
  ipcMain.handle('dialog:message', async (_event, options) => {
    const result = await dialog.showMessageBox(getMainWindow(), {
      type: options.type || 'info',
      title: options.title || '论衡',
      message: options.message,
      buttons: ['确定']
    })
    return result
  })

  // 2. config:get
  ipcMain.handle('config:get', () => {
    return loadConfig(userDataPath)
  })

  // 3. config:set
  ipcMain.handle('config:set', (_event, config) => {
    saveConfig(userDataPath, config)
    return { success: true }
  })

  // 4. report:save
  ipcMain.handle('report:save', async (_event, markdown) => {
    const result = await dialog.showSaveDialog(getMainWindow(), {
      title: '保存分析报告',
      defaultPath: `analysis-${Date.now()}.md`,
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    })
    if (!result.canceled && result.filePath) {
      fs.writeFileSync(result.filePath, markdown, 'utf-8')
      return { success: true, path: result.filePath }
    }
    return { success: false }
  })

  // 5. analyze:start — handler stays in main.js, just register it here
  ipcMain.handle('analyze:start', analyzeHandler)

  // 6. history:list
  ipcMain.handle('history:list', () => {
    return loadHistory(userDataPath)
  })

  // 7. history:get
  ipcMain.handle('history:get', (_event, id) => {
    const p = getReportPath(userDataPath, id)
    if (fs.existsSync(p)) {
      return fs.readFileSync(p, 'utf-8')
    }
    return null
  })

  // 8. history:getAnnotations
  ipcMain.handle('history:getAnnotations', (_event, id) => {
    const p = getAnnotationsPath(userDataPath, id)
    if (fs.existsSync(p)) {
      try {
        return JSON.parse(fs.readFileSync(p, 'utf-8'))
      } catch {
        return []
      }
    }
    return []
  })

  // 9. history:delete
  ipcMain.handle('history:delete', (_event, id) => {
    const list = loadHistory(userDataPath)
    const idx = list.findIndex(e => e.id === id)
    if (idx !== -1) {
      list.splice(idx, 1)
      saveHistory(userDataPath, list)
    }
    try {
      deleteHistoryFiles(userDataPath, id)
    } catch (e) {
      console.error('Failed to delete history files:', e)
    }
    return { success: true }
  })
}

module.exports = { registerHandlers }
