<script setup>
import { computed, onMounted } from 'vue'
import { useHistoryStore } from '../stores/history.js'

const store = useHistoryStore()

onMounted(() => {
  store.loadList()
})

const entry = computed(() => store.latestEntry)

function formatDate(iso) {
  if (!iso) return '--'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '--'
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${d.getMonth() + 1}月${d.getDate()}日 ${hh}:${mm}`
}

function formatWordCount(n) {
  if (n == null) return '--'
  if (n >= 1000) {
    const k = n / 1000
    return k >= 10 ? Math.round(k) + 'K' : k.toFixed(1) + 'K'
  }
  return String(n)
}

const levelLabel = (l) => ({ deep: '深度分析', quick: '快速分析' }[l] || l)
const modeLabel = (m) => ({ report: '报告模式', annotate: '标注模式' }[m] || m)

function handleClick() {
  if (!entry.value) return
  if (!entry.value.articleText) {
    window.__toast?.info('该记录缺少文章内容，无法恢复')
    return
  }
  store.viewEntry(entry.value.id)
}
</script>

<template>
  <div v-if="entry" class="recent-card" @click="handleClick">
    <div class="recent-top">
      <span class="recent-icon">📋</span>
      <span class="recent-label">最近分析</span>
      <span class="recent-date">{{ formatDate(entry.date) }}</span>
    </div>

    <p class="recent-preview">"{{ entry.preview || '（无预览）' }}"</p>

    <div class="recent-badges">
      <span class="badge" :class="'badge-' + entry.level">{{ levelLabel(entry.level) }}</span>
      <span class="badge badge-mode">{{ modeLabel(entry.outputMode) }}</span>
      <span v-if="entry.issueCount" class="badge badge-issues">{{ entry.issueCount }} 个问题</span>
      <span class="badge badge-words">{{ formatWordCount(entry.wordCount) }} 字</span>
    </div>
  </div>
</template>

<style scoped>
.recent-card {
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  background: var(--bg-card);
  box-shadow: var(--shadow);
  padding: 16px 18px;
  cursor: pointer;
  transition: all var(--transition);
}

.recent-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

/* ── Top row ── */
.recent-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.recent-icon {
  font-size: 14px;
  line-height: 1;
}

.recent-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

.recent-date {
  margin-left: auto;
  font-size: 12px;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

/* ── Preview ── */
.recent-preview {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0 0 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Badges ── */
.recent-badges {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.badge {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 8px;
  white-space: nowrap;
}

.badge-deep {
  background: var(--accent-soft);
  color: var(--accent);
}

.badge-quick {
  background: var(--warning-soft);
  color: var(--warning);
}

.badge-mode {
  background: var(--bg);
  color: var(--text-muted);
  border: 1px solid var(--border-light);
}

.badge-issues {
  background: var(--danger-soft);
  color: var(--danger);
}

.badge-words {
  background: var(--success-soft);
  color: var(--success);
}
</style>
