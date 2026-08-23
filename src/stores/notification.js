import { defineStore } from "pinia";
import { ref } from "vue";

export const useNotificationStore = defineStore("notification", () => {
  const notifications = ref([]);

  /**
   * Menambahkan notifikasi baru
   * @param {Object} toast
   * @param {string} toast.message - Pesan yang akan ditampilkan
   * @param {'success' | 'error' | 'info' | 'warning'} [toast.type='success'] - Tipe notifikasi
   * @param {number} [toast.timeout=4000] - Durasi tampil (ms)
   */
  function notify({ message, type = "success", timeout = 4000 }) {
    const id = Date.now() + Math.random();

    notifications.value.push({ id, message, type });

    if (timeout > 0) {
      setTimeout(() => {
        remove(id);
      }, timeout);
    }
  }

  function remove(id) {
    notifications.value = notifications.value.filter((n) => n.id !== id);
  }

  return { notifications, notify, remove };
});
