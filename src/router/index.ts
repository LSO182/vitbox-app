import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '../store/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/clases',
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { requiresGuest: true },
  },
  {
    path: '/registrarse',
    name: 'register',
    component: () => import('../views/RegisterView.vue'),
    meta: { requiresGuest: true },
  },
  {
    path: '/clases',
    name: 'classes',
    component: () => import('../views/ClassScheduleView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/perfil',
    name: 'profile',
    component: () => import('../views/ProfileView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/admin',
    name: 'admin',
    component: () => import('../views/AdminDashboardView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../views/NotFoundView.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

let authInitialized = false

router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()
  if (!authInitialized) {
    await authStore.initializeAuth()
    authInitialized = true
  }

  const { currentUser, profile } = authStore

  if (to.meta.requiresAuth && !currentUser) {
    next({ name: 'login', query: { redirect: to.fullPath } })
    return
  }

  if (to.meta.requiresGuest && currentUser) {
    next({ name: 'classes' })
    return
  }

  if (to.meta.requiresAdmin && profile?.role !== 'admin') {
    next({ name: 'classes' })
    return
  }

  next()
})

export default router
