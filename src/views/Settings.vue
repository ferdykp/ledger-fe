<!-- ledger-web/src/views/Settings.vue -->
<script setup>
import { ref, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useAuthStore } from "@/stores/auth";
import { useCategoryStore } from "@/stores/category";
import { useNotificationStore } from "@/stores/notification";
import {
  Pencil,
  Moon,
  ShieldCheck,
  FileSpreadsheet,
  FileText,
  Plus,
  Utensils,
  Car,
  Briefcase,
  ShoppingBag,
  Home,
  Loader2,
  ChevronDown,
} from "lucide-vue-next";

const authStore = useAuthStore();
const categoryStore = useCategoryStore();
const notifyStore = useNotificationStore();

const { user } = storeToRefs(authStore);
const { categories } = storeToRefs(categoryStore);

// State Form Profil
const profileForm = ref({
  name: user.value?.name || "Andi Susanto",
  email: user.value?.email || "andi@example.com",
});

// State Preferensi
const currency = ref("IDR");
const language = ref("id");
const theme = ref("light"); // 'light' | 'dark'

// State Keamanan
const isCloudBackup = ref(true);
const isSavingProfile = ref(false);

const iconMap = {
  makanan: Utensils,
  transportasi: Car,
  gaji: Briefcase,
  belanja: ShoppingBag,
  tagihan: Home,
};

function getCategoryIcon(name) {
  if (!name) return Utensils;
  const key = name.toLowerCase();
  for (const k in iconMap) {
    if (key.includes(k)) return iconMap[k];
  }
  return Utensils;
}

onMounted(() => {
  if (categories.value.length === 0) {
    categoryStore.fetchCategories();
  }
});

async function handleSaveProfile() {
  isSavingProfile.value = true;
  try {
    // Panggil API update profile jika tersedia
    notifyStore.notify({
      message: "Profil berhasil diperbarui!",
      type: "success",
    });
  } catch (err) {
    notifyStore.notify({ message: "Gagal memperbarui profil.", type: "error" });
  } finally {
    isSavingProfile.value = false;
  }
}

function handleExport(type) {
  notifyStore.notify({
    message: `Mengeksport data transaksi ke format ${type.toUpperCase()}...`,
    type: "info",
  });
}
</script>

