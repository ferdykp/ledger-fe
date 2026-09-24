<script setup>
import { onMounted } from "vue";
import { useAuthStore } from "./stores/auth";
import ToastContainer from "./components/ToastContainer.vue";
import PwaInstallPrompt from "./components/PwaInstallPrompt.vue";
const authStore = useAuthStore();
onMounted(() => {
  const savedTheme = localStorage.getItem("theme") || "light";
  document.documentElement.classList.toggle("dark", savedTheme === "dark");
  authStore.fetchUser();
});
</script>
<template>
  <div class="app-root">
    <router-view v-slot="{ Component, route }">
      <transition name="page" mode="out-in">
        <component :is="Component" :key="route.path" />
      </transition>
    </router-view>
    <ToastContainer />
    <PwaInstallPrompt />
  </div>
</template>
