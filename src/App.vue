<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import ArticleInput from './components/ArticleInput.vue'
import AnalysisPanel from './components/AnalysisPanel.vue'
import ReportView from './components/ReportView.vue'
import Settings from './components/Settings.vue'
import { useConfigStore } from './stores/config.js'
import { useAnalysisStore } from './stores/analysis.js'

const configStore = useConfigStore()
const analysisStore = useAnalysisStore()

const showSettings = ref(false)
const leftWidth = ref(480)
const dragging = ref(false)

let startX = 0
let startW = 0

function onMouseDown(e) {
  dragging.value = true
  startX = e.clientX
  startW = leftWidth.value
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

function onMouseMove(e) {
  if (!dragging.value) return
  const dx = e.clientX - startX
  const w = startW + dx
  if (w >= 340 && w <= 700) {
    leftWidth.value = w
  }
}

function onMouseUp() {
  dragging.value = false
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

onUnmounted(() => {
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
})

configStore.load()
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <div class="header-brand">
        <div class="logo-mark">Z</div>
        <div class="brand-text">
          <h1 class="app-title">知友 <span class="title-en">ZhiCrit</span></h1>
          <span class="app-subtitle">中文文章批判性分析工具</span>
        </div>
      </div>
      <button
        class="settings-btn"
        :class="{ active: showSettings }"
        @click="showSettings = !showSettings"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
        </svg>
        {{ showSettings ? '返回' : '设置' }}
      </button>
    </header>

    <main class="app-main">
      <Settings v-if="showSettings" />

      <template v-else>
        <aside class="panel panel-left" :style="{ width: leftWidth + 'px' }">
          <ArticleInput />
          <AnalysisPanel />
        </aside>

        <div
          class="divider"
          :class="{ dragging }"
          @mousedown="onMouseDown"
        >
          <div class="divider-line"></div>
        </div>

        <section class="panel panel-right">
          <div v-if="analysisStore.status === 'idle'" class="placeholder">
            <div class="placeholder-art">
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                <rect x="14" y="10" width="52" height="60" rx="4" fill="currentColor" opacity="0.06"/>
                <rect x="22" y="20" width="36" height="4" rx="2" fill="currentColor" opacity="0.15"/>
                <rect x="22" y="30" width="28" height="3" rx="1.5" fill="currentColor" opacity="0.1"/>
                <rect x="22" y="38" width="32" height="3" rx="1.5" fill="currentColor" opacity="0.1"/>
                <rect x="22" y="46" width="24" height="3" rx="1.5" fill="currentColor" opacity="0.1"/>
                <circle cx="60" cy="60" r="14" fill="var(--accent)" opacity="0.12"/>
                <path d="M56 57l3-3 6 6" stroke="var(--accent)" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.5"/>
              </svg>
            </div>
            <p class="placeholder-title">准备就绪</p>
            <p class="placeholder-desc">在左侧粘贴文章内容，点击分析按钮即可开始</p>
            <div class="placeholder-tags">
              <span>知乎回答</span>
              <span>公众号文章</span>
              <span>博客</span>
              <span>任意中文文本</span>
            </div>
          </div>
          <div v-else-if="analysisStore.error" class="error-box">
            <div class="error-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            </div>
            <h3>分析出错</h3>
            <pre>{{ analysisStore.error }}</pre>
          </div>
          <ReportView v-else />
        </section>
      </template>
    </main>
  </div>
</template>

<style>
/* ── Design Tokens ── */
:root {
  --bg: #f8f7f4;
  --bg-card: #ffffff;
  --bg-raised: #fcfbf9;
  --border: #eae7e0;
  --border-light: #f0ede8;
  --text: #1a1a1a;
  --text-secondary: #5c5c5c;
  --text-muted: #a0a0a0;
  --accent: #0084FF;
  --accent-glow: rgba(0, 132, 255, 0.12);
  --accent-soft: #e8f4ff;
  --accent-hover: #0070db;
  --success: #10b981;
  --success-soft: #ecfdf5;
  --warning: #f59e0b;
  --warning-soft: #fffbeb;
  --danger: #ef4444;
  --danger-soft: #fef2f2;
  --radius-sm: 6px;
  --radius: 10px;
  --radius-lg: 14px;
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
  --shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.06);
  --shadow-lg: 0 8px 24px rgba(0,0,0,0.08);
  --transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
    "Microsoft YaHei", "Helvetica Neue", sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

/* ── Scrollbar ── */
::-webkit-scrollbar {
  width: 5px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 10px;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--text-muted);
}

/* ── Shell ── */
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background:
    radial-gradient(ellipse 80% 50% at 50% -10%, var(--accent-glow), transparent),
    var(--bg);
}

