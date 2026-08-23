<!-- ledger-web/src/components/Sidebar.vue -->
<script setup>
import { useAuthStore } from "@/stores/auth";
import { useRoute } from "vue-router";
import {
  LayoutDashboard,
  ReceiptText,
  Wallet,
  PiggyBank,
  BarChart3,
  LogOut,
  History,
} from "lucide-vue-next";
import logoImg from "../assets/ledger-icon.png";

const authStore = useAuthStore();
const route = useRoute();

const navItems = [
  { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { name: "History", path: "/riwayat", icon: History },
  { name: "Transaction", path: "/transactions", icon: ReceiptText },
  { name: "Wallet Account", path: "/accounts", icon: Wallet },
  { name: "Budget", path: "/budgets", icon: PiggyBank },
  { name: "Report", path: "/reports", icon: BarChart3 },
];
</script>

<template>
  <!-- TOPBAR MOBILE (Tampil hanya di Layar Kecil) -->
  <header
    class="lg:hidden sticky top-0 z-30 bg-paper-0/90 backdrop-blur-md border-b border-line-200 px-4 py-3 flex items-center justify-between"
  >
    <div class="flex items-center gap-2">
      <div
        class="w-7 h-7 rounded-md bg-violet-600 text-paper-0 flex items-center justify-center font-display font-bold text-sm shadow-violet"
      ></div>
      <span class="font-display font-bold text-lg text-ink-900 tracking-tight"
        >Ledger</span
      >
    </div>

    <button
      @click="authStore.logout()"
      class="p-1.5 text-expense-600 hover:bg-expense-100 rounded-md transition-colors"
      title="Logout"
    >
      <LogOut class="w-4 h-4" />
    </button>
  </header>

  <!-- SIDEBAR DESKTOP (Tampil di Layar Desktop lg:) -->
  <aside
    class="hidden lg:flex flex-col w-64 border-r border-line-200 bg-paper-0 h-screen sticky top-0 p-5 shrink-0 justify-between"
  >
    <div class="space-y-8 space-x-1">
      <!-- Logo App v2.0 -->
      <div class="flex items-center gap-2.5 px-2">
        <div
          class="w-12 h-12 bg-lavender-50 rounded-md text-paper-0 flex items-center justify-center font-display font-bold text-lg shadow-violet"
        >
          <img :src="logoImg" class="w-16 h-16 object-contain" alt="" />
        </div>
        <span
          class="font-display font-bold text-2xl text-ink-900 tracking-tight"
          >Ledger</span
        >
        <!-- <span
          class="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-600 font-semibold uppercase"
          >v2.0</span
        > -->
      </div>

      <!-- Nav Items -->
      <nav class="space-y-4">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="flex items-center gap-3 px-3.5 py-3 rounded-md text-sm font-medium btn-bounce"
          :class="
            route.path === item.path
              ? 'bg-violet-600 text-paper-0 shadow-violet font-semibold'
              : 'text-ink-600 hover:bg-lavender-50 hover:text-ink-900'
          "
        >
          <component :is="item.icon" class="w-4 h-4 shrink-0" />
          <span>{{ item.name }}</span>
        </router-link>
      </nav>
    </div>

    <!-- Profile & Logout -->
    <div class="border-t border-line-200 pt-4 space-y-3 px-2">
      <div class="p-3 rounded-md bg-base-50 border border-line-200 space-y-0.5">
        <!-- <p
          class="text-[10px] uppercase font-semibold tracking-wider text-ink-300"
        >
          Login sebagai
        </p> -->
        <p class="text-xs font-semibold text-ink-900 truncate">
          {{ authStore.user?.email || "User" }}
        </p>
        <p>{{ authStore.token || "token" }}</p>
      </div>
      <button
        @click="authStore.logout()"
        class="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-expense-600 hover:bg-expense-100 rounded-md transition-colors cursor-pointer"
      >
        <LogOut class="w-3.5 h-3.5" />
        <span>Logout</span>
      </button>
    </div>
  </aside>

  <!-- BOTTOM NAVIGATION BAR MOBILE (Fixed di Bawah Layar) -->
  <nav
    class="lg:hidden fixed bottom-0 left-0 right-0 bg-paper-0/95 backdrop-blur-md border-t border-line-200 flex justify-around p-1.5 z-40 pb-safe"
  >
    <router-link
      v-for="item in navItems"
      :key="item.path"
      :to="item.path"
      class="flex flex-col items-center gap-1 p-2 rounded-md transition-colors"
      :class="
        route.path === item.path
          ? 'text-violet-600 font-bold'
          : 'text-ink-600 hover:text-ink-900'
      "
    >
      <component :is="item.icon" class="w-5 h-5 shrink-0" />
      <span class="text-[10px] tracking-tight">{{ item.name }}</span>
    </router-link>
  </nav>
</template>

<style scoped>
/* Menyesuaikan Safe Area untuk perangkat HP layar poni/Home bar */
.pb-safe {
  padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
}
</style>
