<script setup lang="ts">
import { useId } from 'vue'

withDefaults(defineProps<{ light?: boolean; compact?: boolean }>(), { light: false, compact: false })
const gid = useId()
</script>

<template>
  <span class="flex items-center gap-2.5">
    <svg viewBox="0 0 56 40" class="h-9 w-[50px] shrink-0" aria-hidden="true">
      <defs>
        <linearGradient :id="`${gid}-a`" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#3d8ef6" />
          <stop offset="1" stop-color="#1450b8" />
        </linearGradient>
        <linearGradient :id="`${gid}-b`" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#5aa2fa" />
          <stop offset="1" stop-color="#1d5fd0" />
        </linearGradient>
      </defs>
      <path d="M16 2h14L14 38H0z" :fill="`url(#${gid}-a)`" />
      <path d="M38 2h14L36 38H22z" :fill="`url(#${gid}-b)`" />
    </svg>
    <span v-if="!compact" class="leading-none">
      <span class="block text-[17px] font-black tracking-[0.06em]" :class="light ? 'text-white' : 'text-navy-900'">
        株式会社 道廣機工
      </span>
      <span
        class="mt-1 block text-[9px] font-bold tracking-[0.28em]"
        :class="light ? 'text-white/70' : 'text-navy-700'"
      >
        DOUKO KIKO CO., LTD.
      </span>
    </span>
  </span>
</template>
