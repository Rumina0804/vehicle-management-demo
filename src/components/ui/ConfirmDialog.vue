<script setup lang="ts">
import { computed } from 'vue'
import { TriangleAlert, CircleHelp } from '@lucide/vue'
import AppModal from './AppModal.vue'
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
const s = computed(() => ui.confirmState)
</script>

<template>
  <AppModal :open="!!s" :title="s?.title ?? ''" width="460px" @close="ui.resolveConfirm(false)">
    <div v-if="s" class="flex gap-3">
      <span
        class="flex size-10 shrink-0 items-center justify-center rounded-full"
        :class="s.tone === 'danger' ? 'bg-[#fde8e8] text-[#cc2a31]' : 'bg-brand-100 text-brand-700'"
      >
        <TriangleAlert v-if="s.tone === 'danger'" class="size-5" />
        <CircleHelp v-else class="size-5" />
      </span>
      <p class="whitespace-pre-line pt-1.5 text-[14px] leading-relaxed text-ink">{{ s.message }}</p>
    </div>
    <template #footer>
      <button class="btn btn-soft" @click="ui.resolveConfirm(false)">{{ s?.cancelText ?? 'キャンセル' }}</button>
      <button class="btn" :class="s?.tone === 'danger' ? 'btn-danger' : 'btn-primary'" @click="ui.resolveConfirm(true)">
        {{ s?.confirmText ?? 'OK' }}
      </button>
    </template>
  </AppModal>
</template>
