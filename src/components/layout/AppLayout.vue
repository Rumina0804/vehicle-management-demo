<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router'
import AppHeader from './AppHeader.vue'
import AppSidebar from './AppSidebar.vue'
import FeatureBanner from './FeatureBanner.vue'
import HelpDrawer from './HelpDrawer.vue'
import { useDbStore } from '@/stores/db'

const route = useRoute()
const db = useDbStore()
</script>

<template>
  <div class="relative min-h-screen">
    <!-- ページ背景（光の帯） -->
    <div class="pointer-events-none fixed inset-0 -z-0" aria-hidden="true">
      <div class="absolute inset-0 bg-gradient-to-br from-[#eef4fb] via-[#e9f1fa] to-[#dfeaf8]" />
      <div class="absolute -top-40 right-[-10%] h-[520px] w-[720px] rotate-[-18deg] rounded-full bg-white/50 blur-3xl" />
      <div class="absolute bottom-[-200px] left-[20%] h-[400px] w-[900px] rotate-[-8deg] rounded-full bg-[#cfe0f7]/50 blur-3xl" />
    </div>

    <AppHeader />

    <div class="relative flex items-start">
      <AppSidebar />
      <main class="relative min-w-0 flex-1 px-3 pb-6 pt-4 sm:px-4 lg:px-5 2xl:px-6">
        <div
          v-if="db.storageWarning"
          class="mb-3 rounded-lg border border-[#f3d29a] bg-[#fff6e5] px-4 py-2 text-[13px] text-[#8a5300]"
          role="status"
        >
          ブラウザの保存容量が不足しているため、一部の変更が保存されていません（画面上の操作は継続できます）。
        </div>
        <RouterView v-slot="{ Component, route: r }">
          <Transition name="page" mode="out-in">
            <component :is="Component" :key="r.path" />
          </Transition>
        </RouterView>
        <FeatureBanner v-if="route.meta.banner" :variant="route.meta.banner" class="mt-5" />
        <p class="mt-4 text-center text-[11px] text-ink-3">
          © DOUKO KIKO CO., LTD. ／ 車両管理Webシステム デモ版（表示データはすべて架空のサンプルです）
        </p>
      </main>
    </div>

    <HelpDrawer />
  </div>
</template>
