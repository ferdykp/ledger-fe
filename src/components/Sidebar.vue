<!-- ledger-web/src/components/Sidebar.vue -->
<script setup>
import { ref } from "vue";
import { storeToRefs } from "pinia";
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
  User as UserIcon,
  Bell,
  Plus,
  Menu,
  X,
} from "lucide-vue-next";
import logoImg from "../assets/ledger-icon.png";

const authStore = useAuthStore();
const { user } = storeToRefs(authStore);
const route = useRoute();

// State Modal Action Sheet "Lainnya"
const isMoreMenuOpen = ref(false);

const navItems = [
  { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { name: "Riwayat", path: "/history", icon: History },
  { name: "Akun", path: "/accounts", icon: Wallet },
  { name: "Budget", path: "/budget", icon: PiggyBank },
  { name: "Goals", path: "/goals", icon: Target },
  { name: "Laporan", path: "/report", icon: BarChart3 },
  { name: "Pengaturan", path: "/settings", icon: Settings },
];

// Item khusus untuk bottom navigation mobile (4 Utama + Floating Plus)
const mobileBottomNav = [
  { name: "Beranda", path: "/dashboard", icon: LayoutDashboard },
  { name: "Riwayat", path: "/history", icon: History },
  { name: "Dompet", path: "/accounts", icon: Wallet },
];

// Menu Tambahan di dalam Action Sheet "Lainnya"
const mobileMoreItems = [
  {
    name: "Budget",
    path: "/budget",
    icon: PiggyBank,
    desc: "Kelola batas pengeluaran bulanan",
  },
  {
    name: "Goals",
    path: "/goals",
    icon: Target,
    desc: "Target impian & tabungan",
  },
  {
    name: "Laporan",
    path: "/report",
    icon: BarChart3,
    desc: "Analisis & statistik keuangan",
  },
  {
    name: "Pengaturan",
    path: "/settings",
    icon: Settings,
    desc: "Profil, tema, & preferensi",
  },
];
</script>

<template>
  <!-- TOPBAR MOBILE -->
  <header
    class="lg:hidden sticky top-0 z-30 bg-paper-0/95 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-line-200 shadow-soft"
  >
    <!-- Avatar Kiri (Redirect ke Settings) -->
    <router-link to="/settings" class="shrink-0 cursor-pointer">
      <img
        v-if="user?.avatar_url"
        :src="user.avatar_url"
        alt="Avatar Profile"
        class="w-9 h-9 rounded-full object-cover border-2 border-violet-200"
      />
      <div
        v-else
        class="w-9 h-9 rounded-full bg-violet-100 border border-violet-200 flex items-center justify-center text-violet-600"
      >
        <UserIcon class="w-5 h-5 stroke-[2]" />
      </div>
    </router-link>

    <!-- Logo & Title App (Tengah) -->
    <div class="flex items-center gap-1.5">
      <span
        class="font-display font-black text-xl text-violet-600 tracking-tight"
        >Ledger</span
      >
    </div>

    <!-- Lonceng Notifikasi Kanan -->
    <button
      type="button"
      class="w-9 h-9 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center hover:bg-violet-100 transition-colors cursor-pointer"
    >
      <Bell class="w-5 h-5 stroke-[2]" />
    </button>
  </header>

  <!-- SIDEBAR DESKTOP -->
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
      <router-link
        to="/settings"
        class="p-2.5 rounded-2xl bg-base-50/60 hover:bg-violet-50/60 border border-line-200/80 hover:border-violet-200 transition-all duration-200 flex items-center justify-between group cursor-pointer"
      >
        <div class="flex items-center gap-3 truncate">
          <img
            v-if="user?.avatar_url"
            :src="user.avatar_url"
            alt="User Avatar"
            class="w-9 h-9 rounded-xl object-cover border border-violet-200 shrink-0"
          />
          <div
            v-else
            class="w-9 h-9 rounded-xl bg-violet-100 border border-violet-200 flex items-center justify-center text-violet-600 shrink-0"
          >
            <UserIcon class="w-5 h-5 stroke-[2]" />
          </div>

          <div class="truncate">
            <h4
              class="text-xs font-bold text-ink-900 group-hover:text-violet-600 transition-colors truncate"
            >
              {{ user?.name || "User" }}
            </h4>
            <p class="text-[10px] text-ink-400 font-medium truncate">
              {{ user?.email || "user@example.com" }}
            </p>
          </div>
        </div>

        <ChevronRight
          class="w-4 h-4 text-ink-400 group-hover:text-violet-600 transition-colors shrink-0"
        />
      </router-link>

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

  <!-- BOTTOM NAVIGATION MOBILE ERGONOMIS -->
  <nav
    class="lg:hidden fixed bottom-0 left-0 right-0 bg-paper-0/95 backdrop-blur-md border-t border-line-200 flex items-center justify-around px-2 py-2 z-40 pb-safe shadow-card"
  >
    <!-- Item 1: Beranda -->
    <router-link
      :to="mobileBottomNav[0].path"
      class="flex flex-col items-center gap-1 p-1 flex-1 text-center transition-colors"
      :class="
        route.path === mobileBottomNav[0].path
          ? 'text-violet-600 font-extrabold'
          : 'text-ink-400 font-medium'
      "
    >
      <component :is="mobileBottomNav[0].icon" class="w-5 h-5 stroke-[2.2]" />
      <span class="text-[10px] tracking-tight">{{
        mobileBottomNav[0].name
      }}</span>
    </router-link>

    <!-- Item 2: Riwayat -->
    <router-link
      :to="mobileBottomNav[1].path"
      class="flex flex-col items-center gap-1 p-1 flex-1 text-center transition-colors"
      :class="
        route.path === mobileBottomNav[1].path
          ? 'text-violet-600 font-extrabold'
          : 'text-ink-400 font-medium'
      "
    >
      <component :is="mobileBottomNav[1].icon" class="w-5 h-5 stroke-[2.2]" />
      <span class="text-[10px] tracking-tight">{{
        mobileBottomNav[1].name
      }}</span>
    </router-link>

    <!-- TOMBOL MENGAMBANG TAMBAH TRANSAKSI (+) -->
    <div class="flex-1 flex justify-center -mt-6">
      <router-link
        to="/transactions/create"
        class="w-13 h-13 rounded-full bg-rose-500 hover:bg-rose-600 text-paper-0 flex items-center justify-center shadow-coral btn-bounce cursor-pointer border-4 border-paper-0"
      >
        <Plus class="w-7 h-7 stroke-[3]" />
      </router-link>
    </div>

    <!-- Item 3: Dompet -->
    <router-link
      :to="mobileBottomNav[2].path"
      class="flex flex-col items-center gap-1 p-1 flex-1 text-center transition-colors"
      :class="
        route.path === mobileBottomNav[2].path
          ? 'text-violet-600 font-extrabold'
          : 'text-ink-400 font-medium'
      "
    >
      <component :is="mobileBottomNav[2].icon" class="w-5 h-5 stroke-[2.2]" />
      <span class="text-[10px] tracking-tight">{{
        mobileBottomNav[2].name
      }}</span>
    </router-link>

    <!-- Item 4: Lainnya (Membuka Action Sheet Drawer) -->
    <button
      type="button"
      @click="isMoreMenuOpen = true"
      class="flex flex-col items-center gap-1 p-1 flex-1 text-center transition-colors cursor-pointer"
      :class="
        isMoreMenuOpen
          ? 'text-violet-600 font-extrabold'
          : 'text-ink-400 font-medium'
      "
    >
      <Menu class="w-5 h-5 stroke-[2.2]" />
      <span class="text-[10px] tracking-tight">Lainnya</span>
    </button>
  </nav>

  <!-- MOBILE ACTION SHEET / DRAWER MENU "LAINNYA" -->
  <div
    v-if="isMoreMenuOpen"
    class="lg:hidden fixed inset-0 z-50 bg-ink-900/50 backdrop-blur-sm flex flex-col justify-end transition-opacity"
    @click="isMoreMenuOpen = false"
  >
    <div
      class="bg-paper-0 rounded-t-3xl p-6 space-y-5 border-t border-line-200 shadow-card animate-in slide-in-from-bottom duration-200 max-h-[80vh] overflow-y-auto"
      @click.stop
    >
      <!-- Header Drawer -->
      <div
        class="flex items-center justify-between pb-2 border-b border-line-200"
      >
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 rounded-full bg-violet-600"></div>
          <h3 class="font-display font-bold text-base text-ink-900">
            Menu & Fitur Lainnya
          </h3>
        </div>
        <button
          type="button"
          @click="isMoreMenuOpen = false"
          class="p-1.5 text-ink-400 hover:text-ink-900 rounded-full hover:bg-base-50 transition-colors cursor-pointer"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- List Menu Fitur Lainnya -->
      <div class="grid grid-cols-1 gap-2.5">
        <router-link
          v-for="item in mobileMoreItems"
          :key="item.path"
          :to="item.path"
          @click="isMoreMenuOpen = false"
          class="flex items-center gap-3.5 p-3 rounded-2xl bg-base-50/60 hover:bg-violet-50/80 border border-line-200/80 hover:border-violet-200 transition-all cursor-pointer group"
          :class="{
            'bg-violet-50 border-violet-300': route.path === item.path,
          }"
        >
          <div
            class="w-10 h-10 rounded-xl bg-paper-0 border border-line-200 text-violet-600 flex items-center justify-center shrink-0 shadow-soft group-hover:scale-105 transition-transform"
          >
            <component :is="item.icon" class="w-5 h-5 stroke-[2.2]" />
          </div>

          <div class="flex-1 truncate">
            <h4
              class="font-display font-bold text-xs text-ink-900 group-hover:text-violet-600 transition-colors"
            >
              {{ item.name }}
            </h4>
            <p class="text-[11px] text-ink-400 font-medium truncate">
              {{ item.desc }}
            </p>
          </div>

          <ChevronRight
            class="w-4 h-4 text-ink-300 group-hover:text-violet-600 transition-colors shrink-0"
          />
        </router-link>
      </div>

      <!-- Tombol Keluar di Drawer -->
      <div class="pt-2">
        <button
          type="button"
          @click="
            isMoreMenuOpen = false;
            authStore.logout();
          "
          class="w-full flex items-center justify-center gap-2 py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-2xl transition-colors cursor-pointer"
        >
          <LogOut class="w-4 h-4 stroke-[2.2]" />
          <span>Keluar dari Aplikasi</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pb-safe {
  padding-bottom: max(0.6rem, env(safe-area-inset-bottom));
}
</style>
