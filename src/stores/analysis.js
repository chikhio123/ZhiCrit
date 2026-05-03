import { defineStore } from 'pinia'
import { useHistoryStore } from './history.js'

export const useAnalysisStore = defineStore('analysis', {
  state: () => ({
    status: 'idle', // idle | running | done | error
    mode: 'deep',       // 'deep' | 'quick' — analysis depth
    outputMode: 'report', // 'report' | 'annotate' — output format
    articleText: '',
    lastAnalyzedText: '',
    lastMode: null,
    lastOutputMode: null,
    // Step states: idle | running | done | error
    steps: {
      triage: { status: 'idle', result: null, error: null },
      extract: { status: 'idle', result: null, error: null },
      detect: { status: 'idle', result: null, error: null },
      report: { status: 'idle', result: null, error: null },
      annotate: { status: 'idle', result: null, error: null }
    },

    // Final result
    level: null,   // skip | quick | deep
    report: null,   // final markdown
    annotations: [], // sentence-level annotations
    error: null
  }),

  getters: {
    isRunning(state) {
      return state.status === 'running'
    },
    isDone(state) {
      return state.status === 'done'
    },
    currentStep(state) {
      const order = ['triage', 'extract', 'detect', 'report', 'annotate']
      for (const step of order) {
        if (state.steps[step].status === 'running') return step
        if (state.steps[step].status === 'idle') return step
      }
      return 'done'
    }
  },

  actions: {
    reset() {
      this.status = 'idle'
      this.level = null
      this.report = null
      this.annotations = []
      this.error = null
      this.steps = {
        triage: { status: 'idle', result: null, error: null },
        extract: { status: 'idle', result: null, error: null },
        detect: { status: 'idle', result: null, error: null },
        report: { status: 'idle', result: null, error: null },
        annotate: { status: 'idle', result: null, error: null }
      }
    },

    async startAnalysis() {
      if (!this.articleText.trim()) return

      // Prevent concurrent analyses — multiple runs would accumulate IPC listeners
      // and cause state corruption
      if (this.status === 'running') {
        window.__toast?.info('分析正在进行中，请等待完成～')
        return
      }

      // Cache: same article + same depth → instant mode switch
      // Only when switching to a different output mode that already has results
      const sameRequest = this.articleText === this.lastAnalyzedText && this.mode === this.lastMode
      if (sameRequest && this.status === 'done') {
        if (this.outputMode === 'annotate' && this.outputMode !== this.lastOutputMode && this.annotations.length) {
          window.__toast?.success('已切换至标注模式～')
          return
        }
        if (this.outputMode === 'report' && this.outputMode !== this.lastOutputMode && this.report) {
          window.__toast?.success('已切换至分析模式～')
          return
        }
      }

      // Capture existing results to avoid re-running steps — only if same article
      // and the results are real (not skip placeholders from quick mode).
      const sameArticle = this.articleText === this.lastAnalyzedText
      const prevSteps = {}
      if (sameArticle) {
        for (const key of ['triage', 'extract', 'detect']) {
          const r = this.steps[key].result
          if (this.steps[key].status === 'done' && r && !r.skipped) {
            // Deep-clone to strip Vue reactive proxies — IPC needs plain objects
            prevSteps[key] = JSON.parse(JSON.stringify(r))
          }
        }
        // Pass existing report to annotate for richer context
        if (this.outputMode === 'annotate' && this.report) {
          prevSteps.report = { markdown: this.report }
        }
      }

      this.reset()
      this.status = 'running'
      this.lastAnalyzedText = this.articleText
      this.lastMode = this.mode

      const cleanup = window.zhicrit.onProgress((payload) => {
        this.handleProgress(payload)
      })

      const cleanupChunk = window.zhicrit.onChunk(({ step, chunk }) => {
        if (step === 'report') {
          this.report = (this.report || '') + chunk
        }
      })

      try {
        const result = await window.zhicrit.startAnalysis(
          this.articleText, this.mode, this.outputMode, prevSteps
        )
        if (result.error) {
          this.status = 'error'
          this.error = result.error
          window.__toast?.error(result.error)
        } else if (result.success) {
          // Use return value as authoritative — avoids IPC race between
          // webContents.send('analyze:progress') and ipcMain.handle return.
          this.status = 'done'
          this.level = result.level
          this.report = result.report
          this.annotations = result.annotations || []
          this.outputMode = result.outputMode || this.outputMode
          this.lastOutputMode = this.outputMode

          // Persist to localStorage as backup (Electron main saves to file)
          if (result.level !== 'skip') {
            const historyStore = useHistoryStore()
            historyStore.addEntry(this.articleText, result)
          }

          if (result.level === 'skip') {
            window.__toast?.info('该文章无需深度分析')
          } else {
            const label = this.outputMode === 'annotate' ? '标注完成～' : '分析完成～'
            window.__toast?.success(label)
          }
        }
      } catch (err) {
        this.status = 'error'
        this.error = err.message
        window.__toast?.error(err.message || '分析失败')
      } finally {
        // Delay cleanup to allow in-flight progress/stream messages to arrive
        setTimeout(() => {
          cleanup()
          cleanupChunk()
        }, 100)
      }
    },

    handleProgress(payload) {
      const { step, status, result, message } = payload

      if (step === 'done') {
        this.status = 'done'
        if (result) {
          this.level = result.level
          this.report = result.report
          this.annotations = result.annotations || []
          this.outputMode = result.outputMode || this.outputMode
          this.lastOutputMode = this.outputMode

          if (result.level !== 'skip') {
            const historyStore = useHistoryStore()
            historyStore.addEntry(this.articleText, result)
          }
        }
        return
      }

      if (step === 'error') {
        this.status = 'error'
        this.error = message
        return
      }

      if (this.steps[step]) {
        this.steps[step].status = status
        if (result) {
          this.steps[step].result = result
        }
      }
    }
  }
})
