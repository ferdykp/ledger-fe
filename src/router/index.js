// ledger-web/src/router/index.js
import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const AppLayout = () => import("@/layouts/AppLayout.vue");
const Login = () => import("@/views/Login.vue");
const Register = () => import("@/views/Register.vue");
const ForgotPassword = () => import("@/views/ForgotPassword.vue");
const ResetPassword = () => import("@/views/ResetPassword.vue");
const Dashboard = () => import("@/views/Dashboard.vue");
const TransactionCreate = () => import("@/views/TransactionCreate.vue");
const AccountCreate = () => import("../views/AccountCreate.vue");
const Account = () => import("../views/Account.vue");
const Category = () => import("../views/Category.vue");
const TransactionHistory = () => import("../views/TransactionHistory.vue");
const Budget = () => import("../views/Budget.vue");
const Goal = () => import("../views/Goal.vue");
const Report = () => import("../views/Report.vue");
const Settings = () => import("../views/Settings.vue");
const SmartImport = () => import("../views/SmartImport.vue");
const Bills = () => import("../views/Bills.vue");

const routes = [
  {
    path: "/login",
    name: "login",
    component: Login,
    meta: { requiresGuest: true },
  },
  {
    path: "/forgot-password",
    name: "forgot-password",
    component: ForgotPassword,
    meta: { requiresGuest: true },
  },
  {
    path: "/reset-password",
    name: "reset-password",
    component: ResetPassword,
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
        component: Account,
        meta: { requiresAuth: true },
      },
      {
        path: "/history",
        redirect: "/transactions",
      },
      {
        path: "transactions",
        name: "transactions",
        component: TransactionHistory,
      },
      {
        path: "transactions/:id/edit",
        name: "transactions.edit",
        component: TransactionCreate,
      },
      { path: "scan", name: "scan", component: SmartImport },
      { path: "bills", name: "bills", component: Bills },
      { path: "budgets", redirect: "/budget" },
      { path: "reports", redirect: "/report" },

      {
        path: "transactions/create",
        name: "transactions.create",
        component: TransactionCreate,
        meta: { requiresAuth: true },
      },
      {
        path: "categories",
        name: "categories.index",
        component: Category,
        meta: { requiresAuth: true },
      },
      {
        path: "budget",
        name: "budget.index",
        component: Budget,
        meta: { requiresAuth: true },
      },
      {
        path: "goals",
        name: "goals.index",
        component: Goal,
        meta: { requiresAuth: true },
      },
      {
        path: "report",
        name: "report.index",
        component: Report,
        meta: { requiresAuth: true },
      },
      {
        path: "settings",
        name: "settings.index",
        component: Settings,
        meta: { requiresAuth: true },
      },
    ],
  },
  { path: "/:pathMatch(.*)*", redirect: "/dashboard" },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0, behavior: "smooth" };
  },
});

router.beforeEach(async (to) => {
  const authStore = useAuthStore();

  if (authStore.token && !authStore.user) {
    await authStore.fetchUser();
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { path: "/login", query: { redirect: to.fullPath } };
  }

  if (to.meta.requiresGuest && authStore.isAuthenticated) {
    return "/dashboard";
  }
});

export default router;
