<!-- ledger-web/src/components/Sidebar.vue -->
<script setup>
import { useAuthStore } from "@/stores/auth";
import { useRoute } from "vue-router";
import {
  LayoutDashboard,
  Wallet,
  PiggyBank,
  Target,
  BarChart3,
  History,
  Settings,
  LogOut,
  ChevronRight,
} from "lucide-vue-next";
import logoImg from "../assets/ledger-icon.png";

const authStore = useAuthStore();
const route = useRoute();

const navItems = [
  { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { name: "Riwayat", path: "/history", icon: History },
  { name: "Akun", path: "/accounts", icon: Wallet },
  { name: "Budget", path: "/budget", icon: PiggyBank },
  { name: "Goals", path: "/goals", icon: Target },
  { name: "Laporan", path: "/report", icon: BarChart3 },
  { name: "Pengaturan", path: "/settings", icon: Settings },
];
</script>

<template>
  <!-- TOPBAR MOBILE (Tampil hanya di Layar Kecil) -->
  <header
    class="lg:hidden sticky top-0 z-30 bg-paper-0/90 backdrop-blur-md border-b border-line-200 px-4 py-3 flex items-center justify-between shadow-soft"
  >
    <div class="flex items-center gap-2.5">
      <div
        class="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center p-1 border border-violet-100"
      >
        <img
          :src="logoImg"
          class="w-full h-full object-contain"
          alt="Ledger Logo"
        />
      </div>
      <span class="font-display font-bold text-lg text-ink-900 tracking-tight"
        >Ledger</span
      >
    </div>

    <!-- Mobile Avatar Profile Button (Redirect to Settings) -->
    <router-link
      to="/settings"
      class="flex items-center gap-2 p-1 rounded-full hover:bg-base-50 transition-colors"
    >
      <img
        src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256"
        alt="Avatar Profile"
        class="w-8 h-8 rounded-full object-cover border border-violet-300"
      />
    </router-link>
  </header>

  <!-- SIDEBAR DESKTOP (Tampil di Layar Desktop lg:) -->
  <aside
    class="hidden lg:flex flex-col w-64 border-r border-line-200 bg-paper-0 h-screen sticky top-0 p-5 shrink-0 justify-between font-body z-20"
  >
    <div class="space-y-8">
      <!-- Logo App Branding -->
      <div class="flex items-center gap-3 px-2 pt-1">
        <div
          class="w-10 h-10 bg-violet-50/80 rounded-2xl flex items-center justify-center p-1.5 border border-violet-100 shadow-soft"
        >
          <img
            :src="logoImg"
            class="w-full h-full object-contain"
            alt="Ledger Logo"
          />
        </div>
        <div>
          <span
            class="font-display font-extrabold text-xl text-ink-900 tracking-tight block leading-none"
          >
            Ledger
          </span>
          <span
            class="text-[10px] font-semibold text-ink-400 tracking-wide mt-1 block"
          >
            Personal Finance
          </span>
        </div>
      </div>

      <!-- Nav List Items -->
      <nav class="space-y-1.5">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200 group cursor-pointer btn-bounce"
          :class="
            route.path === item.path
              ? 'bg-violet-600 text-paper-0 shadow-violet'
              : 'text-ink-600 hover:bg-violet-50/60 hover:text-violet-600'
          "
        >
          <component :is="item.icon" class="w-4 h-4 shrink-0 stroke-[2.2]" />
          <span>{{ item.name }}</span>
        </router-link>
      </nav>
    </div>

    <!-- PROFILE INTERAKTIF & LOGOUT FOOTER -->
    <div class="space-y-3 pt-4 border-t border-line-200">
      <!-- Interactive Profile Card (Klik Membuka Settings) -->
      <router-link
        to="/settings"
        class="p-2.5 rounded-2xl bg-base-50/60 hover:bg-violet-50/60 border border-line-200/80 hover:border-violet-200 transition-all duration-200 flex items-center justify-between group cursor-pointer"
      >
        <div class="flex items-center gap-3 truncate">
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256"
            alt="User Avatar"
            class="w-9 h-9 rounded-xl object-cover border border-violet-200 shrink-0"
          />
          <div class="truncate">
            <h4
              class="text-xs font-bold text-ink-900 group-hover:text-violet-600 transition-colors truncate"
            >
              {{ authStore.user?.name || "User" }}
            </h4>
            <p class="text-[10px] text-ink-400 font-medium truncate">
              {{ authStore.user?.email || "user@example.com" }}
            </p>
          </div>
        </div>

        <ChevronRight
          class="w-4 h-4 text-ink-400 group-hover:text-violet-600 transition-colors shrink-0"
        />
      </router-link>

      <!-- Logout Button -->
      <button
        type="button"
        @click="authStore.logout()"
        class="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-rose-500 hover:bg-rose-50 rounded-2xl transition-colors cursor-pointer"
      >
        <LogOut class="w-4 h-4 stroke-[2.2]" />
        <span>Keluar</span>
      </button>
    </div>
  </aside>

  <!-- BOTTOM NAVIGATION BAR MOBILE (Fixed di Bawah Layar) -->
  <nav
    class="lg:hidden fixed bottom-0 left-0 right-0 bg-paper-0/95 backdrop-blur-md border-t border-line-200 flex justify-around p-1.5 z-40 pb-safe shadow-soft"
  >
    <router-link
      v-for="item in navItems.slice(0, 5)"
      :key="item.path"
      :to="item.path"
      class="flex flex-col items-center gap-1 p-2 rounded-xl transition-colors"
      :class="
        route.path === item.path
          ? 'text-violet-600 font-extrabold'
          : 'text-ink-400 hover:text-ink-900 font-medium'
      "
    >
      <component :is="item.icon" class="w-5 h-5 shrink-0 stroke-[2.2]" />
      <span class="text-[10px] tracking-tight">{{ item.name }}</span>
    </router-link>
  </nav>
</template>

<style scoped>
.pb-safe {
  padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
}
</style>
