<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import ClassCard from '../components/ClassCard.vue'
import { useClassesStore } from '../store/classes'
import { useAuthStore } from '../store/auth'
import { listenForForegroundMessages } from '../services/notifications'
import type { GymClass, UserProfile } from '../types'
import { db, isFirebaseConfigured } from '../firebase/firebase'
import { doc, getDoc, type Firestore } from 'firebase/firestore'

const classesStore = useClassesStore()
const authStore = useAuthStore()

const alertMessage = ref('')
const alertVariant = ref<'success' | 'danger' | 'info'>('info')
let unsubscribeMessaging: (() => void) | undefined

const classes = computed(() => classesStore.classes)
const userId = computed(() => authStore.currentUser?.uid ?? '')
const membership = computed(() => authStore.profile?.membership ?? 'bronze')

const morningClasses = computed(() => classesStore.morningClasses)
const afternoonClasses = computed(() => classesStore.afternoonClasses)

const showParticipantsModal = ref(false)
const participants = ref<UserProfile[]>([])
const participantsLoading = ref(false)
const participantsError = ref('')
const participantsClassTitle = ref('')

const showAlert = (message: string, variant: 'success' | 'danger' | 'info' = 'info') => {
  alertMessage.value = message
  alertVariant.value = variant
  setTimeout(() => {
    alertMessage.value = ''
  }, 4000)
}

const handleEnroll = async (classId: string) => {
  if (!userId.value) {
    return
  }
  try {
    await classesStore.enrollUser(classId, userId.value, membership.value)
    showAlert('Tu reserva fue registrada con éxito. ¡Nos vemos en clase!', 'success')
  } catch (error) {
    showAlert((error as Error).message, 'danger')
  }
}

const handleUnenroll = async (classId: string) => {
  if (!userId.value) {
    return
  }
  try {
    await classesStore.unenrollUser(classId, userId.value)
    showAlert('Cancelaste tu reserva. Esperamos verte pronto.', 'info')
  } catch (error) {
    showAlert((error as Error).message, 'danger')
  }
}

const openParticipantsModal = async (gymClass: GymClass) => {
  participantsClassTitle.value = gymClass.title
  showParticipantsModal.value = true
  participantsLoading.value = true
  participantsError.value = ''
  participants.value = []

  const validUserIds = gymClass.enrolledUserIds.filter((id) => Boolean(id?.trim?.()))

  if (!validUserIds.length) {
    participantsLoading.value = false
    return
  }

  if (!isFirebaseConfigured || !db) {
    participantsError.value = 'Firebase no está configurado. No se puede obtener el listado.'
    participantsLoading.value = false
    return
  }

  try {
    const firestore = db as Firestore
    const snapshots = await Promise.all(
      validUserIds.map(async (uid) => {
        const userRef = doc(firestore, 'users', uid)
        const snapshot = await getDoc(userRef)
        if (!snapshot.exists()) {
          return null
        }
        const data = snapshot.data() as UserProfile
        return { ...data, uid }
      })
    )

    participants.value = snapshots.filter((item): item is UserProfile => Boolean(item))
  } catch (error) {
    participantsError.value = (error as Error).message
  } finally {
    participantsLoading.value = false
  }
}

const closeParticipantsModal = () => {
  showParticipantsModal.value = false
}

onMounted(async () => {
  await classesStore.subscribe()
  unsubscribeMessaging = await listenForForegroundMessages((payload) => {
    if (typeof payload === 'object' && payload && 'notification' in payload) {
      const notification = (payload as { notification?: { title?: string; body?: string } }).notification
      showAlert(notification?.body ?? 'Nueva notificación recibida.', 'info')
    }
  })
})

onBeforeUnmount(() => {
  classesStore.unsubscribeFromSnapshot()
  if (unsubscribeMessaging) {
    unsubscribeMessaging()
  }
})

const isUserEnrolled = (gymClassId: string) => {
  const gymClass = classes.value.find((item) => item.id === gymClassId)
  if (!gymClass) {
    return false
  }
  return gymClass.enrolledUserIds.includes(userId.value)
}

const isEnrollmentDisabled = (gymClass: GymClass) => {
  if (!userId.value) {
    return true
  }
  return classesStore.isEnrollmentLimitReachedForClass(userId.value, membership.value, gymClass)
}

const enrollmentLimitMessage = (gymClass: GymClass) => {
  if (isUserEnrolled(gymClass.id)) {
    return null
  }
  return isEnrollmentDisabled(gymClass) ? 'Alcanzaste el máximo de reservas para esta semana según tu membresía.' : null
}
</script>

