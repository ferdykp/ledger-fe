<!-- ledger-web/src/App.vue -->
<script setup>
import { onMounted } from "vue";
import { useAuthStore } from "./stores/auth";
import ToastContainer from "./components/ToastContainer.vue";
import PwaInstallPrompt from "./components/PwaInstallPrompt.vue"; // <--- IMPORT DISINI

const authStore = useAuthStore();

onMounted(() => {
  const savedTheme = localStorage.getItem("theme") || "light";
  if (savedTheme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
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

    <!-- Prompt Banner Install PWA -->
    <PwaInstallPrompt />
  </div>
</template>
