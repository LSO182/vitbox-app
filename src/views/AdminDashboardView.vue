<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import ClassCard from '../components/ClassCard.vue'
import ClassFormModal from '../components/ClassFormModal.vue'
import { useClassesStore } from '../store/classes'
import type { GymClass, GymClassFormInput, UserProfile } from '../types'
import { db, isFirebaseConfigured } from '../firebase/firebase'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  type Firestore,
} from 'firebase/firestore'

const classesStore = useClassesStore()

const showClassModal = ref(false)
const editingClass = ref<GymClass | null>(null)
const alertMessage = ref('')
const alertVariant = ref<'success' | 'danger' | 'info'>('success')

const users = ref<UserProfile[]>([])
let unsubscribeUsers: (() => void) | null = null

const showParticipantsModal = ref(false)
const participants = ref<UserProfile[]>([])
const participantsLoading = ref(false)
const participantsError = ref('')
const participantsClassTitle = ref('')

const membershipOptions = [
  { value: 'bronze', label: 'Bronce' },
  { value: 'silver', label: 'Plata' },
  { value: 'gold', label: 'Oro' },
]

const MOCK_USERS_STORAGE_KEY = 'vitbox-mock-users'

const DEFAULT_MOCK_USERS: UserProfile[] = [
  {
    uid: 'mock-admin',
    email: 'admin@vitbox.test',
    phone: '+5491112345678',
    firstName: 'Admin',
    lastName: 'Demo',
    nickname: 'Admin',
    birthDate: '1990-01-01',
    role: 'admin',
    membership: 'gold',
    active: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
]

function loadMockUsers(): UserProfile[] {
  if (typeof window === 'undefined') {
    return [...DEFAULT_MOCK_USERS]
  }

  let storedUsers: UserProfile[] = []
  const rawUsers = window.localStorage.getItem(MOCK_USERS_STORAGE_KEY)
  if (rawUsers) {
    try {
      storedUsers = JSON.parse(rawUsers) as UserProfile[]
    } catch (error) {
      console.warn('No se pudieron cargar los usuarios mock guardados', error)
    }
  }

  if (!storedUsers.length) {
    storedUsers = [...DEFAULT_MOCK_USERS]
  }

  const mockAuthRecord = window.localStorage.getItem('vitbox-mock-auth')
  if (mockAuthRecord) {
    try {
      const parsed = JSON.parse(mockAuthRecord) as { profile: UserProfile }
      const exists = storedUsers.some((user) => user.uid === parsed.profile.uid)
      if (!exists) {
        storedUsers.push(parsed.profile)
      }
    } catch (error) {
      console.warn('No se pudo interpretar el perfil mock guardado', error)
    }
  }

  return storedUsers.map((user) => ({
    membership: 'bronze',
    ...user,
  }))
}

function saveMockUsers(usersList: UserProfile[]) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(MOCK_USERS_STORAGE_KEY, JSON.stringify(usersList))
}

const modalTitle = computed(() => (editingClass.value ? 'Editar clase' : 'Nueva clase'))
const classFormInitialData = computed<Partial<GymClassFormInput> | undefined>(() => {
  if (!editingClass.value) {
    return undefined
  }
  const { title, description, coach, dayOfWeek, date, startTime, endTime, capacity, status } = editingClass.value
  return { title, description, coach, dayOfWeek, date, startTime, endTime, capacity, status }
})

watch(showClassModal, (isOpen) => {
  if (!isOpen) {
    editingClass.value = null
  }
})

const closeModal = () => {
  showClassModal.value = false
  setTimeout(() => {
    editingClass.value = null
  }, 0)
}

const openCreateModal = () => {
  editingClass.value = null
  showClassModal.value = true
}

const openEditModal = (gymClass: GymClass) => {
  editingClass.value = gymClass
  showClassModal.value = true
}

const showAlert = (message: string, variant: 'success' | 'danger' | 'info' = 'success') => {
  alertMessage.value = message
  alertVariant.value = variant
  setTimeout(() => {
    alertMessage.value = ''
  }, 3500)
}

const handleClassSubmit = async (payload: GymClassFormInput) => {
  try {
    if (editingClass.value) {
      await classesStore.updateClass(editingClass.value.id, payload)
      showAlert('Clase actualizada correctamente.')
    } else {
      await classesStore.createClass(payload)
      showAlert('Clase creada y publicada con éxito.')
      editingClass.value = null
    }
    showClassModal.value = false
  } catch (error) {
    showAlert((error as Error).message, 'danger')
  }
}

