<!-- ledger-web/src/App.vue -->
<script setup>
import { ref, onMounted } from "vue";
import { useAuthStore } from "./stores/auth";
import ToastContainer from "./components/ToastContainer.vue";
import { Download, X } from "lucide-vue-next";

const authStore = useAuthStore();
const deferredPrompt = ref(null);
const showInstallBanner = ref(false);

onMounted(() => {
  // 1. Set Inisialisasi Tema
  const savedTheme = localStorage.getItem("theme") || "light";
  if (savedTheme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }

  // 2. Fetch User Data
  authStore.fetchUser();

  // 3. Tangkap Event Prompt PWA
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt.value = e;
    showInstallBanner.value = true;
  });
});

async function installPWA() {
  if (!deferredPrompt.value) return;
  deferredPrompt.value.prompt();
  const { outcome } = await deferredPrompt.value.userChoice;
  if (outcome === "accepted") {
    console.log("Pengguna menginstal Ledger PWA");
  }
  deferredPrompt.value = null;
  showInstallBanner.value = false;
}
</script>

<template>
  <div
    class="min-h-screen bg-paper-50 text-ink-900 font-body antialiased relative"
  >
    <!-- Floating Banner Prompt PWA (Tampil saat PWA Siap Diinstal) -->
    <div
      v-if="showInstallBanner"
      class="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto bg-violet-600 text-paper-0 p-4 rounded-2xl shadow-violet flex items-center justify-between gap-3 animate-in fade-in zoom-in-95 duration-200"
    >
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-xl bg-violet-500/80 flex items-center justify-center shrink-0"
        >
          <Download class="w-5 h-5 text-paper-0" />
        </div>
        <div>
          <h4 class="font-display font-bold text-xs sm:text-sm">
            Instal Aplikasi Ledger
          </h4>
          <p class="text-[11px] text-violet-100 font-medium">
            Pasang di layar utama HP untuk akses cepat!
          </p>
        </div>
      </div>

      <div class="flex items-center gap-1.5 shrink-0">
        <button
          @click="installPWA"
          class="px-3.5 py-2 bg-paper-0 text-violet-600 font-bold text-xs rounded-xl shadow-soft btn-bounce cursor-pointer"
        >
          Instal
        </button>
        <button
          @click="showInstallBanner = false"
          class="p-1.5 text-violet-200 hover:text-paper-0 rounded-lg cursor-pointer"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </div>

    <router-view />
    <!-- Floating Toast Notifikasi -->
    <ToastContainer />
  </div>
</template>
