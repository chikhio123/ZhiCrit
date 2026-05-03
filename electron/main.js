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
    activeProfile: '默认'
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
    temperature: profile.temperature ?? profileDefaults.temperature
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
  const { report } = require('../src/core/report')
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

    // Report: run only in report mode, or reuse cached
    if (prevSteps && prevSteps.report) {
      reportText = prevSteps.report.markdown
      send({ step: 'report', status: 'done', result: { markdown: reportText }, cached: true })
    } else if (isAnnotate) {
      send({ step: 'report', status: 'done', result: { skipped: true } })
    } else {
      send({ step: 'report', status: 'running' })
      reportText = await report(
        articleText, triageResult, extractResult, detectResult, config, (p) => loadPrompt(p)
      )
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
