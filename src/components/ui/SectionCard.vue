<script setup lang="ts">
import type { Component } from 'vue'

withDefaults(
  defineProps<{
    title: string
    icon?: Component
    sub?: string
    bodyClass?: string
  }>(),
  { bodyClass: 'p-4', sub: '', icon: undefined },
)
</script>

<template>
  <section class="card flex min-w-0 flex-col">
    <header class="card-head">
      <component :is="icon" v-if="icon" class="relative z-[1] size-5 shrink-0" :stroke-width="2.4" />
      <h2 class="relative z-[1] min-w-0 truncate">
        {{ title }}<span v-if="sub" class="card-head-sub ml-1">{{ sub }}</span>
      </h2>
      <div class="relative z-[1] ml-auto flex shrink-0 items-center gap-2">
        <slot name="actions" />
      </div>
    </header>
    <div class="min-h-0 flex-1" :class="bodyClass">
      <slot />
    </div>
  </section>
</template>
