/// <reference types="vite/client" />

import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    /** ページタイトル（ブラウザのタブに表示） */
    title?: string
    /** 下部の「実現できること」バナーの種類 */
    banner?: 'system' | 'analytics' | 'detail' | 'users'
    /** 必要な権限 */
    permission?: import('./src/types').Permission
    /** サイドバーでアクティブにするメニュー */
    nav?: string
    /** レイアウトを使わない（ログイン画面など） */
    bare?: boolean
  }
}
