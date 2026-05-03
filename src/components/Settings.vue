<script setup>
import { ref, watch } from 'vue'
import { useConfigStore } from '../stores/config.js'

const configStore = useConfigStore()
const saved = ref(false)

const form = ref({
  api_base: '',
  api_key: '',
  model: '',
  endpoint: '',
  max_tokens: 4096,
  temperature: 0.3
})

watch(() => configStore.loaded, (loaded) => {
  if (loaded) {
    form.value.api_base = configStore.api_base
    form.value.api_key = configStore.api_key
    form.value.model = configStore.model
    form.value.endpoint = configStore.endpoint
    form.value.max_tokens = configStore.max_tokens
    form.value.temperature = configStore.temperature
  }
}, { immediate: true })

async function handleSave() {
  configStore.api_base = form.value.api_base
  configStore.api_key = form.value.api_key
  configStore.model = form.value.model
  configStore.endpoint = form.value.endpoint
  configStore.max_tokens = Number(form.value.max_tokens)
  configStore.temperature = Number(form.value.temperature)
  await configStore.save()
  saved.value = true
  window.__toast?.success('配置已保存～')
  setTimeout(() => { saved.value = false }, 2000)
}

function preset(name) {
  saved.value = false
  if (name === 'deepseek') {
    form.value.api_base = 'https://api.deepseek.com'
    form.value.model = 'deepseek-chat'
    form.value.endpoint = '/v1/chat/completions'
  } else if (name === 'openai') {
    form.value.api_base = 'https://api.openai.com'
    form.value.model = 'gpt-4o'
    form.value.endpoint = '/v1/chat/completions'
  } else if (name === 'ollama') {
    form.value.api_base = 'http://localhost:11434'
    form.value.model = 'llama3'
    form.value.endpoint = '/v1/chat/completions'
  }
}
</script>

<template>
  <div class="settings">
    <div class="settings-card">
      <div class="settings-header">
        <h2>API 配置</h2>
        <p>支持任意 OpenAI 兼容接口 — DeepSeek、OpenAI、Ollama 等</p>
      </div>

      <div class="form-grid">
        <div class="form-group span-2">
          <label>API Base URL</label>
          <input v-model="form.api_base" type="text" placeholder="https://api.deepseek.com" />
        </div>

        <div class="form-group span-2">
          <label>Endpoint</label>
          <input v-model="form.endpoint" type="text" placeholder="/v1/chat/completions" />
        </div>

        <div class="form-group span-2">
          <label>API Key</label>
          <div class="key-input-wrap">
            <input v-model="form.api_key" type="password" placeholder="sk-xxx" />
            <div class="key-dot" v-if="form.api_key" title="已填写"></div>
          </div>
        </div>

        <div class="form-group">
          <label>Model</label>
          <input v-model="form.model" type="text" placeholder="deepseek-chat" />
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

      <div class="settings-actions">
        <button class="save-btn" @click="handleSave">
          <svg v-if="saved" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          {{ saved ? '已保存' : '保存配置' }}
        </button>
      </div>
    </div>

    <div class="settings-card">
      <h3>快速预设</h3>
      <div class="preset-grid">
        <button class="preset-card" @click="preset('deepseek')">
          <div class="preset-icon deepseek">DS</div>
          <div class="preset-info">
            <span class="preset-name">DeepSeek</span>
            <span class="preset-model">deepseek-chat</span>
          </div>
        </button>
        <button class="preset-card" @click="preset('openai')">
          <div class="preset-icon openai">OA</div>
          <div class="preset-info">
            <span class="preset-name">OpenAI</span>
            <span class="preset-model">gpt-4o</span>
          </div>
        </button>
        <button class="preset-card" @click="preset('ollama')">
          <div class="preset-icon ollama">OL</div>
          <div class="preset-info">
            <span class="preset-name">Ollama</span>
            <span class="preset-model">本地模型</span>
          </div>
        </button>
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
  margin-bottom: 24px;
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

.settings-card h3 {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 14px;
}

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
  box-shadow: 0 0 6px rgba(16, 185, 129, 0.4);
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
  box-shadow: 0 2px 8px rgba(0, 132, 255, 0.2);
}
.save-btn:hover {
  background: var(--accent-hover);
  box-shadow: 0 4px 16px rgba(0, 132, 255, 0.3);
  transform: translateY(-1px);
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.preset-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  background: var(--bg-card);
  cursor: pointer;
  transition: all var(--transition);
  font-family: inherit;
  text-align: left;
}

.preset-card:hover {
  border-color: var(--accent);
  background: var(--accent-soft);
  box-shadow: var(--shadow-sm);
}

.preset-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 800;
  color: white;
  flex-shrink: 0;
}

.preset-icon.deepseek { background: linear-gradient(135deg, #005eb8, #0084ff); }
.preset-icon.openai { background: linear-gradient(135deg, #10a37f, #34d399); }
.preset-icon.ollama { background: linear-gradient(135deg, #374151, #6b7280); }

.preset-info {
  display: flex;
  flex-direction: column;
}

.preset-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

.preset-model {
  font-size: 11px;
  color: var(--text-muted);
}
</style>