const handleDeleteClass = async (gymClass: GymClass) => {
  const confirmation = window.confirm('¿Eliminar la clase ' + gymClass.title + '? Esta acción no se puede deshacer.')
  if (!confirmation) {
    return
  }
  try {
    await classesStore.deleteClass(gymClass.id)
    showAlert('Clase eliminada correctamente.', 'info')
  } catch (error) {
    showAlert((error as Error).message, 'danger')
  }
}

const handleToggleStatus = async (gymClass: GymClass) => {
  const nextStatus = gymClass.status === 'active' ? 'inactive' : 'active'
  try {
    await classesStore.updateClass(gymClass.id, { status: nextStatus })
    const statusLabel = nextStatus === 'active' ? 'activa' : 'inactiva'
    showAlert('Clase marcada como ' + statusLabel + '.', 'info')
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
    participantsError.value = 'Firebase no está configurado. No se pueden obtener los usuarios anotados.'
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

const toggleUserRole = async (user: UserProfile) => {
  const nextRole = user.role === 'admin' ? 'user' : 'admin'
  try {
    if (!isFirebaseConfigured || !db) {
      users.value = users.value.map((item) =>
        item.uid === user.uid
          ? {
              ...item,
              role: nextRole,
              updatedAt: Date.now(),
            }
          : item
      )
      saveMockUsers(users.value)
      const label = user.nickname || user.email
      showAlert('El rol de ' + label + ' ahora es ' + nextRole + ' (mock).', 'success')
      return
    }

    await updateDoc(doc(db, 'users', user.uid), {
      role: nextRole,
      updatedAt: serverTimestamp(),
    })
    const label = user.nickname || user.email
    showAlert('El rol de ' + label + ' ahora es ' + nextRole + '.', 'success')
  } catch (error) {
    showAlert((error as Error).message, 'danger')
  }
}

const toggleUserActive = async (user: UserProfile) => {
  const nextActive = user.active !== false
  try {
    if (!isFirebaseConfigured || !db) {
      users.value = users.value.map((item) =>
        item.uid === user.uid
          ? {
              ...item,
              active: !nextActive,
              updatedAt: Date.now(),
            }
          : item
      )
      saveMockUsers(users.value)
      const label = user.nickname || user.email
      const message = !nextActive ? 'activado' : 'desactivado'
      showAlert('El usuario ' + label + ' fue ' + message + ' (mock).', 'info')
      return
    }

    await updateDoc(doc(db, 'users', user.uid), {
      active: !nextActive,
      updatedAt: serverTimestamp(),
    })
    const label = user.nickname || user.email
    const message = !nextActive ? 'activado' : 'desactivado'
    showAlert('El usuario ' + label + ' fue ' + message + '.', 'info')
  } catch (error) {
    showAlert((error as Error).message, 'danger')
  }
}

const deleteUser = async (user: UserProfile) => {
  const confirmation = window.confirm('¿Eliminar al usuario ' + (user.nickname || user.email) + '?')
  if (!confirmation) {
    return
  }

  try {
    if (!isFirebaseConfigured || !db) {
      users.value = users.value.filter((item) => item.uid !== user.uid)
      saveMockUsers(users.value)
      showAlert('Usuario eliminado (mock).', 'info')
      return
    }

    await deleteDoc(doc(db, 'users', user.uid))
    showAlert('Usuario eliminado correctamente.', 'info')
  } catch (error) {
    showAlert((error as Error).message, 'danger')
  }
}

const updateUserMembership = async (user: UserProfile, membership: 'bronze' | 'silver' | 'gold') => {
  try {
    if (!isFirebaseConfigured || !db) {
      users.value = users.value.map((item) =>
        item.uid === user.uid
          ? {
              ...item,
              membership,
              updatedAt: Date.now(),
            }
          : item
      )
      saveMockUsers(users.value)
      showAlert('Membresía actualizada (mock).', 'success')
      return
    }

    await updateDoc(doc(db, 'users', user.uid), {
      membership,
      updatedAt: serverTimestamp(),
    })
    showAlert('Membresía actualizada correctamente.', 'success')
  } catch (error) {
    showAlert((error as Error).message, 'danger')
  }
}

onMounted(async () => {
  await classesStore.subscribe()
  if (!isFirebaseConfigured || !db) {
    users.value = loadMockUsers()
    return
  }
  unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
    users.value = snapshot.docs.map((docSnapshot) => {
      const data = docSnapshot.data() as UserProfile
      return {
        ...data,
        uid: docSnapshot.id,
        membership: data.membership ?? 'bronze',
      }
    })
  })
})