<template>
  <div class="space-y-6 font-body">
    <!-- Header Halaman -->
    <div>
      <h1 class="font-display text-2xl md:text-3xl font-bold text-ink-900">
        Pengaturan
      </h1>
      <p class="text-ink-600 text-sm mt-1">
        Yuk, atur profilmu biar makin personal.
      </p>
    </div>

    <!-- MAIN GRID SETTINGS (2 KOLOM) -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <!-- KOLOM KIRI (5/12): PROFIL & DATA KEAMANAN -->
      <div class="lg:col-span-5 space-y-6">
        <!-- Kartu Profil -->
        <div
          class="bg-paper-0 border border-line-200 rounded-3xl p-6 shadow-soft space-y-6"
        >
          <h2 class="font-display font-bold text-base text-ink-900">Profil</h2>

          <!-- Avatar & Upload Badge -->
          <div class="flex justify-center">
            <div class="relative">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256"
                alt="Avatar"
                class="w-24 h-24 rounded-full object-cover border-4 border-violet-100 shadow-soft"
              />
              <button
                type="button"
                class="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-violet-600 text-paper-0 flex items-center justify-center shadow-soft hover:bg-violet-700 transition-all cursor-pointer btn-bounce"
                title="Ubah Foto"
              >
                <Pencil class="w-4 h-4" />
              </button>
            </div>
          </div>

          <form @submit.prevent="handleSaveProfile" class="space-y-4">
            <!-- Nama Lengkap -->
            <div class="space-y-1.5">
              <label
                class="block text-[11px] font-bold text-ink-300 uppercase tracking-wider"
              >
                NAMA LENGKAP
              </label>
              <input
                v-model="profileForm.name"
                type="text"
                required
                class="w-full px-4 h-11 border border-line-200 rounded-xl bg-paper-0 focus:border-violet-600 focus:outline-none text-xs font-semibold text-ink-900 transition-colors"
              />
            </div>

            <!-- Email -->
            <div class="space-y-1.5">
              <label
                class="block text-[11px] font-bold text-ink-300 uppercase tracking-wider"
              >
                EMAIL
              </label>
              <input
                v-model="profileForm.email"
                type="email"
                required
                class="w-full px-4 h-11 border border-line-200 rounded-xl bg-paper-0 focus:border-violet-600 focus:outline-none text-xs font-semibold text-ink-900 transition-colors"
              />
            </div>

            <button
              type="submit"
              :disabled="isSavingProfile"
              class="w-full h-11 bg-violet-600 text-paper-0 font-bold text-xs rounded-xl shadow-violet btn-bounce cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Loader2 v-if="isSavingProfile" class="w-4 h-4 animate-spin" />
              <span>Simpan Profil</span>
            </button>
          </form>
        </div>

        <!-- Kartu Data & Keamanan -->
        <div
          class="bg-paper-0 border border-line-200 rounded-3xl p-6 shadow-soft space-y-5"
        >
          <div class="flex items-center justify-between">
            <h2 class="font-display font-bold text-base text-ink-900">
              Data & Keamanan
            </h2>
            <ShieldCheck class="w-5 h-5 text-ink-400" />
          </div>

          <!-- Backup Cloud Toggle -->
          <div class="flex items-center justify-between pt-1">
            <div>
              <p class="font-display font-bold text-xs text-ink-900">
                Backup Cloud
              </p>
              <p class="text-[11px] text-ink-400 font-medium">
                Simpan data otomatis ke cloud
              </p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                v-model="isCloudBackup"
                class="sr-only peer"
              />
              <div
                class="w-11 h-6 bg-line-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-paper-0 after:border-line-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"
              ></div>
            </label>
          </div>

          <!-- Export Data Buttons -->
          <div class="space-y-2 pt-2">
            <label
              class="block text-[11px] font-bold text-ink-300 uppercase tracking-wider"
            >
              EXPORT DATA
            </label>
            <div class="grid grid-cols-2 gap-3">
              <button
                type="button"
                @click="handleExport('csv')"
                class="py-2.5 bg-rose-500 hover:bg-rose-600 text-paper-0 font-bold text-xs rounded-xl shadow-soft flex items-center justify-center gap-2 cursor-pointer transition-colors btn-bounce"
              >
                <FileSpreadsheet class="w-4 h-4" />
                <span>CSV</span>
              </button>

              <button
                type="button"
                @click="handleExport('pdf')"
                class="py-2.5 bg-rose-500 hover:bg-rose-600 text-paper-0 font-bold text-xs rounded-xl shadow-soft flex items-center justify-center gap-2 cursor-pointer transition-colors btn-bounce"
              >
                <FileText class="w-4 h-4" />
                <span>PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- KOLOM KANAN (7/12): PREFERENSI & KATEGORI TRANSAKSI -->
      <div class="lg:col-span-7 space-y-6">
        <!-- Kartu Preferensi -->
        <div
          class="bg-paper-0 border border-line-200 rounded-3xl p-6 shadow-soft space-y-5"
        >
          <h2 class="font-display font-bold text-base text-ink-900">
            Preferensi
          </h2>

          <!-- Mata Uang & Bahasa -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label
                class="block text-[11px] font-bold text-ink-300 uppercase tracking-wider"
              >
                MATA UANG UTAMA
              </label>
              <div class="relative">
                <select
                  v-model="currency"
                  class="w-full px-4 h-11 border border-line-200 rounded-xl bg-paper-0 focus:border-violet-600 text-xs font-semibold text-ink-900 focus:outline-none appearance-none cursor-pointer"
                >
                  <option value="IDR">IDR (Rp)</option>
                  <option value="USD">USD ($)</option>
                </select>
                <ChevronDown
                  class="w-4 h-4 text-ink-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                />
              </div>
            </div>

            <div class="space-y-1.5">
              <label
                class="block text-[11px] font-bold text-ink-300 uppercase tracking-wider"
              >
                BAHASA
              </label>
              <div class="relative">
                <select
                  v-model="language"
                  class="w-full px-4 h-11 border border-line-200 rounded-xl bg-paper-0 focus:border-violet-600 text-xs font-semibold text-ink-900 focus:outline-none appearance-none cursor-pointer"
                >
                  <option value="id">Bahasa Indonesia</option>
                  <option value="en">English</option>
                </select>
                <ChevronDown
                  class="w-4 h-4 text-ink-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                />
              </div>
            </div>
          </div>

          <!-- Tema Tampilan Switcher (Violet Pill) -->
          <div
            class="bg-violet-50/60 border border-violet-100 rounded-2xl p-4 flex items-center justify-between"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-9 h-9 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center shrink-0"
              >
                <Moon class="w-4 h-4" />
              </div>
              <div>
                <h4 class="font-display font-bold text-xs text-ink-900">
                  Tema Tampilan
                </h4>
                <p class="text-[11px] text-ink-400 font-medium">
                  Pilih tema terang atau gelap
                </p>
              </div>
            </div>

            <div
              class="bg-paper-0 border border-line-200 p-1 rounded-xl flex items-center gap-1 shadow-soft"
            >
              <button
                type="button"
                @click="theme = 'light'"
                class="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                :class="
                  theme === 'light'
                    ? 'bg-violet-100/80 text-violet-700'
                    : 'text-ink-400 hover:text-ink-900'
                "
              >
                Terang
              </button>
              <button
                type="button"
                @click="theme = 'dark'"
                class="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                :class="
                  theme === 'dark'
                    ? 'bg-violet-600 text-paper-0'
                    : 'text-ink-400 hover:text-ink-900'
                "
              >
                Gelap
              </button>
            </div>
          </div>
        </div>

        <!-- Kartu Kategori Transaksi -->
        <div
          class="bg-paper-0 border border-line-200 rounded-3xl p-6 shadow-soft space-y-4"
        >
          <div class="flex items-center justify-between">
            <h2 class="font-display font-bold text-base text-ink-900">
              Kategori Transaksi
            </h2>

            <router-link
              to="/categories"
              class="inline-flex items-center gap-1.5 px-3.5 py-2 bg-violet-600 text-paper-0 rounded-xl font-bold text-xs shadow-violet btn-bounce cursor-pointer"
            >
              <Plus class="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Tambah Kategori</span>
            </router-link>
          </div>

          <!-- Category Chips List Grid -->
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div
              v-for="cat in categories.slice(0, 6)"
              :key="cat.id"
              class="bg-paper-0 border border-line-200 rounded-2xl p-3.5 flex items-center gap-3 shadow-soft hover:border-violet-300 transition-colors"
            >
              <div
                class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                :style="{
                  backgroundColor: `${cat.color || '#6C4CF1'}18`,
                  color: cat.color || '#6C4CF1',
                }"
              >
                <component
                  :is="getCategoryIcon(cat.name)"
                  class="w-4 h-4 stroke-[2.2]"
                />
              </div>
              <span
                class="font-display font-bold text-xs text-ink-900 truncate"
              >
                {{ cat.name }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
