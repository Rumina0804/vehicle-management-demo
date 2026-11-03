import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Permission, Role } from '@/types'
import { useDbStore } from './db'

/** 権限マトリクス（ユーザー・権限管理画面の表と同じ内容） */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  system_admin: ['users.manage', 'masters.manage', 'data.edit', 'analytics.view', 'data.view'],
  company_admin: ['users.manage', 'masters.manage', 'data.edit', 'analytics.view', 'data.view'],
  office_user: ['masters.manage', 'data.edit', 'analytics.view', 'data.view'],
  viewer: ['data.view'],
}

export const PERMISSION_LABELS: Record<Permission, string> = {
  'users.manage': 'ユーザー管理',
  'masters.manage': 'マスタ管理',
  'data.edit': 'データの登録・編集',
  'analytics.view': '集計・分析',
  'data.view': '閲覧（参照）',
}

/** デモで切り替えられるアカウント */
export const DEMO_ACCOUNTS: { loginId: string; role: Role; note: string }[] = [
  { loginId: 'sato.d', role: 'system_admin', note: 'すべての機能を利用できます' },
  { loginId: 'suzuki.n', role: 'company_admin', note: '全社の車両・ユーザーを管理します' },
  { loginId: 'takahashi.k', role: 'office_user', note: '所属事業部（福山）の車両を登録・編集します' },
  { loginId: 'yamamoto.t', role: 'viewer', note: '閲覧のみ（登録・編集はできません）' },
]

const KEY = 'douko-vehicle-demo:login'

function readLogin(): string | null {
  try {
    const v = localStorage.getItem(KEY)
    if (v === '') return null
    return v ?? 'sato.d'
  } catch {
    return 'sato.d'
  }
}

export const useAuthStore = defineStore('auth', () => {
  const db = useDbStore()
  const loginId = ref<string | null>(readLogin())

  const user = computed(() => (loginId.value ? (db.userByLogin.get(loginId.value) ?? null) : null))
  const role = computed<Role>(() => user.value?.role ?? 'viewer')
  const isLoggedIn = computed(() => !!user.value && user.value.status === 'active')

  function can(p: Permission): boolean {
    return isLoggedIn.value && ROLE_PERMISSIONS[role.value].includes(p)
  }

  /** 事業所利用者は所属事業部のデータのみ登録・編集できる */
  const scopeDivisionId = computed(() => (role.value === 'office_user' ? (user.value?.divisionId ?? null) : null))

  function canEditDivision(divisionId: string | null | undefined): boolean {
    if (!can('data.edit')) return false
    return !scopeDivisionId.value || scopeDivisionId.value === divisionId
  }

  function persist() {
    try {
      localStorage.setItem(KEY, loginId.value ?? '')
    } catch {
      /* 保存できなくても動作は継続 */
    }
  }

  function login(id: string): boolean {
    const u = db.userByLogin.get(id)
    if (!u || u.status !== 'active') return false
    loginId.value = id
    persist()
    db.touchLogin(id)
    return true
  }

  function logout() {
    loginId.value = null
    persist()
  }

  return { loginId, user, role, isLoggedIn, can, scopeDivisionId, canEditDivision, login, logout }
})
