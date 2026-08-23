<!-- ledger-web/src/views/Category.vue -->
<script setup>
import { ref, onMounted, computed } from "vue";
import { storeToRefs } from "pinia";
import { useCategoryStore } from "@/stores/category";
import { useNotificationStore } from "@/stores/notification";
import {
  Tag,
  Plus,
  Pencil,
  Trash2,
  Utensils,
  Car,
  ShoppingBag,
  MoreHorizontal,
  Wallet,
  Building2,
  TrendingUp,
  TrendingDown,
  X,
  Check,
  AlertTriangle,
  Loader2,
} from "lucide-vue-next";

const categoryStore = useCategoryStore();
const notifyStore = useNotificationStore();
const { categories, isLoading } = storeToRefs(categoryStore);

// Tab Active Filter
const activeTab = ref("expense"); // 'expense' | 'income'

// Modal States
const isCreateModalOpen = ref(false);
const isEditModalOpen = ref(false);
const isDeleteModalOpen = ref(false);

const isSubmitting = ref(false);
const selectedCategory = ref(null);

// Form State
const form = ref({
  name: "",
  type: "expense",
  color: "#6C4CF1",
  icon: "utensils",
});

const colorSwatches = [
  "#6C4CF1",
  "#17B978",
  "#FFB020",
  "#00AED6",
  "#F0473E",
  "#EC4899",
];

// Map Ikon Lucide untuk Render Dinamis
const iconMap = {
  utensils: Utensils,
  car: Car,
  "shopping-bag": ShoppingBag,
  "more-horizontal": MoreHorizontal,
  wallet: Wallet,
  building: Building2,
};

function getIconComponent(iconName) {
  return iconMap[iconName] || Tag;
}

const filteredCategories = computed(() => {
  return categories.value.filter((cat) => cat.type === activeTab.value);
});

onMounted(async () => {
  await categoryStore.fetchCategories();
});

function openCreateModal() {
  form.value = {
    name: "",
    type: activeTab.value,
    color: "#6C4CF1",
    icon: "utensils",
  };
  isCreateModalOpen.value = true;
}

function openEditModal(cat) {
  selectedCategory.value = cat;
  form.value = { ...cat };
  isEditModalOpen.value = true;
}

function confirmDelete(cat) {
  selectedCategory.value = cat;
  isDeleteModalOpen.value = true;
}

async function handleCreate() {
  if (!form.value.name.trim()) return;
  isSubmitting.value = true;
  try {
    await categoryStore.addCategory(form.value);
    notifyStore.notify({
      message: "Kategori berhasil ditambahkan!",
      type: "success",
    });
    isCreateModalOpen.value = false;
  } catch (err) {
    notifyStore.notify({
      message: err.response?.data?.message || "Gagal membuat kategori.",
      type: "error",
    });
  } finally {
    isSubmitting.value = false;
  }
}

async function handleUpdate() {
  if (!form.value.name.trim() || !selectedCategory.value) return;
  isSubmitting.value = true;
  try {
    await categoryStore.updateCategory(selectedCategory.value.id, form.value);
    notifyStore.notify({
      message: "Kategori berhasil diperbarui!",
      type: "success",
    });
    isEditModalOpen.value = false;
  } catch (err) {
    notifyStore.notify({
      message: err.response?.data?.message || "Gagal memperbarui kategori.",
      type: "error",
    });
  } finally {
    isSubmitting.value = false;
  }
}

async function handleDelete() {
  if (!selectedCategory.value) return;
  isSubmitting.value = true;
  try {
    await categoryStore.deleteCategory(selectedCategory.value.id);
    notifyStore.notify({
      message: "Kategori berhasil dihapus.",
      type: "success",
    });
    isDeleteModalOpen.value = false;
  } catch (err) {
    notifyStore.notify({
      message: err.response?.data?.message || "Gagal menghapus kategori.",
      type: "error",
    });
  } finally {
    isSubmitting.value = false;
    selectedCategory.value = null;
  }
}
</script>

