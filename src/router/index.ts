import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior: (_to, _from, saved) => saved ?? { top: 0 },
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { title: 'ログイン', bare: true },
    },
    {
      path: '/',
      component: AppLayout,
      children: [
        {
          path: '',
          name: 'dashboard',
          component: () => import('@/views/DashboardView.vue'),
          meta: { title: 'ダッシュボード', banner: 'system', nav: 'dashboard' },
        },
        {
          path: 'vehicles',
          name: 'vehicles',
          component: () => import('@/views/VehicleListView.vue'),
          meta: { title: '車両台帳一覧', banner: 'system', nav: 'vehicles' },
        },
        {
          path: 'vehicles/new',
          name: 'vehicle-new',
          component: () => import('@/views/VehicleFormView.vue'),
          meta: { title: '新規車両登録', nav: 'vehicles', permission: 'data.edit' },
        },
        {
          path: 'vehicles/:id',
          name: 'vehicle-detail',
          component: () => import('@/views/VehicleDetailView.vue'),
          props: true,
          meta: { title: '車両詳細', banner: 'detail', nav: 'vehicles' },
        },
        {
          path: 'vehicles/:id/edit',
          name: 'vehicle-edit',
          component: () => import('@/views/VehicleFormView.vue'),
          props: true,
          meta: { title: '台帳を編集', nav: 'vehicles', permission: 'data.edit' },
        },
        {
          path: 'maintenance',
          name: 'maintenance',
          component: () => import('@/views/MaintenanceListView.vue'),
          meta: { title: '修理・整備履歴一覧', banner: 'system', nav: 'maintenance' },
        },
        {
          path: 'maintenance/new',
          name: 'maintenance-new',
          component: () => import('@/views/MaintenanceFormView.vue'),
          meta: { title: '修理・整備履歴登録', nav: 'maintenance', permission: 'data.edit' },
        },
        {
          path: 'analytics',
          name: 'analytics',
          component: () => import('@/views/AnalyticsView.vue'),
          meta: { title: '集計・分析', banner: 'analytics', nav: 'analytics', permission: 'analytics.view' },
        },
        {
          path: 'masters',
          name: 'masters',
          component: () => import('@/views/MasterView.vue'),
          meta: { title: 'マスタ管理', banner: 'system', nav: 'masters' },
        },
        {
          path: 'users',
          name: 'users',
          component: () => import('@/views/UserManagementView.vue'),
          meta: { title: 'ユーザー・権限管理', banner: 'users', nav: 'users', permission: 'users.manage' },
        },
        {
          path: 'forbidden',
          name: 'forbidden',
          component: () => import('@/views/ForbiddenView.vue'),
          meta: { title: '権限がありません' },
        },
        {
          path: ':pathMatch(.*)*',
          name: 'not-found',
          component: () => import('@/views/NotFoundView.vue'),
          meta: { title: 'ページが見つかりません' },
        },
      ],
    },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (!to.meta.bare && !auth.isLoggedIn) {
    return { name: 'login', query: to.fullPath !== '/' ? { redirect: to.fullPath } : {} }
  }
  if (to.name === 'login' && auth.isLoggedIn) return { name: 'dashboard' }
  if (to.meta.permission && !auth.can(to.meta.permission)) {
    return { name: 'forbidden', query: { from: to.fullPath } }
  }
  return true
})

router.afterEach((to) => {
  document.title = `${to.meta.title ? `${to.meta.title}｜` : ''}車両管理Webシステム（デモ）`
})

export default router
