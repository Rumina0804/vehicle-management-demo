import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Toast {
  id: number
  type: 'success' | 'error' | 'info'
  message: string
}

export interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  tone?: 'primary' | 'danger'
}

export const useUiStore = defineStore('ui', () => {
  const toasts = ref<Toast[]>([])
  let seq = 0

  function toast(message: string, type: Toast['type'] = 'success') {
    const id = ++seq
    toasts.value.push({ id, type, message })
    setTimeout(() => dismiss(id), 3800)
  }

  function dismiss(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  const confirmState = ref<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null)

  function confirm(opts: ConfirmOptions): Promise<boolean> {
    confirmState.value?.resolve(false)
    return new Promise((resolve) => {
      confirmState.value = { ...opts, resolve }
    })
  }

  function resolveConfirm(v: boolean) {
    confirmState.value?.resolve(v)
    confirmState.value = null
  }

  const sidebarOpen = ref(false)
  const helpOpen = ref(false)

  return { toasts, toast, dismiss, confirmState, confirm, resolveConfirm, sidebarOpen, helpOpen }
})
