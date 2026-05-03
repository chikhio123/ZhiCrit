import { defineStore } from 'pinia'

const profileDefaults = {
  api_base: 'https://api.deepseek.com',
  api_key: '',
  model: 'deepseek-chat',
  endpoint: '/v1/chat/completions',
  max_tokens: 4096,
  temperature: 0.3
}

export const useConfigStore = defineStore('config', {
  state: () => ({
    profiles: [],
    activeProfile: null,
    streaming: false,
    theme: 'auto',
    loaded: false
  }),

  getters: {
    activeConfig(state) {
      const profile = state.profiles.find(p => p.name === state.activeProfile)
        || state.profiles[0]
      if (!profile) return { ...profileDefaults }
      return {
        api_base: profile.api_base ?? profileDefaults.api_base,
        api_key: profile.api_key ?? profileDefaults.api_key,
        model: profile.model ?? profileDefaults.model,
        endpoint: profile.endpoint ?? profileDefaults.endpoint,
        max_tokens: profile.max_tokens ?? profileDefaults.max_tokens,
        temperature: profile.temperature ?? profileDefaults.temperature
      }
    }
  },

  actions: {
    async load() {
      if (!window.zhicrit) {
        const saved = localStorage.getItem('zhicrit-config')
        if (saved) {
          Object.assign(this, JSON.parse(saved))
        }
        if (!this.profiles.length) {
          this.profiles = [{ name: '默认', ...profileDefaults }]
          this.activeProfile = '默认'
        }
        this.loaded = true
        return
      }
      const config = await window.zhicrit.getConfig()
      this.profiles = config.profiles || [{ name: '默认', ...profileDefaults }]
      this.activeProfile = config.activeProfile || this.profiles[0]?.name || '默认'
      this.streaming = config.streaming ?? false
      this.theme = config.theme || 'auto'
      this.loaded = true
    },

    async save() {
      // Deep-clone to strip Vue reactivity proxies for IPC structured-clone
      const data = JSON.parse(JSON.stringify({
        profiles: this.profiles,
        activeProfile: this.activeProfile,
        streaming: this.streaming,
        theme: this.theme
      }))
      if (!window.zhicrit) {
        localStorage.setItem('zhicrit-config', JSON.stringify(data))
        return
      }
      await window.zhicrit.setConfig(data)
    },

    addProfile(profile) {
      this.profiles.push(profile)
      if (!this.activeProfile || this.profiles.length === 1) {
        this.activeProfile = profile.name
      }
    },

    deleteProfile(name) {
      if (this.profiles.length <= 1) return
      this.profiles = this.profiles.filter(p => p.name !== name)
      if (this.activeProfile === name) {
        this.activeProfile = this.profiles[0].name
      }
    },

    renameProfile(oldName, newName) {
      const p = this.profiles.find(p => p.name === oldName)
      if (p) p.name = newName
      if (this.activeProfile === oldName) {
        this.activeProfile = newName
      }
    },

    setActiveProfile(name) {
      this.activeProfile = name
      this.save()
    },

    upsertProfile(formData) {
      const existing = this.profiles.find(p => p.name === formData.name)
      if (existing) {
        Object.assign(existing, formData)
      } else {
        this.profiles.push({ ...formData })
        this.activeProfile = formData.name
      }
    }
  }
})
