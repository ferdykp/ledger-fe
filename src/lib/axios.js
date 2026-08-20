import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000",
  withCredentials: true,
  headers: {
    "X-Requested-With": "XMLHttpRequest",
    Accept: "application/json",
  },
});

// Helper khusus Laravel Sanctum untuk mengambil cookie CSRF sebelum login/action mutasi
export const getCsrfToken = () => api.get("/sanctum/csrf-cookie");

// Response Interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Nanti dihubungkan dengan authStore (misal: redirect ke /login atau reset state user)
      // const authStore = useAuthStore();
      // authStore.logout();
    }
    return Promise.reject(error);
  },
);

export default api;
