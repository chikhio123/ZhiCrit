<script setup>
import { ref, computed } from 'vue'
import { useAnalysisStore } from '../stores/analysis.js'

const analysisStore = useAnalysisStore()
const isFocused = ref(false)

const wordCount = computed(() => analysisStore.articleText.length)
const canAnalyze = computed(() => analysisStore.articleText.trim().length > 0 && !analysisStore.isRunning)

function handleAnalyze() {
  if (!canAnalyze.value) return
  analysisStore.startAnalysis()
}

function handleClear() {
  analysisStore.articleText = ''
  analysisStore.reset()
}

const modeLabel = computed(() => {
  if (analysisStore.outputMode === 'annotate') {
    return analysisStore.mode === 'deep' ? '开始标注（深度）' : '开始标注（快速）'
  }
  return analysisStore.mode === 'deep' ? '开始分析（深度）' : '开始分析（快速）'
})
</script>

<template>
  <div class="article-input">
    <div class="input-topbar">
      <div class="input-label">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
        <span>文章内容</span>
      </div>
      <div class="topbar-right">
        <span class="word-badge" :class="{ 'has-content': wordCount > 0 }">
          {{ wordCount.toLocaleString() }} 字
        </span>
      </div>
    </div>

    <!-- Mode Selector -->
    <div class="mode-selector">
      <div class="mode-row">
        <button
          class="mode-card"
          :class="{ active: analysisStore.outputMode === 'report' }"
          :disabled="analysisStore.isRunning"
          @click="analysisStore.outputMode = 'report'"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          <div class="mode-card-text">
            <span class="mode-card-title">分析报告</span>
            <span class="mode-card-desc">结构化报告</span>
          </div>
        </button>
        <button
          class="mode-card"
          :class="{ active: analysisStore.outputMode === 'annotate' }"
          :disabled="analysisStore.isRunning"
          @click="analysisStore.outputMode = 'annotate'"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
          <div class="mode-card-text">
            <span class="mode-card-title">原文标注</span>
            <span class="mode-card-desc">三色高亮标记</span>
          </div>
        </button>
      </div>
      <div class="depth-row">
        <span class="depth-label">{{ analysisStore.outputMode === 'report' ? '分析深度' : '标注深度' }}</span>
        <div class="depth-switch">
          <button
            class="depth-btn"
            :class="{ active: analysisStore.mode === 'deep' }"
            :disabled="analysisStore.isRunning"
            @click="analysisStore.mode = 'deep'"
          >深度</button>
          <button
            class="depth-btn"
            :class="{ active: analysisStore.mode === 'quick' }"
            :disabled="analysisStore.isRunning"
            @click="analysisStore.mode = 'quick'"
          >快速</button>
        </div>
      </div>
    </div>

    <div class="textarea-wrapper" :class="{ focused: isFocused }">
      <textarea
        v-model="analysisStore.articleText"
        placeholder="在此粘贴要分析的文章..."
        :disabled="analysisStore.isRunning"
        @focus="isFocused = true"
        @blur="isFocused = false"
      ></textarea>
    </div>

    <div class="input-actions">
      <button
        class="btn-analyze"
        :class="{ running: analysisStore.isRunning }"
        :disabled="!canAnalyze"
        @click="handleAnalyze"
      >
        <svg v-if="!analysisStore.isRunning" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
        <span class="spinner" v-else></span>
        {{ analysisStore.isRunning ? '处理中...' : modeLabel }}
      </button>
      <button
        class="btn-clear"
        :disabled="analysisStore.isRunning || wordCount === 0"
        @click="handleClear"
      >
        清空
      </button>
    </div>
  </div>
</template>

<style scoped>
.article-input {
  padding: 20px;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.input-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.input-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.word-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 12px;
  background: var(--bg);
  color: var(--text-muted);
  transition: all var(--transition);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.word-badge.has-content {
  background: var(--accent-soft);
  color: var(--accent);
}

/* ── Mode Selector ── */
.mode-selector {
  margin-bottom: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mode-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.mode-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border: 2px solid var(--border-light);
  border-radius: var(--radius);
  background: var(--bg-card);
  cursor: pointer;
  transition: all var(--transition);
  font-family: inherit;
  text-align: left;
  color: var(--text-muted);
}

.mode-card svg {
  flex-shrink: 0;
  opacity: 0.4;
  transition: opacity var(--transition);
}

.mode-card.active {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
}

.mode-card.active svg {
  opacity: 1;
}

.mode-card:hover:not(.active):not(:disabled) {
  border-color: var(--border);
  background: var(--bg);
}

.mode-card:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.mode-card-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.mode-card-title {
  font-size: 13px;
  font-weight: 700;
}

.mode-card-desc {
  font-size: 11px;
  opacity: 0.6;
}

/* ── Depth Row ── */
.depth-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2px;
}

.depth-label {
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 500;
}

.depth-switch {
  display: flex;
  background: var(--bg);
  border-radius: 12px;
  padding: 2px;
  border: 1px solid var(--border-light);
}

.depth-btn {
  padding: 3px 12px;
  border: none;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  background: transparent;
  color: var(--text-muted);
  transition: all var(--transition);
}

.depth-btn.active {
  background: var(--bg-card);
  color: var(--text);
  box-shadow: var(--shadow-sm);
}

.depth-btn:hover:not(.active):not(:disabled) {
  color: var(--text-secondary);
}

.depth-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.textarea-wrapper {
  flex: 1;
  min-height: 0;
  border-radius: var(--radius);
  background: var(--bg);
  border: 2px solid transparent;
  transition: all var(--transition);
  display: flex;
}
.textarea-wrapper.focused {
  border-color: var(--accent);
  background: var(--bg-card);
  box-shadow: 0 0 0 4px var(--accent-glow);
}

textarea {
  flex: 1;
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: var(--radius);
  background: transparent;
  font-size: 14px;
  line-height: 1.75;
  resize: none;
  font-family: inherit;
  color: var(--text);
  outline: none;
}
textarea:disabled {
  opacity: 0.5;
}
textarea::placeholder {
  color: var(--text-muted);
  opacity: 0.5;
  font-size: 13px;
}

.input-actions {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}

.btn-analyze {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 24px;
  border: none;
  border-radius: var(--radius);
  background: var(--accent);
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition);
  font-family: inherit;
  box-shadow: 0 2px 8px rgba(var(--accent-rgb), 0.25);
}
.btn-analyze:hover:not(:disabled) {
  background: var(--accent-hover);
  box-shadow: 0 4px 16px rgba(var(--accent-rgb), 0.35);
  transform: translateY(-1px);
}
.btn-analyze:active:not(:disabled) {
  transform: translateY(0);
}
.btn-analyze:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  box-shadow: none;
}

.btn-clear {
  padding: 10px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-card);
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition);
  font-family: inherit;
}
.btn-clear:hover:not(:disabled) {
  background: var(--bg);
  border-color: var(--text-muted);
  color: var(--text);
}
.btn-clear:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
