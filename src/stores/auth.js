// ledger-web/src/stores/auth.js
import { defineStore } from "pinia";
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "@/lib/axios";
import { useNotificationStore } from "@/stores/notification";

export const useAuthStore = defineStore("auth", () => {
  const router = useRouter();
  const user = ref(null);
  // Deklarasikan variabel token sebagai ref
  const token = ref(localStorage.getItem("token") || "");
  const isAuthenticated = ref(!!localStorage.getItem("token"));
  const notifyStore = useNotificationStore();

  async function fetchUser() {
    // Gunakan token.value untuk membaca nilai ref
    if (!token.value) {
      isAuthenticated.value = false;
      user.value = null;
      return false;
    }

    try {
      const response = await api.get("/api/user");
      user.value = response.data;
      isAuthenticated.value = true;
      return true;
    } catch {
      logoutLocal();
      return false;
    }
  }

  async function login(credentials) {
    const response = await api.post("/api/login", credentials);
    const authToken = response.data.data.token;

    token.value = authToken;
    localStorage.setItem("token", authToken);
    isAuthenticated.value = true;

    await fetchUser();

    notifyStore.notify({
      message: "Berhasil masuk ke akun Anda.",
      type: "success",
    });

    return response.data;
  }

  async function register(payload) {
    const response = await api.post("/api/register", payload);
    const authToken = response.data.data.token;

    // token.value = authToken;
    // localStorage.setItem("token", authToken);
    // isAuthenticated.value = true;

    // await fetchUser();

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
    } finally {
      logoutLocal();
      notifyStore.notify({
        message: "Anda telah keluar dari aplikasi.",
        type: "info",
      });

      router.push("/login");
    }
  }

  function logoutLocal() {
    localStorage.removeItem("token");
    token.value = "";
    user.value = null;
    isAuthenticated.value = false;
  }
  // ledger-web/src/stores/auth.js

  async function updateProfile(formData) {
    const response = await api.post("/api/user/profile", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

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
  };
});
