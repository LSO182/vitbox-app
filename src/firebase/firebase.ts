import type { FirebaseApp } from 'firebase/app'
import { getApp, getApps, initializeApp } from 'firebase/app'
import type { Auth } from 'firebase/auth'
import { getAuth } from 'firebase/auth'
import type { Firestore } from 'firebase/firestore'
import { getFirestore } from 'firebase/firestore'
import { getMessaging, isSupported, type Messaging } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
  measurementId: (import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string | undefined) || undefined,
}

const requiredKeys: Array<keyof typeof firebaseConfig> = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
]

const missingConfigKeys = requiredKeys.filter((key) => !firebaseConfig[key])
let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null
let messaging: Messaging | null = null

let messagingPromise: Promise<Messaging | null> = Promise.resolve(null)

let firebaseInitialized = false

if (missingConfigKeys.length > 0) {
  console.warn(
    'Firebase configuration is incomplete. Missing keys: ' + missingConfigKeys.join(', ') +
      '. Se omite la inicialización.'
  )
} else {
  try {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig)
    auth = getAuth(app)
    db = getFirestore(app)

    messagingPromise = isSupported()
      .then((supported) => (supported ? getMessaging(app!) : null))
      .then((instance) => {
        messaging = instance
        return messaging
      })
      .catch((error) => {
        console.warn('Firebase Messaging is not supported in this environment', error)
        return null
      })

    firebaseInitialized = true
  } catch (error) {
    console.error('No se pudo inicializar Firebase con la configuración actual.', error)
  }
}

export const isFirebaseConfigured = firebaseInitialized

export { app, auth, db, messagingPromise }
export type { Messaging }
