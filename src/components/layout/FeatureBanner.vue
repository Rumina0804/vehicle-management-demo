<script setup lang="ts">
import { computed, type Component } from 'vue'
import { ChartColumnBig, ShieldCheck, Cog, Users, Coins } from '@lucide/vue'
import { useDbStore } from '@/stores/db'

const props = defineProps<{ variant: 'system' | 'analytics' | 'detail' | 'users' }>()
const db = useDbStore()

interface Feature {
  icon: Component
  title: string
  sub: string
}

const config = computed<{ lead: string; items: Feature[] }>(() => {
  const n = db.activeDivisions.length
  const fleet = Math.round(db.vehicles.length / 10) * 10
  const unify: Feature = { icon: Users, title: `全社・${n}事業部の一元管理`, sub: `約${fleet}台の車両をまとめて管理` }
  switch (props.variant) {
    case 'analytics':
      return {
        lead: '集計・分析で実現できること',
        items: [
          { icon: Coins, title: '修理実態と会社負担の比較', sub: '負担率の把握・最適化' },
          { icon: ChartColumnBig, title: '期間比較での増減分析', sub: '年度・月次の傾向把握' },
          { icon: Users, title: '事業部・車両・業者の比較', sub: 'コストの偏りを可視化' },
          { icon: Cog, title: 'コスト要因の特定と対策', sub: '車両・区分・業者別に分析' },
        ],
      }
    case 'detail':
      return {
        lead: '車両管理Webシステムで実現できること',
        items: [
          { icon: ShieldCheck, title: '安全・法令遵守', sub: '車検・点検の確実な管理' },
          { icon: ChartColumnBig, title: 'コストの見える化', sub: '取得費・整備状況の分析' },
          { icon: Cog, title: '車両の適正運用', sub: '稼働・整備の最適化' },
          unify,
        ],
      }
    case 'users':
      return {
        lead: '車両管理Webシステムで実現できること',
        items: [
          { icon: ShieldCheck, title: '安全・法令遵守', sub: '車両情報の確実な管理' },
          { icon: ChartColumnBig, title: 'コストの見える化', sub: '修理費・稼働状況の分析' },
          { icon: Cog, title: '車両の適正運用', sub: '点検・整備の最適化' },
          unify,
        ],
      }
    default:
      return {
        lead: '車両管理Webシステムで実現できること',
        items: [
          { icon: ShieldCheck, title: '安全・法令遵守', sub: '車検・点検の確実な管理' },
          { icon: ChartColumnBig, title: 'コストの見える化', sub: '修理費・稼働状況の分析' },
          { icon: Cog, title: '車両の適正運用', sub: '配置・稼働の最適化' },
          unify,
        ],
      }
  }
})
</script>

<template>
  <section
    class="relative overflow-hidden rounded-2xl border border-white/70 bg-gradient-to-r from-[#e6f0fd] via-[#f4f8ff] to-[#e2edfc] shadow-card"
    aria-label="このシステムで実現できること"
  >
    <div class="flex flex-col lg:flex-row lg:items-stretch">
      <div class="relative flex items-center gap-3 bg-gradient-to-r from-[#0f4bb5] to-[#1d6fe0] px-6 py-4 text-white lg:w-[300px] lg:shrink-0 lg:[clip-path:polygon(0_0,100%_0,90%_100%,0_100%)] lg:pr-10">
        <ChartColumnBig class="size-8 shrink-0" :stroke-width="2.4" />
        <span class="text-[16px] font-black leading-snug tracking-wide">{{ config.lead }}</span>
      </div>
      <ul class="grid flex-1 grid-cols-1 gap-px sm:grid-cols-2 xl:grid-cols-4">
        <li v-for="f in config.items" :key="f.title" class="flex items-center gap-3 px-5 py-3.5">
          <component :is="f.icon" class="size-9 shrink-0 text-brand-600" :stroke-width="2.1" />
          <span>
            <span class="block text-[15px] font-black text-navy-900">{{ f.title }}</span>
            <span class="block text-[12px] font-medium text-ink-2">（{{ f.sub }}）</span>
          </span>
        </li>
      </ul>
    </div>
  </section>
</template>
