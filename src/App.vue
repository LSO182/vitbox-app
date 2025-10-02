<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterView } from 'vue-router'
import AppHeader from './components/layout/AppHeader.vue'
import AppFooter from './components/layout/AppFooter.vue'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const showInstallBanner = ref(false)
const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null)

const installApp = async () => {
  if (!deferredPrompt.value) {
    return
  }

  const promptEvent = deferredPrompt.value
  deferredPrompt.value = null
  showInstallBanner.value = false
  await promptEvent.prompt()
  await promptEvent.userChoice
}

const dismissBanner = () => {
  showInstallBanner.value = false
}

const beforeInstallPromptHandler = (event: Event) => {
  event.preventDefault()
  deferredPrompt.value = event as BeforeInstallPromptEvent
  showInstallBanner.value = true
}

const appInstalledHandler = () => {
  deferredPrompt.value = null
  showInstallBanner.value = false
}

onMounted(() => {
  window.addEventListener('beforeinstallprompt', beforeInstallPromptHandler)
  window.addEventListener('appinstalled', appInstalledHandler)
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
          <p class="mb-0 small text-muted">Sumala a tu pantalla para acceder más rápido.</p>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-outline-secondary btn-sm" type="button" @click="dismissBanner">No, gracias</button>
          <button class="btn btn-primary btn-sm" type="button" @click="installApp">Instalar</button>
        </div>
      </div>
    </transition>
  </div>
</template>
