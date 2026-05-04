const { app, BrowserWindow } = require('electron')
const path = require('path')
const {
  profileDefaults,
  loadConfig, getActiveConfig, saveConfig,
  loadPrompt,
  loadHistory, saveHistory, getReportPath, getAnnotationsPath, deleteHistoryFiles
} = require('./storage')

const isDev = !app.isPackaged
const VITE_PORT = process.env.VITE_PORT || '5173'
const VITE_URL = process.env.VITE_DEV_SERVER_URL || `http://localhost:${VITE_PORT}`
const userDataPath = app.getPath('userData')
const promptCtx = { isDev, resourcesPath: process.resourcesPath, __dirname }

let mainWindow = null

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

// ── IPC Handlers ──

const { registerHandlers } = require('./ipc-handlers')

registerHandlers({
  getMainWindow: () => mainWindow,
  userDataPath,
  loadConfig: () => loadConfig(userDataPath),
  saveConfig: (c) => saveConfig(userDataPath, c),
  loadHistory: () => loadHistory(userDataPath),
  saveHistory: (list) => saveHistory(userDataPath, list),
  getReportPath: (id) => getReportPath(userDataPath, id),
  getAnnotationsPath: (id) => getAnnotationsPath(userDataPath, id),
  deleteHistoryFiles: (id) => deleteHistoryFiles(userDataPath, id),
  analyzeHandler
})

// ── Analysis Pipeline ──

async function analyzeHandler(event, articleText, mode = 'deep', outputMode = 'report', prevSteps = null) {
  const config = getActiveConfig(loadConfig(userDataPath))

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
    // Step 1: Triage
    let triageResult = (prevSteps && prevSteps.triage) || null
    if (triageResult) {
      send({ step: 'triage', status: 'done', result: triageResult, cached: true })
    } else {
      send({ step: 'triage', status: 'running' })
      triageResult = await triage(articleText, config, (name) => loadPrompt(name, promptCtx))
      send({ step: 'triage', status: 'done', result: triageResult })
    }

    if (triageResult.level === 'skip' && mode !== 'deep') {
      finalResult = { level: 'skip', report: triageResult.report || triageResult.verdict }
      send({ step: 'done', result: finalResult })
      return { success: true, ...finalResult }
    }

    const isAnnotate = outputMode === 'annotate'
    const isQuick = triageResult.level !== 'skip' && mode === 'quick'
    let extractResult = null
    let detectResult = null

    if (!isQuick) {
      // Step 2: Extract
      extractResult = (prevSteps && prevSteps.extract) || null
      if (extractResult) {
        send({ step: 'extract', status: 'done', result: extractResult, cached: true })
      } else {
        send({ step: 'extract', status: 'running' })
        extractResult = await extract(articleText, config, (name) => loadPrompt(name, promptCtx))
        send({ step: 'extract', status: 'done', result: extractResult })
      }

      // Step 3: Detect
      detectResult = (prevSteps && prevSteps.detect) || null
      if (detectResult) {
        send({ step: 'detect', status: 'done', result: detectResult, cached: true })
      } else {
        send({ step: 'detect', status: 'running' })
        detectResult = await detect(articleText, extractResult, config, (name) => loadPrompt(name, promptCtx))
        send({ step: 'detect', status: 'done', result: detectResult })
      }
    } else {
      send({ step: 'extract', status: 'done', result: { skipped: true } })
      send({ step: 'detect', status: 'done', result: { skipped: true } })
    }

    // Step 4: Report
    let reportText = null
    let annotateResult = null

    if (prevSteps && prevSteps.report) {
      reportText = prevSteps.report.markdown
      send({ step: 'report', status: 'done', result: { markdown: reportText }, cached: true })
    } else {
      send({ step: 'report', status: 'running' })
      if (config.streaming) {
        reportText = ''
        for await (const chunk of reportStream(
          articleText, triageResult, extractResult, detectResult, config, (name) => loadPrompt(name, promptCtx)
        )) {
          reportText += chunk
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('analyze:chunk', { step: 'report', chunk })
          }
        }
      } else {
        reportText = await report(
          articleText, triageResult, extractResult, detectResult, config, (name) => loadPrompt(name, promptCtx)
        )
      }
      send({ step: 'report', status: 'done', result: { markdown: reportText } })
    }

    // Step 5: Annotate
    if (!isAnnotate) {
      send({ step: 'annotate', status: 'done', result: { skipped: true } })
    } else {
      send({ step: 'annotate', status: 'running' })
      annotateResult = await annotate(
        articleText, triageResult, extractResult, detectResult, reportText, config, (name) => loadPrompt(name, promptCtx)
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

    // Auto-save history
    if (finalResult.level !== 'skip') {
      const now = new Date()
      const id = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
      const wordCount = articleText.length
      const preview = articleText.replace(/\s+/g, '').slice(0, 40)
      const issueCount = detectResult?.issues?.length || 0

      try {
        const content = reportText || `# 标注模式分析\n\n该分析使用标注模式，未生成传统报告。\n\n标注数量：${annotateResult?.annotations?.length || 0}`
        const fs = require('fs')
        fs.writeFileSync(getReportPath(userDataPath, id), content, 'utf-8')

        const anns = annotateResult?.annotations
        if (anns && anns.length) {
          fs.writeFileSync(getAnnotationsPath(userDataPath, id), JSON.stringify(anns, null, 2), 'utf-8')
        }

        const list = loadHistory(userDataPath)
        const dupIdx = list.findIndex(e => e.articleText === articleText)
        if (dupIdx !== -1) {
          deleteHistoryFiles(userDataPath, list[dupIdx].id)
          list.splice(dupIdx, 1)
        }
        list.unshift({
          id, date: now.toISOString(), preview, wordCount,
          level: finalResult.level, issueCount,
          outputMode: finalResult.outputMode, articleText
        })
        saveHistory(userDataPath, list)
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
}

// ── App Lifecycle ──

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
