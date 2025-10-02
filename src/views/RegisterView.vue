<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../store/auth'

const authStore = useAuthStore()
const router = useRouter()
const form = reactive({
  firstName: '',
  lastName: '',
  nickname: '',
  phone: '',
  birthDate: '',
  email: '',
  password: '',
  confirmPassword: '',
})

const errorMessage = ref('')
const successMessage = ref('')

const handleSubmit = async () => {
  errorMessage.value = ''
  successMessage.value = ''

  if (form.password !== form.confirmPassword) {
    errorMessage.value = 'Las contraseñas no coinciden.'
    return
  }

  try {
    await authStore.register({
      firstName: form.firstName,
      lastName: form.lastName,
      nickname: form.nickname,
      phone: form.phone,
      birthDate: form.birthDate,
      email: form.email,
      password: form.password,
    })
    successMessage.value = 'Cuenta creada correctamente. Te redirigiremos a las clases.'
    setTimeout(() => router.push({ name: 'classes' }), 1200)
  } catch (error) {
    errorMessage.value = (error as Error).message
  }
}
</script>

<template>
  <div class="row justify-content-center">
    <div class="col-lg-12">
      <img src="/src/assets/logo-vitbox.png" alt="Logo Vitbox" class="d-flex mx-auto logo-vitbox" />
    </div>
    <div class="col-lg-7">
      <div class="form-section shadow p-4">
        <h2 class="mb-3">Crear cuenta Vitbox</h2>
        <p class="text-muted">Completá tus datos para poder registrarte.</p>
        <form class="mt-4" @submit.prevent="handleSubmit">
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label" for="firstName">Nombre</label>
              <input id="firstName" v-model="form.firstName" class="form-control" required />
            </div>
            <div class="col-md-6">
              <label class="form-label" for="lastName">Apellido</label>
              <input id="lastName" v-model="form.lastName" class="form-control" required />
            </div>
            <div class="col-md-6">
              <label class="form-label" for="nickname">Apodo</label>
              <input id="nickname" v-model="form.nickname" class="form-control" placeholder="Cómo querés que te llamemos" required />
            </div>
            <div class="col-md-6">
              <label class="form-label" for="phone">Teléfono</label>
              <input id="phone" v-model="form.phone" class="form-control" placeholder="Ej: +54 9 11 1234 5678" required />
            </div>
            <div class="col-md-6">
              <label class="form-label" for="birthDate">Fecha de nacimiento</label>
              <input id="birthDate" v-model="form.birthDate" type="date" class="form-control" required />
            </div>
            <div class="col-md-6">
              <label class="form-label" for="email">Email</label>
              <input id="email" v-model="form.email" type="email" class="form-control" required />
            </div>
            <div class="col-md-6">
              <label class="form-label" for="password">Contraseña</label>
              <input id="password" v-model="form.password" type="password" class="form-control" minlength="6" required />
            </div>
            <div class="col-md-6">
              <label class="form-label" for="confirmPassword">Confirmar contraseña</label>
              <input id="confirmPassword" v-model="form.confirmPassword" type="password" class="form-control" minlength="6" required />
            </div>
          </div>
          <div v-if="errorMessage" class="alert alert-danger mt-3" role="alert">
            {{ errorMessage }}
          </div>
          <div v-if="successMessage" class="alert alert-success mt-3" role="alert">
            {{ successMessage }}
          </div>
          <button class="btn btn-primary w-100 btn-rounded mt-4" type="submit" :disabled="authStore.loading">
            <span v-if="authStore.loading" class="spinner-border spinner-border-sm me-2" role="status"></span>
            Crear cuenta
          </button>
        </form>
        <hr class="my-4" />
        <p class="mb-0 text-center">
          ¿Ya tenés una cuenta?
          <router-link :to="{ name: 'login' }">Entrá aca</router-link>
        </p>
      </div>
    </div>
  </div>
</template>
