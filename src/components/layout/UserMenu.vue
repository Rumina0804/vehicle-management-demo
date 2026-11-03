<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronDown, CircleUserRound, LogOut, RefreshCw, Check, Repeat } from '@lucide/vue'
import { useAuthStore, DEMO_ACCOUNTS } from '@/stores/auth'
import { useDbStore } from '@/stores/db'
import { useUiStore } from '@/stores/ui'
import { useClickOutside } from '@/composables/useClickOutside'
import { ROLE_LABELS } from '@/mock/catalog'

const auth = useAuthStore()
const db = useDbStore()
const ui = useUiStore()
const router = useRouter()
const route = useRoute()

const open = ref(false)
const root = ref<HTMLElement | null>(null)
useClickOutside(root, () => (open.value = false))

const accounts = computed(() =>
  DEMO_ACCOUNTS.map((a) => ({ ...a, user: db.userByLogin.get(a.loginId) })).filter((a) => a.user),
)

function switchTo(loginId: string) {
  if (!auth.login(loginId)) return
  open.value = false
  const u = db.userByLogin.get(loginId)
  ui.toast(`${u?.name}（${ROLE_LABELS[auth.role]}）に切り替えました`, 'info')
  // 権限のない画面にいる場合はダッシュボードへ
  const perm = route.meta.permission
  if (perm && !auth.can(perm)) router.push('/')
}

async function resetData() {
  open.value = false
  const ok = await ui.confirm({
    title: 'デモデータを初期化',
    message: '登録・編集した内容を破棄し、デモデータを今日の日付で作り直します。よろしいですか？',
    confirmText: '初期化する',
    tone: 'danger',
  })
  if (!ok) return
  db.reset()
  ui.toast('デモデータを初期化しました')
  router.push('/')
}

function logout() {
  open.value = false
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <div ref="root" class="relative">
    <button
      class="flex h-10 items-center gap-2 rounded-lg pl-2 pr-2.5 hover:bg-white/10"
      :aria-expanded="open"
      aria-haspopup="menu"
      @click="open = !open"
    >
      <CircleUserRound class="size-[24px]" />
      <span class="hidden text-[14px] font-bold sm:inline">{{ ROLE_LABELS[auth.role] }}</span>
      <ChevronDown class="size-4 transition" :class="open ? 'rotate-180' : ''" />
    </button>

    <Transition
      enter-active-class="transition duration-150"
      enter-from-class="opacity-0 -translate-y-1"
      leave-active-class="transition duration-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        role="menu"
        class="absolute right-0 top-12 z-50 w-[min(340px,calc(100vw-24px))] overflow-hidden rounded-xl border border-line bg-white text-ink shadow-pop"
      >
        <div v-if="auth.user" class="flex items-center gap-3 bg-gradient-to-r from-brand-50 to-white px-4 py-3">
          <span class="flex size-10 items-center justify-center rounded-full bg-navy-900 text-sm font-bold text-white">
            {{ auth.user.name.slice(0, 1) }}
          </span>
          <span class="min-w-0">
            <span class="block text-sm font-bold">{{ auth.user.name }}<span class="ml-1.5 text-xs font-medium text-ink-3">{{ auth.user.loginId }}</span></span>
            <span class="block truncate text-xs text-ink-2">{{ db.userAffiliation(auth.user) }}／{{ ROLE_LABELS[auth.role] }}</span>
          </span>
        </div>

        <div class="border-t border-line-soft px-2 py-2">
          <p class="flex items-center gap-1.5 px-2 pb-1 text-[11px] font-bold text-ink-3">
            <Repeat class="size-3.5" />権限を切り替えて確認（デモ用）
          </p>
          <button
            v-for="a in accounts"
            :key="a.loginId"
            role="menuitemradio"
            :aria-checked="a.loginId === auth.loginId"
            class="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-brand-50"
            @click="switchTo(a.loginId)"
          >
            <span class="flex size-4 shrink-0 items-center justify-center">
              <Check v-if="a.loginId === auth.loginId" class="size-4 text-brand-600" :stroke-width="3" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block text-[13px] font-bold">{{ ROLE_LABELS[a.role] }}<span class="ml-1.5 text-xs font-medium text-ink-2">{{ a.user?.name }}</span></span>
              <span class="block text-[11px] text-ink-3">{{ a.note }}</span>
            </span>
          </button>
        </div>

        <div class="border-t border-line-soft p-2">
          <button role="menuitem" class="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-[13px] font-bold hover:bg-brand-50" @click="resetData">
            <RefreshCw class="size-4 text-ink-2" />デモデータを初期化
          </button>
          <button role="menuitem" class="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-[13px] font-bold hover:bg-brand-50" @click="logout">
            <LogOut class="size-4 text-ink-2" />ログアウト
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>