onBeforeUnmount(() => {
  classesStore.unsubscribeFromSnapshot()
  if (unsubscribeUsers) {
    unsubscribeUsers()
  }
})
</script>

<template>
  <section>
    <header class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
      <div>
        <h1 class="section-title">Panel administrativo</h1>
        <p class="text-muted mb-0">Gestioná clases, cupos y usuarios desde un mismo lugar.</p>
      </div>
      <button class="btn btn-primary btn-rounded" type="button" @click="openCreateModal">
        <i class="bi bi-plus-circle me-2"></i>
        Nueva clase
      </button>
    </header>

    <div v-if="alertMessage" class="alert" :class="['alert', 'alert-' + alertVariant]" role="alert">
      {{ alertMessage }}
    </div>

    <div class="row g-4">
      <div class="col-lg-7">
        <div class="form-section p-4 h-100">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h2 class="h5 mb-0">Clases publicadas</h2>
            <span class="badge text-bg-light">{{ classesStore.classes.length }} clases</span>
          </div>
          <div v-if="!classesStore.classes.length" class="alert alert-light" role="alert">
            Aún no hay clases cargadas. Creá la primera con el botón "Nueva clase".
          </div>
          <div class="row g-3">
            <div v-for="gymClass in classesStore.classes" :key="gymClass.id" class="col-12">
              <ClassCard
                :gym-class="gymClass"
                :is-enrolled="false"
                hide-booking-actions
                show-admin-actions
                show-participants-trigger
                @view-participants="openParticipantsModal(gymClass)"
                @edit="openEditModal(gymClass)"
                @delete="handleDeleteClass(gymClass)"
                @toggle-status="handleToggleStatus(gymClass)"
              />
            </div>
          </div>
        </div>
      </div>
      <div class="col-lg-5">
        <div class="form-section p-4 h-100">
          <h2 class="h5 mb-3">Usuarios registrados</h2>
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th class="text-center">Membresía</th>
                  <th class="text-center">Rol</th>
                  <th class="text-center">Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!users.length">
                  <td colspan="5" class="text-center text-muted py-4">Sin usuarios registrados por el momento.</td>
                </tr>
                <tr v-for="user in users" :key="user.uid">
                  <td>
                    <div class="fw-semibold">{{ user.firstName }} {{ user.lastName }}</div>
                    <div class="text-muted small">{{ user.nickname }}</div>
                  </td>
                  <td>{{ user.email }}</td>
                  <td class="text-center">
                    <select
                      class="form-select form-select-sm w-auto mx-auto"
                      :value="user.membership || 'bronze'"
                      @change="updateUserMembership(user, ($event.target as HTMLSelectElement).value as 'bronze' | 'silver' | 'gold')"
                    >
                      <option v-for="option in membershipOptions" :key="option.value" :value="option.value">
                        {{ option.label }}
                      </option>
                    </select>
                  </td>
                  <td class="text-center">
                    <span class="badge" :class="user.role === 'admin' ? 'text-bg-primary' : 'text-bg-secondary'">
                      {{ user.role === 'admin' ? 'Admin' : 'Usuario' }}
                    </span>
                  </td>
                  <td class="text-center">
                    <span class="badge" :class="user.active === false ? 'text-bg-warning' : 'text-bg-success'">
                      {{ user.active === false ? 'Inactivo' : 'Activo' }}
                    </span>
                  </td>
                  <td class="text-end">
                    <div class="btn-group btn-group-sm">
                      <button class="btn btn-outline-primary" type="button" @click="toggleUserRole(user)">
                        {{ user.role === 'admin' ? 'Quitar admin' : 'Hacer admin' }}
                      </button>
                      <button class="btn btn-outline-warning" type="button" @click="toggleUserActive(user)">
                        {{ user.active === false ? 'Activar' : 'Desactivar' }}
                      </button>
                      <button class="btn btn-outline-danger" type="button" @click="deleteUser(user)">
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="text-muted small mt-3">
            Para eliminar usuarios o resetear contraseñas, utilizá la consola de Firebase Authentication.
          </p>
        </div>
      </div>
    </div>

    <ClassFormModal
      v-model="showClassModal"
      :initial-data="classFormInitialData"
      :title="modalTitle"
      @update:modelValue="closeModal"
      @submit="handleClassSubmit"
    />

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
                    No hay usuarios anotados en esta clase.
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
  </section>
</template>
