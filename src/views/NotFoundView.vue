<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { SearchX } from '@lucide/vue'
</script>

<template>
  <div class="card mx-auto mt-10 max-w-xl p-8 text-center">
    <span class="mx-auto flex size-14 items-center justify-center rounded-full bg-brand-100 text-brand-700">
      <SearchX class="size-7" />
    </span>
    <h1 class="mt-4 text-xl font-black text-navy-900">ページが見つかりません</h1>
    <p class="mt-2 text-[14px] text-ink-2">URLが正しいか確認してください。</p>
    <RouterLink to="/" class="btn btn-primary mt-6">ダッシュボードへ戻る</RouterLink>
  </div>
</template>
