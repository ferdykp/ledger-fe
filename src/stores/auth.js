// ledger-web/src/stores/auth.js
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import router from "@/router";
import api from "@/lib/axios";
import { useNotificationStore } from "@/stores/notification";

export const useAuthStore = defineStore("auth", () => {
  const user = ref(null);
  // Deklarasikan variabel token sebagai ref
  const token = ref(localStorage.getItem("token") || "");
  const isAuthenticated = computed(() => Boolean(token.value));
  const notifyStore = useNotificationStore();

  async function fetchUser() {
    // Gunakan token.value untuk membaca nilai ref
    if (!token.value) {
      user.value = null;
      return false;
    }

    try {
      const response = await api.get("/api/user");
      user.value = response.data;

      return true;
    } catch (error) {
      if (error.response?.status === 401) logoutLocal();
      return false;
    }
  }

  async function login(credentials) {
    const response = await api.post("/api/login", credentials);
    const authToken = response.data.data.token;

    token.value = authToken;
    localStorage.setItem("token", authToken);

    user.value = response.data.data.user;

    notifyStore.notify({
      message: "Berhasil masuk ke akun Anda.",
      type: "success",
    });

    return response.data;
  }

  async function register(payload) {
    const response = await api.post("/api/register", payload);

    notifyStore.notify({
      message: "Registrasi berhasil! Silahkan Login.",
      type: "success",
    });

    return response.data;
  }

  async function logout() {
    try {
      if (token.value) {
        await api.post("/api/logout");
      }
    } catch {
      // Always finish local logout even if the network is unavailable.
    } finally {
      logoutLocal();
      notifyStore.notify({
        message: "Anda telah keluar dari aplikasi.",
        type: "info",
      });

      await router.replace("/login");
    }
  }

  function logoutLocal() {
    window.dispatchEvent(new Event("ledger:session-cleared"));
    localStorage.removeItem("token");
    token.value = "";
    user.value = null;
  }
  // ledger-web/src/stores/auth.js

  async function updateProfile(formData) {
    const response = await api.post("/api/user/profile", formData);

    user.value = response.data.data || response.data;
    return user.value;
  }

  // Jangan lupa return updateProfile di bagian bawah store:
  return {
    user,
    token,
    isAuthenticated,
    fetchUser,
    login,
    register,
    updateProfile,
    logout,
    logoutLocal,
  };
});
