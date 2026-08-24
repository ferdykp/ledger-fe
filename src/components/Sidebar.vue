<!-- ledger-web/src/components/Sidebar.vue -->
<script setup>
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
} from "lucide-vue-next";
import logoImg from "../assets/ledger-icon.png";

const authStore = useAuthStore();
const { user } = storeToRefs(authStore);
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

// Item khusus untuk bottom navigation mobile
const mobileBottomNav = [
  { name: "Beranda", path: "/dashboard", icon: LayoutDashboard },
  { name: "Riwayat", path: "/history", icon: History },
  { name: "Dompet", path: "/accounts", icon: Wallet },
  { name: "Laporan", path: "/report", icon: BarChart3 },
];
</script>

<template>
  <!-- TOPBAR MOBILE PRESISI SESUAI GAMBAR (Avatar Kiri, Title Tengah, Lonceng Kanan) -->
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

  <!-- BOTTOM NAVIGATION MOBILE (SESUAI GAMBAR DENGAN TOMBOL TAMBAH MENGAMBANG) -->
  <nav
    class="lg:hidden fixed bottom-0 left-0 right-0 bg-paper-0/95 backdrop-blur-md border-t border-line-200 flex items-center justify-around px-3 py-2 z-40 pb-safe shadow-card"
  >
    <!-- Item Kiri 1 (Beranda) -->
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

    <!-- Item Kiri 2 (Riwayat) -->
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

    <!-- TOMBOL TAMBAH FLOATING CORAL/RED CENTER (+) -->
    <div class="flex-1 flex justify-center -mt-6">
      <router-link
        to="/transactions/create"
        class="w-13 h-13 rounded-full bg-rose-500 hover:bg-rose-600 text-paper-0 flex items-center justify-center shadow-coral btn-bounce cursor-pointer border-4 border-paper-0"
      >
        <Plus class="w-7 h-7 stroke-[3]" />
      </router-link>
    </div>

    <!-- Item Kanan 1 (Dompet) -->
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

    <!-- Item Kanan 2 (Laporan) -->
    <router-link
      :to="mobileBottomNav[3].path"
      class="flex flex-col items-center gap-1 p-1 flex-1 text-center transition-colors"
      :class="
        route.path === mobileBottomNav[3].path
          ? 'text-violet-600 font-extrabold'
          : 'text-ink-400 font-medium'
      "
    >
      <component :is="mobileBottomNav[3].icon" class="w-5 h-5 stroke-[2.2]" />
      <span class="text-[10px] tracking-tight">{{
        mobileBottomNav[3].name
      }}</span>
    </router-link>
  </nav>
</template>

<style scoped>
.pb-safe {
  padding-bottom: max(0.6rem, env(safe-area-inset-bottom));
}
</style>
