import { defineStore } from 'pinia'

const defaults = {
  api_base: 'https://api.deepseek.com',
  api_key: '',
  model: 'deepseek-chat',
  endpoint: '/v1/chat/completions',
  max_tokens: 4096,
  temperature: 0.3
}

export const useConfigStore = defineStore('config', {
  state: () => ({
    ...defaults,
    loaded: false
  }),

  actions: {
    async load() {
      if (!window.zhicrit) {
        // Running in browser (dev without Electron), use localStorage
        const saved = localStorage.getItem('zhicrit-config')
        if (saved) {
          Object.assign(this, JSON.parse(saved))
        }
        this.loaded = true
        return
      }
      const config = await window.zhicrit.getConfig()
      Object.assign(this, config)
      this.loaded = true
    },

    async save() {
      const data = {
        api_base: this.api_base,
        api_key: this.api_key,
        model: this.model,
        endpoint: this.endpoint,
        max_tokens: this.max_tokens,
        temperature: this.temperature
      }
      if (!window.zhicrit) {
        localStorage.setItem('zhicrit-config', JSON.stringify(data))
        return
      }
      await window.zhicrit.setConfig(data)
    }
  }
})
