<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { X } from '@lucide/vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    width?: string
  }>(),
  { width: '640px' },
)
const emit = defineEmits<{ close: [] }>()

const panel = ref<HTMLElement | null>(null)

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

watch(
  () => props.open,
  async (open) => {
    if (open) {
      document.addEventListener('keydown', onKey)
      document.body.style.overflow = 'hidden'
      await nextTick()
      panel.value?.focus()
    } else {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition enter-active-class="transition duration-200" enter-from-class="opacity-0" leave-active-class="transition duration-150" leave-to-class="opacity-0">
      <div v-if="open" class="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-navy-950/45 p-3 pt-[6vh] sm:p-6 sm:pt-[8vh]" @mousedown.self="emit('close')">
        <div
          ref="panel"
          tabindex="-1"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
          class="w-full overflow-hidden rounded-2xl bg-white shadow-pop outline-none"
          :style="{ maxWidth: width }"
        >
          <div class="flex items-center gap-3 bg-gradient-to-r from-[#1553bd] via-[#2470dc] to-[#5b9cf0] px-5 py-3.5 text-white">
            <h2 class="flex-1 text-[16px] font-black tracking-wide">{{ title }}</h2>
            <button class="flex size-8 items-center justify-center rounded-lg hover:bg-white/15" aria-label="閉じる" @click="emit('close')">
              <X class="size-5" />
            </button>
          </div>
          <div class="max-h-[72vh] overflow-y-auto p-5">
            <slot />
          </div>
          <div v-if="$slots.footer" class="flex flex-wrap items-center justify-end gap-2 border-t border-line-soft bg-[#f7f9fd] px-5 py-3">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
