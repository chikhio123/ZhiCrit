<script setup>
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { useConfigStore } from '../stores/config.js'

const configStore = useConfigStore()
const selectedName = ref('')
const dropdownOpen = ref(false)
const dropdownRef = ref(null)

function closeDropdown(e) {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target)) {
    dropdownOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', closeDropdown)
  document.addEventListener('click', closeEndpointDropdown)
  document.addEventListener('click', closeModelDropdown)
})
onUnmounted(() => {
  document.removeEventListener('click', closeDropdown)
  document.removeEventListener('click', closeEndpointDropdown)
  document.removeEventListener('click', closeModelDropdown)
})

const profileDefaults = {
  name: '',
  api_base: 'https://api.deepseek.com',
  api_key: '',
  model: 'deepseek-chat',
  endpoint: '/v1/chat/completions',
  max_tokens: 4096,
  temperature: 0.3
}

const form = ref({ ...profileDefaults })

const profileNames = computed(() => configStore.profiles.map(p => p.name))
const canDelete = computed(() => configStore.profiles.length > 1)

// Model fetcher
const fetchingModels = ref(false)
const fetchedModels = ref([])
const modelDropdownOpen = ref(false)
const modelDropdownRef = ref(null)

async function fetchModels() {
  if (!form.value.api_base) {
    window.__toast?.warning('请先填写 API Base URL～')
    return
  }
  fetchingModels.value = true
  fetchedModels.value = []
  try {
    const base = form.value.api_base.replace(/\/+$/, '')
    const res = await fetch(`${base}/v1/models`, {
      headers: {
        'Authorization': `Bearer ${form.value.api_key || ''}`,
        'Content-Type': 'application/json'
      }
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`${res.status}: ${text.slice(0, 200)}`)
    }
    const data = await res.json()
    fetchedModels.value = (data.data || [])
      .map(m => m.id)
      .sort()
    if (!fetchedModels.value.length) {
      window.__toast?.info('未找到可用模型')
    } else {
      window.__toast?.success(`拉取到 ${fetchedModels.value.length} 个模型～`)
      // 当前模型名不在列表中则清空
      if (!fetchedModels.value.includes(form.value.model)) {
        form.value.model = ''
      }
    }
  } catch (err) {
    window.__toast?.error(`拉取失败：${err.message}`)
  } finally {
    fetchingModels.value = false
  }
}

function selectModel(id) {
  form.value.model = id
  modelDropdownOpen.value = false
}

function closeModelDropdown(e) {
  if (modelDropdownRef.value && !modelDropdownRef.value.contains(e.target)) {
    modelDropdownOpen.value = false
  }
}

const endpointPresets = [
  { value: '/v1/chat/completions', label: 'OpenAI Chat Completions' },
  { value: '/v1/responses',       label: 'OpenAI Responses（新格式）' },
  { value: '/v1/messages',        label: 'Anthropic Messages（Claude）' }
]
const endpointDropdownOpen = ref(false)
const endpointDropdownRef = ref(null)
const customEndpoint = ref('')

const endpointLabel = computed(() => {
  const preset = endpointPresets.find(p => p.value === form.value.endpoint)
  return preset ? preset.label : form.value.endpoint
})

const fullURL = computed(() => {
  const base = (form.value.api_base || '').replace(/\/+$/, '')
  const ep = form.value.endpoint || ''
  return base + ep
})

function selectEndpoint(ep) {
  form.value.endpoint = ep.value
  customEndpoint.value = ''
  endpointDropdownOpen.value = false
}

function closeEndpointDropdown(e) {
  if (endpointDropdownRef.value && !endpointDropdownRef.value.contains(e.target)) {
    endpointDropdownOpen.value = false
  }
}

function handleCustomEndpoint() {
  if (customEndpoint.value.trim()) {
    form.value.endpoint = customEndpoint.value.trim()
    customEndpoint.value = ''
    endpointDropdownOpen.value = false
  }
}

function uniqueName(base) {
  let name = base
  let n = 2
  while (configStore.profiles.some(p => p.name === name)) {
    name = `${base} ${n}`
    n++
  }
  return name
}

function selectProfile(name) {
  selectedName.value = name
  const p = configStore.profiles.find(p => p.name === name)
  if (p) {
    form.value = {
      name: p.name,
      api_base: p.api_base,
      api_key: p.api_key,
      model: p.model,
      endpoint: p.endpoint,
      max_tokens: p.max_tokens,
      temperature: p.temperature
    }
  }
}

function syncToActiveProfile() {
  if (configStore.loaded && configStore.activeProfile) {
    selectProfile(configStore.activeProfile)
  }
}

