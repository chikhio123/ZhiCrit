import { defineStore } from 'pinia'
import { useAnalysisStore } from './analysis.js'

export const useHistoryStore = defineStore('history', {
  state: () => ({
    list: [],
    loading: false
  }),

  getters: {
    stats(state) {
      const list = state.list
      if (!list.length) return null

      const deepCount = list.filter(e => e.level === 'deep').length
      const quickCount = list.filter(e => e.level === 'quick').length
      const reportCount = list.filter(e => e.outputMode === 'report').length
      const annotateCount = list.filter(e => e.outputMode === 'annotate').length
      const totalIssues = list.reduce((sum, e) => sum + (e.issueCount || 0), 0)
      const avgWordCount = Math.round(
        list.reduce((sum, e) => sum + (e.wordCount || 0), 0) / list.length
      )

      const monthMap = {}
      list.forEach(e => {
        const month = e.date.slice(0, 7)
        monthMap[month] = (monthMap[month] || 0) + 1
      })
      const analysesByMonth = Object.entries(monthMap)
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => a.month.localeCompare(b.month))

      return {
        totalAnalyses: list.length,
        deepCount,
        quickCount,
        reportCount,
        annotateCount,
        totalIssues,
        avgWordCount,
        analysesByMonth
      }
    }
  },

  actions: {
    async loadList() {
      this.loading = true
      try {
        if (window.zhicrit) {
          this.list = await window.zhicrit.listHistory()
        } else {
          const saved = localStorage.getItem('zhicrit-history')
          this.list = saved ? JSON.parse(saved) : []
        }
      } catch (e) {
        console.error('Failed to load history:', e)
        this.list = []
      } finally {
        this.loading = false
      }
    },

    async viewEntry(id) {
      const entry = this.list.find(e => e.id === id)
      if (!entry) return

      const analysisStore = useAnalysisStore()

      try {
        if (window.zhicrit) {
          const markdown = await window.zhicrit.getHistory(id)
          if (markdown != null && markdown !== '') {
            analysisStore.report = markdown
            analysisStore.level = entry.level
            analysisStore.outputMode = entry.outputMode || 'report'
            analysisStore.articleText = entry.articleText || ''
            analysisStore.status = 'done'
          } else {
            window.__toast?.warning('该历史记录没有报告内容')
          }
        } else {
          // Browser fallback: read from localStorage
          const saved = localStorage.getItem(`zhicrit-history-${id}`)
          if (saved) {
            analysisStore.report = saved
            analysisStore.level = entry.level
            analysisStore.outputMode = entry.outputMode || 'report'
            analysisStore.articleText = entry.articleText || ''
            analysisStore.status = 'done'
          }
        }
      } catch (e) {
        console.error('Failed to load history entry:', e)
        window.__toast?.error('加载历史记录失败')
      }
    },

    async deleteEntry(id) {
      try {
        if (window.zhicrit) {
          await window.zhicrit.deleteHistory(id)
        } else {
          this.list = this.list.filter(e => e.id !== id)
          localStorage.setItem('zhicrit-history', JSON.stringify(this.list))
          localStorage.removeItem(`zhicrit-history-${id}`)
          return
        }
        this.list = this.list.filter(e => e.id !== id)
      } catch (e) {
        console.error('Failed to delete history entry:', e)
      }
    }
  }
})
