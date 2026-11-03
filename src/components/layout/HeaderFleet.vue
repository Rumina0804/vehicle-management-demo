<script setup lang="ts">
import { useId } from 'vue'

/** ヘッダー右側の車列イラスト（装飾） */
const gid = useId()
const trucks = [
  { x: 330, s: 1 },
  { x: 268, s: 0.86 },
  { x: 214, s: 0.74 },
  { x: 168, s: 0.64 },
  { x: 128, s: 0.55 },
  { x: 94, s: 0.47 },
  { x: 64, s: 0.4 },
]
</script>

<template>
  <svg viewBox="0 0 430 64" preserveAspectRatio="xMaxYMax meet" aria-hidden="true">
    <defs>
      <linearGradient :id="`${gid}-box`" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ffffff" />
        <stop offset="1" stop-color="#d5e1f0" />
      </linearGradient>
      <linearGradient :id="`${gid}-glass`" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#1f3f70" />
        <stop offset="1" stop-color="#5b84c0" />
      </linearGradient>
      <symbol :id="`${gid}-truck`" viewBox="0 0 100 52">
        <!-- 荷台 -->
        <rect x="22" y="2" width="76" height="38" rx="2" :fill="`url(#${gid}-box)`" stroke="#9fb6d6" stroke-width="1" />
        <rect x="22" y="34" width="76" height="4" fill="#9fb0c6" />
        <path d="M30 14 L34 6 H37 L33 14 Z M36 14 L40 6 H43 L39 14 Z" fill="#1b66d6" />
        <!-- キャブ（左向き） -->
        <path d="M2 18 Q2 12 8 10 L20 8 H22 V42 H2 Z" fill="#ffffff" stroke="#9fb6d6" stroke-width="1" />
        <path d="M5 13 L19 11 V24 H4 Z" :fill="`url(#${gid}-glass)`" />
        <rect x="2" y="28" width="20" height="3" fill="#1b66d6" />
        <rect x="0" y="38" width="24" height="5" rx="1.5" fill="#56657a" />
        <!-- タイヤ -->
        <circle cx="12" cy="44" r="6.5" fill="#1d232b" />
        <circle cx="72" cy="44" r="6.5" fill="#1d232b" />
        <circle cx="86" cy="44" r="6.5" fill="#1d232b" />
        <circle cx="12" cy="44" r="3" fill="#aab6c5" />
        <circle cx="72" cy="44" r="3" fill="#aab6c5" />
        <circle cx="86" cy="44" r="3" fill="#aab6c5" />
      </symbol>
    </defs>
    <use
      v-for="(t, i) in [...trucks].reverse()"
      :key="i"
      :href="`#${gid}-truck`"
      :x="t.x"
      :y="64 - 52 * t.s"
      :width="100 * t.s"
      :height="52 * t.s"
      :opacity="0.55 + t.s * 0.45"
    />
  </svg>
</template>
