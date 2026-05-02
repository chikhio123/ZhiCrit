<script setup>
import { computed, ref } from 'vue'
import { useAnalysisStore } from '../stores/analysis.js'

const analysisStore = useAnalysisStore()
const expanded = ref(false)

const steps = [
  { key: 'triage', label: '预判', desc: '判断文章是否值得分析' },
  { key: 'extract', label: '结构提取', desc: '提取论证骨架与推理链' },
  { key: 'detect', label: '问题标记', desc: '逐项检查逻辑问题' },
  { key: 'report', label: '报告生成', desc: '整合为结构化报告' }
]

const doneCount = computed(() => {
  return steps.filter(s => analysisStore.steps[s.key].status === 'done').length
})

function stepPreview(key) {
  const s = analysisStore.steps[key]
  if (!s.result) return null
  if (s.result.skipped) return '已跳过'
  if (key === 'triage') {
    const r = s.result
    return `${r.article_type || '?'} · ${r.level} · AI ${r.ai_probability || '?'}`
  }
  if (key === 'extract') {
    const r = s.result
    return `${r.premises?.length || 0} 前提 · ${r.reasoning_chain?.length || 0} 推理`
  }
  if (key === 'detect') {
    const r = s.result
    const c = r.issues?.filter(i => i.severity === 'critical').length || 0
    return `${r.issues?.length || 0} 问题（${c} 致命）`
  }
  return null
}
</script>

<template>
  <div class="analysis-panel" v-if="analysisStore.status !== 'idle'">
    <!-- Compact bar -->
    <div class="compact-bar" @click="expanded = !expanded">
      <div class="bar-left">
        <svg v-if="analysisStore.isRunning" class="bar-icon spinning" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
        <svg v-else-if="analysisStore.isDone" class="bar-icon done" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <svg v-else class="bar-icon error" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        <span class="bar-label">
          <template v-if="analysisStore.isRunning">{{ doneCount }}/4</template>
          <template v-else-if="analysisStore.isDone">分析完成</template>
          <template v-else>出错</template>
        </span>
      </div>
      <div class="bar-right">
        <div class="mini-progress">
          <div class="mini-track" :style="{ width: (doneCount / 4 * 100) + '%' }"></div>
        </div>
        <svg class="chevron" :class="{ open: expanded }" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>
    </div>

    <!-- Expanded details -->
    <div class="expanded-detail" v-if="expanded">
      <div
        v-for="step in steps"
        :key="step.key"
        class="step"
        :class="{
          'step-active': analysisStore.steps[step.key].status === 'running',
          'step-done': analysisStore.steps[step.key].status === 'done'
        }"
      >
        <div class="step-marker">
          <svg v-if="analysisStore.steps[step.key].status === 'done'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <div v-else-if="analysisStore.steps[step.key].status === 'running'" class="pulse-dot"></div>
          <span v-else class="step-num">{{ steps.indexOf(step) + 1 }}</span>
        </div>
        <div class="step-body">
          <span class="step-label">{{ step.label }}</span>
          <span v-if="stepPreview(step.key)" class="step-result">{{ stepPreview(step.key) }}</span>
        </div>
      </div>

      <div v-if="analysisStore.status === 'error'" class="panel-error">
        {{ analysisStore.error }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.analysis-panel {
  border-top: 1px solid var(--border-light);
  flex-shrink: 0;
}

/* ── Compact bar ── */
.compact-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 20px;
  cursor: pointer;
  transition: background var(--transition);
  user-select: none;
}
.compact-bar:hover {
  background: var(--bg);
}

.bar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bar-icon {
  color: var(--accent);
  flex-shrink: 0;
}
.bar-icon.spinning {
  animation: spin 1.5s linear infinite;
}
.bar-icon.done {
  color: var(--success);
}
.bar-icon.error {
  color: var(--danger);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.bar-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}

.bar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mini-progress {
  width: 48px;
  height: 3px;
  background: var(--border-light);
  border-radius: 2px;
  overflow: hidden;
}

.mini-track {
  height: 100%;
  background: var(--accent);
  border-radius: 2px;
  transition: width 0.4s ease;
}

.chevron {
  color: var(--text-muted);
  transition: transform 0.2s;
  flex-shrink: 0;
}
.chevron.open {
  transform: rotate(180deg);
}

/* ── Expanded detail ── */
.expanded-detail {
  padding: 4px 20px 16px;
  border-top: 1px solid var(--border-light);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.step {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  border-radius: 6px;
  transition: all var(--transition);
}

.step-marker {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  flex-shrink: 0;
}

.step:not(.step-active):not(.step-done) .step-marker {
  background: var(--bg);
  color: var(--text-muted);
}
.step-active .step-marker {
  background: var(--accent-soft);
  color: var(--accent);
}
.step-done .step-marker {
  color: var(--success);
}

.step-num {
  font-size: 11px;
  font-weight: 700;
}

.pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.4); opacity: 0.4; }
}

.step-body {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.step-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-muted);
  white-space: nowrap;
}
.step-active .step-label {
  color: var(--text);
  font-weight: 600;
}
.step-done .step-label {
  color: var(--text-secondary);
}

.step-result {
  font-size: 11px;
  color: var(--accent);
  background: var(--accent-soft);
  padding: 1px 8px;
  border-radius: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.step-done .step-result {
  color: var(--success);
  background: var(--success-soft);
}

.panel-error {
  padding: 8px 10px;
  background: var(--danger-soft);
  border-radius: 6px;
  font-size: 12px;
  color: var(--danger);
}
</style>
