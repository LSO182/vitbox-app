<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import type { GymClassFormInput } from '../types'

const props = defineProps<{
  modelValue: boolean
  initialData?: Partial<GymClassFormInput>
  title: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [payload: GymClassFormInput]
}>()

const defaultForm: GymClassFormInput = {
  title: '',
  description: '',
  coach: '',
  dayOfWeek: 'Lunes',
  date: '',
  startTime: '08:00',
  endTime: '09:00',
  capacity: 1,
  status: 'active',
}

const form = reactive({ ...defaultForm })

watch(
  () => props.initialData,
  (value) => {
    Object.assign(form, { ...defaultForm, ...value })
  },
  { immediate: true }
)

const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

const derivedDayOfWeek = computed(() => {
  if (!form.date) {
    return form.dayOfWeek
  }

  const date = new Date(form.date + 'T00:00:00')
  if (Number.isNaN(date.getTime())) {
    return form.dayOfWeek
  }

  return dayNames[date.getUTCDay()]
})

watch(
  () => form.date,
  () => {
    const nextDay = derivedDayOfWeek.value
    if (nextDay) {
      form.dayOfWeek = nextDay
    }
  }
)

const closeModal = () => emit('update:modelValue', false)

const handleSubmit = () => {
  const nextDay = derivedDayOfWeek.value
  if (nextDay) {
    form.dayOfWeek = nextDay
  }
  emit('submit', { ...form })
  closeModal()
}
</script>

<template>
  <Teleport to="body">
    <div v-if="modelValue">
      <div class="modal fade show d-block" tabindex="-1" role="dialog" aria-modal="true">
        <div class="modal-dialog modal-lg" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">{{ title }}</h5>
              <button type="button" class="btn-close" aria-label="Close" @click="closeModal"></button>
            </div>
            <form @submit.prevent="handleSubmit">
              <div class="modal-body row g-3">
                <div class="col-md-6">
                  <label class="form-label" for="classTitle">Nombre de la clase</label>
                  <input id="classTitle" v-model="form.title" class="form-control" placeholder="Funcional, HIIT, etc." required />
                </div>
                <div class="col-md-6">
                  <label class="form-label" for="coach">Profesor/a</label>
                  <input id="coach" v-model="form.coach" class="form-control" placeholder="Nombre del coach" required />
                </div>
                <div class="col-12">
                  <label class="form-label" for="description">Descripción</label>
                  <textarea
                    id="description"
                    v-model="form.description"
                    class="form-control"
                    rows="3"
                    placeholder="Detalle breve de la clase"
                    required
                  ></textarea>
                </div>
            <div class="col-md-3">
              <label class="form-label" for="date">Fecha</label>
              <input id="date" v-model="form.date" type="date" class="form-control" />
            </div>
            <div class="col-md-3">
              <label class="form-label">Día</label>
              <input class="form-control" :value="derivedDayOfWeek" type="text" readonly />
            </div>
            <div class="col-md-3">
              <label class="form-label" for="startTime">Hora inicio</label>
              <input id="startTime" v-model="form.startTime" type="time" class="form-control" required />
            </div>
            <div class="col-md-3">
              <label class="form-label" for="endTime">Hora fin</label>
              <input id="endTime" v-model="form.endTime" type="time" class="form-control" required />
            </div>
                <div class="col-md-6">
                  <label class="form-label" for="capacity">Cupo máximo</label>
                  <input
                    id="capacity"
                    v-model.number="form.capacity"
                    type="number"
                    min="1"
                    max="50"
                    class="form-control"
                    required
                  />
                </div>
                <div class="col-md-6">
                  <label class="form-label" for="status">Estado</label>
                  <select id="status" v-model="form.status" class="form-select">
                    <option value="active">Activa</option>
                    <option value="inactive">Inactiva</option>
                  </select>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-outline-secondary" @click="closeModal">Cancelar</button>
                <button type="submit" class="btn btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div class="modal-backdrop fade show"></div>
    </div>
  </Teleport>
</template>