// 每次打开设置页，定位到当前使用的 API profile
syncToActiveProfile()
watch(() => configStore.loaded, (loaded) => {
  if (loaded) selectProfile(configStore.activeProfile || configStore.profiles[0]?.name)
})

async function handleSave() {
  if (!form.value.name.trim()) {
    window.__toast?.warning('请输入配置名称～')
    return
  }
  const oldName = selectedName.value
  const newName = form.value.name.trim()

  try {
    if (oldName !== newName) {
      const collides = configStore.profiles.some(p => p.name === newName)
      if (collides) {
        configStore.deleteProfile(oldName)
        configStore.upsertProfile({ ...form.value, name: newName })
      } else {
        configStore.renameProfile(oldName, newName)
        configStore.upsertProfile({ ...form.value, name: newName })
      }
    } else {
      configStore.upsertProfile({ ...form.value, name: newName })
    }
    await configStore.save()
    selectedName.value = newName
    window.__toast?.success('配置已保存～')
  } catch (err) {
    window.__toast?.error(`保存失败：${err.message}`)
    console.error('Save error:', err)
  }
}

async function handleAdd() {
  const name = uniqueName('新配置')
  const p = { ...profileDefaults, name }
  configStore.addProfile(p)
  await configStore.save()
  selectProfile(name)
  window.__toast?.success(`已添加「${name}」～`)
}

async function handleStreamingToggle(event) {
  configStore.streaming = event.target.checked
  await configStore.save()
}

async function handleDelete() {
  if (!canDelete.value) return
  const name = selectedName.value
  configStore.deleteProfile(name)
  await configStore.save()
  selectProfile(configStore.activeProfile)
  window.__toast?.info('配置已删除')
}

</script>

