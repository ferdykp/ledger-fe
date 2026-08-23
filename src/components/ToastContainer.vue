<script setup>
import { useNotificationStore } from "../stores/notification";

const notificationStore = useNotificationStore();
</script>

<template>
  <div
    class="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full px-4 pointer-events-none"
  >
    <TransitionGroup name="toast" tag="div" class="flex flex-col gap-2 w-full">
      <div
        v-for="toast in notificationStore.notifications"
        :key="toast.id"
        class="pointer-events-auto p-4 rounded-md shadow-float border flex items-start justify-between gap-3 text-xs md:text-sm transition-all duration-200"
        :class="{
          'bg-income-100 border-income-600/30 text-income-600':
            toast.type === 'success',
          'bg-expense-100 border-expense-600/30 text-expense-600':
            toast.type === 'error',
          'bg-amber-100 border-amber-600/30 text-amber-600':
            toast.type === 'warning',
          'bg-indigo-100 border-indigo-600/30 text-indigo-600':
            toast.type === 'info',
        }"
      >
        <div class="flex items-center gap-2">
          <!-- Icon Success -->
          <span v-if="toast.type === 'success'" class="font-bold text-base"
            >✓</span
          >
          <!-- Icon Error -->
          <span v-else-if="toast.type === 'error'" class="font-bold text-base"
            >✕</span
          >
          <!-- Icon Warning -->
          <span v-else-if="toast.type === 'warning'" class="font-bold text-base"
            >⚠</span
          >
          <!-- Icon Info -->
          <span v-else class="font-bold text-base">ℹ</span>

          <span>{{ toast.message }}</span>
        </div>

        <button
          @click="notificationStore.remove(toast.id)"
          class="font-semibold opacity-60 hover:opacity-100 transition-opacity ml-2"
        >
          ✕
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}
.toast-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}
.toast-enter-active,
.toast-leave-active {
  transition: all 220ms cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
