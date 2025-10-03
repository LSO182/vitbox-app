import { defineStore } from 'pinia'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  type Firestore,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../firebase/firebase'
import type { GymClass, GymClassFormInput } from '../types'
import { notifySlotAvailable } from '../services/notifications'

interface ClassesState {
  classes: GymClass[]
  loading: boolean
  error: string | null
  unsubscribe: (() => void) | null
}

const COLLECTION_NAME = 'classes'
type MembershipTier = 'bronze' | 'silver' | 'gold'

const MEMBERSHIP_LIMITS: Record<MembershipTier, number> = {
  bronze: 2,
  silver: 3,
  gold: 5,
}

function parseClassDateTime(gymClass: GymClass, time: string | undefined): Date | null {
  if (!gymClass.date || !time) {
    return null
  }

  const dateTimeString = gymClass.date + 'T' + time
  const parsed = new Date(dateTimeString)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }
  return parsed
}

function shouldAutoDeactivateClass(gymClass: GymClass): boolean {
  if (gymClass.status !== 'active') {
    return false
  }

  const startDate = parseClassDateTime(gymClass, gymClass.startTime)
  if (!startDate) {
    return false
  }

  return new Date().getTime() >= startDate.getTime()
}

function getWeekKey(dateString: string | undefined): string | null {
  if (!dateString) {
    return null
  }

  const date = new Date(dateString + 'T00:00:00')
  if (Number.isNaN(date.getTime())) {
    return null
  }

  const day = date.getDay()
  const diffToMonday = (day + 6) % 7
  const monday = new Date(date)
  monday.setDate(date.getDate() - diffToMonday)
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString().slice(0, 10)
}

function getMembershipLimit(membership?: string): number {
  if (!membership) {
    return MEMBERSHIP_LIMITS.bronze
  }

  if (['bronze', 'silver', 'gold'].includes(membership)) {
    return MEMBERSHIP_LIMITS[membership as MembershipTier]
  }

  return MEMBERSHIP_LIMITS.bronze
}

