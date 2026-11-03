<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import {
  Users,
  CircleSlash,
  Crown,
  Building,
  Plus,
  Upload,
  RefreshCw,
  Search,
  RotateCcw,
  FileText,
  Pencil,
  CirclePause,
  CirclePlay,
  CircleCheck,
  Lock,
  Check,
  Minus,
  History,
  ChevronRight,
  UserPlus,
  Network,
  User,
  CirclePlus,
  Download,
  FileSpreadsheet,
} from '@lucide/vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import KpiCard, { type KpiDelta } from '@/components/ui/KpiCard.vue'
import AppModal from '@/components/ui/AppModal.vue'
import PaginationBar from '@/components/ui/PaginationBar.vue'
import SortTh from '@/components/ui/SortTh.vue'
import { useDbStore } from '@/stores/db'
import { useAuthStore, ROLE_PERMISSIONS, PERMISSION_LABELS } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { usePagination, useSort } from '@/composables/useTable'
import { addDays, fmtDateTime, todayISO } from '@/utils/date'
import { num, pct, signed } from '@/utils/format'
import { downloadCsv, parseCsv, stamp } from '@/utils/csv'
import { HQ_DEPARTMENTS, ROLE_LABELS, ROLE_TARGETS } from '@/mock/catalog'
import type { AppUser, Permission, Role } from '@/types'

const db = useDbStore()
const auth = useAuthStore()
const ui = useUiStore()
const today = todayISO()
const monthAgo = `${addDays(today, -30)}T23:59`

const ROLES = Object.keys(ROLE_LABELS) as Role[]
const ROLE_STYLE: Record<Role, { cls: string; icon: typeof Crown }> = {
  system_admin: { cls: 'bg-[#efe9fd] text-[#4b36b0] border-[#d8cdf8]', icon: Crown },
  company_admin: { cls: 'bg-[#e2edff] text-[#1652b2] border-[#c2d7f6]', icon: Users },
  office_user: { cls: 'bg-[#fff1d6] text-[#8a4f00] border-[#f3d29a]', icon: Building },
  viewer: { cls: 'bg-[#edf0f5] text-[#4f5d74] border-[#d9dee6]', icon: Search },
}

// ---- KPI ----
const activeUsers = computed(() => db.users.filter((u) => u.status === 'active'))
const suspendedUsers = computed(() => db.users.filter((u) => u.status === 'suspended'))
const wasActiveMonthAgo = (u: AppUser) => u.createdAt <= monthAgo && (u.status === 'active' || (u.statusChangedAt ?? '') > monthAgo)
const activeDelta = computed<KpiDelta>(() => {
  const d = activeUsers.value.length - db.users.filter(wasActiveMonthAgo).length
  return { text: `前月比 ${signed(d, '名')}`, dir: d > 0 ? 'up' : d < 0 ? 'down' : 'flat', upIsGood: true }
})
const suspendedDelta = computed<KpiDelta>(() => {
  const prev = db.users.filter((u) => u.status === 'suspended' && (u.statusChangedAt ?? '') <= monthAgo).length
  const d = suspendedUsers.value.length - prev
  return { text: `前月比 ${signed(d, '名')}`, dir: d > 0 ? 'up' : d < 0 ? 'down' : 'flat', upIsGood: false }
})
const countRole = (r: Role) => activeUsers.value.filter((u) => u.role === r).length

// ---- 一覧 ----
const form = reactive({ role: '', division: '', status: '', q: '' })
const applied = ref({ ...form })
function search() {
  applied.value = { ...form }
  page.value = 1
}
function clear() {
  Object.assign(form, { role: '', division: '', status: '', q: '' })
  search()
}