<template>
  <section>
    <header class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h1 class="section-title text-white">Agenda de clases</h1>
        <p class="text-white mb-0">Reserva tus turnos MAÑANA o TARDE. Cupo máximo de 20 personas por clase.</p>
      </div>
    </header>

    <div v-if="alertMessage" class="alert" :class="['alert', 'alert-' + alertVariant]" role="alert">
      {{ alertMessage }}
    </div>

    <div v-if="classesStore.loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
      <p class="text-muted mt-3">Cargando clases disponibles...</p>
    </div>

    <div v-else class="row g-4">
      <div class="col-12">
        <h4 class="mb-3 text-white">TURNOS MAÑANA</h4>
        <div class="row g-3 overflow-x-scroll overflow-x-lg-hidden overflow-y-hidden flex-nowrap flex-lg-wrap">
          <div v-if="!morningClasses.length" class="col-12">
            <div class="alert alert-light" role="alert">No hay clases del turno mañana cargadas por el momento.</div>
          </div>
          <div v-for="gymClass in morningClasses" :key="gymClass.id" class="col-11 col-md-6 col-xl-4">
            <ClassCard
              :gym-class="gymClass"
              :is-enrolled="isUserEnrolled(gymClass.id)"
              show-participants-trigger
              :disable-actions="isEnrollmentDisabled(gymClass)"
              :enrollment-limit-message="enrollmentLimitMessage(gymClass)"
              @view-participants="openParticipantsModal(gymClass)"
              @enroll="handleEnroll(gymClass.id)"
              @unenroll="handleUnenroll(gymClass.id)"
            />
          </div>
        </div>
      </div>

      <div class="col-12">
        <h4 class="mb-3 text-white">TURNOS TARDE</h4>
        <div class="row g-3 overflow-x-scroll overflow-x-lg-hidden overflow-y-hidden flex-nowrap flex-lg-wrap">
          <div v-if="!afternoonClasses.length" class="col-12">
            <div class="alert alert-light" role="alert">No hay clases del turno tarde cargadas por el momento.</div>
          </div>
          <div v-for="gymClass in afternoonClasses" :key="gymClass.id" class="col-11 col-md-6 col-xl-4">
            <ClassCard
              :gym-class="gymClass"
              :is-enrolled="isUserEnrolled(gymClass.id)"
              show-participants-trigger
              :disable-actions="isEnrollmentDisabled(gymClass)"
              :enrollment-limit-message="enrollmentLimitMessage(gymClass)"
              @view-participants="openParticipantsModal(gymClass)"
              @enroll="handleEnroll(gymClass.id)"
              @unenroll="handleUnenroll(gymClass.id)"
            />
          </div>
        </div>
      </div>
    </div>
  </section>
    <Teleport to="body">
      <div v-if="showParticipantsModal">
        <div class="modal fade show d-block" tabindex="-1" role="dialog" aria-modal="true">
          <div class="modal-dialog modal-lg" role="document">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">Participantes - {{ participantsClassTitle }}</h5>
                <button type="button" class="btn-close" aria-label="Close" @click="closeParticipantsModal"></button>
              </div>
              <div class="modal-body">
                <div v-if="participantsLoading" class="text-center py-4">
                  <div class="spinner-border text-primary" role="status"></div>
                  <p class="text-muted mt-3">Cargando participantes...</p>
                </div>
                <div v-else-if="participantsError" class="alert alert-danger" role="alert">
                  {{ participantsError }}
                </div>
                <template v-else>
                  <div v-if="!participants.length" class="alert alert-light" role="alert">
                    No hay usuarios anotados todavía. ¡Sé el primero en reservar!
                  </div>
                  <ul v-else class="list-group list-group-flush">
                    <li
                      v-for="person in participants"
                      :key="person.uid"
                      class="list-group-item d-flex justify-content-between align-items-center"
                    >
                      <div>
                        <div class="fw-semibold">{{ person.nickname || person.firstName || 'Sin apodo' }}</div>
                        <div class="text-muted small">
                          <span v-if="person.firstName || person.lastName">
                            ({{ [person.firstName, person.lastName].filter(Boolean).join(' ') }})
                          </span>
                          <span v-else>(Sin nombre)</span>
                        </div>
                      </div>
                      <span class="badge text-bg-secondary">{{ person.phone || 'Sin teléfono' }}</span>
                    </li>
                  </ul>
                </template>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-outline-secondary" @click="closeParticipantsModal">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-backdrop fade show"></div>
      </div>
    </Teleport>
</template>
