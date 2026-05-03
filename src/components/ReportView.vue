<script setup>
import { computed, ref } from 'vue'
import { useAnalysisStore } from '../stores/analysis.js'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'

const analysisStore = useAnalysisStore()
const copied = ref(false)
const isAnnotateMode = computed(() => analysisStore.outputMode === 'annotate')
const activeAnnotation = ref(null)

marked.setOptions({ breaks: true, gfm: true })

const renderedHTML = computed(() => {
  const md = analysisStore.report
  if (!md) return ''
  const raw = marked.parse(md, {
    highlight: (code, lang) => {
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value
      }
      return hljs.highlightAuto(code).value
    }
  })
  return DOMPurify.sanitize(raw)
})

const levelLabel = computed(() => {
  const map = { deep: '深度分析', quick: '快速分析', skip: '已跳过' }
  return map[analysisStore.level] || ''
})

// Build annotated segments from original text + annotations
const annotatedSegments = computed(() => {
  const text = analysisStore.articleText
  const annotations = analysisStore.annotations
  if (!text || !annotations.length) return []

  // Sort by position in text
  const positioned = annotations
    .map((a, i) => ({ ...a, _id: i, pos: text.indexOf(a.quote) }))
    .filter(a => a.pos !== -1)
    .sort((a, b) => a.pos - b.pos)

  const segments = []
  let cursor = 0
  for (const ann of positioned) {
    if (ann.pos < cursor) continue
    if (ann.pos > cursor) {
      segments.push({ text: text.slice(cursor, ann.pos), mark: null, _id: null })
    }
    segments.push({ text: ann.quote, mark: ann.mark, reason: ann.reason, _id: ann._id })
    cursor = ann.pos + ann.quote.length
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), mark: null, _id: null })
  }
  return segments
})

const markLabel = (mark) => ({ yellow: '疑似AI', red: '逻辑问题', green: '可取之处' }[mark] || mark)

function handleMarkClick(seg, event) {
  if (!seg.mark) {
    activeAnnotation.value = null
    return
  }
  const rect = event.target.getBoundingClientRect()
  activeAnnotation.value = {
    mark: seg.mark,
    reason: seg.reason,
    quote: seg.text,
    x: rect.left + rect.width / 2,
    y: rect.bottom + 6
  }
}

function dismissTooltip() {
  activeAnnotation.value = null
}

async function handleCopy() {
  if (!analysisStore.report) return
  await navigator.clipboard.writeText(analysisStore.report)
  copied.value = true
  window.__toast?.success('已复制到剪贴板～')
  setTimeout(() => { copied.value = false }, 2000)
}