const filtered = computed(() => {
  const f = applied.value
  const q = f.q.trim().toLowerCase()
  return db.users.filter((u) => {
    if (f.role && u.role !== f.role) return false
    if (f.division === 'hq' && u.divisionId) return false
    if (f.division && f.division !== 'hq' && u.divisionId !== f.division) return false
    if (f.status && u.status !== f.status) return false
    if (q && !`${u.name.replace(/\s/g, '')}${u.loginId}`.toLowerCase().includes(q.replace(/\s/g, ''))) return false
    return true
  })
})
const ROLE_ORDER: Record<Role, number> = { system_admin: 0, company_admin: 1, office_user: 2, viewer: 3 }
const { sort, toggle, sorted } = useSort(filtered, { key: 'id', dir: 'asc' }, {
  id: (u) => u.id,
  name: (u) => u.name,
  login: (u) => u.loginId,
  division: (u) => (u.divisionId ? (db.divisionMap.get(u.divisionId)?.sortOrder ?? 99) : 0),
  role: (u) => ROLE_ORDER[u.role],
  status: (u) => u.status,
  last: (u) => u.lastLoginAt ?? '',
})
const { page, pageSize, pageCount, paged, total, rangeFrom, rangeTo } = usePagination(sorted, 10)

// ---- 選択・一括操作 ----
const checked = ref<string[]>([])
const allOnPage = computed(() => paged.value.length > 0 && paged.value.every((u) => checked.value.includes(u.id)))
function toggleAll() {
  const ids = paged.value.map((u) => u.id)
  checked.value = allOnPage.value ? checked.value.filter((id) => !ids.includes(id)) : [...new Set([...checked.value, ...ids])]
}
const actor = computed(() => auth.user?.name ?? 'システム')

function canManage(u: AppUser) {
  if (u.role === 'system_admin' && auth.role !== 'system_admin') return false
  return true
}

async function setStatus(u: AppUser, status: AppUser['status']) {
  if (u.loginId === auth.loginId) return ui.toast('ログイン中のアカウントは停止できません', 'error')
  if (!canManage(u)) return ui.toast('システム管理者のアカウントはシステム管理者のみ変更できます', 'error')
  const ok = await ui.confirm({
    title: status === 'suspended' ? 'アカウントの停止' : 'アカウントの再開',
    message: status === 'suspended' ? `${u.name}（${u.loginId}）のアカウントを停止します。\n停止中はログインできなくなります。` : `${u.name}（${u.loginId}）のアカウントを有効に戻します。`,
    confirmText: status === 'suspended' ? '停止する' : '有効にする',
    tone: status === 'suspended' ? 'danger' : 'primary',
  })
  if (!ok) return
  db.updateUser(u.id, { status }, actor.value, ROLE_LABELS)
  ui.toast(status === 'suspended' ? `${u.name} さんのアカウントを停止しました` : `${u.name} さんのアカウントを有効にしました`)
}

async function bulkStatus(status: AppUser['status']) {
  const targets = db.users.filter((u) => checked.value.includes(u.id) && u.status !== status && u.loginId !== auth.loginId && canManage(u))
  if (!targets.length) return ui.toast('変更対象のアカウントがありません', 'info')
  const ok = await ui.confirm({
    title: status === 'suspended' ? '選択したアカウントを停止' : '選択したアカウントを有効化',
    message: `${targets.length}名のアカウントを「${status === 'suspended' ? '停止' : '有効'}」にします。よろしいですか？`,
    confirmText: '実行する',
    tone: status === 'suspended' ? 'danger' : 'primary',
  })
  if (!ok) return
  for (const u of targets) db.updateUser(u.id, { status }, actor.value, ROLE_LABELS)
  checked.value = []
  ui.toast(`${targets.length}名のアカウントを更新しました`)
}

// ---- 発行・編集 ----
interface EditForm {
  id: string | null
  name: string
  loginId: string
  email: string
  affiliation: string
  role: Role
  status: AppUser['status']
}
const editOpen = ref(false)
const edit = reactive<EditForm>({ id: null, name: '', loginId: '', email: '', affiliation: 'kurashiki1', role: 'office_user', status: 'active' })
const editErrors = ref<Record<string, string>>({})
const AFFILIATIONS = computed(() => [
  ...HQ_DEPARTMENTS.map((d) => ({ value: `hq:${d}`, label: `本社（${d}）` })),
  ...db.divisions.map((d) => ({ value: d.id, label: d.name })),
])

