<script setup lang="ts">
import type { Component } from 'vue'
import HeroBadge from './HeroBadge.vue'

withDefaults(
  defineProps<{
    title: string
    icon: Component
    description?: string
    badge?: 'fleet' | 'analytics' | 'none'
  }>(),
  { badge: 'fleet', description: '' },
)
</script>

<template>
  <div class="mb-4 flex min-h-[60px] flex-wrap items-center gap-x-5 gap-y-2">
    <div class="flex items-center gap-3">
      <component :is="icon" class="size-9 shrink-0 text-navy-900" :stroke-width="2.4" />
      <h1 class="text-[26px] font-black tracking-[0.04em] text-navy-900 sm:text-[30px]">{{ title }}</h1>
    </div>
    <p
      v-if="description"
      class="hidden max-w-[560px] whitespace-pre-line border-l-2 border-[#c4d1e3] pl-5 text-[13px] leading-relaxed text-ink-2 md:block"
    >
      {{ description }}
    </p>
    <div class="ml-auto flex items-center gap-3">
      <slot name="actions" />
      <HeroBadge v-if="badge !== 'none'" :variant="badge" />
    </div>
  </div>
</template>
