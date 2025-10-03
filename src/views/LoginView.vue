<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../store/auth'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()
const form = reactive({
  email: '',
  password: '',
})
const errorMessage = ref('')

const handleSubmit = async () => {
  errorMessage.value = ''
  try {
    await authStore.login(form.email.trim(), form.password)
    const redirect = (route.query.redirect as string) ?? '/clases'
    router.push(redirect)
  } catch (error) {
    errorMessage.value =
      (error as Error).message === 'Firebase: Error (auth/invalid-credential).' ?
        'Usuario o contraseña incorrectos.' :
        (error as Error).message
  }
}
</script>

<template>
  <div class="row justify-content-center">
    <div class="col-lg-12">
      <img src="/src/assets/logo-vitbox.png" alt="Logo Vitbox" class="d-flex mx-auto logo-vitbox" />
    </div>
    <div class="col-lg-5">
      <div class="form-section shadow p-4">
        <h2 class="mb-3">Iniciar sesión</h2>
        <p class="text-muted">Ingresa con tu email y contraseña para guardar tu lugar en tu clase favorita.</p>
        <form class="mt-4" @submit.prevent="handleSubmit">
          <div class="mb-3">
            <label class="form-label" for="email">Email</label>
            <input
              id="email"
              v-model="form.email"
              type="email"
              class="form-control"
              placeholder="tuemail@ejemplo.com"
              required
            />
          </div>
          <div class="mb-3">
            <label class="form-label" for="password">Contraseña</label>
            <input
              id="password"
              v-model="form.password"
              type="password"
              class="form-control"
              placeholder="••••••••"
              minlength="6"
              required
            />
          </div>
          <div v-if="errorMessage" class="alert d-inline-flex alert-light" role="alert">
            {{ errorMessage }}
          </div>
          <button class="btn btn-primary w-100 btn-rounded" type="submit" :disabled="authStore.loading">
            <span v-if="authStore.loading" class="spinner-border spinner-border-sm me-2" role="status"></span>
            Ingresar
          </button>
        </form>
        <hr class="my-4" />
        <p class="mb-0 text-center">
          ¿No tenés cuenta?
          <router-link :to="{ name: 'register' }">Registrate aquí</router-link>
        </p>
      </div>
    </div>
  </div>
</template>
