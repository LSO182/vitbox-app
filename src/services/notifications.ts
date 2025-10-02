import { arrayUnion, doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { getToken, onMessage } from 'firebase/messaging'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { auth, db, isFirebaseConfigured, messagingPromise } from '../firebase/firebase'

type NotifyPayload = {
  classId: string
  classTitle: string
}

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string

export async function saveDeviceMessagingToken() {
  if (!isFirebaseConfigured || !auth || !db) {
    console.warn('Firebase no está configurado. Se omite el guardado de tokens de notificación.')
    return
  }

  const currentUser = auth.currentUser
  if (!currentUser) {
    return
  }

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return
  }

  let permission = Notification.permission
  if (permission === 'default') {
    permission = await Notification.requestPermission()
  }

  if (permission !== 'granted') {
    console.info('El usuario no habilitó las notificaciones push')
    return
  }

  const messaging = await messagingPromise
  if (!messaging) {
    console.warn('Firebase Messaging no está disponible en este navegador')
    return
  }

  if (!vapidKey) {
    console.warn('VITE_FIREBASE_VAPID_KEY no está configurada; se omitirá el registro de notificaciones.')
    return
  }

  const token = await getToken(messaging, { vapidKey })
  if (!token) {
    return
  }

  const userRef = doc(db, 'users', currentUser.uid)
  await updateDoc(userRef, {
    pushTokens: arrayUnion(token),
    updatedAt: serverTimestamp(),
  })
}

export async function notifySlotAvailable(classId: string, classTitle: string) {
  if (!isFirebaseConfigured) {
    console.warn('Firebase no está configurado. Se omite la notificación de cupos disponibles.')
    return
  }

  try {
    const functions = getFunctions()
    const callable = httpsCallable<NotifyPayload, void>(functions, 'notifySlotAvailable')
    await callable({ classId, classTitle })
  } catch (error) {
    console.warn('No se pudo invocar la función de notificaciones. Configure Firebase Functions.', error)
  }
}

export async function listenForForegroundMessages(callback: (payload: unknown) => void) {
  const messaging = await messagingPromise
  if (!messaging) {
    return
  }

  return onMessage(messaging, callback)
}
