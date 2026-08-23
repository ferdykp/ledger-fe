<!-- ledger-web/src/layouts/AppLayout.vue -->
<script setup>
import Sidebar from "@/components/Sidebar.vue";
import PwaInstallPrompt from "@/components/PwaInstallPrompt.vue";
</script>

<template>
  <div
    class="min-h-screen bg-base-50 text-ink-900 font-body flex flex-col lg:flex-row"
  >
    <Sidebar />

    <!-- Konten Utama Responsive -->
    <main class="flex-1 p-4 md:p-8 pb-24 lg:pb-8 max-w-7xl mx-auto w-full">
      <router-view />
    </main>

    <!-- Modal Prompt Install PWA -->
    <PwaInstallPrompt />
  </div>
</template>
