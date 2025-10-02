<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useAuthStore } from '../store/auth'
import { useClassesStore } from '../store/classes'

const authStore = useAuthStore()
const classesStore = useClassesStore()

const profile = computed(() => authStore.profile)
const userId = computed(() => authStore.currentUser?.uid ?? '')

const form = reactive({
  phone: '',
  nickname: '',
  birthDate: '',
})

const successMessage = ref('')
const errorMessage = ref('')

watch(
  profile,
  (value) => {
    if (!value) {
      return
    }
    form.phone = value.phone
    form.nickname = value.nickname
    form.birthDate = value.birthDate
  },
  { immediate: true }
)

const handleSubmit = async () => {
  if (!profile.value) {
    return
  }
  try {
    await authStore.updateProfileDetails({
      phone: form.phone,
      nickname: form.nickname,
      birthDate: form.birthDate,
    })
    successMessage.value = 'Perfil actualizado correctamente.'
    errorMessage.value = ''
    setTimeout(() => (successMessage.value = ''), 3000)
  } catch (error) {
    errorMessage.value = (error as Error).message
    successMessage.value = ''
  }
}

onMounted(() => {
  classesStore.subscribe()
})

onBeforeUnmount(() => {
  classesStore.unsubscribeFromSnapshot()
})

const myClasses = computed(() =>
  classesStore.classes.filter((gymClass) => gymClass.enrolledUserIds.includes(userId.value))
)
</script>

<template>
  <section>
    <div class="row g-4">
      <div class="col-lg-4">
        <div class="form-section p-4 h-100">
          <h2 class="mb-3">Mis datos</h2>
          <p class="text-muted">Actualiza tu información de contacto para que el equipo de Vitbox pueda comunicarse con vos.</p>
          <div class="mb-3">
            <label class="form-label">Nombre completo</label>
            <div class="form-control bg-light fw-semibold">
              {{ profile?.firstName }} {{ profile?.lastName }}
            </div>
          </div>
          <div class="mb-3">
            <label class="form-label">Email</label>
            <div class="form-control bg-light">{{ profile?.email }}</div>
          </div>
          <form class="mt-3" @submit.prevent="handleSubmit">
            <div class="mb-3">
              <label class="form-label" for="nickname">Apodo</label>
              <input id="nickname" v-model="form.nickname" class="form-control" required />
            </div>
            <div class="mb-3">
              <label class="form-label" for="phone">Teléfono</label>
              <input id="phone" v-model="form.phone" class="form-control" required />
            </div>
            <div class="mb-3">
              <label class="form-label" for="birthDate">Fecha de nacimiento</label>
              <input id="birthDate" v-model="form.birthDate" type="date" class="form-control" required />
            </div>
            <div v-if="successMessage" class="alert alert-success" role="alert">{{ successMessage }}</div>
            <div v-if="errorMessage" class="alert alert-danger" role="alert">{{ errorMessage }}</div>
            <button class="btn btn-primary w-100 btn-rounded" type="submit" :disabled="authStore.loading">
              Guardar cambios
            </button>
          </form>
        </div>
      </div>
      <div class="col-lg-8">
        <div class="form-section p-4 h-100">
          <h2 class="mb-3">Mis reservas</h2>
          <p class="text-muted">Visualiza tus próximas clases y sus detalles.</p>
          <div v-if="!myClasses.length" class="alert alert-light" role="alert">
            Todavía no reservaste ninguna clase. Encontralas en la sección "Clases".
          </div>
          <div v-else class="list-group list-group-flush">
            <div v-for="gymClass in myClasses" :key="gymClass.id" class="list-group-item">
              <div class="d-flex justify-content-between align-items-start">
                <div>
                  <h5 class="mb-1">{{ gymClass.title }}</h5>
                  <p class="text-muted mb-1">{{ gymClass.description }}</p>
                  <span class="badge text-bg-secondary me-2">{{ gymClass.dayOfWeek }}</span>
                  <span class="badge text-bg-light">{{ gymClass.startTime }} - {{ gymClass.endTime }}</span>
                </div>
                <div class="text-end">
                  <span class="badge text-bg-primary mb-2">Coach: {{ gymClass.coach }}</span>
                  <div class="text-muted small">
                    {{ gymClass.enrolledCount }} / {{ gymClass.capacity }} asistentes
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