export const useClassesStore = defineStore('classes', {
  state: (): ClassesState => ({
    classes: [],
    loading: false,
    error: null,
    unsubscribe: null,
  }),
  getters: {
    morningClasses(state): GymClass[] {
      return state.classes.filter((gymClass) => {
        const hour = Number.parseInt((gymClass.startTime ?? '00').slice(0, 2), 10)
        return hour < 12
      })
    },
    afternoonClasses(state): GymClass[] {
      return state.classes.filter((gymClass) => {
        const hour = Number.parseInt((gymClass.startTime ?? '00').slice(0, 2), 10)
        return hour >= 12
      })
    },
  },
  actions: {
    async subscribe() {
      if (this.unsubscribe) {
        return
      }
      if (!isFirebaseConfigured || !db) {
        this.error = 'Firebase no está configurado. No se pudieron cargar las clases.'
        return
      }

      this.loading = true

      const firestore = db as Firestore
      const classesRef = collection(firestore, COLLECTION_NAME)
      const classesQuery = query(classesRef, orderBy('dayOfWeek'), orderBy('startTime'))
      this.unsubscribe = onSnapshot(
        classesQuery,
        (snapshot) => {
          const parsedClasses = snapshot.docs.map((docSnapshot) => ({
            id: docSnapshot.id,
            ...(docSnapshot.data() as Omit<GymClass, 'id'>),
          }))
          this.classes = parsedClasses
          this.loading = false
          void this.autoDeactivateExpiredClasses(parsedClasses)
        },
        (error) => {
          this.error = error.message
          this.loading = false
        }
      )
    },
    unsubscribeFromSnapshot() {
      if (this.unsubscribe) {
        this.unsubscribe()
        this.unsubscribe = null
      }
    },
    async createClass(payload: GymClassFormInput) {
      if (!isFirebaseConfigured || !db) {
        throw new Error('Firebase no está configurado. No se puede crear la clase.')
      }

      const firestore = db as Firestore
      const classesRef = collection(firestore, COLLECTION_NAME)
      await addDoc(classesRef, {
        title: payload.title,
        description: payload.description,
        coach: payload.coach,
        dayOfWeek: payload.dayOfWeek,
        date: payload.date ?? '',
        startTime: payload.startTime,
        endTime: payload.endTime,
        capacity: payload.capacity ?? 1,
        enrolledCount: 0,
        enrolledUserIds: [],
        status: payload.status ?? 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    },
    async updateClass(id: string, payload: Partial<GymClassFormInput>) {
      if (!isFirebaseConfigured || !db) {
        throw new Error('Firebase no está configurado. No se puede actualizar la clase.')
      }

      const firestore = db as Firestore
      const classRef = doc(firestore, COLLECTION_NAME, id)
      await updateDoc(classRef, {
        ...payload,
        updatedAt: serverTimestamp(),
      })
    },
    async deleteClass(id: string) {
      if (!isFirebaseConfigured || !db) {
        throw new Error('Firebase no está configurado. No se puede eliminar la clase.')
      }

      const firestore = db as Firestore
      await deleteDoc(doc(firestore, COLLECTION_NAME, id))
    },
    getWeeklyEnrollmentCount(userId: string, weekKey: string | null, excludeClassId?: string) {
      if (!weekKey) {
        return 0
      }

      return this.classes.filter((gymClass) => {
        if (gymClass.id === excludeClassId) {
          return false
        }
        if (!gymClass.date) {
          return false
        }
        const classWeekKey = getWeekKey(gymClass.date)
        return classWeekKey === weekKey && gymClass.enrolledUserIds.includes(userId)
      }).length
    },
    async enrollUser(classId: string, userId: string, membership: string | undefined) {
      if (!isFirebaseConfigured || !db) {
        throw new Error('Firebase no está configurado. No se puede gestionar la inscripción.')
      }

      const membershipLimit = getMembershipLimit(membership)
      const targetClassFromStore = this.classes.find((gymClass) => gymClass.id === classId)
      const targetWeekKey = targetClassFromStore?.date ? getWeekKey(targetClassFromStore.date) : null
      const currentEnrollments = this.getWeeklyEnrollmentCount(userId, targetWeekKey, classId)

      if (targetWeekKey && currentEnrollments >= membershipLimit) {
        throw new Error('Alcanzaste el máximo de reservas para esta semana según tu membresía.')
      }

      const firestore = db as Firestore
      await runTransaction(firestore, async (transaction) => {
        const classRef = doc(firestore, COLLECTION_NAME, classId)
        const snapshot = await transaction.get(classRef)
        if (!snapshot.exists()) {
          throw new Error('La clase no existe o fue eliminada')
        }
        const data = snapshot.data() as GymClass
        if (data.status !== 'active') {
          throw new Error('La clase no está disponible en este momento')
        }
        if (data.enrolledUserIds.includes(userId)) {
          throw new Error('Ya estás inscripto en esta clase')
        }
        if (data.enrolledUserIds.length >= data.capacity) {
          throw new Error('La clase ya alcanzó el cupo máximo')
        }

        const weekKey = getWeekKey(data.date)
        const currentWeeklyCount = this.getWeeklyEnrollmentCount(userId, weekKey, classId)
        if (weekKey && currentWeeklyCount >= membershipLimit) {
          throw new Error('Alcanzaste el máximo de reservas para esta semana según tu membresía.')
        }

        const updatedUserIds = [...data.enrolledUserIds, userId]

        transaction.update(classRef, {
          enrolledUserIds: updatedUserIds,
          enrolledCount: updatedUserIds.length,
          updatedAt: serverTimestamp(),
        })
      })
    },
    async unenrollUser(classId: string, userId: string) {
      if (!isFirebaseConfigured || !db) {
        throw new Error('Firebase no está configurado. No se puede gestionar la baja de la clase.')
      }

      let shouldSendNotification = false
      let classTitle: string | undefined
      const firestore = db as Firestore
      await runTransaction(firestore, async (transaction) => {
        const classRef = doc(firestore, COLLECTION_NAME, classId)
        const snapshot = await transaction.get(classRef)
        if (!snapshot.exists()) {
          throw new Error('La clase no existe o fue eliminada')
        }
        const data = snapshot.data() as GymClass
        classTitle = data.title
        if (!data.enrolledUserIds.includes(userId)) {
          throw new Error('No estás inscripto en esta clase')
        }

        const wasFull = data.enrolledUserIds.length >= data.capacity
        const updatedUserIds = data.enrolledUserIds.filter((id) => id !== userId)
        const hasFreeSlot = updatedUserIds.length < data.capacity

        if (wasFull && hasFreeSlot) {
          shouldSendNotification = true
        }

        transaction.update(classRef, {
          enrolledUserIds: updatedUserIds,
          enrolledCount: updatedUserIds.length,
          updatedAt: serverTimestamp(),
        })
      })

      if (shouldSendNotification && classTitle) {
        await notifySlotAvailable(classId, classTitle)
      }
    },
    async autoDeactivateExpiredClasses(classes: GymClass[]) {
      if (!isFirebaseConfigured || !db) {
        return
      }

      const expiredClasses = classes.filter((gymClass) => shouldAutoDeactivateClass(gymClass))
      if (!expiredClasses.length) {
        return
      }

      const firestore = db as Firestore

      await Promise.all(
        expiredClasses.map(async (gymClass) => {
          try {
            await updateDoc(doc(firestore, COLLECTION_NAME, gymClass.id), {
              status: 'inactive',
              updatedAt: serverTimestamp(),
            })
          } catch (error) {
            console.warn('No se pudo desactivar automáticamente la clase ' + gymClass.id, error)
          }
        })
      )
    },
    isEnrollmentLimitReachedForClass(userId: string, membership: string | undefined, gymClass: GymClass) {
      const membershipLimit = getMembershipLimit(membership)
      const weekKey = getWeekKey(gymClass.date)
      const currentCount = this.getWeeklyEnrollmentCount(userId, weekKey, gymClass.id)
      return Boolean(weekKey) && currentCount >= membershipLimit
    },
  },
})
