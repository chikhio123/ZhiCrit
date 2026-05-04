const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')

// Determine if running in development
const isDev = !app.isPackaged
const VITE_PORT = process.env.VITE_PORT || '5173'
const VITE_URL = process.env.VITE_DEV_SERVER_URL || `http://localhost:${VITE_PORT}`

let mainWindow = null

function getConfigPath() {
  return path.join(app.getPath('userData'), 'config.json')
}

const profileDefaults = {
  api_base: 'https://api.deepseek.com',
  api_key: '',
  model: 'deepseek-chat',
  endpoint: '/v1/chat/completions',
  max_tokens: 4096,
  temperature: 0.3
}

function loadConfig() {
  const configPath = getConfigPath()
  const defaultConfig = {
    profiles: [{ name: '默认', ...profileDefaults }],
    activeProfile: '默认',
    streaming: false
  }
  try {
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'))

      // Migrate old flat format to profiles structure
      if (!data.profiles && data.api_base !== undefined) {
        const migrated = {
          profiles: [{
            name: '默认',
            api_base: data.api_base ?? profileDefaults.api_base,
            api_key: data.api_key ?? profileDefaults.api_key,
            model: data.model ?? profileDefaults.model,
            endpoint: data.endpoint ?? profileDefaults.endpoint,
            max_tokens: data.max_tokens ?? profileDefaults.max_tokens,
            temperature: data.temperature ?? profileDefaults.temperature
          }],
          activeProfile: '默认'
        }
        fs.writeFileSync(configPath, JSON.stringify(migrated, null, 2), 'utf-8')
        return migrated
      }

      if (data.profiles) {
        return data
      }
    }
  } catch (e) {
    console.error('Failed to load config:', e)
  }
  return defaultConfig
}

function getActiveConfig(fullConfig) {
  const profiles = fullConfig.profiles || []
  const name = fullConfig.activeProfile
  const profile = profiles.find(p => p.name === name) || profiles[0]
  if (!profile) return { ...profileDefaults }
  return {
    api_base: profile.api_base ?? profileDefaults.api_base,
    api_key: profile.api_key ?? profileDefaults.api_key,
    model: profile.model ?? profileDefaults.model,
    endpoint: profile.endpoint ?? profileDefaults.endpoint,
    max_tokens: profile.max_tokens ?? profileDefaults.max_tokens,
    temperature: profile.temperature ?? profileDefaults.temperature,
    streaming: fullConfig.streaming ?? false
  }
}

function saveConfig(config) {
  const configPath = getConfigPath()
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')
}

function getPromptPath(name) {
  if (isDev) {
    return path.join(__dirname, '..', 'src', 'prompts', name)
  }
  // In production, prompts are in the extraResources directory
  return path.join(process.resourcesPath, 'prompts', name)
}

// History storage — uses userData so it survives app updates and works in production
function getHistoryDir() {
  const dir = path.join(app.getPath('userData'), 'history')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

function getHistoryPath() {
  return path.join(getHistoryDir(), 'history.json')
}

function loadHistory() {
  const p = getHistoryPath()
  try {
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf-8'))
    }
  } catch (e) {
    console.error('Failed to load history:', e)
  }
  return []
}

function saveHistory(list) {
  fs.writeFileSync(getHistoryPath(), JSON.stringify(list, null, 2), 'utf-8')
}

function getReportPath(id) {
  return path.join(getHistoryDir(), `analysis-${id}.md`)
}

function getAnnotationsPath(id) {
  return path.join(getHistoryDir(), `analysis-${id}-annotations.json`)
}

