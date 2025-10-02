# Vitbox Gym PWA

Aplicación web progresiva para la gestión de turnos y clases del gimnasio Vitbox construida con Vue 3, Vite, TypeScript, Bootstrap 5 y Firebase.

## Funcionalidades clave
- Registro e inicio de sesión con autenticación de Firebase (email y contraseña).
- Perfil de usuario con edición de datos personales y listado de reservas activas.
- Catálogo de clases separado entre mañana y tarde con capacidad máxima de 20 alumnos.
- Reservas y cancelaciones en tiempo real con sincronización vía Firestore.
- Panel administrativo para crear, editar, pausar o eliminar clases y para gestionar roles o estado de usuarios.
- Integración con Firebase Cloud Messaging para notificaciones push cuando se libera un cupo.
- Configuración PWA lista para instalar en dispositivos móviles gracias a vite-plugin-pwa, manifest y service worker dedicados.

## Requisitos previos
- Node.js 18 o superior.
- Cuenta de Firebase con un proyecto configurado.

## Configuración rápida
1. Copiá el archivo de variables de entorno y completalo con las llaves de tu proyecto:
       cp .env.example .env.local
   Completa en .env.local los valores de Firebase (Configuración del proyecto → Tus apps → SDK de configuración):
       VITE_FIREBASE_API_KEY=
       VITE_FIREBASE_AUTH_DOMAIN=
       VITE_FIREBASE_PROJECT_ID=
       VITE_FIREBASE_STORAGE_BUCKET=
       VITE_FIREBASE_MESSAGING_SENDER_ID=
       VITE_FIREBASE_APP_ID=
       VITE_FIREBASE_MEASUREMENT_ID=
       VITE_FIREBASE_VAPID_KEY=

2. Actualizá los valores del service worker de mensajería:
   - Copiá public/firebase-config.example.js a public/firebase-config.js y reemplazá los placeholders por los mismos valores.
   - El campo VITE_FIREBASE_VAPID_KEY debe contener la clave pública Web Push que entrega Firebase Cloud Messaging.

3. Instalá dependencias y levantá el entorno local:
       npm install
       npm run dev

4. Construí la versión de producción cuando lo necesites:
       npm run build
       npm run preview

## Configuración de Firebase
Asegurate de habilitar los siguientes servicios:
- Authentication con método Email/Password.
- Firestore en modo producción.
- Cloud Messaging para generar la clave VAPID pública.
- (Opcional) Cloud Functions para envío de notificaciones push.

### Reglas sugeridas de Firestore (ajusta según tu modelo de seguridad)
    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        match /users/{userId} {
          allow read: if request.auth != null && request.auth.uid == userId;
          allow write: if request.auth != null && request.auth.uid == userId;
        }

        match /classes/{classId} {
          allow read: if request.auth != null;
          allow write: if request.auth != null && request.auth.token.admin == true;
        }
      }
    }

Los usuarios administradores pueden recibir un claim personalizado admin: true mediante Cloud Functions o directamente desde la consola. Otra alternativa es validar el rol dentro de una función callable que verifique el documento users/{uid}.

### Notificaciones push cuando se libera un cupo
El front-end llama a notifySlotAvailable después de que un alumno cancela su reserva. Para completar el flujo se recomienda crear una función callable en Firebase Functions, por ejemplo:
    import * as functions from 'firebase-functions/v2/https';
    import * as admin from 'firebase-admin';

    admin.initializeApp();

    export const notifySlotAvailable = functions.onCall(async (request) => {
      const { classId, classTitle } = request.data as { classId: string; classTitle: string };
      if (!request.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Solo admins pueden enviar notificaciones');
      }

      const snapshot = await admin.firestore().collection('users').get();
      const tokens: string[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (Array.isArray(data.pushTokens)) {
          tokens.push(...data.pushTokens);
        }
      });

      if (!tokens.length) {
        return { delivered: 0 };
      }

      await admin.messaging().sendMulticast({
        tokens,
        notification: {
          title: 'Hay cupo disponible',
          body: 'Se liberó una vacante en ' + classTitle + '. Reservala ahora mismo.',
        },
        data: {
          classId,
        },
      });

      return { delivered: tokens.length };
    });

Adaptá el filtro para enviar la notificación únicamente a los usuarios interesados (por ejemplo, almacenando una bandera notifyOnWaitlist por clase o usuario).

## Estructura principal
    src/
      components/
        ClassCard.vue
        ClassFormModal.vue
        layout/
          AppHeader.vue
          AppFooter.vue
      firebase/
        firebase.ts
      services/
        notifications.ts
      store/
        auth.ts
        classes.ts
      views/
        AdminDashboardView.vue
        ClassScheduleView.vue
        LoginView.vue
        ProfileView.vue
        RegisterView.vue
        NotFoundView.vue
      router/
        index.ts

## Próximos pasos sugeridos
- Implementar reglas de seguridad avanzadas por rol usando claims personalizados.
- Añadir un flujo de lista de espera cuando el cupo esté completo.
- Crear paneles de analítica (ocupación, asistencia histórica, etc.).
- Optimizar los assets de Bootstrap Icons o aplicar carga diferida para reducir el bundle inicial.

## Scripts disponibles
- npm run dev – Arranca el servidor de desarrollo con recarga en caliente.
- npm run build – Genera el bundle de producción y el service worker.
- npm run preview – Sirve la build para validación antes de desplegar.

## Compatibilidad PWA
El proyecto incluye manifest, service worker y registro automático. Para probar la instalación:
1. Ejecutá npm run build y luego npm run preview.
2. Abrí la URL desde un dispositivo móvil o usá Lighthouse en Chrome DevTools.
3. Serví la aplicación detrás de HTTPS (Firebase Hosting, Vercel, Netlify, etc.) para que las notificaciones push funcionen.

---
Desarrollado por Codex para el equipo de Vitbox.
