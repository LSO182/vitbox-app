<script setup lang="ts">
import { computed } from 'vue'
import type { GymClass } from '../types'

const props = defineProps<{
  gymClass: GymClass
  isEnrolled: boolean
  disableActions?: boolean
  showAdminActions?: boolean
  hideBookingActions?: boolean
  showParticipantsTrigger?: boolean
  enrollmentLimitMessage?: string | null
}>()

const emit = defineEmits<{
  enroll: []
  unenroll: []
  edit: []
  delete: []
  toggleStatus: []
  viewParticipants: []
}>()

const availableSlots = computed(() => props.gymClass.capacity - props.gymClass.enrolledCount)
const isFull = computed(() => availableSlots.value <= 0)
const statusBadgeClass = computed(() =>
  props.gymClass.status === 'active' ? 'badge-status-active pulsate-fwd' : 'badge-status-inactive'
)

const formattedDate = computed(() => {
  if (!props.gymClass.date) {
    return ''
  }

  const [year, month, day] = props.gymClass.date.split('-')
  if (!year || !month || !day) {
    return props.gymClass.date
  }

  const safeDay = day.padStart(2, '0')
  const safeMonth = month.padStart(2, '0')
  return safeDay + '/' + safeMonth + '/' + year
})
</script>

<template>
  <div class="card card-class h-100">
    <div class="card-body d-flex flex-column">
      <div class="d-flex justify-content-between align-items-start mb-2">
        <div>
          <h5 class="card-title mb-1">{{ gymClass.title }}</h5>
          <span class="badge p-2" :class="statusBadgeClass">
            {{ gymClass.status === 'active' ? 'Disponible' : 'Inactiva' }}
          </span>
        </div>
        <div class="text-end">
          <span class="badge text-bg-light p-2">
            {{ gymClass.dayOfWeek }}
          </span>
          <div v-if="formattedDate" class="small text-muted">
            {{ formattedDate }}
          </div>
          <div class="small text-muted">
            {{ gymClass.startTime }} - {{ gymClass.endTime }}
          </div>
        </div>
      </div>
      <p class="card-text text-muted small flex-grow-1">
        <template v-if="enrollmentLimitMessage && !isEnrolled">
          {{ enrollmentLimitMessage }}
        </template>
        <template v-else>
          {{ gymClass.description }}
        </template>
      </p>
      <div class="mb-3">
        <span
          class="badge text-bg-primary me-2 p-2"
          :class="{ 'badge-action': showParticipantsTrigger }"
          :role="showParticipantsTrigger ? 'button' : undefined"
          tabindex="0"
          @click="showParticipantsTrigger && emit('viewParticipants')"
          @keydown.enter.prevent="showParticipantsTrigger && emit('viewParticipants')"
        >
          <i class="bi bi-people-fill me-1">
            
          </i>
          {{ gymClass.enrolledCount }}/{{ gymClass.capacity }}
        </span>
        <span class="badge bg-light text-black border p-2">
          <span class="me-1" role="img" aria-label="Entrenador">🏋️‍♂️</span>
          {{ gymClass.coach }}
        </span>
      </div>
      <div class="d-flex flex-column gap-2">
        <template v-if="!hideBookingActions">
          <button
            v-if="!isEnrolled"
            class="btn btn-secondary btn-rounded"
            :disabled="isFull || gymClass.status !== 'active' || disableActions"
            type="button"
            @click="emit('enroll')"
          >
            <i class="bi bi-calendar-check me-2"></i>
            Reservar cupo
          </button>
          <button
            v-else
            class="btn btn-outline-danger btn-rounded"
            :disabled="disableActions && !isEnrolled"
            type="button"
            @click="emit('unenroll')"
          >
            <i class="bi bi-calendar-x me-2"></i>
            Cancelar reserva
          </button>
        </template>
        <button v-if="showAdminActions" class="btn btn-outline-secondary btn-sm" type="button" @click="emit('edit')">
          <i class="bi bi-pencil-square me-1"></i>
          Editar clase
        </button>
        <div v-if="showAdminActions" class="d-flex gap-2">
          <button class="btn btn-outline-warning btn-sm flex-grow-1" type="button" @click="emit('toggleStatus')">
            {{ gymClass.status === 'active' ? 'Marcar como inactiva' : 'Marcar como activa' }}
          </button>
          <button class="btn btn-outline-danger btn-sm flex-grow-1" type="button" @click="emit('delete')">
            Eliminar
          </button>
        </div>
      </div>
      <div v-if="isFull" class="alert alert-warning mt-3 mb-0 small" role="alert">
        La clase está completa. Activa las notificaciones para enterarte si se libera un lugar.
      </div>
    </div>
  </div>
</template>