<template>
  <div class="settings">
    <div class="settings-card">
      <div class="settings-header">
        <h2>API 配置</h2>
        <p>支持任意 OpenAI 兼容接口 — 可保存多套配置随时切换</p>
      </div>

      <!-- Profile selector -->
      <div class="profile-bar">
        <div class="profile-dropdown" ref="dropdownRef">
          <button class="profile-dropdown-trigger" @click="dropdownOpen = !dropdownOpen">
            <span class="trigger-label">{{ selectedName }}</span>
            <svg class="trigger-chevron" :class="{ open: dropdownOpen }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <Transition name="dropdown-slide">
            <div v-if="dropdownOpen" class="profile-dropdown-menu">
              <button
                v-for="name in profileNames"
                :key="name"
                class="profile-dropdown-item"
                :class="{ active: name === selectedName }"
                @click="configStore.setActiveProfile(name); selectProfile(name); dropdownOpen = false"
              >
                <svg v-if="name === selectedName" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                <span v-else class="check-placeholder"></span>
                {{ name }}
              </button>
            </div>
          </Transition>
        </div>
        <div class="profile-bar-actions">
          <button class="profile-action-btn" title="新建配置" @click="handleAdd">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <button class="profile-action-btn danger" title="删除当前配置" :disabled="!canDelete" @click="handleDelete">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>

      <div class="form-grid">
        <div class="form-group span-2">
          <label>配置名称</label>
          <input v-model="form.name" type="text" placeholder="例如：DeepSeek、公司 OpenAI" />
        </div>

        <div class="form-group span-2">
          <label>API Base URL</label>
          <input v-model="form.api_base" type="text" placeholder="https://api.deepseek.com" />
          <span class="url-hint" v-if="fullURL">{{ fullURL }}</span>
        </div>

        <div class="form-group span-2">
          <label>Endpoint</label>
          <div class="profile-dropdown" ref="endpointDropdownRef">
            <button class="profile-dropdown-trigger" @click="endpointDropdownOpen = !endpointDropdownOpen">
              <span class="trigger-label">{{ endpointLabel || '选择 endpoint...' }}</span>
              <svg class="trigger-chevron" :class="{ open: endpointDropdownOpen }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <Transition name="dropdown-slide">
              <div v-if="endpointDropdownOpen" class="profile-dropdown-menu">
                <button
                  v-for="ep in endpointPresets"
                  :key="ep.value"
                  class="profile-dropdown-item"
                  :class="{ active: ep.value === form.endpoint }"
                  @click="selectEndpoint(ep)"
                >
                  <svg v-if="ep.value === form.endpoint" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  <span v-else class="check-placeholder"></span>
                  <div class="endpoint-item">
                    <span class="endpoint-label">{{ ep.label }}</span>
                    <span class="endpoint-value">{{ ep.value }}</span>
                  </div>
                </button>
                <div class="dropdown-custom-row">
                  <input
                    v-model="customEndpoint"
                    class="dropdown-custom-input"
                    placeholder="自定义 endpoint..."
                    @keydown.enter="handleCustomEndpoint"
                    @click.stop
                  />
                  <button class="dropdown-custom-btn" @click="handleCustomEndpoint">确定</button>
                </div>
              </div>
            </Transition>
          </div>
        </div>

        <div class="form-group span-2">
          <label>API Key</label>
          <div class="key-input-wrap">
            <input v-model="form.api_key" type="password" placeholder="sk-xxx" />
            <div class="key-dot" v-if="form.api_key" title="已填写"></div>
          </div>
        </div>

        <div class="form-group span-2">
          <label>Model</label>
          <div class="model-row">
            <div class="profile-dropdown model-dropdown" ref="modelDropdownRef">
              <input
                v-model="form.model"
                type="text"
                placeholder="deepseek-chat"
                class="model-input"
                @focus="modelDropdownOpen = fetchedModels.length > 0"
              />
              <Transition name="dropdown-slide">
                <div v-if="modelDropdownOpen && fetchedModels.length" class="profile-dropdown-menu model-menu">
                  <button
                    v-for="m in fetchedModels"
                    :key="m"
                    class="profile-dropdown-item"
                    :class="{ active: m === form.model }"
                    @click="selectModel(m)"
                  >{{ m }}</button>
                </div>
              </Transition>
            </div>
            <button class="fetch-btn" :disabled="fetchingModels" @click="fetchModels">
              <svg v-if="fetchingModels" class="spinning" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
              拉取
            </button>
          </div>
        </div>

        <div class="form-group">
          <label>Max Tokens</label>
          <input v-model.number="form.max_tokens" type="number" min="256" max="32768" step="256" />
        </div>

        <div class="form-group">
          <label>Temperature</label>
          <div class="slider-group">
            <input
              v-model.number="form.temperature"
              type="range"
              min="0" max="2" step="0.1"
            />
            <span class="slider-val">{{ form.temperature }}</span>
          </div>
        </div>
      </div>

      <div class="streaming-toggle">
        <div class="streaming-info">
          <span class="streaming-label">流式输出</span>
          <span class="streaming-desc">报告生成时实时显示文字</span>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" :checked="configStore.streaming" @change="handleStreamingToggle" />
          <span class="toggle-slider"></span>
        </label>
      </div>

      <div class="setting-row">
        <div class="setting-label">主题</div>
        <div class="seg-group">
          <button class="seg-btn" :class="{ active: configStore.theme === 'light' }" @click="configStore.theme = 'light'; configStore.save()">浅色</button>
          <button class="seg-btn" :class="{ active: configStore.theme === 'dark' }" @click="configStore.theme = 'dark'; configStore.save()">深色</button>
          <button class="seg-btn" :class="{ active: configStore.theme === 'auto' }" @click="configStore.theme = 'auto'; configStore.save()">自动</button>
        </div>
      </div>

      <div class="settings-actions">
        <button class="save-btn" @click="handleSave">保存配置</button>
      </div>
    </div>

  </div>
</template>

<style scoped>
.settings {
  max-width: 600px;
  margin: 0 auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.settings-card {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  padding: 28px;
  box-shadow: var(--shadow-sm);
}

.settings-header {
  margin-bottom: 20px;
}

.settings-header h2 {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 4px;
  letter-spacing: -0.3px;
}

.settings-header p {
  font-size: 13px;
  color: var(--text-muted);
}

/* ── Profile bar ── */
.profile-bar {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-light);
}

.profile-dropdown {
  flex: 1;
  position: relative;
}

.profile-dropdown-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 9px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-card);
  color: var(--text);
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all var(--transition);
}

.profile-dropdown-trigger:hover {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-glow);
}

.trigger-label {
  flex: 1;
  text-align: left;
}

.trigger-chevron {
  color: var(--text-muted);
  transition: transform 0.2s;
  flex-shrink: 0;
}

.trigger-chevron.open {
  transform: rotate(180deg);
}

.profile-dropdown-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-md);
  z-index: 30;
  overflow: hidden;
  max-height: 220px;
  overflow-y: auto;
}

.profile-dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 14px;
  border: none;
  background: none;
  color: var(--text);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: background var(--transition);
  text-align: left;
}

.profile-dropdown-item:hover {
  background: var(--accent-soft);
  color: var(--accent);
}

.profile-dropdown-item.active {
  font-weight: 600;
  color: var(--accent);
}

.check-placeholder {
  width: 12px;
  flex-shrink: 0;
}

