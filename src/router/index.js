// ledger-web/src/router/index.js
import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";

import AppLayout from "@/layouts/AppLayout.vue";
import Login from "@/views/Login.vue";
import Register from "@/views/Register.vue";
import Dashboard from "@/views/Dashboard.vue"; // Import langsung Dashboard

const Placeholder = (title) => ({
  template: `<div class="p-6 bg-paper-0 border border-line-200 rounded-md">
    <h1 class="font-display text-2xl font-medium text-ink-900 mb-2">${title}</h1>
    <p class="text-sm text-ink-600">Halaman ini sedang dalam tahap pengembangan.</p>
  </div>`,
});

const routes = [
  {
    path: "/login",
    name: "login",
    component: Login,
    meta: { requiresGuest: true },
  },
  {
    path: "/register",
    name: "register",
    component: Register,
    meta: { requiresGuest: true },
  },
  {
    path: "/",
    component: AppLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: "",
        redirect: "/dashboard",
      },
      {
        path: "dashboard",
        name: "dashboard",
        component: Dashboard, // Gunakan komponen yang diimpor langsung
      },
      {
        path: "accounts",
        name: "accounts",
        component: Placeholder("Akun & Dompet"),
      },
      {
        path: "transactions",
        name: "transactions",
        component: Placeholder("Transaksi"),
      },
      {
        path: "budgets",
        name: "budgets",
        component: Placeholder("Budgeting"),
      },
      {
        path: "reports",
        name: "reports",
        component: Placeholder("Laporan Finansial"),
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to) => {
  const authStore = useAuthStore();

  if (authStore.token && !authStore.user) {
    await authStore.fetchUser();
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return "/login";
  }

  if (to.meta.requiresGuest && authStore.isAuthenticated) {
    return "/dashboard";
  }
});

export default router;