function loadPrompt(name) {
  const promptPath = getPromptPath(name)
  return fs.readFileSync(promptPath, 'utf-8')
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: '论衡',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (isDev) {
    mainWindow.loadURL(VITE_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
}

// ---- IPC Handlers ----

ipcMain.handle('dialog:message', async (_event, options) => {
  const result = await dialog.showMessageBox(mainWindow, {
    type: options.type || 'info',
    title: options.title || '论衡',
    message: options.message,
    buttons: ['确定']
  })
  return result
})

ipcMain.handle('config:get', () => {
  return loadConfig()
})

ipcMain.handle('config:set', (_event, config) => {
  saveConfig(config)
  return { success: true }
})

ipcMain.handle('report:save', async (_event, markdown) => {
  const result = await dialog.showSaveDialog(mainWindow, {
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

ipcMain.handle('analyze:start', async (event, articleText, mode = 'deep', outputMode = 'report', prevSteps = null) => {
  const config = getActiveConfig(loadConfig())

  if (!config.api_key) {
    return { error: '请先在设置中配置 API Key' }
  }

  const { triage } = require('../src/core/triage')
  const { extract } = require('../src/core/extract')
  const { detect } = require('../src/core/detect')
  const { report, reportStream } = require('../src/core/report')
  const { annotate } = require('../src/core/annotate')

  const send = (payload) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('analyze:progress', payload)
    }
  }

  let finalResult = null

  try {
    // Step 1: Triage — reuse if available
    let triageResult = (prevSteps && prevSteps.triage) || null
    if (triageResult) {
      send({ step: 'triage', status: 'done', result: triageResult, cached: true })
    } else {
      send({ step: 'triage', status: 'running' })
      triageResult = await triage(articleText, config, (p) => loadPrompt(p))
      send({ step: 'triage', status: 'done', result: triageResult })
    }

    // Skip gate only applies when user didn't explicitly choose deep
    if (triageResult.level === 'skip' && mode !== 'deep') {
      finalResult = { level: 'skip', report: triageResult.report || triageResult.verdict }
      send({ step: 'done', result: finalResult })
      return { success: true, ...finalResult }
    }

    // User-selected mode overrides triage level
    const isAnnotate = outputMode === 'annotate'
    const isQuick = triageResult.level !== 'skip' && mode === 'quick'
    let extractResult = null
    let detectResult = null

    if (!isQuick) {
      // Step 2: Extract — reuse if available
      extractResult = (prevSteps && prevSteps.extract) || null
      if (extractResult) {
        send({ step: 'extract', status: 'done', result: extractResult, cached: true })
      } else {
        send({ step: 'extract', status: 'running' })
        extractResult = await extract(articleText, config, (p) => loadPrompt(p))
        send({ step: 'extract', status: 'done', result: extractResult })
      }

      // Step 3: Detect — reuse if available
      detectResult = (prevSteps && prevSteps.detect) || null
      if (detectResult) {
        send({ step: 'detect', status: 'done', result: detectResult, cached: true })
      } else {
        send({ step: 'detect', status: 'running' })
        detectResult = await detect(articleText, extractResult, config, (p) => loadPrompt(p))
        send({ step: 'detect', status: 'done', result: detectResult })
      }
    } else {
      // Quick mode: skip structure extraction and issue detection
      send({ step: 'extract', status: 'done', result: { skipped: true } })
      send({ step: 'detect', status: 'done', result: { skipped: true } })
    }

    // Step 4-5: Report and/or Annotate depending on outputMode
    let reportText = null
    let annotateResult = null

    // Report: always generate — needed for mode switching between report/annotate
    if (prevSteps && prevSteps.report) {
      reportText = prevSteps.report.markdown
      send({ step: 'report', status: 'done', result: { markdown: reportText }, cached: true })
    } else {
      send({ step: 'report', status: 'running' })
      if (config.streaming) {
        reportText = ''
        for await (const chunk of reportStream(
          articleText, triageResult, extractResult, detectResult, config, (p) => loadPrompt(p)
        )) {
          reportText += chunk
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('analyze:chunk', { step: 'report', chunk })
          }
        }
      } else {
        reportText = await report(
          articleText, triageResult, extractResult, detectResult, config, (p) => loadPrompt(p)
        )
      }
      send({ step: 'report', status: 'done', result: { markdown: reportText } })
    }

    // Annotate: run only in annotate mode
    if (!isAnnotate) {
      send({ step: 'annotate', status: 'done', result: { skipped: true } })
    } else {
      send({ step: 'annotate', status: 'running' })
      annotateResult = await annotate(
        articleText, triageResult, extractResult, detectResult, reportText, config, (p) => loadPrompt(p)
      )
      send({ step: 'annotate', status: 'done', result: annotateResult })
    }

    finalResult = {
      level: isQuick ? 'quick' : 'deep',
      outputMode,
      report: reportText,
      annotations: annotateResult?.annotations || []
    }
    send({ step: 'done', result: finalResult })

    // Auto-save to history (skip if triage said skip)
    if (finalResult.level !== 'skip') {
      const now = new Date()
      const id = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
      const wordCount = articleText.length
      const preview = articleText.replace(/\s+/g, '').slice(0, 40)
      const issueCount = detectResult?.issues?.length || 0

      try {
        const content = reportText || `# 标注模式分析\n\n该分析使用标注模式，未生成传统报告。\n\n标注数量：${annotateResult?.annotations?.length || 0}`
        fs.writeFileSync(getReportPath(id), content, 'utf-8')

        // Also persist annotations as sidecar JSON for annotate mode restoration
        const anns = annotateResult?.annotations
        if (anns && anns.length) {
          fs.writeFileSync(getAnnotationsPath(id), JSON.stringify(anns, null, 2), 'utf-8')
        }

        // Deduplicate: same article → overwrite old entry instead of adding a duplicate
        const list = loadHistory()
        const dupIdx = list.findIndex(e => e.articleText === articleText)
        if (dupIdx !== -1) {
          const oldId = list[dupIdx].id
          const oldReport = getReportPath(oldId)
          if (oldId !== id && fs.existsSync(oldReport)) {
            fs.unlinkSync(oldReport)
          }
          const oldAnnotations = getAnnotationsPath(oldId)
          if (fs.existsSync(oldAnnotations)) {
            fs.unlinkSync(oldAnnotations)
          }
          list.splice(dupIdx, 1)
        }
        list.unshift({
          id,
          date: now.toISOString(),
          preview,
          wordCount,
          level: finalResult.level,
          issueCount,
          outputMode: finalResult.outputMode,
          articleText
        })
        saveHistory(list)
      } catch (e) {
        console.error('Failed to save history:', e)
      }
    }

    return { success: true, ...finalResult }
  } catch (err) {
    console.error('Analysis error:', err)
    send({ step: 'error', message: err.message })
    return { error: err.message }
  }
})

// ---- History IPC ----

ipcMain.handle('history:list', () => {
  return loadHistory()
})

ipcMain.handle('history:get', (_event, id) => {
  const p = getReportPath(id)
  if (fs.existsSync(p)) {
    return fs.readFileSync(p, 'utf-8')
  }
  return null
})

ipcMain.handle('history:getAnnotations', (_event, id) => {
  const p = getAnnotationsPath(id)
  if (fs.existsSync(p)) {
    try {
      return JSON.parse(fs.readFileSync(p, 'utf-8'))
    } catch {
      return []
    }
  }
  return []
})

ipcMain.handle('history:delete', (_event, id) => {
  const list = loadHistory()
  const idx = list.findIndex(e => e.id === id)
  if (idx !== -1) {
    list.splice(idx, 1)
    saveHistory(list)
  }
  const rp = getReportPath(id)
  if (fs.existsSync(rp)) {
    fs.unlinkSync(rp)
  }
  const ap = getAnnotationsPath(id)
  if (fs.existsSync(ap)) {
    fs.unlinkSync(ap)
  }
  return { success: true }
})

// ---- App Lifecycle ----

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
