<script setup>
import { ref } from 'vue'

const messages = ref([])
let nextId = 0

function add(type, text, duration = 4000) {
  const id = nextId++
  messages.value.push({ id, type, text })
  if (duration > 0) {
    setTimeout(() => remove(id), duration)
  }
  return id
}

function remove(id) {
  const idx = messages.value.findIndex(m => m.id === id)
  if (idx !== -1) {
    messages.value.splice(idx, 1)
  }
}

// Global singleton
const toast = {
  success: (text) => add('success', text),
  warning: (text) => add('warning', text, 5000),
  error: (text) => add('error', text, 6000),
  info: (text) => add('info', text),
  remove,
  messages
}

defineExpose(toast)

// Expose globally for use outside components
if (typeof window !== 'undefined') {
  window.__toast = toast
}
</script>

<template>
  <Teleport to="body">
    <div class="toast-container">
      <TransitionGroup name="toast">
        <div
          v-for="msg in messages"
          :key="msg.id"
          class="toast-item"
          :class="`toast-${msg.type}`"
          @click="remove(msg.id)"
        >
          <span class="toast-icon">
            <svg v-if="msg.type === 'success'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            <svg v-else-if="msg.type === 'warning'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <svg v-else-if="msg.type === 'error'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          </span>
          <span class="toast-text">{{ msg.text }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style>
.toast-container {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  pointer-events: none;
}

.toast-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.5;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  pointer-events: auto;
  cursor: pointer;
  max-width: 480px;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.toast-success {
  background: var(--success-soft);
  border: 1px solid var(--success);
  color: var(--text);
}

.toast-warning {
  background: var(--warning-soft);
  border: 1px solid var(--warning);
  color: var(--text);
}

.toast-error {
  background: var(--danger-soft);
  border: 1px solid var(--danger);
  color: var(--text);
}

.toast-info {
  background: var(--accent-soft);
  border: 1px solid var(--accent);
  color: var(--text);
}

.toast-icon {
  flex-shrink: 0;
  display: flex;
}

.toast-text {
  flex: 1;
}

/* ── Transition ── */
.toast-enter-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.toast-leave-active {
  transition: all 0.2s ease-in;
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(-12px) scale(0.95);
}
.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.95);
}
</style>
