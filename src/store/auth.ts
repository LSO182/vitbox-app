import { defineStore } from 'pinia'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type Auth,
  type User,
} from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { auth, db, isFirebaseConfigured } from '../firebase/firebase'
import type { UserProfile } from '../types'
import { saveDeviceMessagingToken } from '../services/notifications'

interface RegisterPayload {
  email: string
  password: string
  phone: string
  firstName: string
  lastName: string
  nickname: string
  birthDate: string
}

interface AuthState {
  currentUser: User | null
  profile: UserProfile | null
  loading: boolean
  initialized: boolean
  error: string | null
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    currentUser: null,
    profile: null,
    loading: false,
    initialized: false,
    error: null,
  }),
  actions: {
    async initializeAuth() {
      if (this.initialized) {
        return
      }

      this.loading = true

      if (!isFirebaseConfigured || !auth || !db) {
        console.error('Firebase no está configurado. No se pudo inicializar la autenticación.')
        this.error = 'Firebase no está configurado. Revisá las variables de entorno.'
        this.currentUser = null
        this.profile = null
        this.initialized = true
        this.loading = false
        return
      }

      const firebaseAuth = auth as Auth

      await new Promise<void>((resolve) => {
        onAuthStateChanged(firebaseAuth, async (user) => {
          this.currentUser = user

          if (user) {
            await this.fetchUserProfile(user.uid)
            await saveDeviceMessagingToken()
          } else {
            this.profile = null
          }

          this.initialized = true
          this.loading = false
          resolve()
        })
      })
    },
    async fetchUserProfile(uid: string) {
      if (!isFirebaseConfigured || !db) {
        throw new Error('Firebase no está configurado. No se pudo obtener el perfil.')
      }

      const firestore = db
      const userRef = doc(firestore, 'users', uid)
      const snapshot = await getDoc(userRef)

      if (snapshot.exists()) {
        const data = snapshot.data() as UserProfile
        this.profile = {
          membership: 'bronze',
          ...data,
        }
      } else if (this.currentUser?.email) {
        const fallbackProfile: UserProfile = {
          uid,
          email: this.currentUser.email,
          phone: '',
          firstName: this.currentUser.displayName ?? '',
          lastName: '',
          nickname: this.currentUser.displayName ?? '',
          birthDate: '',
          role: 'user',
          membership: 'bronze',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        await setDoc(userRef, fallbackProfile)
        this.profile = fallbackProfile
      }
    },
    async register(payload: RegisterPayload) {
      this.loading = true
      this.error = null
      try {
        if (!isFirebaseConfigured || !auth || !db) {
          throw new Error('Firebase no está configurado. No se pudo registrar el usuario.')
        }

        const { email, password, ...profileData } = payload
        const firebaseAuth = auth as Auth
        const firestore = db

        const credentials = await createUserWithEmailAndPassword(firebaseAuth, email, password)
        await updateProfile(credentials.user, {
          displayName: profileData.nickname,
        })

        const userProfile: UserProfile = {
          uid: credentials.user.uid,
          email,
          phone: profileData.phone,
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          nickname: profileData.nickname,
          birthDate: profileData.birthDate,
          role: 'user',
          membership: 'bronze',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }

        await setDoc(doc(firestore, 'users', credentials.user.uid), {
          ...userProfile,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })

        this.currentUser = credentials.user
        this.profile = userProfile

        await saveDeviceMessagingToken()
        return credentials.user
      } catch (error) {
        this.error = (error as Error).message
        throw error
      } finally {
        this.loading = false
      }
    },
    async login(email: string, password: string) {
      this.loading = true
      this.error = null
      try {
        if (!isFirebaseConfigured || !auth || !db) {
          throw new Error('Firebase no está configurado. No se pudo iniciar sesión.')
        }

        const firebaseAuth = auth as Auth
        const credentials = await signInWithEmailAndPassword(firebaseAuth, email, password)
        this.currentUser = credentials.user
        await this.fetchUserProfile(credentials.user.uid)
        await saveDeviceMessagingToken()
        return credentials.user
      } catch (error) {
        this.error = (error as Error).message
        throw error
      } finally {
        this.loading = false
      }
    },
    async logout() {
      if (!isFirebaseConfigured || !auth) {
        throw new Error('Firebase no está configurado. No se pudo cerrar la sesión.')
      }

      const firebaseAuth = auth as Auth
      await signOut(firebaseAuth)
      this.currentUser = null
      this.profile = null
    },
    async updateProfileDetails(patch: Partial<UserProfile>) {
      if (!this.currentUser) {
        throw new Error('No se encontró un usuario autenticado')
      }

      if (!isFirebaseConfigured || !db) {
        throw new Error('Firebase no está configurado. No se pudo actualizar el perfil.')
      }

      const firestore = db
      const userRef = doc(firestore, 'users', this.currentUser.uid)
      await updateDoc(userRef, {
        ...patch,
        updatedAt: serverTimestamp(),
      })
      await this.fetchUserProfile(this.currentUser.uid)
    },
  },
})
