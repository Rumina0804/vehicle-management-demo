<script setup lang="ts">
import { computed, watch, type Component } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { House, Truck, Wrench, ChartColumnBig, Database, Users, ChevronRight, Lock, X } from '@lucide/vue'
import SidebarScene from './SidebarScene.vue'
import BrandLogo from './BrandLogo.vue'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import type { Permission } from '@/types'

interface NavItem {
  key: string
  label: string
  icon: Component
  to: string
  perm: Permission
  children?: { label: string; to: string; name: string; perm: Permission }[]
}

const auth = useAuthStore()
const ui = useUiStore()
const route = useRoute()

const items = computed<NavItem[]>(() => [
  { key: 'dashboard', label: 'ダッシュボード', icon: House, to: '/', perm: 'data.view' },
  {
    key: 'vehicles',
    label: '車両台帳',
    icon: Truck,
    to: '/vehicles',
    perm: 'data.view',
    children: [
      { label: '車両台帳一覧', to: '/vehicles', name: 'vehicles', perm: 'data.view' },
      { label: '新規車両登録', to: '/vehicles/new', name: 'vehicle-new', perm: 'data.edit' },
    ],
  },
  {
    key: 'maintenance',
    label: '修理・整備履歴',
    icon: Wrench,
    to: auth.can('data.edit') ? '/maintenance/new' : '/maintenance',
    perm: 'data.view',
    children: [
      { label: '履歴の登録', to: '/maintenance/new', name: 'maintenance-new', perm: 'data.edit' },
      { label: '履歴の一覧', to: '/maintenance', name: 'maintenance', perm: 'data.view' },
    ],
  },
  { key: 'analytics', label: '集計・分析', icon: ChartColumnBig, to: '/analytics', perm: 'analytics.view' },
  { key: 'masters', label: 'マスタ管理', icon: Database, to: '/masters', perm: 'data.view' },
  { key: 'users', label: 'ユーザー管理', icon: Users, to: '/users', perm: 'users.manage' },
])

const activeKey = computed(() => route.meta.nav ?? '')

watch(
  () => route.fullPath,
  () => (ui.sidebarOpen = false),
)
</script>

<template>
  <!-- PC：固定サイドバー / スマホ：ドロワー -->
  <Transition enter-active-class="transition-opacity duration-200" enter-from-class="opacity-0" leave-active-class="transition-opacity duration-150" leave-to-class="opacity-0">
    <div v-if="ui.sidebarOpen" class="fixed inset-0 z-40 bg-navy-950/50 lg:hidden" @click="ui.sidebarOpen = false" />
  </Transition>

  <aside
    class="sidebar fixed inset-y-0 left-0 z-50 w-[236px] -translate-x-full transition-transform duration-200 lg:sticky lg:top-16 lg:z-20 lg:h-[calc(100vh-4rem)] lg:translate-x-0"
    :class="ui.sidebarOpen ? 'translate-x-0' : ''"
    aria-label="メインメニュー"
  >
    <div class="relative flex h-full flex-col overflow-hidden">
      <!-- 光の帯 -->
      <div class="pointer-events-none absolute inset-0" aria-hidden="true">
        <div class="absolute -left-10 top-20 h-[140%] w-16 rotate-[28deg] bg-white/[0.04]" />
        <div class="absolute left-24 -top-10 h-[140%] w-6 rotate-[28deg] bg-white/[0.05]" />
      </div>

      <div class="flex items-center justify-between px-4 py-3 lg:hidden">
        <BrandLogo light />
        <button class="flex size-9 items-center justify-center rounded-lg text-white hover:bg-white/10" aria-label="メニューを閉じる" @click="ui.sidebarOpen = false">
          <X class="size-5" />
        </button>
      </div>

      <nav class="relative z-10 flex flex-col gap-1.5 px-3 pt-4">
        <template v-for="item in items" :key="item.key">
          <RouterLink
            v-if="auth.can(item.perm)"
            :to="item.to"
            class="nav-item group"
            :class="activeKey === item.key ? 'is-active' : ''"
            :aria-current="activeKey === item.key ? 'page' : undefined"
          >
            <component :is="item.icon" class="size-[22px] shrink-0" :stroke-width="2.2" />
            <span class="flex-1 truncate">{{ item.label }}</span>
            <ChevronRight class="size-4 shrink-0 opacity-80 transition" :class="activeKey === item.key && item.children ? 'rotate-90' : ''" />
          </RouterLink>
          <span v-else class="nav-item cursor-not-allowed opacity-45" title="この機能を利用する権限がありません">
            <component :is="item.icon" class="size-[22px] shrink-0" :stroke-width="2.2" />
            <span class="flex-1 truncate">{{ item.label }}</span>
            <Lock class="size-4 shrink-0" />
          </span>

          <div v-if="item.children && activeKey === item.key" class="mb-1 ml-9 flex flex-col gap-0.5 border-l border-white/20 pl-2">
            <template v-for="c in item.children" :key="c.to">
              <RouterLink
                v-if="auth.can(c.perm)"
                :to="c.to"
                class="rounded-md px-2.5 py-1.5 text-[13px] font-bold text-white/75 hover:bg-white/10 hover:text-white"
                :class="route.name === c.name ? 'bg-white/15 !text-white' : ''"
              >
                {{ c.label }}
              </RouterLink>
            </template>
          </div>
        </template>
      </nav>

      <SidebarScene class="pointer-events-none absolute inset-x-0 bottom-0 h-[300px] w-full [@media(max-height:820px)]:opacity-40 [@media(max-height:700px)]:hidden" />
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  background:
    radial-gradient(120% 50% at 0% 0%, rgb(70 140 240 / 0.35), transparent 60%),
    linear-gradient(180deg, #0f3f8c 0%, #0b2f6c 55%, #0a2a63 100%);
  box-shadow: 4px 0 18px rgb(8 30 70 / 0.18);
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  height: 3rem;
  padding: 0 0.75rem 0 0.9rem;
  border-radius: 0.65rem;
  color: rgb(255 255 255 / 0.94);
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.02em;
  transition: background-color 0.15s;
}
a.nav-item:hover {
  background: rgb(255 255 255 / 0.1);
}
.nav-item.is-active {
  background: linear-gradient(90deg, #3b93ff 0%, #1d6fe6 100%);
  box-shadow:
    0 6px 16px rgb(20 110 255 / 0.45),
    inset 0 1px 0 rgb(255 255 255 / 0.35);
  outline: 1px solid rgb(255 255 255 / 0.35);
}
</style>
