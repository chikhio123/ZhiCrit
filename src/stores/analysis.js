import { defineStore } from 'pinia'

export const useAnalysisStore = defineStore('analysis', {
  state: () => ({
    status: 'idle', // idle | running | done | error
    mode: 'deep',       // 'deep' | 'quick' — analysis depth
    outputMode: 'report', // 'report' | 'annotate' — output format
    articleText: '',
    articleWordCount: 0,
    lastAnalyzedText: '', // cache key — skip re-run if same article

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

    setArticle(text) {
      this.articleText = text
      this.articleWordCount = text.length
    },

    async startAnalysis() {
      if (!this.articleText.trim()) return

      // Cache hit: same article, already analyzed, requested output is available
      const sameArticle = this.articleText === this.lastAnalyzedText
      if (sameArticle && this.status === 'done') {
        if (this.outputMode === 'annotate' && this.annotations.length) {
          return // 标注模式：直接用已有标注
        }
        if (this.outputMode === 'report' && this.report) {
          return // 分析模式：直接用已有报告
        }
      }

      this.reset()
      this.status = 'running'
      this.lastAnalyzedText = this.articleText

      const cleanup = window.zhicrit.onProgress((payload) => {
        this.handleProgress(payload)
      })

      try {
        const result = await window.zhicrit.startAnalysis(this.articleText, this.mode, this.outputMode)
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
        // Delay cleanup to allow in-flight progress messages to arrive
        setTimeout(() => cleanup(), 100)
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

      // If triage returns skip, mark remaining steps as done
      if (step === 'triage' && status === 'done' && result) {
        if (result.level === 'skip') {
          this.steps.extract.status = 'done'
          this.steps.detect.status = 'done'
          this.steps.report.status = 'done'
          this.steps.annotate.status = 'done'
        }
      }
    }
  }
})