.endpoint-item {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.endpoint-label {
  font-size: 13px;
  font-weight: 500;
}

.endpoint-value {
  font-size: 11px;
  color: var(--text-muted);
  font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
}

/* Dropdown transition */
.model-row {
  display: flex;
  gap: 8px;
}

.model-dropdown {
  flex: 1;
}

.model-input {
  width: 100%;
  padding: 9px 13px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-family: inherit;
  background: var(--bg-card);
  color: var(--text);
  transition: all var(--transition);
}

.model-input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-glow);
}

.model-menu {
  max-height: 240px;
  overflow-y: auto;
}

.fetch-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 0 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-card);
  color: var(--accent);
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all var(--transition);
  white-space: nowrap;
  flex-shrink: 0;
}

.fetch-btn:hover {
  background: var(--accent-soft);
  border-color: var(--accent);
}

.fetch-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spinning {
  animation: spin 1.5s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.dropdown-slide-enter-active {
  transition: all 0.15s ease-out;
}
.dropdown-slide-leave-active {
  transition: all 0.1s ease-in;
}
.dropdown-slide-enter-from {
  opacity: 0;
  transform: translateY(-4px);
}
.dropdown-slide-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.dropdown-custom-row {
  display: flex;
  gap: 6px;
  padding: 8px 14px;
  border-top: 1px solid var(--border-light);
}

.dropdown-custom-input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-family: inherit;
  background: var(--bg);
  color: var(--text);
  min-width: 0;
}

.dropdown-custom-input:focus {
  outline: none;
  border-color: var(--accent);
}

.dropdown-custom-btn {
  padding: 6px 12px;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--accent);
  color: white;
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
}

.url-hint {
  font-size: 11px;
  color: var(--text-muted);
  font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
  margin-top: 4px;
}

.profile-bar-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.profile-action-btn {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  border-radius: 20px;
  background: var(--bg);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition);
  flex-shrink: 0;
}

.profile-action-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-soft);
}

.profile-action-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.profile-action-btn:disabled:hover {
  border-color: var(--border);
  color: var(--text-secondary);
  background: var(--bg);
}

.profile-action-btn.danger:hover {
  border-color: var(--danger);
  color: var(--danger);
  background: var(--danger-soft);
}

/* ── Form ── */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.span-2 { grid-column: span 2; }

.form-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.form-group label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.form-group input {
  padding: 9px 13px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-family: inherit;
  background: var(--bg-card);
  color: var(--text);
  transition: all var(--transition);
}

.form-group input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-glow);
}

.form-group input[type="number"] {
  font-variant-numeric: tabular-nums;
}

.key-input-wrap {
  position: relative;
}

.key-input-wrap input {
  width: 100%;
  padding-right: 32px;
}

.key-dot {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--success);
  box-shadow: 0 0 6px var(--success);
}

.slider-group {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 0;
}

.slider-group input[type="range"] {
  flex: 1;
  accent-color: var(--accent);
  height: 4px;
}

.slider-val {
  font-size: 14px;
  font-weight: 700;
  color: var(--accent);
  min-width: 24px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

/* ── Streaming Toggle ── */
.streaming-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 20px;
  padding-top: 18px;
  border-top: 1px solid var(--border-light);
}

.streaming-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.streaming-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

.streaming-desc {
  font-size: 12px;
  color: var(--text-muted);
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: var(--border);
  border-radius: 24px;
  transition: all 0.25s;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background: white;
  border-radius: 50%;
  transition: all 0.25s;
}

.toggle-switch input:checked + .toggle-slider {
  background: var(--accent);
}

.toggle-switch input:checked + .toggle-slider::before {
  transform: translateX(20px);
}

/* ── Theme Selector ── */
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
  padding-top: 18px;
  border-top: 1px solid var(--border-light);
}

.setting-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

.seg-group {
  display: flex;
  border-radius: var(--radius);
  overflow: hidden;
  border: 1px solid var(--border);
}

.seg-btn {
  flex: 1;
  padding: 8px 16px;
  border: none;
  background: var(--bg-card);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all var(--transition);
  white-space: nowrap;
}

.seg-btn:not(:last-child) {
  border-right: 1px solid var(--border);
}

.seg-btn.active {
  background: var(--accent);
  color: white;
  font-weight: 600;
}

.settings-actions {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--border-light);
}

.save-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 11px 24px;
  border: none;
  border-radius: var(--radius);
  background: var(--accent);
  color: white;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all var(--transition);
  box-shadow: 0 2px 8px rgba(var(--accent-rgb), 0.2);
}
.save-btn:hover {
  background: var(--accent-hover);
  box-shadow: 0 4px 16px rgba(var(--accent-rgb), 0.3);
  transform: translateY(-1px);
}

</style>
