<script setup lang="ts">
import { computed } from 'vue'
import { ChartSpline } from '@lucide/vue'
import { useDbStore } from '@/stores/db'

const props = withDefaults(defineProps<{ variant?: 'fleet' | 'analytics' }>(), { variant: 'fleet' })
const db = useDbStore()

const fleet = computed(() => Math.round(db.vehicles.length / 10) * 10)
const divisions = computed(() => db.activeDivisions.length)
</script>

<template>
  <div class="relative hidden h-[54px] items-center pl-5 xl:flex" aria-hidden="true">
    <span class="absolute left-0 top-0 h-full w-9 -skew-x-[22deg] rounded-[3px] bg-gradient-to-b from-[#ffd76a] to-[#f2a700]" />
    <span class="absolute left-3 top-0 h-full w-3 -skew-x-[22deg] bg-white/70" />
    <div
      class="relative flex h-full -skew-x-[22deg] items-center rounded-md bg-gradient-to-r from-[#1b5fd2] via-[#1450b8] to-[#0c3a8e] px-7 shadow-[0_6px_16px_rgba(12,58,142,0.35)] ring-1 ring-white/30"
    >
      <div v-if="props.variant === 'fleet'" class="flex skew-x-[22deg] items-baseline gap-1 whitespace-nowrap font-black italic text-white">
        <span class="text-[19px] tracking-wider">保有車両</span>
        <span class="ml-2 text-[16px]">約</span>
        <span class="text-[40px] leading-none">{{ fleet }}</span>
        <span class="text-[19px]">台</span>
        <span class="mx-4 h-9 w-[2px] translate-y-1 rotate-[22deg] self-center bg-white/60" />
        <span class="text-[19px] tracking-wider">対応</span>
        <span class="ml-1.5 text-[40px] leading-none text-[#ffd25a]">{{ divisions }}</span>
        <span class="text-[19px]">事業部</span>
      </div>
      <div v-else class="flex skew-x-[22deg] items-center gap-3 whitespace-nowrap font-black italic text-white">
        <ChartSpline class="size-8 not-italic" :stroke-width="2.4" />
        <span class="text-[19px] tracking-wider">修理実態と会社負担を</span>
        <span class="text-[32px] leading-none text-[#ffd25a]">比較・分析</span>
      </div>
    </div>
  </div>
</template>