async function handleSave() {
  if (!analysisStore.report) return
  if (window.zhicrit) {
    const result = await window.zhicrit.saveReport(analysisStore.report)
    if (result.success) {
      window.__toast?.success('报告已保存～')
    }
  } else {
    const blob = new Blob([analysisStore.report], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analysis-${Date.now()}.md`
    a.click()
    URL.revokeObjectURL(url)
    window.__toast?.success('报告已下载～')
  }
}
</script>

<template>
  <div class="report-view" @click="dismissTooltip">
    <!-- ===== 标注模式：直接显示标注视图 ===== -->
    <template v-if="isAnnotateMode && analysisStore.isDone">
      <div class="report-toolbar">
        <div class="toolbar-left">
          <span class="level-badge" :class="`level-${analysisStore.level}`">
            {{ levelLabel }}
          </span>
          <span class="mode-indicator annotate-indicator">标注模式</span>
        </div>
      </div>
      <div class="annotate-body">
        <div class="annotate-legend">
          <span class="legend-item"><span class="legend-dot yellow"></span> 疑似AI</span>
          <span class="legend-item"><span class="legend-dot red"></span> 逻辑问题</span>
          <span class="legend-item"><span class="legend-dot green"></span> 可取之处</span>
        </div>
        <div class="annotate-text" v-if="annotatedSegments.length">
          <span
            v-for="(seg, i) in annotatedSegments"
            :key="i"
            class="annotate-seg"
            :class="{ ['mark-' + seg.mark]: seg.mark }"
            @click.stop="handleMarkClick(seg, $event)"
          >{{ seg.text }}</span>
        </div>
        <div v-else class="annotate-empty">
          <p>标注数据暂不可用</p>
          <p class="sub">可能是标注步骤未完成，或标注结果无法匹配到原文</p>
        </div>
      </div>
    </template>

    <!-- ===== 分析模式：仅显示报告 ===== -->
    <template v-else-if="analysisStore.report">
      <div class="report-toolbar">
        <div class="toolbar-left">
          <span class="level-badge" :class="`level-${analysisStore.level}`">
            {{ levelLabel }}
          </span>
          <span class="mode-indicator report-indicator">分析模式</span>
        </div>
        <div class="toolbar-right">
          <button class="tb-btn" @click="handleCopy">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            {{ copied ? '已复制' : '复制' }}
          </button>
          <button class="tb-btn primary" @click="handleSave">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
            </svg>
            保存
          </button>
        </div>
      </div>

      <article class="markdown-body" v-html="renderedHTML"></article>
    </template>

    <div v-else-if="analysisStore.isRunning" class="report-waiting">
      <div class="waiting-animation">
        <div class="typing-dots">
          <span></span><span></span><span></span>
        </div>
      </div>
      <p>正在生成报告...</p>
    </div>

    <!-- Tooltip -->
    <Teleport to="body">
      <div
        v-if="activeAnnotation"
        class="annotate-tooltip"
        :class="'tooltip-' + activeAnnotation.mark"
        :style="{ left: activeAnnotation.x + 'px', top: activeAnnotation.y + 'px' }"
        @click.stop
      >
        <div class="tooltip-header">
          <span class="tooltip-dot" :class="activeAnnotation.mark"></span>
          {{ markLabel(activeAnnotation.mark) }}
        </div>
        <p class="tooltip-reason">{{ activeAnnotation.reason }}</p>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.report-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* ── Toolbar ── */
.report-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 20px;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--border-light);
  flex-shrink: 0;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar-right {
  display: flex;
  gap: 8px;
}

.level-badge {
  padding: 5px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
}

.level-deep {
  background: var(--accent-soft);
  color: var(--accent);
}

.level-quick {
  background: var(--warning-soft);
  color: var(--warning);
}

.level-skip {
  background: var(--bg);
  color: var(--text-muted);
}

.mode-indicator {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 10px;
}
.mode-indicator.report-indicator {
  background: var(--accent-soft);
  color: var(--accent);
}
.mode-indicator.annotate-indicator {
  background: rgba(34, 197, 94, 0.1);
  color: #16a34a;
}

.tb-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-card);
  color: var(--text-secondary);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all var(--transition);
}
.tb-btn:hover {
  background: var(--bg);
  border-color: var(--text-muted);
  color: var(--text);
}
.tb-btn.primary {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
  font-weight: 600;
}
.tb-btn.primary:hover {
  background: var(--accent-hover);
  box-shadow: 0 2px 8px rgba(0, 132, 255, 0.3);
}

/* ── Markdown Body ── */
.markdown-body {
  flex: 1;
  overflow-y: auto;
  font-size: 15px;
  line-height: 1.9;
  color: var(--text);
  max-width: 720px;
  padding-bottom: 60px;
}

.markdown-body :deep(h1) {
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.5px;
  margin: 0 0 28px;
  padding-bottom: 14px;
  border-bottom: 2px solid var(--border);
}

.markdown-body :deep(h2) {
  font-size: 19px;
  font-weight: 700;
  margin: 40px 0 16px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-light);
  letter-spacing: -0.3px;
}

.markdown-body :deep(h3) {
  font-size: 16px;
  font-weight: 600;
  margin: 28px 0 12px;
  color: var(--text-secondary);
}

.markdown-body :deep(p) {
  margin: 14px 0;
}

.markdown-body :deep(ul), .markdown-body :deep(ol) {
  padding-left: 24px;
  margin: 12px 0;
}

.markdown-body :deep(li) {
  margin: 6px 0;
}

.markdown-body :deep(blockquote) {
  border-left: 3px solid var(--accent);
  padding: 10px 20px;
  margin: 18px 0;
  background: var(--accent-soft);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.markdown-body :deep(code) {
  background: var(--bg);
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 0.88em;
  font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
  color: #e11d48;
}

.markdown-body :deep(pre) {
  background: #1e1e2e;
  padding: 18px;
  border-radius: var(--radius);
  overflow-x: auto;
  margin: 14px 0;
}

.markdown-body :deep(pre code) {
  background: none;
  padding: 0;
  color: #cdd6f4;
  font-size: 13px;
}

.markdown-body :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 14px 0;
  font-size: 14px;
}

.markdown-body :deep(th) {
  background: var(--bg);
  font-weight: 600;
  padding: 10px 14px;
  border: 1px solid var(--border);
  text-align: left;
}

.markdown-body :deep(td) {
  padding: 8px 14px;
  border: 1px solid var(--border-light);
}

.markdown-body :deep(strong) {
  font-weight: 700;
  color: var(--text);
}

.markdown-body :deep(hr) {
  border: none;
  border-top: 1px solid var(--border-light);
  margin: 28px 0;
}

.markdown-body :deep(a) {
  color: var(--accent);
  text-decoration: none;
}
.markdown-body :deep(a:hover) {
  text-decoration: underline;
}

/* ── Annotation View ── */
.annotate-body {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 60px;
}

.annotate-legend {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border-light);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
}
.legend-dot.yellow { background: #eab308; }
.legend-dot.red   { background: #ef4444; }
.legend-dot.green { background: #22c55e; }

.annotate-text {
  font-size: 15px;
  line-height: 2;
  color: var(--text);
  white-space: pre-wrap;
}

.annotate-seg {
  cursor: default;
  transition: background 0.15s;
}

.annotate-seg.mark-yellow {
  background: rgba(234, 179, 8, 0.2);
  border-bottom: 2px solid rgba(234, 179, 8, 0.5);
  cursor: pointer;
}
.annotate-seg.mark-yellow:hover {
  background: rgba(234, 179, 8, 0.35);
}

.annotate-seg.mark-red {
  background: rgba(239, 68, 68, 0.12);
  border-bottom: 2px solid rgba(239, 68, 68, 0.5);
  text-decoration: underline;
  text-decoration-color: rgba(239, 68, 68, 0.4);
  text-underline-offset: 2px;
  cursor: pointer;
}
.annotate-seg.mark-red:hover {
  background: rgba(239, 68, 68, 0.22);
}

.annotate-seg.mark-green {
  background: rgba(34, 197, 94, 0.12);
  border-bottom: 2px solid rgba(34, 197, 94, 0.5);
  cursor: pointer;
}
.annotate-seg.mark-green:hover {
  background: rgba(34, 197, 94, 0.22);
}

.annotate-empty {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-muted);
}
.annotate-empty .sub {
  font-size: 12px;
  margin-top: 6px;
  opacity: 0.7;
}

/* ── Tooltip ── */
.annotate-tooltip {
  position: fixed;
  transform: translateX(-50%);
  z-index: 10000;
  background: var(--bg-card);
  border-radius: var(--radius);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
  padding: 14px 18px;
  max-width: 320px;
  border: 1px solid var(--border);
  animation: tooltip-in 0.15s ease-out;
}

@keyframes tooltip-in {
  from { opacity: 0; transform: translateX(-50%) translateY(-4px); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0); }
}

.tooltip-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.tooltip-dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
}
.tooltip-dot.yellow { background: #eab308; }
.tooltip-dot.red   { background: #ef4444; }
.tooltip-dot.green { background: #22c55e; }

.tooltip-reason {
  font-size: 13px;
  color: var(--text);
  line-height: 1.6;
  margin: 0;
}

/* ── Waiting ── */
.report-waiting {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 20px;
}

.typing-dots {
  display: flex;
  gap: 6px;
}

.typing-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
  animation: typing 1.2s ease-in-out infinite;
}

.typing-dots span:nth-child(2) { animation-delay: 0.15s; }
.typing-dots span:nth-child(3) { animation-delay: 0.3s; }

@keyframes typing {
  0%, 100% { transform: translateY(0); opacity: 0.3; }
  50% { transform: translateY(-6px); opacity: 1; }
}

.report-waiting p {
  font-size: 14px;
  color: var(--text-muted);
}
</style>
