<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { X, Lightbulb, Database, Repeat, RefreshCw } from '@lucide/vue'
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
const route = useRoute()

const TIPS: Record<string, { title: string; tips: string[] }> = {
  dashboard: {
    title: 'ダッシュボード',
    tips: [
      '上部の「表示対象」で事業部を切り替えると、すべての数値・グラフが連動します。',
      '「車検期限が近い車両」は期限までの日数が少ない順に表示されます。行をクリックすると車両詳細を開きます。',
      'グラフ右上の「表」で、同じデータを表形式で確認できます。',
    ],
  },
  vehicles: {
    title: '車両台帳一覧',
    tips: [
      '条件を指定して「検索」を押すと一覧が絞り込まれます。列見出しをクリックすると並び替えできます。',
      '「CSV出力」で現在の検索結果をExcelで開ける形式でダウンロードできます。',
      '「CSV取込」で台帳の一括登録・更新ができます（出力したCSVをそのまま取り込めます）。',
    ],
  },
  maintenance: {
    title: '修理・整備履歴',
    tips: [
      '＊印の項目を入力するだけで登録できます。',
      '修理総額と「会社・保険・その他」の負担額の合計が一致すると、自動でチェックが付きます。',
      '「下書き保存」で入力途中の内容を保存し、あとから続きを入力できます。',
    ],
  },
  analytics: {
    title: '集計・分析',
    tips: [
      '分析条件を変更して「集計・表示」を押すと、すべてのグラフ・表が同じ条件で再集計されます。',
      '当期（途中経過）を選んだ場合、前期間は「前年の同じ期間」と比較します。',
      '「費用指標」で修理・整備総額と会社実質負担額（保険等を除いた額）を切り替えられます。',
    ],
  },
  masters: {
    title: 'マスタ管理',
    tips: ['事業部・修理業者・修理箇所などの選択肢を管理します。', '無効にした項目は新規登録の選択肢に表示されなくなります。'],
  },
  users: {
    title: 'ユーザー・権限管理',
    tips: [
      '権限は「システム管理者」「全社管理者」「事業所利用者」「閲覧専用」の4種類です。',
      '事業所利用者は所属事業部の車両のみ登録・編集できます。',
      'アカウントの発行・権限変更・停止はすべて操作履歴に記録されます。',
    ],
  },
}

const help = computed(() => TIPS[route.meta.nav ?? 'dashboard'] ?? TIPS.dashboard!)
</script>

<template>
  <Teleport to="body">
    <Transition enter-active-class="transition-opacity duration-200" enter-from-class="opacity-0" leave-active-class="transition-opacity duration-150" leave-to-class="opacity-0">
      <div v-if="ui.helpOpen" class="fixed inset-0 z-[60] bg-navy-950/40" @click="ui.helpOpen = false" />
    </Transition>
    <Transition enter-active-class="transition-transform duration-200" enter-from-class="translate-x-full" leave-active-class="transition-transform duration-150" leave-to-class="translate-x-full">
      <aside
        v-if="ui.helpOpen"
        class="fixed inset-y-0 right-0 z-[61] flex w-[min(420px,100vw)] flex-col bg-white shadow-pop"
        role="dialog"
        aria-modal="true"
        aria-label="ヘルプ"
      >
        <div class="flex items-center justify-between bg-gradient-to-r from-[#1553bd] to-[#2a73e0] px-5 py-4 text-white">
          <h2 class="text-lg font-black">ヘルプ：{{ help.title }}</h2>
          <button class="flex size-9 items-center justify-center rounded-lg hover:bg-white/15" aria-label="閉じる" @click="ui.helpOpen = false">
            <X class="size-5" />
          </button>
        </div>
        <div class="flex-1 space-y-6 overflow-y-auto p-5 text-[14px] leading-relaxed">
          <section>
            <h3 class="mb-2 flex items-center gap-2 font-bold text-navy-900"><Lightbulb class="size-4 text-amber-500" />この画面の使い方</h3>
            <ul class="space-y-2">
              <li v-for="t in help.tips" :key="t" class="flex gap-2 text-ink-2">
                <span class="mt-2 size-1.5 shrink-0 rounded-full bg-brand-500" />{{ t }}
              </li>
            </ul>
          </section>
          <section class="rounded-xl border border-line bg-brand-50/60 p-4">
            <h3 class="mb-2 font-bold text-navy-900">デモ版について</h3>
            <ul class="space-y-2 text-[13px] text-ink-2">
              <li class="flex gap-2"><Database class="mt-0.5 size-4 shrink-0 text-brand-600" />データはすべて架空のサンプルで、このブラウザ内にのみ保存されます（サーバーには送信されません）。</li>
              <li class="flex gap-2"><Repeat class="mt-0.5 size-4 shrink-0 text-brand-600" />右上のユーザーメニューから権限を切り替えると、権限ごとの画面の違いを確認できます。</li>
              <li class="flex gap-2"><RefreshCw class="mt-0.5 size-4 shrink-0 text-brand-600" />「デモデータを初期化」で、登録・変更した内容を元に戻せます。</li>
            </ul>
          </section>
        </div>
      </aside>
    </Transition>
  </Teleport>
</template>
