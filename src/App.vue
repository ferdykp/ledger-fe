<script setup>
import { onMounted } from "vue";
import { useAuthStore } from "./stores/auth";
import ToastContainer from "./components/ToastContainer.vue";

const authStore = useAuthStore();

onMounted(() => {
  authStore.fetchUser();
});
</script>

<template>
  <div
    class="min-h-screen bg-paper-50 text-ink-900 font-body antialiased relative"
  >
    <router-view />
    <!-- Floating Toast Notifikasi -->
    <ToastContainer />
  </div>
</template>