function openNew() {
  Object.assign(edit, { id: null, name: '', loginId: '', email: '', affiliation: auth.scopeDivisionId ?? 'kurashiki1', role: 'office_user', status: 'active' })
  editErrors.value = {}
  editOpen.value = true
}
function openEdit(u: AppUser) {
  if (!canManage(u)) return ui.toast('システム管理者のアカウントはシステム管理者のみ編集できます', 'error')
  Object.assign(edit, {
    id: u.id,
    name: u.name,
    loginId: u.loginId,
    email: u.email,
    affiliation: u.divisionId ?? `hq:${u.department || '管理部'}`,
    role: u.role,
    status: u.status,
  })
  editErrors.value = {}
  editOpen.value = true
}

function saveUser() {
  const e: Record<string, string> = {}
  if (!edit.name.trim()) e.name = '氏名を入力してください'
  if (!/^[a-z0-9._-]{3,30}$/.test(edit.loginId)) e.loginId = '半角英小文字・数字・記号（. _ -）で3〜30文字'
  else if (db.users.some((u) => u.loginId === edit.loginId && u.id !== edit.id)) e.loginId = 'このログインIDは既に使われています'
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(edit.email)) e.email = 'メールアドレスの形式が正しくありません'
  if (edit.role === 'system_admin' && auth.role !== 'system_admin') e.role = 'システム管理者はシステム管理者のみ付与できます'
  editErrors.value = e
  if (Object.keys(e).length) return
  const hq = edit.affiliation.startsWith('hq:')
  const payload = {
    name: edit.name.trim(),
    loginId: edit.loginId,
    email: edit.email,
    divisionId: hq ? null : edit.affiliation,
    department: hq ? edit.affiliation.slice(3) : '',
    role: edit.role,
    status: edit.status,
  }
  if (edit.id) {
    db.updateUser(edit.id, payload, actor.value, ROLE_LABELS)
    ui.toast(`${payload.name} さんのアカウントを更新しました`)
  } else {
    db.addUser(payload, actor.value)
    ui.toast(`アカウントを発行しました（${payload.loginId}）。初期パスワードの通知はデモでは送信されません。`)
  }
  editOpen.value = false
}

// ---- 詳細 ----
const detail = ref<AppUser | null>(null)
const detailLogs = computed(() => (detail.value ? db.auditLogs.filter((l) => l.targetLoginId === detail.value!.loginId).slice(0, 8) : []))

// ---- 権限マトリクス・操作履歴 ----
const MATRIX: Permission[] = ['users.manage', 'masters.manage', 'data.edit', 'analytics.view', 'data.view']
const logsOpen = ref(false)
const LOG_ICON = { create: CirclePlus, role: Pencil, status: CirclePause, division: Network, update: Pencil, import: Upload } as const

// ---- CSV ----
const csvOpen = ref(false)
const csvRows = ref<(Omit<AppUser, 'id' | 'createdAt' | 'lastLoginAt' | 'statusChangedAt'> & { exists: boolean })[]>([])
const csvErrors = ref<string[]>([])
const CSV_HEADER = ['氏名', 'ログインID', 'メールアドレス', '所属', '権限', '状態']

function exportUsers() {
  downloadCsv(
    `ユーザー一覧_${stamp()}.csv`,
    CSV_HEADER,
    sorted.value.map((u) => [u.name, u.loginId, u.email, db.userAffiliation(u), ROLE_LABELS[u.role], u.status === 'active' ? '有効' : '停止']),
  )
}