/* ── Header ── */
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 24px;
  background: rgba(255,255,255,0.75);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border-light);
  flex-shrink: 0;
  z-index: 10;
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-mark {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0084FF, #40a9ff);
  color: white;
  font-weight: 800;
  font-size: 16px;
  border-radius: var(--radius-sm);
  box-shadow: 0 2px 8px rgba(0, 132, 255, 0.3);
}

.app-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.3px;
}

.title-en {
  font-weight: 400;
  color: var(--text-muted);
  margin-left: 2px;
}

.app-subtitle {
  display: block;
  font-size: 11px;
  color: var(--text-muted);
  margin-top: -1px;
}

.settings-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  border: 1px solid var(--border);
  border-radius: 20px;
  background: var(--bg-card);
  cursor: pointer;
  font-size: 13px;
  color: var(--text-secondary);
  transition: all var(--transition);
  font-family: inherit;
  white-space: nowrap;
}
.settings-btn:hover {
  background: var(--bg);
  border-color: var(--accent);
  color: var(--accent);
  box-shadow: var(--shadow-sm);
}
.settings-btn.active {
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--accent);
}

/* ── Main ── */
.app-main {
  display: flex;
  flex: 1;
  overflow: hidden;
  padding: 16px;
  gap: 16px;
}

.panel {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
  overflow-y: auto;
}

.panel-left {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

.divider {
  width: 8px;
  flex-shrink: 0;
  cursor: col-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  transition: background var(--transition);
  position: relative;
  z-index: 5;
}
.divider:hover,
.divider.dragging {
  background: var(--accent-soft);
}
.divider-line {
  width: 2px;
  height: 40px;
  border-radius: 1px;
  background: var(--border);
  transition: all var(--transition);
}
.divider:hover .divider-line,
.divider.dragging .divider-line {
  background: var(--accent);
  height: 60px;
}

.panel-right {
  flex: 1;
  padding: 32px;
  min-width: 0;
}

/* ── Placeholder ── */
.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  gap: 0;
}

.placeholder-art {
  color: var(--text-muted);
  margin-bottom: 16px;
  opacity: 0.7;
}

.placeholder-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.placeholder-desc {
  font-size: 14px;
  color: var(--text-muted);
  margin-bottom: 20px;
}

.placeholder-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.placeholder-tags span {
  padding: 4px 14px;
  background: var(--bg);
  border: 1px solid var(--border-light);
  border-radius: 20px;
  font-size: 12px;
  color: var(--text-muted);
}

/* ── Error ── */
.error-box {
  padding: 32px;
  background: var(--danger-soft);
  border-radius: var(--radius-lg);
  border: 1px solid rgba(239, 68, 68, 0.2);
  margin-top: 16px;
}

.error-icon {
  color: var(--danger);
  margin-bottom: 12px;
}

.error-box h3 {
  color: var(--danger);
  margin-bottom: 8px;
  font-size: 16px;
}

.error-box pre {
  white-space: pre-wrap;
  font-size: 13px;
  color: var(--text-secondary);
  font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
}
</style>
