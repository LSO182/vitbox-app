importScripts('https://www.gstatic.com/firebasejs/12.3.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/12.3.0/firebase-messaging-compat.js')
importScripts('/firebase-config.js')

if (self.firebaseConfig && self.firebaseConfig.apiKey) {
  firebase.initializeApp(self.firebaseConfig)
  const messaging = firebase.messaging()

  messaging.onBackgroundMessage((payload) => {
    const notificationTitle = payload.notification && payload.notification.title ? payload.notification.title : 'Vitbox'
    const notificationOptions = {
      body: payload.notification && payload.notification.body ? payload.notification.body : 'Hay novedades en tus clases.',
      icon: '/vite.svg',
      data: payload.data,
    }

    self.registration.showNotification(notificationTitle, notificationOptions)
  })
} else {
  console.warn('Firebase config missing in firebase-config.js. Push notifications will be disabled.')
}