async function onCsv(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  ;(e.target as HTMLInputElement).value = ''
  csvRows.value = []
  csvErrors.value = []
  if (!file) return
  const rows = parseCsv(await file.text())
  const head = rows.shift() ?? []
  const idx = (n: string) => head.indexOf(n)
  const roleBy = new Map<string, Role>(Object.entries(ROLE_LABELS).map(([k, l]) => [l, k as Role]))
  rows.forEach((r, i) => {
    const g = (n: string) => (r[idx(n)] ?? '').trim()
    const line = i + 2
    const role = roleBy.get(g('権限'))
    if (!g('氏名') || !g('ログインID')) return csvErrors.value.push(`${line}行目：氏名・ログインIDは必須です`)
    if (!role) return csvErrors.value.push(`${line}行目：権限「${g('権限')}」が正しくありません`)
    if (role === 'system_admin' && auth.role !== 'system_admin') return csvErrors.value.push(`${line}行目：システム管理者は付与できません`)
    const aff = g('所属')
    const hq = aff.match(/^本社（(.+)）$/)
    const div = db.divisions.find((d) => d.name === aff || d.shortName === aff)
    if (!hq && !div) return csvErrors.value.push(`${line}行目：所属「${aff}」が見つかりません`)
    csvRows.value.push({
      name: g('氏名'),
      loginId: g('ログインID'),
      email: g('メールアドレス') || `${g('ログインID')}@douko-kiko.example.jp`,
      divisionId: div?.id ?? null,
      department: hq ? hq[1]! : '',
      role,
      status: g('状態') === '停止' ? 'suspended' : 'active',
      exists: db.userByLogin.has(g('ログインID')),
    })
  })
}

function runCsv() {
  let added = 0
  let updated = 0
  for (const { exists, ...row } of csvRows.value) {
    const u = db.userByLogin.get(row.loginId)
    if (exists && u) {
      db.updateUser(u.id, row, actor.value, ROLE_LABELS)
      updated++
    } else {
      db.addUser(row, actor.value)
      added++
    }
  }
  csvOpen.value = false
  csvRows.value = []
  ui.toast(`CSVを取り込みました（新規 ${added}名・更新 ${updated}名）`)
}
</script>

