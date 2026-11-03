<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Bell, CircleAlert, Info, TriangleAlert, CheckCheck } from '@lucide/vue'
import { useNotices } from '@/composables/useNotices'
import { useClickOutside } from '@/composables/useClickOutside'

const open = ref(false)
const root = ref<HTMLElement | null>(null)
useClickOutside(root, () => (open.value = false))

const router = useRouter()
const { notices, unreadCount, markAllRead, markRead } = useNotices()

const LEVEL = {
  danger: { icon: CircleAlert, cls: 'text-[#cc2a31] bg-[#fde8e8]' },
  warning: { icon: TriangleAlert, cls: 'text-[#a35d00] bg-[#fff1d6]' },
  info: { icon: Info, cls: 'text-brand-700 bg-brand-100' },
} as const

function go(id: string, to: string) {
  markRead(id)
  open.value = false
  router.push(to)
}
</script>

<template>
  <div ref="root" class="relative">
    <button
      class="relative flex h-10 w-12 items-center justify-center rounded-lg hover:bg-white/10"
      :aria-label="`お知らせ（未読${unreadCount}件）`"
      :aria-expanded="open"
      @click="open = !open"
    >
      <Bell class="size-[22px]" />
      <span
        v-if="unreadCount"
        class="absolute right-1.5 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#e5484f] px-1 text-[11px] font-bold leading-none text-white ring-2 ring-navy-900"
      >
        {{ unreadCount }}
      </span>
    </button>

    <Transition
      enter-active-class="transition duration-150"
      enter-from-class="opacity-0 -translate-y-1"
      leave-active-class="transition duration-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="absolute right-0 top-12 z-50 w-[min(360px,calc(100vw-24px))] overflow-hidden rounded-xl border border-line bg-white text-ink shadow-pop"
      >
        <div class="flex items-center justify-between border-b border-line-soft px-4 py-2.5">
          <span class="text-sm font-bold">お知らせ</span>
          <button v-if="unreadCount" class="flex items-center gap-1 text-xs font-bold text-brand-600 hover:underline" @click="markAllRead">
            <CheckCheck class="size-3.5" />すべて既読にする
          </button>
        </div>
        <ul class="max-h-[60vh] overflow-y-auto">
          <li v-for="n in notices" :key="n.id">
            <button
              class="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-brand-50"
              :class="n.read ? 'opacity-60' : ''"
              @click="go(n.id, n.to)"
            >
              <span class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full" :class="LEVEL[n.level].cls">
                <component :is="LEVEL[n.level].icon" class="size-4" />
              </span>
              <span class="min-w-0 flex-1">
                <span class="flex items-center gap-2 text-[13px] font-bold">
                  {{ n.title }}
                  <span v-if="!n.read" class="size-2 shrink-0 rounded-full bg-[#e5484f]" aria-label="未読" />
                </span>
                <span class="mt-0.5 block text-xs leading-relaxed text-ink-2">{{ n.body }}</span>
              </span>
            </button>
          </li>
          <li v-if="!notices.length" class="px-4 py-8 text-center text-sm text-ink-3">新しいお知らせはありません</li>
        </ul>
      </div>
    </Transition>
  </div>
</template>
