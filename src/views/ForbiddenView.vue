<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { Lock } from '@lucide/vue'
import { useAuthStore } from '@/stores/auth'
import { ROLE_LABELS } from '@/mock/catalog'

const auth = useAuthStore()
</script>

<template>
  <div class="card mx-auto mt-10 max-w-xl p-8 text-center">
    <span class="mx-auto flex size-14 items-center justify-center rounded-full bg-[#fff1d6] text-[#a35d00]">
      <Lock class="size-7" />
    </span>
    <h1 class="mt-4 text-xl font-black text-navy-900">この画面を表示する権限がありません</h1>
    <p class="mt-2 text-[14px] leading-relaxed text-ink-2">
      現在の権限（{{ ROLE_LABELS[auth.role] }}）では利用できない機能です。<br />
      必要な場合はシステム管理者に権限の変更を依頼してください。
    </p>
    <p class="mt-1 text-[12px] text-ink-3">※デモ版では右上のユーザーメニューから権限を切り替えられます。</p>
    <RouterLink to="/" class="btn btn-primary mt-6">ダッシュボードへ戻る</RouterLink>
  </div>
</template>