<template>
  <div>
    <PageHeader
      title="ユーザー・権限管理"
      :icon="Users"
      description="アカウントの発行、所属事業部の割り当て、&#10;システムの編集権限（操作できる範囲）の管理を行います。"
    />

    <div class="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
      <KpiCard label="有効アカウント数" :value="num(activeUsers.length)" unit="名" :icon="Users" tone="blue" :delta="activeDelta" />
      <KpiCard label="停止中アカウント" :value="num(suspendedUsers.length)" unit="名" :icon="CircleSlash" :deco="CirclePause" tone="red" :delta="suspendedDelta" />
      <KpiCard label="全社管理者" :value="num(countRole('company_admin'))" unit="名" :icon="Crown" tone="orange" :note="`（全体の ${pct(activeUsers.length ? countRole('company_admin') / activeUsers.length : 0)}）`" />
      <KpiCard label="事業所利用者" :value="num(countRole('office_user'))" unit="名" :icon="Building" tone="violet" :note="`（全体の ${pct(activeUsers.length ? countRole('office_user') / activeUsers.length : 0)}）`" />
    </div>

    <SectionCard :title="`ユーザー一覧（全${num(db.users.length)}名）`" :icon="Users" class="mb-4" body-class="p-0">
      <template #actions>
        <button class="head-chip !bg-gradient-to-b !from-[#2f82ef] !to-[#1a62d3] !text-white ring-1 ring-white/50" @click="openNew"><Plus class="size-3.5" />アカウント新規発行</button>
        <button class="head-chip hidden sm:inline-flex" @click="csvOpen = true"><Upload class="size-3.5" />一括登録（CSV）</button>
        <button class="head-chip hidden sm:inline-flex" @click="exportUsers"><RefreshCw class="size-3.5" />一括更新用CSV出力</button>
      </template>

      <form class="flex flex-wrap items-end gap-3 border-b border-line-soft px-4 py-3" @submit.prevent="search">
        <label class="w-40"><span class="field-label mb-1">権限種別</span>
          <select v-model="form.role" class="input"><option value="">すべて</option><option v-for="r in ROLES" :key="r" :value="r">{{ ROLE_LABELS[r] }}</option></select>
        </label>
        <label class="w-44"><span class="field-label mb-1">所属事業部</span>
          <select v-model="form.division" class="input"><option value="">すべて</option><option value="hq">本社</option><option v-for="d in db.divisions" :key="d.id" :value="d.id">{{ d.name }}</option></select>
        </label>
        <label class="w-32"><span class="field-label mb-1">状態</span>
          <select v-model="form.status" class="input"><option value="">すべて</option><option value="active">有効</option><option value="suspended">停止</option></select>
        </label>
        <label class="min-w-[220px] flex-1"><span class="field-label mb-1">キーワード</span>
          <span class="relative block"><Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" /><input v-model="form.q" class="input pl-9" placeholder="氏名・ログインIDで検索" /></span>
        </label>
        <button type="submit" class="btn btn-primary h-[38px] w-28"><Search class="size-4" />検索</button>
        <button type="button" class="btn btn-soft h-[38px]" @click="clear"><RotateCcw class="size-4" />クリア</button>
      </form>

      <div v-if="checked.length" class="flex flex-wrap items-center gap-2 border-b border-line-soft bg-brand-50 px-4 py-2 text-[13px]">
        <b>{{ checked.length }}名を選択中</b>
        <button class="btn btn-sm btn-danger-outline" @click="bulkStatus('suspended')"><CirclePause class="size-3.5" />一括停止</button>
        <button class="btn btn-sm btn-good-outline" @click="bulkStatus('active')"><CirclePlay class="size-3.5" />一括で有効化</button>
        <button class="link ml-2 text-[12px]" @click="checked = []">選択を解除</button>
      </div>

      <div class="overflow-x-auto">
        <table class="tbl">
          <thead>
            <tr>
              <th class="w-10"><input type="checkbox" class="check" :checked="allOnPage" aria-label="このページをすべて選択" @change="toggleAll" /></th>
              <SortTh label="氏名" field="name" :sort="sort" @sort="toggle($event as never)" />
              <SortTh label="ログインID" field="login" :sort="sort" @sort="toggle($event as never)" />
              <SortTh label="所属事業部" field="division" :sort="sort" @sort="toggle($event as never)" />
              <SortTh label="権限" field="role" :sort="sort" @sort="toggle($event as never)" />
              <SortTh label="状態" field="status" :sort="sort" @sort="toggle($event as never)" />
              <SortTh label="最終ログイン" field="last" :sort="sort" @sort="toggle($event as never)" />
              <th class="text-center">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in paged" :key="u.id">
              <td><input v-model="checked" type="checkbox" class="check" :value="u.id" :aria-label="`${u.name}を選択`" /></td>
              <td class="whitespace-nowrap font-bold">{{ u.name }}<span v-if="u.loginId === auth.loginId" class="ml-1.5 rounded bg-brand-100 px-1.5 text-[10.5px] text-brand-700">あなた</span></td>
              <td>{{ u.loginId }}</td>
              <td class="whitespace-nowrap">{{ db.userAffiliation(u) }}</td>
              <td>
                <span class="badge min-w-[118px] border" :class="ROLE_STYLE[u.role].cls">
                  <component :is="ROLE_STYLE[u.role].icon" class="size-3.5" />{{ ROLE_LABELS[u.role] }}
                </span>
              </td>
              <td>
                <span v-if="u.status === 'active'" class="flex items-center gap-1 font-bold text-[#13803f]"><CircleCheck class="size-4" />有効</span>
                <span v-else class="badge badge-muted"><CirclePause class="size-3.5" />停止</span>
              </td>
              <td class="tnum whitespace-nowrap">{{ fmtDateTime(u.lastLoginAt) }}</td>
              <td>
                <span class="flex justify-center gap-1.5">
                  <button class="btn btn-outline btn-sm" @click="detail = u"><FileText class="size-3.5" />詳細</button>
                  <button class="btn btn-outline btn-sm" @click="openEdit(u)"><Pencil class="size-3.5" />編集</button>
                  <button v-if="u.status === 'active'" class="btn btn-danger-outline btn-sm w-[70px]" @click="setStatus(u, 'suspended')"><CirclePause class="size-3.5" />停止</button>
                  <button v-else class="btn btn-good-outline btn-sm w-[70px]" @click="setStatus(u, 'active')"><CirclePlay class="size-3.5" />有効化</button>
                </span>
              </td>
            </tr>
            <tr v-if="!paged.length"><td colspan="8" class="py-10 text-center text-ink-3">条件に一致するユーザーはいません</td></tr>
          </tbody>
        </table>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft px-4 py-2.5">
        <span class="flex items-center gap-3 text-[12.5px] text-ink-2">
          表示件数
          <select v-model.number="pageSize" class="input h-8 w-20 text-[12.5px]"><option :value="10">10件</option><option :value="20">20件</option><option :value="50">50件</option></select>
          <span class="tnum">（{{ rangeFrom }} - {{ rangeTo }}件 ／ 全{{ total }}件）</span>
        </span>
        <PaginationBar v-model:page="page" :page-count="pageCount" />
      </div>
    </SectionCard>

    <div class="grid grid-cols-1 gap-4 2xl:grid-cols-[1fr_1.05fr]">
      <SectionCard title="権限種別と操作範囲" sub="（権限マトリクス）" :icon="Lock" body-class="p-0">
        <div class="overflow-x-auto">
          <table class="tbl tbl-compact">
            <thead>
              <tr>
                <th>権限種別</th>
                <th>主な対象ユーザー</th>
                <th v-for="p in MATRIX" :key="p" class="text-center">{{ PERMISSION_LABELS[p] }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in ROLES" :key="r" :class="r === auth.role ? 'bg-brand-50/70' : ''">
                <td><span class="badge min-w-[118px] border" :class="ROLE_STYLE[r].cls"><component :is="ROLE_STYLE[r].icon" class="size-3.5" />{{ ROLE_LABELS[r] }}</span></td>
                <td class="min-w-[200px] text-[12px] leading-snug">{{ ROLE_TARGETS[r] }}</td>
                <td v-for="p in MATRIX" :key="p" class="text-center">
                  <span v-if="ROLE_PERMISSIONS[r].includes(p)" class="inline-flex size-6 items-center justify-center rounded-full bg-[#e2f5e9] text-[#13803f]" :aria-label="'可'"><Check class="size-4" :stroke-width="3.2" /></span>
                  <Minus v-else class="mx-auto size-4 text-ink-3" aria-label="不可" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="border-t border-line-soft px-4 py-2 text-[11.5px] text-ink-2">※事業所利用者が登録・編集できるのは所属事業部の車両・履歴のみです。網掛けの行は現在ログイン中の権限です。</p>
      </SectionCard>

      <SectionCard title="操作履歴" sub="（直近のアカウント・権限に関する操作）" :icon="History" body-class="p-0">
        <template #actions>
          <span class="text-[12px] font-bold">最新50件</span>
          <button class="head-chip" @click="logsOpen = true">一覧を見る<ChevronRight class="size-3.5" /></button>
        </template>
        <div class="overflow-x-auto">
          <table class="tbl tbl-compact">
            <thead><tr><th>操作日時</th><th>操作者</th><th>対象</th><th>変更内容</th></tr></thead>
            <tbody>
              <tr v-for="l in db.auditLogs.slice(0, 5)" :key="l.id">
                <td class="tnum whitespace-nowrap"><component :is="LOG_ICON[l.action]" class="mr-1.5 inline size-4 text-brand-600" />{{ fmtDateTime(l.at) }}</td>
                <td class="whitespace-nowrap">{{ l.actorName }}</td>
                <td class="whitespace-nowrap"><User class="mr-1 inline size-3.5 text-ink-3" />{{ l.action === 'create' ? '（新規アカウント）' : l.targetLoginId }}</td>
                <td>{{ l.description }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>

    <!-- 発行・編集 -->
    <AppModal :open="editOpen" :title="edit.id ? 'アカウントの編集' : 'アカウントの新規発行'" width="560px" @close="editOpen = false">
      <form class="grid grid-cols-[110px_1fr] items-center gap-x-4 gap-y-3" @submit.prevent="saveUser">
        <span class="field-label req">氏名</span>
        <div><input v-model="edit.name" class="input" :class="editErrors.name ? 'is-invalid' : ''" placeholder="例：山田 太郎" /><p v-if="editErrors.name" class="field-error">{{ editErrors.name }}</p></div>
        <span class="field-label req">ログインID</span>
        <div><input v-model="edit.loginId" class="input" :class="editErrors.loginId ? 'is-invalid' : ''" placeholder="例：yamada.t" :disabled="!!edit.id" /><p v-if="editErrors.loginId" class="field-error">{{ editErrors.loginId }}</p></div>
        <span class="field-label req">メール</span>
        <div><input v-model="edit.email" type="email" class="input" :class="editErrors.email ? 'is-invalid' : ''" placeholder="example@douko-kiko.example.jp" /><p v-if="editErrors.email" class="field-error">{{ editErrors.email }}</p></div>
        <span class="field-label req">所属</span>
        <select v-model="edit.affiliation" class="input"><option v-for="a in AFFILIATIONS" :key="a.value" :value="a.value">{{ a.label }}</option></select>
        <span class="field-label req self-start pt-2">権限</span>
        <div class="space-y-1.5">
          <label v-for="r in ROLES" :key="r" class="flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2" :class="edit.role === r ? 'border-brand-400 bg-brand-50' : 'border-line'">
            <input v-model="edit.role" type="radio" :value="r" class="check mt-0.5" :disabled="r === 'system_admin' && auth.role !== 'system_admin'" />
            <span><span class="block text-[13px] font-bold">{{ ROLE_LABELS[r] }}</span><span class="block text-[11.5px] text-ink-2">{{ ROLE_TARGETS[r] }}</span></span>
          </label>
          <p v-if="editErrors.role" class="field-error">{{ editErrors.role }}</p>
        </div>
        <template v-if="edit.id">
          <span class="field-label">状態</span>
          <select v-model="edit.status" class="input" :disabled="edit.loginId === auth.loginId"><option value="active">有効</option><option value="suspended">停止</option></select>
        </template>
        <p v-else class="col-span-2 rounded-lg bg-[#f4f8ff] px-3 py-2 text-[12px] text-ink-2">発行後、初期パスワードを登録メールアドレスへ通知します（デモ版では送信されません）。</p>
        <button type="submit" class="hidden" />
      </form>
      <template #footer>
        <button class="btn btn-soft" @click="editOpen = false">キャンセル</button>
        <button class="btn btn-primary" @click="saveUser"><UserPlus v-if="!edit.id" class="size-4" />{{ edit.id ? '変更を保存' : '発行する' }}</button>
      </template>
    </AppModal>

    <!-- 詳細 -->
    <AppModal :open="!!detail" :title="`アカウント詳細：${detail?.name}`" width="640px" @close="detail = null">
      <table v-if="detail" class="tbl mb-4">
        <tbody>
          <tr><th class="w-32">ログインID</th><td>{{ detail.loginId }}</td></tr>
          <tr><th>メール</th><td>{{ detail.email }}</td></tr>
          <tr><th>所属</th><td>{{ db.userAffiliation(detail) }}</td></tr>
          <tr><th>権限</th><td>{{ ROLE_LABELS[detail.role] }}（{{ ROLE_PERMISSIONS[detail.role].map((p) => PERMISSION_LABELS[p]).join('・') }}）</td></tr>
          <tr><th>状態</th><td>{{ detail.status === 'active' ? '有効' : '停止' }}<span v-if="detail.statusChangedAt" class="ml-2 text-ink-2">（{{ fmtDateTime(detail.statusChangedAt) }} 変更）</span></td></tr>
          <tr><th>発行日時</th><td>{{ fmtDateTime(detail.createdAt) }}</td></tr>
          <tr><th>最終ログイン</th><td>{{ fmtDateTime(detail.lastLoginAt) }}</td></tr>
        </tbody>
      </table>
      <h3 class="mb-2 flex items-center gap-1.5 text-[14px] font-black"><History class="size-4 text-brand-600" />このアカウントへの操作履歴</h3>
      <ul class="space-y-1 text-[12.5px]">
        <li v-for="l in detailLogs" :key="l.id" class="flex gap-3 rounded-md bg-[#f6f9fd] px-3 py-1.5"><span class="tnum shrink-0 text-ink-2">{{ fmtDateTime(l.at) }}</span><span class="flex-1">{{ l.description }}</span><span class="shrink-0 text-ink-3">{{ l.actorName }}</span></li>
        <li v-if="!detailLogs.length" class="text-ink-3">操作履歴はありません</li>
      </ul>
    </AppModal>

    <!-- 操作履歴一覧 -->
    <AppModal :open="logsOpen" title="操作履歴（最新50件）" width="900px" @close="logsOpen = false">
      <table class="tbl tbl-compact">
        <thead><tr><th>操作日時</th><th>操作者</th><th>対象</th><th>変更内容</th></tr></thead>
        <tbody>
          <tr v-for="l in db.auditLogs.slice(0, 50)" :key="l.id">
            <td class="tnum whitespace-nowrap">{{ fmtDateTime(l.at) }}</td>
            <td class="whitespace-nowrap">{{ l.actorName }}</td>
            <td>{{ l.targetLoginId }}</td>
            <td>{{ l.description }}</td>
          </tr>
        </tbody>
      </table>
    </AppModal>

    <!-- CSV -->
    <AppModal :open="csvOpen" title="ユーザーの一括登録・更新（CSV）" width="640px" @close="(csvOpen = false), (csvRows = []), (csvErrors = [])">
      <p class="mb-3 text-[13px] text-ink-2">見出し行：{{ CSV_HEADER.join('、') }}。ログインIDが一致するユーザーは更新、それ以外は新規発行になります。</p>
      <label class="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-brand-300 bg-brand-50/60 px-4 py-8 hover:bg-brand-50">
        <FileSpreadsheet class="size-10 text-brand-600" />
        <span class="text-[14px] font-bold">CSVファイルを選択</span>
        <input type="file" accept=".csv,text/csv" class="sr-only" @change="onCsv" />
      </label>
      <button class="link mt-2 flex items-center gap-1 text-[12.5px]" @click="exportUsers"><Download class="size-3.5" />現在の一覧をCSVで出力（編集用）</button>
      <p v-if="csvRows.length" class="mt-3 rounded-lg bg-[#e2f5e9] px-3 py-2 text-[13px] font-bold text-[#0f6b35]">
        取込可能：{{ csvRows.length }}名（新規 {{ csvRows.filter((r) => !r.exists).length }}名・更新 {{ csvRows.filter((r) => r.exists).length }}名）
      </p>
      <ul v-if="csvErrors.length" class="mt-2 max-h-36 overflow-y-auto rounded-lg bg-[#fde8e8] px-3 py-2 text-[12.5px] text-[#b4232a]">
        <li v-for="e in csvErrors" :key="e">{{ e }}</li>
      </ul>
      <template #footer>
        <button class="btn btn-soft" @click="csvOpen = false">キャンセル</button>
        <button class="btn btn-primary" :disabled="!csvRows.length" @click="runCsv">{{ csvRows.length }}名を取り込む</button>
      </template>
    </AppModal>
  </div>
</template>
