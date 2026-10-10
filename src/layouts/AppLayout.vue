<script setup>
import Sidebar from "@/components/Sidebar.vue";
</script>
<template>
  <div class="app-frame">
    <a href="#main-content" class="skip-link">Langsung ke konten</a>
    <Sidebar />
    <main id="main-content" class="app-content" tabindex="-1">
      <div class="app-content-inner">
        <router-view v-slot="{ Component, route }">
          <transition name="content-page" mode="out-in">
            <component :is="Component" :key="route.path" />
          </transition>
        </router-view>
      </div>
    </main>
  </div>
</template>