<template>
  <div class="space-y-8 font-body">
    <!-- Header Halaman -->
    <div
      class="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
    >
      <div>
        <h1 class="font-display text-2xl md:text-3xl font-bold text-ink-900">
          Kategori Transaksi
        </h1>
        <p class="text-ink-600 text-sm mt-1">
          Kelompokkan arus kas kamu untuk analisis keuangan yang lebih presisi.
        </p>
      </div>

      <button
        type="button"
        @click="openCreateModal"
        class="inline-flex items-center justify-center gap-2 px-5 py-3 bg-violet-600 text-paper-0 rounded-2xl font-bold text-sm shadow-violet btn-bounce cursor-pointer self-start sm:self-auto"
      >
        <Plus class="w-4 h-4 stroke-[2.5]" />
        <span>Tambah Kategori</span>
      </button>
    </div>

    <!-- Toggle Segmented Tab (Expense vs Income) -->
    <div class="flex items-center gap-2 border-b border-line-200 pb-4">
      <button
        @click="activeTab = 'expense'"
        class="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer"
        :class="
          activeTab === 'expense'
            ? 'bg-expense-600 text-paper-0 shadow-soft'
            : 'bg-base-50 text-ink-600 hover:text-ink-900'
        "
      >
        <TrendingDown class="w-4 h-4" />
        <span>Pengeluaran</span>
      </button>

      <button
        @click="activeTab = 'income'"
        class="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer"
        :class="
          activeTab === 'income'
            ? 'bg-income-600 text-paper-0 shadow-soft'
            : 'bg-base-50 text-ink-600 hover:text-ink-900'
        "
      >
        <TrendingUp class="w-4 h-4" />
        <span>Pemasukan</span>
      </button>
    </div>

    <!-- Grid List Kategori -->
    <div
      class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
    >
      <template v-if="isLoading">
        <div
          v-for="i in 4"
          :key="i"
          class="h-20 bg-paper-0 border border-line-200 rounded-2xl p-4 flex items-center justify-between animate-pulse"
        >
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-base-100"></div>
            <div class="w-24 h-4 bg-base-100 rounded"></div>
          </div>
        </div>
      </template>

      <template v-else-if="filteredCategories.length === 0">
        <div
          class="col-span-full py-12 text-center bg-paper-0 border border-line-200 rounded-3xl space-y-3"
        >
          <Tag class="w-8 h-8 text-ink-300 mx-auto" />
          <p class="text-xs font-semibold text-ink-600">
            Belum ada kategori
            {{ activeTab === "expense" ? "pengeluaran" : "pemasukan" }} nih.
          </p>
        </div>
      </template>

      <template v-else>
        <div
          v-for="cat in filteredCategories"
          :key="cat.id"
          class="bg-paper-0 border border-line-200 rounded-2xl p-4 shadow-soft hover:shadow-card hover:-translate-y-1 transition-all flex items-center justify-between group"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-soft"
              :style="{
                backgroundColor: `${cat.color || '#6C4CF1'}18`,
                color: cat.color || '#6C4CF1',
              }"
            >
              <component
                :is="getIconComponent(cat.icon)"
                class="w-5 h-5 stroke-[2.2]"
              />
            </div>
            <span
              class="font-display font-bold text-sm text-ink-900 group-hover:text-violet-600 transition-colors"
            >
              {{ cat.name }}
            </span>
          </div>

          <!-- Action Buttons -->
          <div
            class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <button
              @click="openEditModal(cat)"
              class="p-1.5 text-ink-400 hover:text-violet-600 rounded-lg hover:bg-violet-50 transition-colors cursor-pointer"
            >
              <Pencil class="w-3.5 h-3.5" />
            </button>
            <button
              @click="confirmDelete(cat)"
              class="p-1.5 text-ink-400 hover:text-expense-600 rounded-lg hover:bg-expense-50 transition-colors cursor-pointer"
            >
              <Trash2 class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </template>
    </div>

    <!-- Modal Form Tambah / Edit Kategori -->
    <div
      v-if="isCreateModalOpen || isEditModalOpen"
      class="fixed inset-0 z-50 bg-ink-900/40 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        class="w-full max-w-lg bg-paper-0 border border-line-200 rounded-3xl shadow-card overflow-hidden"
      >
        <div
          class="px-6 py-5 border-b border-line-200 flex items-center justify-between"
        >
          <h2 class="font-display font-bold text-lg text-ink-900">
            {{ isEditModalOpen ? "Edit Kategori" : "Tambah Kategori Baru" }}
          </h2>
          <button
            @click="
              isCreateModalOpen = false;
              isEditModalOpen = false;
            "
            class="p-1 text-ink-600 hover:text-ink-900 rounded-full hover:bg-base-50 cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <form
          @submit.prevent="isEditModalOpen ? handleUpdate() : handleCreate()"
          class="p-6 space-y-5"
        >
          <!-- Nama Kategori -->
          <div class="space-y-2">
            <label
              class="block text-[11px] font-bold text-ink-300 uppercase tracking-wider"
            >
              NAMA KATEGORI
            </label>
            <input
              v-model="form.name"
              type="text"
              required
              placeholder="Contoh: Makanan & Minuman"
              class="w-full px-4 h-12 border border-line-200 rounded-xl bg-paper-0 focus:border-violet-600 focus:outline-none text-sm font-medium text-ink-900 transition-colors"
            />
          </div>

          <!-- Tipe Kategori -->
          <div class="space-y-2">
            <label
              class="block text-[11px] font-bold text-ink-300 uppercase tracking-wider"
            >
              TIPE
            </label>
            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                @click="form.type = 'expense'"
                class="py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border text-center"
                :class="
                  form.type === 'expense'
                    ? 'border-expense-600 bg-expense-50 text-expense-600'
                    : 'border-line-200 text-ink-600 hover:border-line-300'
                "
              >
                Pengeluaran
              </button>
              <button
                type="button"
                @click="form.type = 'income'"
                class="py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border text-center"
                :class="
                  form.type === 'income'
                    ? 'border-income-600 bg-income-50 text-income-600'
                    : 'border-line-200 text-ink-600 hover:border-line-300'
                "
              >
                Pemasukan
              </button>
            </div>
          </div>

          <!-- Color Swatches -->
          <div class="space-y-3">
            <label
              class="block text-[11px] font-bold text-ink-300 uppercase tracking-wider"
            >
              WARNA KATEGORI
            </label>
            <div class="flex items-center gap-3">
              <button
                v-for="color in colorSwatches"
                :key="color"
                type="button"
                @click="form.color = color"
                class="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer btn-bounce"
                :style="{ backgroundColor: color }"
              >
                <Check
                  v-if="form.color === color"
                  class="w-4 h-4 text-paper-0"
                />
              </button>
            </div>
          </div>

          <!-- Submit Button -->
          <div class="pt-2 flex gap-3">
            <button
              type="button"
              @click="
                isCreateModalOpen = false;
                isEditModalOpen = false;
              "
              class="flex-1 h-12 bg-base-50 text-ink-600 font-bold text-sm rounded-2xl cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="flex-1 h-12 bg-violet-600 text-paper-0 font-bold text-sm rounded-2xl shadow-violet flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Loader2 v-if="isSubmitting" class="w-4 h-4 animate-spin" />
              <span>{{ isSubmitting ? "Simpan..." : "Simpan Kategori" }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Delete Confirmation -->
    <div
      v-if="isDeleteModalOpen"
      class="fixed inset-0 z-50 bg-ink-900/40 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        class="w-full max-w-md bg-paper-0 border border-line-200 rounded-3xl p-6 shadow-card space-y-4 text-center"
      >
        <div
          class="w-12 h-12 rounded-full bg-expense-100 text-expense-600 flex items-center justify-center mx-auto"
        >
          <AlertTriangle class="w-6 h-6" />
        </div>
        <div>
          <h3 class="font-display font-bold text-lg text-ink-900">
            Hapus Kategori?
          </h3>
          <p class="text-xs text-ink-600 mt-1">
            Kategori
            <span class="font-bold text-ink-900">{{
              selectedCategory?.name
            }}</span>
            akan dihapus dari daftar.
          </p>
        </div>
        <div class="grid grid-cols-2 gap-3 pt-2">
          <button
            @click="isDeleteModalOpen = false"
            class="py-2.5 bg-base-50 text-ink-600 font-semibold text-xs rounded-xl hover:bg-base-100 transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            @click="handleDelete"
            :disabled="isSubmitting"
            class="py-2.5 bg-expense-600 text-paper-0 font-semibold text-xs rounded-xl shadow-soft hover:bg-expense-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Loader2 v-if="isSubmitting" class="w-4 h-4 animate-spin" />
            <span>{{ isSubmitting ? "Merapikan..." : "Ya, Hapus" }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
