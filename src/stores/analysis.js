import { defineStore } from 'pinia'

export const useAnalysisStore = defineStore('analysis', {
  state: () => ({
    status: 'idle', // idle | running | done | error
    mode: 'deep',    // 'deep' | 'quick' — user-selected analysis mode
    articleText: '',
    articleWordCount: 0,

    // Step states: idle | running | done | error
    steps: {
      triage: { status: 'idle', result: null, error: null },
      extract: { status: 'idle', result: null, error: null },
      detect: { status: 'idle', result: null, error: null },
      report: { status: 'idle', result: null, error: null }
    },

    // Final result
    level: null,   // skip | quick | deep
    report: null,   // final markdown
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
      const order = ['triage', 'extract', 'detect', 'report']
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
      this.error = null
      this.steps = {
        triage: { status: 'idle', result: null, error: null },
        extract: { status: 'idle', result: null, error: null },
        detect: { status: 'idle', result: null, error: null },
        report: { status: 'idle', result: null, error: null }
      }
    },

    setArticle(text) {
      this.articleText = text
      this.articleWordCount = text.length
    },

    async startAnalysis() {
      if (!this.articleText.trim()) return
      this.reset()
      this.status = 'running'

      const cleanup = window.zhicrit.onProgress((payload) => {
        this.handleProgress(payload)
      })

      try {
        const result = await window.zhicrit.startAnalysis(this.articleText, this.mode)
        if (result.error) {
          this.status = 'error'
          this.error = result.error
        } else if (result.report) {
          // Use return value as authoritative — avoids IPC race between
          // webContents.send('analyze:progress') and ipcMain.handle return.
          this.status = 'done'
          this.level = result.level
          this.report = result.report
        }
      } catch (err) {
        this.status = 'error'
        this.error = err.message
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
        }
      }
    }
  }
})
