<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { LogIn, ShieldCheck } from '@lucide/vue'
import BrandLogo from '@/components/layout/BrandLogo.vue'
import SidebarScene from '@/components/layout/SidebarScene.vue'
import { DEMO_ACCOUNTS, useAuthStore } from '@/stores/auth'
import { useDbStore } from '@/stores/db'
import { ROLE_LABELS } from '@/mock/catalog'

const auth = useAuthStore()
const db = useDbStore()
const router = useRouter()
const route = useRoute()

const accounts = computed(() => DEMO_ACCOUNTS.map((a) => ({ ...a, user: db.userByLogin.get(a.loginId) })))

function enter(loginId: string) {
  if (!auth.login(loginId)) return
  const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/') ? route.query.redirect : '/'
  router.replace(redirect)
}
</script>

<template>
  <div class="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#0f3f8c] via-[#0b2f6c] to-[#071a3e] p-4">
    <SidebarScene class="pointer-events-none absolute bottom-0 left-0 h-[360px] w-[300px] opacity-70" />
    <div class="pointer-events-none absolute -right-40 -top-40 size-[520px] rounded-full bg-[#3b8cf5]/20 blur-3xl" />

    <main class="relative w-full max-w-[460px] rounded-2xl bg-white p-7 shadow-pop">
      <BrandLogo />
      <h1 class="mt-5 text-[24px] font-black tracking-wide text-navy-900">車両管理Webシステム</h1>
      <p class="mt-1 text-[13px] text-ink-2">デモ版：ログインするアカウント（権限）を選んでください。</p>

      <ul class="mt-5 space-y-2">
        <li v-for="a in accounts" :key="a.loginId">
          <button
            class="flex w-full items-center gap-3 rounded-xl border border-line px-4 py-3 text-left transition hover:border-brand-300 hover:bg-brand-50"
            @click="enter(a.loginId)"
          >
            <span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-navy-900 text-[15px] font-bold text-white">
              {{ a.user?.name.slice(0, 1) }}
            </span>
            <span class="min-w-0 flex-1">
              <span class="block text-[14px] font-black text-navy-900">{{ ROLE_LABELS[a.role] }}</span>
              <span class="block truncate text-[12px] text-ink-2">{{ a.user?.name }}（{{ a.loginId }}）／{{ a.note }}</span>
            </span>
            <LogIn class="size-5 shrink-0 text-brand-600" />
          </button>
        </li>
      </ul>

      <p class="mt-5 flex items-start gap-2 rounded-lg bg-[#f4f8ff] px-3 py-2.5 text-[12px] leading-relaxed text-ink-2">
        <ShieldCheck class="mt-0.5 size-4 shrink-0 text-brand-600" />
        本番システムではログインIDとパスワードで認証します。デモ版ではパスワード入力を省略しています。
      </p>
    </main>
  </div>
</template>
