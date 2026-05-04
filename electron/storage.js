const path = require('path')
const fs = require('fs')

const profileDefaults = {
  api_base: 'https://api.deepseek.com',
  api_key: '',
  model: 'deepseek-chat',
  endpoint: '/v1/chat/completions',
  max_tokens: 4096,
  temperature: 0.3
}

// ── Config ──

function getConfigPath(userDataPath) {
  return path.join(userDataPath, 'config.json')
}

function loadConfig(userDataPath) {
  const configPath = getConfigPath(userDataPath)
  const defaultConfig = {
    profiles: [{ name: '默认', ...profileDefaults }],
    activeProfile: '默认',
    streaming: false
  }
  try {
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      if (!data.profiles && data.api_base !== undefined) {
        const migrated = {
          profiles: [{
            name: '默认',
            api_base: data.api_base ?? profileDefaults.api_base,
            api_key: data.api_key ?? profileDefaults.api_key,
            model: data.model ?? profileDefaults.model,
            endpoint: data.endpoint ?? profileDefaults.endpoint,
            max_tokens: data.max_tokens ?? profileDefaults.max_tokens,
            temperature: data.temperature ?? profileDefaults.temperature
          }],
          activeProfile: '默认'
        }
        fs.writeFileSync(configPath, JSON.stringify(migrated, null, 2), 'utf-8')
        return migrated
      }
      if (data.profiles) return data
    }
  } catch (e) {
    console.error('Failed to load config:', e)
  }
  return defaultConfig
}

function getActiveConfig(fullConfig) {
  const profiles = fullConfig.profiles || []
  const name = fullConfig.activeProfile
  const profile = profiles.find(p => p.name === name) || profiles[0]
  if (!profile) return { ...profileDefaults }
  return {
    api_base: profile.api_base ?? profileDefaults.api_base,
    api_key: profile.api_key ?? profileDefaults.api_key,
    model: profile.model ?? profileDefaults.model,
    endpoint: profile.endpoint ?? profileDefaults.endpoint,
    max_tokens: profile.max_tokens ?? profileDefaults.max_tokens,
    temperature: profile.temperature ?? profileDefaults.temperature,
    streaming: fullConfig.streaming ?? false
  }
}

function saveConfig(userDataPath, config) {
  fs.writeFileSync(getConfigPath(userDataPath), JSON.stringify(config, null, 2), 'utf-8')
}

// ── Prompts ──

function getPromptPath(name, { isDev, resourcesPath, __dirname }) {
  if (isDev) return path.join(__dirname, '..', 'src', 'prompts', name)
  return path.join(resourcesPath, 'prompts', name)
}

function loadPrompt(name, ctx) {
  return fs.readFileSync(getPromptPath(name, ctx), 'utf-8')
}

// ── History ──

function getHistoryDir(userDataPath) {
  const dir = path.join(userDataPath, 'history')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

function getHistoryPath(userDataPath) {
  return path.join(getHistoryDir(userDataPath), 'history.json')
}

function getReportPath(userDataPath, id) {
  return path.join(getHistoryDir(userDataPath), `analysis-${id}.md`)
}

function getAnnotationsPath(userDataPath, id) {
  return path.join(getHistoryDir(userDataPath), `analysis-${id}-annotations.json`)
}

function loadHistory(userDataPath) {
  const p = getHistoryPath(userDataPath)
  try {
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8'))
  } catch (e) {
    console.error('Failed to load history:', e)
  }
  return []
}

function saveHistory(userDataPath, list) {
  fs.writeFileSync(getHistoryPath(userDataPath), JSON.stringify(list, null, 2), 'utf-8')
}

function deleteHistoryFiles(userDataPath, id) {
  const rp = getReportPath(userDataPath, id)
  if (fs.existsSync(rp)) fs.unlinkSync(rp)
  const ap = getAnnotationsPath(userDataPath, id)
  if (fs.existsSync(ap)) fs.unlinkSync(ap)
}

module.exports = {
  profileDefaults,
  loadConfig, getActiveConfig, saveConfig,
  getPromptPath, loadPrompt,
  getHistoryDir, getHistoryPath, getReportPath, getAnnotationsPath,
  loadHistory, saveHistory, deleteHistoryFiles
}
