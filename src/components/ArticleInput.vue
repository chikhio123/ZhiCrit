<script setup>
import { ref, computed } from 'vue'
import { useAnalysisStore } from '../stores/analysis.js'

const analysisStore = useAnalysisStore()
const text = ref('')
const isFocused = ref(false)

const wordCount = computed(() => text.value.length)
const canAnalyze = computed(() => text.value.trim().length > 0 && !analysisStore.isRunning)

function handleAnalyze() {
  if (!canAnalyze.value) return
  analysisStore.setArticle(text.value)
  analysisStore.startAnalysis()
}

function handleClear() {
  text.value = ''
  analysisStore.reset()
}
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
        <div class="mode-switch">
          <button
            class="mode-btn"
            :class="{ active: analysisStore.mode === 'deep' }"
            :disabled="analysisStore.isRunning"
            @click="analysisStore.mode = 'deep'"
            title="结构提取 + 问题标记 + 完整报告"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.3-4.3"/>
            </svg>
            深度
          </button>
          <button
            class="mode-btn"
            :class="{ active: analysisStore.mode === 'quick' }"
            :disabled="analysisStore.isRunning"
            @click="analysisStore.mode = 'quick'"
            title="跳过中间步骤，直接生成报告"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
            快速
          </button>
        </div>
      </div>
    </div>

    <div class="textarea-wrapper" :class="{ focused: isFocused }">
      <textarea
        v-model="text"
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
        {{ analysisStore.isRunning ? '分析中...' : '开始分析' }}
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

/* ── Mode Switch ── */
.mode-switch {
  display: flex;
  background: var(--bg);
  border-radius: 14px;
  padding: 2px;
  border: 1px solid var(--border-light);
}

.mode-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: none;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  background: transparent;
  color: var(--text-muted);
  transition: all var(--transition);
  white-space: nowrap;
}

.mode-btn svg {
  flex-shrink: 0;
  opacity: 0.5;
  transition: opacity var(--transition);
}

.mode-btn.active {
  background: var(--bg-card);
  color: var(--accent);
  box-shadow: var(--shadow-sm);
}

.mode-btn.active svg {
  opacity: 1;
}

.mode-btn:hover:not(.active):not(:disabled) {
  color: var(--text-secondary);
}

.mode-btn:hover:not(.active):not(:disabled) svg {
  opacity: 0.7;
}

.mode-btn:disabled {
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
  box-shadow: 0 2px 8px rgba(0, 132, 255, 0.25);
}
.btn-analyze:hover:not(:disabled) {
  background: var(--accent-hover);
  box-shadow: 0 4px 16px rgba(0, 132, 255, 0.35);
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
