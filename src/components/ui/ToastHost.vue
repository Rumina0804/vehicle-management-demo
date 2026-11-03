<script setup lang="ts">
import { CircleCheck, CircleX, Info, X } from '@lucide/vue'
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
const ICON = { success: CircleCheck, error: CircleX, info: Info } as const
const CLS = {
  success: 'border-[#a9dcbc] text-[#0f6b35]',
  error: 'border-[#f0b8bb] text-[#b4232a]',
  info: 'border-brand-200 text-brand-700',
} as const
</script>

<template>
  <Teleport to="body">
    <div class="pointer-events-none fixed bottom-5 right-5 z-[90] flex w-[min(380px,calc(100vw-40px))] flex-col gap-2" aria-live="polite">
      <TransitionGroup
        enter-active-class="transition duration-200"
        enter-from-class="opacity-0 translate-y-2"
        leave-active-class="transition duration-150"
        leave-to-class="opacity-0"
      >
        <div
          v-for="t in ui.toasts"
          :key="t.id"
          class="pointer-events-auto flex items-start gap-2.5 rounded-xl border bg-white px-4 py-3 shadow-pop"
          :class="CLS[t.type]"
          role="status"
        >
          <component :is="ICON[t.type]" class="mt-0.5 size-5 shrink-0" />
          <p class="flex-1 text-[13px] font-bold leading-relaxed text-ink">{{ t.message }}</p>
          <button class="text-ink-3 hover:text-ink" aria-label="閉じる" @click="ui.dismiss(t.id)"><X class="size-4" /></button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
