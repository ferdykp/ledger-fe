<!-- ledger-web/src/components/PwaInstallPrompt.vue -->
<script setup>
import { ref, onMounted } from "vue";
import { Download, X } from "lucide-vue-next";

const deferredPrompt = ref(null);
const showPrompt = ref(false);

onMounted(() => {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt.value = e;
    showPrompt.value = true;
  });
});

async function installPwa() {
  if (!deferredPrompt.value) return;
  deferredPrompt.value.prompt();
  const { outcome } = await deferredPrompt.value.userChoice;
  if (outcome === "accepted") {
    showPrompt.value = false;
  }
  deferredPrompt.value = null;
}

function dismiss() {
  showPrompt.value = false;
}
</script>

<template>
  <div
    v-if="showPrompt"
    class="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:bottom-6 z-50 max-w-sm bg-ink-900 text-paper-0 p-4 rounded-md shadow-violet border border-line-200/20 flex items-center justify-between gap-3 animate-bounce-in"
  >
    <div class="flex items-center gap-3">
      <div
        class="w-9 h-9 rounded-md bg-violet-600 text-paper-0 flex items-center justify-center font-bold shrink-0"
      >
        L
      </div>
      <div>
        <p class="text-xs font-bold">Install Aplikasi Ledger</p>
        <p class="text-[11px] text-ink-300">
          Akses cepat dari Home Screen HP kamu.
        </p>
      </div>
    </div>

    <div class="flex items-center gap-1 shrink-0">
      <button
        @click="installPwa"
        class="px-3 py-1.5 bg-violet-600 hover:bg-violet-600/90 text-paper-0 font-semibold text-xs rounded-sm transition-colors flex items-center gap-1"
      >
        <Download class="w-3.5 h-3.5" />
        <span>Install</span>
      </button>
      <button @click="dismiss" class="p-1 text-ink-300 hover:text-paper-0">
        <X class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>
