<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterView } from 'vue-router'
import AppHeader from './components/layout/AppHeader.vue'
import AppFooter from './components/layout/AppFooter.vue'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const installBannerMode = ref<'prompt' | 'ios' | null>(null)
const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null)

const installApp = async () => {
  if (installBannerMode.value !== 'prompt' || !deferredPrompt.value) {
    return
  }

  const promptEvent = deferredPrompt.value
  deferredPrompt.value = null
  installBannerMode.value = null
  await promptEvent.prompt()
  await promptEvent.userChoice
}

const dismissBanner = () => {
  installBannerMode.value = null
}

const beforeInstallPromptHandler = (event: Event) => {
  event.preventDefault()
  deferredPrompt.value = event as BeforeInstallPromptEvent
  installBannerMode.value = 'prompt'
}

const appInstalledHandler = () => {
  deferredPrompt.value = null
  installBannerMode.value = null
}

const checkIosInstallPrompt = () => {
  const userAgent = window.navigator.userAgent.toLowerCase()
  const isIosDevice = /iphone|ipad|ipod/.test(userAgent)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true

  if (isIosDevice && !isStandalone && !installBannerMode.value) {
    installBannerMode.value = 'ios'
  }
}

const showInstallBanner = computed(() => installBannerMode.value !== null)

onMounted(() => {
  window.addEventListener('beforeinstallprompt', beforeInstallPromptHandler)
  window.addEventListener('appinstalled', appInstalledHandler)
  checkIosInstallPrompt()
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeinstallprompt', beforeInstallPromptHandler)
  window.removeEventListener('appinstalled', appInstalledHandler)
})
</script>

<template>
  <div class="d-flex flex-column min-vh-100">
    <AppHeader />
    <main class="flex-grow-1 py-4 bg-black">
      <div class="container">
        <RouterView />
      </div>
    </main>
    <AppFooter />
    <transition name="fade-slide">
      <div v-if="showInstallBanner" class="pwa-banner shadow">
        <div>
          <h6 class="mb-1">Instalá Vitbox</h6>
          <p v-if="installBannerMode === 'prompt'" class="mb-0 small text-muted">Sumala a tu pantalla para acceder más rápido.</p>
          <div v-else class="mb-0 small text-muted">
            <p class="mb-1">En iPhone seguí estos pasos:</p>
            <ol class="ps-3 mb-0">
              <li>Abrí el menú compartir (icono de cuadrado con flecha).</li>
              <li>Elegí <strong>Añadir a pantalla de inicio</strong>.</li>
              <li>Confirmá con <strong>Añadir</strong>.</li>
            </ol>
          </div>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-outline-primary btn-sm" type="button" @click="dismissBanner">
            {{ installBannerMode === 'prompt' ? 'No, gracias' : 'Entendido' }}
          </button>
          <button
            v-if="installBannerMode === 'prompt'"
            class="btn btn-primary btn-sm"
            type="button"
            @click="installApp"
          >
            Instalar
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>
