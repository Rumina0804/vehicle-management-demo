<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { Menu, CircleHelp, Truck } from '@lucide/vue'
import BrandLogo from './BrandLogo.vue'
import HeaderFleet from './HeaderFleet.vue'
import NotificationMenu from './NotificationMenu.vue'
import UserMenu from './UserMenu.vue'
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
</script>

<template>
  <header class="sticky top-0 z-40 h-16 bg-white shadow-[0_2px_12px_rgba(10,40,90,0.10)]">
    <!-- 背景の装飾 -->
    <div class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div class="absolute inset-0 bg-gradient-to-r from-white via-white to-[#e4effd]" />
      <div
        class="absolute inset-y-0 right-0 w-[58%] bg-gradient-to-r from-[#d7e7fc] via-[#8dbaf3] to-[#2a6fdb]"
        style="clip-path: polygon(14% 0, 100% 0, 100% 100%, 0 100%)"
      />
      <div
        class="absolute inset-y-0 right-[30%] w-24 bg-white/40"
        style="clip-path: polygon(45% 0, 100% 0, 55% 100%, 0 100%)"
      />
      <HeaderFleet class="absolute bottom-0 right-[300px] hidden h-[60px] w-[430px] xl:block" />
    </div>

    <div class="relative flex h-full items-center gap-3 px-3 lg:gap-4 lg:px-5">
      <button
        class="flex size-10 items-center justify-center rounded-lg text-navy-900 hover:bg-brand-50 lg:hidden"
        aria-label="メニューを開く"
        @click="ui.sidebarOpen = true"
      >
        <Menu class="size-6" />
      </button>

      <RouterLink to="/" class="shrink-0" aria-label="ダッシュボードへ">
        <BrandLogo />
      </RouterLink>

      <div class="hidden h-9 w-px bg-[#c4d1e3] md:block" />

      <div class="hidden min-w-0 items-center gap-2.5 md:flex">
        <Truck class="size-8 shrink-0 text-navy-800" :stroke-width="2.2" />
        <span class="truncate text-[23px] font-black tracking-[0.04em] text-navy-900">車両管理Webシステム</span>
        <span class="rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-black tracking-wider text-navy-950">DEMO</span>
      </div>

      <div class="flex-1" />

      <nav
        class="flex items-center rounded-xl bg-gradient-to-b from-[#0d2f66] to-[#081f47] px-1 text-white shadow-[0_4px_14px_rgba(5,25,60,0.35)] ring-1 ring-white/10"
        aria-label="ユーザーメニュー"
      >
        <NotificationMenu />
        <span class="h-6 w-px bg-white/20" />
        <button
          class="flex h-10 items-center gap-1.5 rounded-lg px-3 text-[14px] font-bold hover:bg-white/10"
          @click="ui.helpOpen = true"
        >
          <CircleHelp class="size-[20px]" /><span class="hidden sm:inline">ヘルプ</span>
        </button>
        <span class="h-6 w-px bg-white/20" />
        <UserMenu />
      </nav>
    </div>
  </header>
</template>
