<script setup>
import { computed, onMounted } from 'vue'
import { useHistoryStore } from '../stores/history.js'

const emit = defineEmits(['open-history'])
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

const levelLabel = (l) => ({ deep: '深度分析', quick: '快速分析', skip: '无需分析' }[l] || l)
const levelClass = (l) => ['deep', 'quick', 'skip'].includes(l) ? `badge-${l}` : 'badge-mode'
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
  <div v-if="entry" class="recent-card">
    <div class="recent-top">
      <span class="recent-label">最近分析</span>
      <span class="recent-date">{{ formatDate(entry.date) }}</span>
    </div>

    <p class="recent-preview">"{{ entry.preview || '（无预览）' }}"</p>

    <div class="recent-badges">
      <span class="badge" :class="levelClass(entry.level)">{{ levelLabel(entry.level) }}</span>
      <span class="badge badge-mode">{{ modeLabel(entry.outputMode) }}</span>
      <span v-if="entry.issueCount" class="badge badge-issues">{{ entry.issueCount }} 个问题</span>
      <span class="badge badge-words">{{ formatWordCount(entry.wordCount) }} 字</span>
    </div>

    <div class="recent-actions">
      <button class="recent-btn primary" @click="handleClick">恢复报告</button>
      <button class="recent-btn" @click="emit('open-history')">查看历史</button>
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
}

/* ── Top row ── */
.recent-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
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

.badge-skip {
  background: var(--bg);
  color: var(--text-muted);
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

/* ── Actions ── */
.recent-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-light);
}

.recent-btn {
  flex: 1;
  padding: 7px 0;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-card);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all var(--transition);
}

.recent-btn:hover {
  background: var(--bg);
  border-color: var(--text-muted);
  color: var(--text);
}

.recent-btn.primary {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
}

.recent-btn.primary:hover {
  background: var(--accent-hover);
  box-shadow: 0 2px 8px rgba(var(--accent-rgb), 0.25);
}
</style>
