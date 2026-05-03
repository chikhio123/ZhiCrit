<script setup>
import { ref, onMounted } from 'vue'
import { useHistoryStore } from '../stores/history.js'

const emit = defineEmits(['close'])
const store = useHistoryStore()
const deleteTarget = ref(null)

onMounted(() => {
  store.loadList()
})

function formatDate(iso) {
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

async function handleClick(id) {
  await store.viewEntry(id)
  emit('close')
}

function confirmDelete(id) {
  if (deleteTarget.value === id) {
    store.deleteEntry(id)
    deleteTarget.value = null
  } else {
    deleteTarget.value = id
  }
}

function cancelDelete() {
  deleteTarget.value = null
}

const levelLabel = (l) => ({ deep: '深度', quick: '快速' }[l] || l)
const modeLabel = (m) => ({ report: '分析', annotate: '标注' }[m] || m)
</script>

<template>
  <div class="history-panel" @click.self="emit('close')">
    <div class="history-card">
      <div class="history-header">
        <h2>历史记录</h2>
        <span class="history-count" v-if="store.list.length">{{ store.list.length }} 条</span>
        <button class="close-btn" @click="emit('close')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div class="history-body">
        <!-- Loading -->
        <div v-if="store.loading" class="history-empty">
          <div class="typing-dots"><span></span><span></span><span></span></div>
        </div>

        <!-- Empty -->
        <div v-else-if="!store.list.length" class="history-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.3">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          <p>暂无历史记录</p>
          <p class="sub">分析完成后会自动保存在这里</p>
        </div>

        <!-- List -->
        <div v-else class="history-list">
          <div
            v-for="entry in store.list"
            :key="entry.id"
            class="history-item"
            @click="handleClick(entry.id)"
          >
            <div class="item-main">
              <div class="item-meta">
                <span class="item-date">{{ formatDate(entry.date) }}</span>
                <span class="item-badge" :class="'badge-' + entry.level">{{ levelLabel(entry.level) }}</span>
                <span class="item-mode">{{ modeLabel(entry.outputMode) }}</span>
                <span v-if="entry.issueCount" class="item-issues">{{ entry.issueCount }} 个问题</span>
              </div>
              <p class="item-preview">{{ entry.preview }}{{ entry.wordCount > 40 ? '...' : '' }}</p>
            </div>

            <div class="item-actions" @click.stop>
              <button
                v-if="deleteTarget !== entry.id"
                class="del-btn"
                title="删除"
                @click="confirmDelete(entry.id)"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
              <template v-else>
                <span class="confirm-text">确认删除？</span>
                <button class="confirm-yes" @click="confirmDelete(entry.id)">删除</button>
                <button class="confirm-no" @click="cancelDelete">取消</button>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.history-panel {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 40px 20px;
  background: rgba(248, 247, 244, 0.55);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: var(--radius-lg);
  overflow-y: auto;
}

.history-card {
  width: 100%;
  max-width: 560px;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  overflow: hidden;
}

.history-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 22px;
  border-bottom: 1px solid var(--border-light);
}

.history-header h2 {
  font-size: 18px;
  font-weight: 700;
}

.history-count {
  font-size: 12px;
  color: var(--text-muted);
  background: var(--bg);
  padding: 2px 10px;
  border-radius: 10px;
}

.close-btn {
  margin-left: auto;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: var(--bg);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition);
}

.close-btn:hover {
  background: var(--danger-soft);
  color: var(--danger);
}

.history-body {
  max-height: 60vh;
  overflow-y: auto;
}

.history-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 48px 20px;
  color: var(--text-muted);
}

.history-empty .sub {
  font-size: 12px;
  opacity: 0.7;
}

/* ── List ── */
.history-list {
  padding: 8px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: var(--radius);
  cursor: pointer;
  transition: all var(--transition);
}

.history-item:hover {
  background: var(--accent-soft);
}

.item-main {
  flex: 1;
  min-width: 0;
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  flex-wrap: wrap;
}

.item-date {
  font-size: 12px;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.item-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 8px;
}

.badge-deep { background: var(--accent-soft); color: var(--accent); }
.badge-quick { background: var(--warning-soft); color: var(--warning); }

.item-mode {
  font-size: 10px;
  color: var(--text-muted);
  background: var(--bg);
  padding: 1px 6px;
  border-radius: 6px;
}

.item-issues {
  font-size: 10px;
  color: var(--danger);
  background: var(--danger-soft);
  padding: 1px 6px;
  border-radius: 6px;
}

.item-preview {
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0;
}

.item-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.del-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: all var(--transition);
}

.del-btn:hover {
  background: var(--danger-soft);
  color: var(--danger);
}

.confirm-text {
  font-size: 11px;
  color: var(--danger);
  font-weight: 600;
}

.confirm-yes, .confirm-no {
  padding: 3px 10px;
  border-radius: var(--radius-sm);
  font-size: 11px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  border: none;
  transition: all var(--transition);
}

.confirm-yes {
  background: var(--danger);
  color: white;
}

.confirm-yes:hover {
  background: #dc2626;
}

.confirm-no {
  background: var(--bg);
  color: var(--text-secondary);
  border: 1px solid var(--border);
}

.confirm-no:hover {
  background: var(--border-light);
}

/* ── typing dots ── */
.typing-dots {
  display: flex;
  gap: 5px;
}

.typing-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  animation: typing 1.2s ease-in-out infinite;
}

.typing-dots span:nth-child(2) { animation-delay: 0.15s; }
.typing-dots span:nth-child(3) { animation-delay: 0.3s; }

@keyframes typing {
  0%, 100% { transform: translateY(0); opacity: 0.3; }
  50% { transform: translateY(-5px); opacity: 1; }
}
</style>
