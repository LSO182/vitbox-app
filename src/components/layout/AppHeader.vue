<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../store/auth'

const authStore = useAuthStore()
const router = useRouter()
const isNavbarOpen = ref(false)

const isAuthenticated = computed(() => Boolean(authStore.currentUser))
const isAdmin = computed(() => authStore.profile?.role === 'admin')
const displayName = computed(() => authStore.profile?.nickname || authStore.profile?.firstName || authStore.currentUser?.email || 'Usuario')

const toggleNavbar = () => {
  isNavbarOpen.value = !isNavbarOpen.value
}

const closeNavbar = () => {
  isNavbarOpen.value = false
}

const handleLogout = async () => {
  await authStore.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <nav class="navbar navbar-expand-lg navbar-light bg-white shadow-sm border-bottom">
    <div class="container">
      <router-link class="navbar-brand" :to="{ name: isAuthenticated ? 'classes' : 'login' }" @click="closeNavbar">
        Vitbox
      </router-link>
      <button
        class="navbar-toggler"
        type="button"
        aria-controls="navbarNav"
        aria-expanded="false"
        aria-label="Toggle navigation"
        @click="toggleNavbar"
      >
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" :class="{ show: isNavbarOpen }" id="navbarNav">
        <ul class="navbar-nav me-auto mb-2 mb-lg-0">
          <li v-if="isAuthenticated" class="nav-item">
            <router-link class="nav-link" :to="{ name: 'classes' }" @click="closeNavbar">
              Clases
            </router-link>
          </li>
          <li v-if="isAuthenticated" class="nav-item">
            <router-link class="nav-link" :to="{ name: 'profile' }" @click="closeNavbar">
              Perfil
            </router-link>
          </li>
          <li v-if="isAdmin" class="nav-item">
            <router-link class="nav-link" :to="{ name: 'admin' }" @click="closeNavbar">
              Administración
            </router-link>
          </li>
        </ul>
        <div class="d-flex gap-2 align-items-center">
          <span v-if="isAuthenticated" class="text-muted small">Hola, {{ displayName }}</span>
          <router-link
            v-if="!isAuthenticated"
            class="btn btn-outline-primary btn-rounded"
            :to="{ name: 'login' }"
            @click="closeNavbar"
          >
            Iniciar sesión
          </router-link>
          <router-link
            v-if="!isAuthenticated"
            class="btn btn-primary btn-rounded"
            :to="{ name: 'register' }"
            @click="closeNavbar"
          >
            Registrarse
          </router-link>
          <button
            v-if="isAuthenticated"
            class="btn btn-outline-danger btn-rounded"
            type="button"
            @click="handleLogout"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  </nav>
</template>
