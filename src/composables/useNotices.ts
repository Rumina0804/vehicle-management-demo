import { computed } from 'vue'
import { useDbStore } from '@/stores/db'
import { useAuthStore } from '@/stores/auth'
import { diffDays, todayISO } from '@/utils/date'

export interface Notice {
  id: string
  level: 'danger' | 'warning' | 'info'
  title: string
  body: string
  to: string
  read: boolean
}

/** 通知（データから自動生成。既読状態はブラウザに保存） */
export function useNotices() {
  const db = useDbStore()
  const auth = useAuthStore()

  const notices = computed<Notice[]>(() => {
    const today = todayISO()
    const scope = auth.scopeDivisionId
    const vehicles = db.vehicles.filter((v) => !scope || v.divisionId === scope)
    const list: Omit<Notice, 'read'>[] = []

    const expiring = vehicles.filter((v) => {
      const d = diffDays(v.inspectionExpiry, today)
      return d >= 0 && d <= 60
    })
    const urgent = expiring.filter((v) => diffDays(v.inspectionExpiry, today) <= 14)
    if (expiring.length) {
      list.push({
        id: `exp-${today}-${expiring.length}`,
        level: urgent.length ? 'danger' : 'warning',
        title: `車検期限が60日以内の車両が${expiring.length}台あります`,
        body: urgent.length
          ? `うち${urgent.length}台は14日以内に期限を迎えます（${urgent.map((v) => v.id).join('、')}）。`
          : '早めに車検の予約・手配を行ってください。',
        to: '/vehicles?expiring=1',
      })
    }

    const inRepair = vehicles.filter((v) => v.status === 'repair')
    if (inRepair.length) {
      list.push({
        id: `rep-${today}-${inRepair.map((v) => v.id).join('.')}`,
        level: 'warning',
        title: `修理中の車両が${inRepair.length}台あります`,
        body: `${inRepair.map((v) => v.id).join('、')}（費用は見込で登録済み）`,
        to: '/maintenance?state=open',
      })
    }

    const latestUser = [...db.users].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
    if (latestUser && auth.can('users.manage')) {
      list.push({
        id: `usr-${latestUser.loginId}`,
        level: 'info',
        title: '新しいアカウントが発行されました',
        body: `${latestUser.name}（${latestUser.loginId}）／${db.userAffiliation(latestUser)}`,
        to: '/users',
      })
    }

    const read = new Set(db.readNoticeIds)
    return list.map((n) => ({ ...n, read: read.has(n.id) }))
  })

  const unreadCount = computed(() => notices.value.filter((n) => !n.read).length)

  function markAllRead() {
    db.markNoticesRead(notices.value.map((n) => n.id))
  }

  function markRead(id: string) {
    db.markNoticesRead([id])
  }

  return { notices, unreadCount, markAllRead, markRead }
}
