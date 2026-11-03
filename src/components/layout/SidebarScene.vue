<script setup lang="ts">
import { useId } from 'vue'

/** サイドバー下部の工場・クレーン・トラックのイラスト（装飾） */
const gid = useId()
</script>

<template>
  <svg viewBox="0 0 228 280" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <defs>
      <linearGradient :id="`${gid}-sky`" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#0b2f6b" stop-opacity="0" />
        <stop offset="0.55" stop-color="#2a63b8" stop-opacity="0.55" />
        <stop offset="1" stop-color="#6aa3ea" stop-opacity="0.85" />
      </linearGradient>
      <linearGradient :id="`${gid}-road`" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#9cc6ff" stop-opacity="0" />
        <stop offset="0.5" stop-color="#cfe4ff" stop-opacity="0.9" />
        <stop offset="1" stop-color="#9cc6ff" stop-opacity="0" />
      </linearGradient>
      <linearGradient :id="`${gid}-box`" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ffffff" />
        <stop offset="1" stop-color="#c9d7ea" />
      </linearGradient>
      <linearGradient :id="`${gid}-glass`" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#14305e" />
        <stop offset="1" stop-color="#4d79b8" />
      </linearGradient>
    </defs>

    <rect x="0" y="40" width="228" height="240" :fill="`url(#${gid}-sky)`" />

    <!-- 工場のシルエット -->
    <g fill="#5d8fd6" opacity="0.55">
      <rect x="120" y="118" width="12" height="74" />
      <rect x="138" y="96" width="9" height="96" />
      <rect x="152" y="128" width="40" height="64" />
      <circle cx="205" cy="160" r="22" />
      <rect x="183" y="160" width="44" height="32" />
      <rect x="96" y="150" width="26" height="42" />
    </g>
    <g stroke="#8db6ee" stroke-width="1.2" opacity="0.6" fill="none">
      <path d="M96 160 H228 M96 172 H228" />
      <path d="M126 118 v-8 M142 96 v-10" />
    </g>

    <!-- タワークレーン -->
    <g stroke="#a9cbf5" stroke-width="1.4" fill="none" opacity="0.75">
      <path d="M40 196 V58 M50 196 V58" />
      <path d="M40 70 L50 82 M50 82 L40 94 M40 94 L50 106 M50 106 L40 118 M40 118 L50 130 M50 130 L40 142 M40 142 L50 154 M50 154 L40 166 M40 166 L50 178" />
      <path d="M8 58 H120 M20 50 H112 M45 40 V58" />
      <path d="M45 40 L8 58 M45 40 L120 58" />
      <path d="M100 58 V84" stroke-width="1" />
      <rect x="95" y="84" width="10" height="7" fill="#a9cbf5" stroke="none" />
    </g>

    <!-- 道路の光 -->
    <rect x="0" y="246" width="228" height="34" fill="#0d3a80" opacity="0.55" />
    <path d="M-10 252 L238 244" :stroke="`url(#${gid}-road)`" stroke-width="2" />
    <path d="M-10 270 L238 262" :stroke="`url(#${gid}-road)`" stroke-width="1.5" />
    <path d="M10 258 H70 M-4 264 H40" stroke="#d9ebff" stroke-width="1.2" opacity="0.7" />

    <!-- トラック -->
    <g transform="translate(14 172)">
      <ellipse cx="96" cy="80" rx="96" ry="6" fill="#06204a" opacity="0.45" />
      <rect x="4" y="6" width="128" height="60" rx="3" :fill="`url(#${gid}-box)`" stroke="#8fb0db" />
      <rect x="4" y="58" width="128" height="6" fill="#8ea3bf" />
      <g transform="translate(46 24)">
        <path d="M0 18 L7 0 H13 L6 18 Z" fill="#1b66d6" />
        <path d="M10 18 L17 0 H23 L16 18 Z" fill="#4c8ef0" />
      </g>
      <path d="M134 22 Q134 14 142 13 L170 11 Q180 11 184 22 L190 52 V70 H134 Z" fill="#ffffff" stroke="#8fb0db" />
      <path d="M140 18 L168 16 Q176 16 179 24 L183 40 H140 Z" :fill="`url(#${gid}-glass)`" />
      <rect x="134" y="46" width="56" height="4" fill="#1b66d6" />
      <rect x="182" y="56" width="8" height="5" rx="1" fill="#ffd36a" />
      <rect x="130" y="66" width="64" height="7" rx="2" fill="#4b5a6e" />
      <g fill="#141a22">
        <circle cx="36" cy="74" r="10" />
        <circle cx="60" cy="74" r="10" />
        <circle cx="166" cy="74" r="10" />
      </g>
      <g fill="#9eacbf">
        <circle cx="36" cy="74" r="4.5" />
        <circle cx="60" cy="74" r="4.5" />
        <circle cx="166" cy="74" r="4.5" />
      </g>
    </g>
  </svg>
</template>
