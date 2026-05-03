<script setup>
import { computed, onMounted } from 'vue'
import { useHistoryStore } from '../stores/history.js'

const emit = defineEmits(['close'])
const store = useHistoryStore()

onMounted(() => {
  store.loadList()
})

const stats = computed(() => store.stats)

const sortedMonths = computed(() => {
  if (!stats.value?.analysesByMonth) return []
  return [...stats.value.analysesByMonth].sort((a, b) => a.month.localeCompare(b.month))
})

const maxMonthCount = computed(() => {
  if (!sortedMonths.value.length) return 1
  return Math.max(...sortedMonths.value.map(m => m.count), 1)
})
</script>

<template>
  <div class="stats-panel" @click.self="emit('close')">
    <div class="stats-card">
      <div class="stats-header">
        <h2>分析统计</h2>
        <button class="close-btn" @click="emit('close')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div class="stats-body">
        <!-- Empty state -->
        <div v-if="!stats" class="stats-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.3">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
          <p>暂无统计数据</p>
          <p class="sub">分析文章后会自动汇总</p>
        </div>

        <!-- Data state -->
        <template v-else>
          <!-- Row 1: 3 columns -->
          <div class="stat-cards stat-cards-3">
            <div class="stat-card">
              <div class="stat-value">{{ stats.totalAnalyses }}</div>
              <div class="stat-label">总分析次数</div>
            </div>

            <div class="stat-card stat-card-double">
              <div class="stat-sub">
                <div class="stat-sub-value deep">{{ stats.deepCount }}</div>
                <div class="stat-sub-label">深度</div>
              </div>
              <div class="stat-sub">
                <div class="stat-sub-value quick">{{ stats.quickCount }}</div>
                <div class="stat-sub-label">快速</div>
              </div>
            </div>

            <div class="stat-card stat-card-double">
              <div class="stat-sub">
                <div class="stat-sub-value report">{{ stats.reportCount }}</div>
                <div class="stat-sub-label">报告</div>
              </div>
              <div class="stat-sub">
                <div class="stat-sub-value annotate">{{ stats.annotateCount }}</div>
                <div class="stat-sub-label">标注</div>
              </div>
            </div>
          </div>

          <!-- Row 2: 2 columns -->
          <div class="stat-cards stat-cards-2">
            <div class="stat-card">
              <div class="stat-value danger">{{ stats.totalIssues }}</div>
              <div class="stat-label">总发现问题数</div>
            </div>

            <div class="stat-card">
              <div class="stat-value">{{ stats.avgWordCount }}</div>
              <div class="stat-label">平均字数</div>
            </div>
          </div>

          <!-- Monthly trend chart -->
          <div v-if="sortedMonths.length" class="chart-section">
            <h3 class="chart-title">月度趋势</h3>
            <div class="bar-chart">
              <div
                v-for="m in sortedMonths"
                :key="m.month"
                class="bar-col"
              >
                <span class="bar-count">{{ m.count }}</span>
                <div
                  class="bar"
                  :style="{
                    height: Math.max((m.count / maxMonthCount) * 120, 4) + 'px'
                  }"
                ></div>
                <span class="bar-label">{{ m.month }}</span>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Overlay ── */
.stats-panel {
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

.stats-card {
  width: 100%;
  max-width: 560px;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  overflow: hidden;
}

/* ── Header ── */
.stats-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 22px;
  border-bottom: 1px solid var(--border-light);
}

.stats-header h2 {
  font-size: 18px;
  font-weight: 700;
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

/* ── Body ── */
.stats-body {
  max-height: 60vh;
  overflow-y: auto;
}

/* ── Empty state ── */
.stats-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 48px 20px;
  color: var(--text-muted);
}

.stats-empty .sub {
  font-size: 12px;
  opacity: 0.7;
}

/* ── Stat cards grid ── */
.stat-cards {
  display: grid;
  gap: 12px;
  padding: 16px;
}

.stat-cards-3 {
  grid-template-columns: repeat(3, 1fr);
}

.stat-cards-2 {
  grid-template-columns: repeat(2, 1fr);
  padding-top: 0;
}

.stat-card {
  background: var(--bg);
  border-radius: var(--radius);
  padding: 16px 12px;
  text-align: center;
}

.stat-card-double {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 16px 8px;
}

.stat-sub {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.stat-value {
  font-size: 28px;
  font-weight: 800;
  color: var(--accent);
  line-height: 1.2;
}

.stat-value.danger {
  color: var(--danger);
}

.stat-sub-value {
  font-size: 22px;
  font-weight: 700;
  line-height: 1.2;
}

.stat-sub-value.deep {
  color: var(--accent);
}

.stat-sub-value.quick {
  color: var(--warning);
}

.stat-sub-value.report {
  color: var(--accent);
}

.stat-sub-value.annotate {
  color: var(--success);
}

.stat-label {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 4px;
}

.stat-sub-label {
  font-size: 11px;
  color: var(--text-muted);
}

/* ── Chart section ── */
.chart-section {
  padding: 8px 16px 20px;
}

.chart-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 16px;
}

.bar-chart {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 12px;
  height: 170px;
  padding: 4px 0 0;
}

.bar-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex: 0 0 auto;
  min-width: 36px;
}

.bar-count {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  line-height: 1;
  margin-bottom: 2px;
}

.bar {
  width: 28px;
  min-height: 4px;
  background: var(--accent);
  border-radius: 4px 4px 0 0;
  transition: height 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.bar-label {
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1;
  white-space: nowrap;
}
</style>
