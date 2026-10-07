// ledger-web/src/lib/axios.js
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000",
  timeout: 20000,
  withCredentials: false,
  headers: {
    "X-Requested-With": "XMLHttpRequest",
    Accept: "application/json",
  },
});

// Otomatis menempelkan Bearer Token dari localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  config.ledgerToken = token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Tangani token expired / unauthorized
api.interceptors.response.use(
  (response) => {
    if (response.config.ledgerToken !== localStorage.getItem("token")) {
      return Promise.reject(new axios.CanceledError("Session changed"));
    }
    return response;
  },
  (error) => {
    const activeSession =
      error.config?.ledgerToken === localStorage.getItem("token");
    if (
      error.response?.status === 401 &&
      activeSession &&
      error.config?.ledgerToken
    ) {
      window.dispatchEvent(new Event("ledger:unauthorized"));
    } else if (
      error.config?.method === "get" &&
      activeSession &&
      !axios.isCancel(error)
    ) {
      window.dispatchEvent(
        new CustomEvent("ledger:request-error", {
          detail: "Data belum dapat dimuat. Periksa koneksi lalu coba lagi.",
        }),
      );
    }
    return Promise.reject(error);
  },
);

export default api;
