<template>
  <div class="text-center py-5">
    <h1 class="display-5 fw-semibold mb-3">404</h1>
    <p class="text-muted mb-4">La página que buscás no existe. Es posible que haya sido movida.</p>
    <router-link class="btn btn-primary btn-rounded" :to="{ name: 'classes' }">
      Volver al inicio
    </router-link>
  </div>
</template>
