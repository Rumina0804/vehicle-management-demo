<script setup lang="ts">
import { computed, type Component } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowUp, ArrowDown, Minus } from '@lucide/vue'

export interface KpiDelta {
  /** 例：前月比 +3台 */
  text: string
  dir: 'up' | 'down' | 'flat'
  /** 増加が良いことか */
  upIsGood: boolean
}

const props = withDefaults(
  defineProps<{
    label: string
    sublabel?: string
    value: string
    unit?: string
    icon: Component
    deco?: Component
    tone?: 'blue' | 'red' | 'orange' | 'violet' | 'green' | 'gray'
    note?: string
    delta?: KpiDelta | null
    to?: string
  }>(),
  { tone: 'blue', unit: '', note: '', sublabel: '', delta: null, to: '', deco: undefined },
)

const TONES = {
  blue: { bg: 'from-[#f7faff] to-[#e6f0ff] border-[#cfe0f8]', icon: 'bg-gradient-to-b from-[#3b8cf5] to-[#1659c9]', value: 'text-navy-900', deco: 'text-[#b9d3f6]' },
  red: { bg: 'from-[#fff7f7] to-[#ffe5e5] border-[#f5cccc]', icon: 'bg-gradient-to-b from-[#f0646a] to-[#cf2f36]', value: 'text-[#c9262d]', deco: 'text-[#f6c2c2]' },
  orange: { bg: 'from-[#fffaf2] to-[#ffeed6] border-[#f6dcb5]', icon: 'bg-gradient-to-b from-[#ffa940] to-[#e77a00]', value: 'text-[#c76400]', deco: 'text-[#f8d3a0]' },
  violet: { bg: 'from-[#faf9ff] to-[#ece8ff] border-[#dcd5f6]', icon: 'bg-gradient-to-b from-[#8b7cf0] to-[#5b47d0]', value: 'text-navy-900', deco: 'text-[#cfc6f5]' },
  green: { bg: 'from-[#f5fcf7] to-[#def4e6] border-[#c5e8d1]', icon: 'bg-gradient-to-b from-[#3cc47a] to-[#17914c]', value: 'text-[#13803f]', deco: 'text-[#b9e3c8]' },
  gray: { bg: 'from-[#f8f9fb] to-[#eaedf2] border-[#d9dee6]', icon: 'bg-gradient-to-b from-[#8a96a8] to-[#5d6a7e]', value: 'text-navy-900', deco: 'text-[#d3d9e2]' },
} as const

const t = computed(() => TONES[props.tone])

const deltaTone = computed(() => {
  const d = props.delta
  if (!d || d.dir === 'flat') return 'text-ink-2'
  const good = (d.dir === 'up') === d.upIsGood
  return good ? 'text-[#13803f]' : 'text-[#c9262d]'
})
</script>

<template>
  <component
    :is="to ? RouterLink : 'div'"
    :to="to || undefined"
    class="relative flex min-h-[132px] flex-col justify-between overflow-hidden rounded-[14px] border bg-gradient-to-br px-5 py-4 shadow-card transition"
    :class="[t.bg, to ? 'hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(16,42,90,0.12)]' : '']"
  >
    <component :is="deco ?? icon" class="pointer-events-none absolute -right-2 top-3 size-[92px] opacity-80" :class="t.deco" :stroke-width="1.6" aria-hidden="true" />

    <div class="relative flex items-center gap-3">
      <span class="flex size-11 shrink-0 items-center justify-center rounded-full text-white shadow-md" :class="t.icon">
        <component :is="icon" class="size-6" :stroke-width="2.2" />
      </span>
      <span class="leading-tight">
        <span class="block text-[16px] font-black text-navy-900">{{ label }}</span>
        <span v-if="sublabel" class="block text-[11px] font-bold text-ink-2">{{ sublabel }}</span>
      </span>
    </div>

    <div class="relative mt-2 flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
      <span class="flex items-baseline font-black" :class="t.value">
        <span class="text-[40px] leading-none tracking-tight">{{ value }}</span>
        <span v-if="unit" class="ml-1 text-[20px]">{{ unit }}</span>
      </span>
      <span v-if="delta" class="flex items-center gap-1 pb-1 text-[13px] font-bold" :class="deltaTone">
        <ArrowUp v-if="delta.dir === 'up'" class="size-4" :stroke-width="3" />
        <ArrowDown v-else-if="delta.dir === 'down'" class="size-4" :stroke-width="3" />
        <Minus v-else class="size-4" :stroke-width="3" />
        {{ delta.text }}
      </span>
      <span v-else-if="note" class="pb-1 text-[12px] font-bold text-ink-2">{{ note }}</span>
    </div>
  </component>
</template>
