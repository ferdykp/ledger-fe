<script setup>
import { ref, watch, computed } from "vue";
import { useAuthStore } from "@/stores/auth";
import { useRoute } from "vue-router";
import BrandMark from "@/components/BrandMark.vue";
import {
  LayoutDashboard,
  Wallet,
  PiggyBank,
  Target,
  BarChart3,
  History,
  Settings,
  Plus,
  ScanLine,
  Menu,
  X,
  ReceiptText,
  Tags,
  ChevronRight,
  MessageCircle,
} from "lucide-vue-next";
const auth = useAuthStore();
const route = useRoute();
const more = ref(false);
const sections = [
  {
    label: "Keuangan",
    items: [
      { name: "Beranda", path: "/dashboard", icon: LayoutDashboard },
      { name: "Transaksi", path: "/transactions", icon: History },
      { name: "Dompet", path: "/accounts", icon: Wallet },
      { name: "Laporan", path: "/report", icon: BarChart3 },
    ],
  },
  {
    label: "Perencanaan",
    items: [
      { name: "Anggaran", path: "/budget", icon: PiggyBank },
      { name: "Target tabungan", path: "/goals", icon: Target },
      { name: "Tagihan", path: "/bills", icon: ReceiptText },
    ],
  },
  {
    label: "Alat & pengaturan",
    items: [
      { name: "Pindai bukti", path: "/scan", icon: ScanLine },
      { name: "WhatsApp", path: "/settings/whatsapp", icon: MessageCircle },
      { name: "Kategori", path: "/categories", icon: Tags },
      { name: "Pengaturan", path: "/settings", icon: Settings },
    ],
  },
];
const active = (path) =>
  path === "/settings"
    ? route.path === path
    : route.path === path || route.path.startsWith(path + "/");
const mobile = sections[0].items;
const inMore = computed(() =>
  sections.slice(1).some((s) => s.items.some((i) => active(i.path))),
);
watch(
  () => route.path,
  () => {
    more.value = false;
  },
);
</script>
<template>
  <header class="ledger-mobile-header lg:hidden">
    <router-link
      to="/dashboard"
      class="brand-lockup"
      aria-label="Ledger, beranda"
      ><BrandMark /><span>Ledger</span></router-link
    >
    <router-link
      to="/scan"
      class="icon-button"
      aria-label="Pindai bukti transaksi"
      ><ScanLine class="w-5 h-5"
    /></router-link>
  </header>
  <aside class="ledger-sidebar hidden lg:flex">
    <router-link to="/dashboard" class="brand-lockup"
      ><BrandMark /><span
        >Ledger<span class="brand-caption">Keuangan pribadi</span></span
      ></router-link
    >
    <router-link to="/transactions/create" class="primary-button sidebar-create"
      ><Plus class="w-4 h-4" />Catat transaksi</router-link
    >
    <nav class="sidebar-navigation" aria-label="Navigasi utama">
      <section v-for="section in sections" :key="section.label">
        <p class="nav-section-label">{{ section.label }}</p>
        <router-link
          v-for="item in section.items"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ 'is-active': active(item.path) }"
          :aria-current="active(item.path) ? 'page' : undefined"
          ><component :is="item.icon" /><span>{{ item.name }}</span
          ><span v-if="active(item.path)" class="nav-active-dot"
        /></router-link>
      </section>
    </nav>
    <router-link to="/settings" class="sidebar-profile"
      ><span class="profile-initial">{{
        (auth.user?.name || "A").charAt(0).toUpperCase()
      }}</span
      ><span class="min-w-0 flex-1"
        ><strong>{{ auth.user?.name || "Akun Anda" }}</strong
        ><small>Kelola akun</small></span
      ><ChevronRight class="w-4 h-4"
    /></router-link>
  </aside>
  <nav class="mobile-navigation lg:hidden" aria-label="Navigasi utama ponsel">
    <router-link
      v-for="item in mobile.slice(0, 2)"
      :key="item.path"
      :to="item.path"
      :class="{ 'is-active': active(item.path) }"
      :aria-current="active(item.path) ? 'page' : undefined"
      ><component :is="item.icon" /><span>{{ item.name }}</span></router-link
    >
    <router-link
      to="/transactions/create"
      class="mobile-create"
      aria-label="Catat transaksi baru"
      ><span class="mobile-create-icon"><Plus /></span
      ><span>Catat</span></router-link
    >
    <router-link
      to="/report"
      :class="{ 'is-active': active('/report') }"
      :aria-current="active('/report') ? 'page' : undefined"
      ><BarChart3 /><span>Laporan</span></router-link
    >
    <button
      @click="more = true"
      :class="{ 'is-active': inMore || active('/accounts') }"
      :aria-expanded="more"
      aria-controls="mobile-menu"
    >
      <Menu /><span>Menu</span>
    </button>
  </nav>
  <div
    v-if="more"
    v-dialog="() => (more = false)"
    class="dialog-backdrop menu-backdrop lg:hidden"
    @click.self="more = false"
  >
    <section id="mobile-menu" class="menu-panel">
      <div class="flex items-center justify-between mb-5">
        <div>
          <h2>Semua menu</h2>
          <p class="text-sm text-ink-500 mt-1">Temukan yang Anda butuhkan.</p>
        </div>
        <button
          @click="more = false"
          class="icon-button"
          aria-label="Tutup menu"
        >
          <X class="w-5 h-5" />
        </button>
      </div>
      <section v-for="section in sections" :key="section.label" class="mb-5">
        <p class="nav-section-label">{{ section.label }}</p>
        <div class="grid grid-cols-2 gap-2">
          <router-link
            v-for="item in section.items"
            :key="item.path"
            :to="item.path"
            class="menu-tile"
            :class="{ 'is-active': active(item.path) }"
            ><component :is="item.icon" /><span>{{
              item.name
            }}</span></router-link
          >
        </div>
      </section>
    </section>
  </div>
</template>
