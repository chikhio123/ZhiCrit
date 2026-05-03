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

function loadConfig() {
  const configPath = getConfigPath()
  const defaults = {
    api_base: 'https://api.deepseek.com',
    api_key: '',
    model: 'deepseek-chat',
    endpoint: '/v1/chat/completions',
    max_tokens: 4096,
    temperature: 0.3
  }
  try {
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      return { ...defaults, ...data }
    }
  } catch (e) {
    console.error('Failed to load config:', e)
  }
  return defaults
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

// Ensure output dir exists
function ensureOutputDir() {
  const outDir = path.join(__dirname, '..', 'output')
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true })
  }
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
    title: '知友 ZhiCrit',
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

ipcMain.handle('analyze:start', async (event, articleText, mode = 'deep', outputMode = 'report') => {
  const config = loadConfig()

  if (!config.api_key) {
    return { error: '请先在设置中配置 API Key' }
  }

  const { triage } = require('../src/core/triage')
  const { extract } = require('../src/core/extract')
  const { detect } = require('../src/core/detect')
  const { report } = require('../src/core/report')
  const { annotate } = require('../src/core/annotate')

  const send = (payload) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('analyze:progress', payload)
    }
  }

  let finalResult = null

  try {
    // Step 1: Triage
    send({ step: 'triage', status: 'running' })
    const triageResult = await triage(articleText, config, (p) => loadPrompt(p))
    send({ step: 'triage', status: 'done', result: triageResult })

    if (triageResult.level === 'skip') {
      finalResult = { level: 'skip', report: triageResult.report || triageResult.verdict }
      send({ step: 'done', result: finalResult })
      return { success: true, ...finalResult }
    }

    // User-selected mode overrides triage level (except skip)
    const isAnnotate = outputMode === 'annotate'
    const isQuick = triageResult.level !== 'skip' && mode === 'quick'
    let extractResult = null
    let detectResult = null

    if (!isQuick) {
      // Step 2: Extract
      send({ step: 'extract', status: 'running' })
      extractResult = await extract(articleText, config, (p) => loadPrompt(p))
      send({ step: 'extract', status: 'done', result: extractResult })

      // Step 3: Detect
      send({ step: 'detect', status: 'running' })
      detectResult = await detect(articleText, extractResult, config, (p) => loadPrompt(p))
      send({ step: 'detect', status: 'done', result: detectResult })
    } else {
      // Quick mode: skip structure extraction and issue detection
      send({ step: 'extract', status: 'done', result: { skipped: true } })
      send({ step: 'detect', status: 'done', result: { skipped: true } })
    }

    // Step 4-5: Report and/or Annotate depending on outputMode
    let reportText = null
    let annotateResult = null

    if (isAnnotate) {
      // 标注模式：skip report, annotate is the main output
      send({ step: 'report', status: 'done', result: { skipped: true } })
    } else {
      // 分析模式：generate report first, then annotate as supplement
      send({ step: 'report', status: 'running' })
      reportText = await report(
        articleText, triageResult, extractResult, detectResult, config, (p) => loadPrompt(p)
      )
      send({ step: 'report', status: 'done', result: { markdown: reportText } })
    }

    // Annotate: in annotation mode it's the main output; in report mode it
    // still runs so switching modes later is instant (cache hit).
    send({ step: 'annotate', status: 'running' })
    annotateResult = await annotate(
      articleText, triageResult, extractResult, detectResult, config, (p) => loadPrompt(p)
    )
    send({ step: 'annotate', status: 'done', result: annotateResult })

    finalResult = {
      level: isQuick ? 'quick' : 'deep',
      outputMode,
      report: reportText,
      annotations: annotateResult.annotations || []
    }
    send({ step: 'done', result: finalResult })

    return { success: true, ...finalResult }
  } catch (err) {
    console.error('Analysis error:', err)
    send({ step: 'error', message: err.message })
    return { error: err.message }
  }
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
