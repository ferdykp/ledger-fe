<!-- ledger-web/src/views/Budget.vue -->
<script setup>
import { ref, onMounted, computed } from "vue";
import { storeToRefs } from "pinia";
import { useBudgetStore } from "@/stores/budget";
import { useCategoryStore } from "@/stores/category";
import { useNotificationStore } from "@/stores/notification";
import { formatRupiah } from "@/utils/formatters";
import {
  Plus,
  Target,
  Utensils,
  Car,
  ShoppingBag,
  Zap,
  Tag,
  Pencil,
  Trash2,
  X,
  Loader2,
  AlertTriangle,
} from "lucide-vue-next";

const budgetStore = useBudgetStore();
const categoryStore = useCategoryStore();
const notifyStore = useNotificationStore();

const {
  budgets,
  isLoading,
  totalBudgetLimit,
  totalBudgetSpent,
  totalBudgetPercentage,
} = storeToRefs(budgetStore);
const { categories } = storeToRefs(categoryStore);

// Month Picker State
const currentMonth = ref(new Date().toISOString().slice(0, 7));

// Modal States
const isModalOpen = ref(false);
const isSubmitting = ref(false);
const editingBudgetId = ref(null);

// Delete Modal States
const isDeleteModalOpen = ref(false);
const budgetToDelete = ref(null);
const isDeleting = ref(false);

const form = ref({
  category_id: "",
  amount_limit: 0,
  start_date: `${currentMonth.value}-01`,
  period: "monthly",
});

// Formatter Input Limit Nominal
const formattedAmountLimit = computed({
  get() {
    if (!form.value.amount_limit) return "";
    return Number(form.value.amount_limit).toLocaleString("id-ID");
  },
  set(newValue) {
    const rawValue = newValue.replace(/\D/g, "");
    form.value.amount_limit = rawValue ? Number(rawValue) : 0;
  },
});

const iconMap = {
  utensils: Utensils,
  car: Car,
  "shopping-bag": ShoppingBag,
  zap: Zap,
};

function getCategoryIcon(iconName) {
  return iconMap[iconName] || Tag;
}

const remainingDaysInMonth = computed(() => {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return Math.max(0, lastDay - now.getDate());
});

onMounted(async () => {
  await budgetStore.fetchBudgets(currentMonth.value);
  if (categories.value.length === 0) {
    await categoryStore.fetchCategories();
  }
});

function openModal(budgetToEdit = null) {
  if (budgetToEdit) {
    editingBudgetId.value = budgetToEdit.id;
    form.value = {
      category_id: budgetToEdit.category?.id,
      amount_limit: budgetToEdit.amount_limit,
      start_date: `${currentMonth.value}-01`,
      period: "monthly",
    };
  } else {
    editingBudgetId.value = null;
    const availableCategory = categories.value.find(
      (c) => c.type === "expense",
    );
    form.value = {
      category_id: availableCategory?.id || "",
      amount_limit: 0,
      start_date: `${currentMonth.value}-01`,
      period: "monthly",
    };
  }
  isModalOpen.value = true;
}

async function handleSaveBudget() {
  if (!form.value.category_id || !form.value.amount_limit) return;

  isSubmitting.value = true;
  try {
    form.value.start_date = `${currentMonth.value}-01`;
    await budgetStore.saveBudget(form.value);
    notifyStore.notify({
      message: "Budget berhasil disimpan!",
      type: "success",
    });
    isModalOpen.value = false;
  } catch (err) {
    notifyStore.notify({
      message: err.response?.data?.message || "Gagal menyimpan budget.",
      type: "error",
    });
  } finally {
    isSubmitting.value = false;
  }
}

// Konfirmasi & Hapus Budget
function confirmDeleteBudget(budget) {
  budgetToDelete.value = budget;
  isDeleteModalOpen.value = true;
}

async function handleDeleteBudget() {
  if (!budgetToDelete.value) return;
  isDeleting.value = true;
  try {
    await budgetStore.deleteBudget(budgetToDelete.value.id);
    notifyStore.notify({
      message: "Limit budget berhasil dihapus.",
      type: "success",
    });
    isDeleteModalOpen.value = false;
  } catch (err) {
    notifyStore.notify({ message: "Gagal menghapus budget.", type: "error" });
  } finally {
    isDeleting.value = false;
    budgetToDelete.value = null;
  }
}
</script>

<template>
  <div class="space-y-6 font-body">
    <!-- Header Halaman -->
    <div class="flex items-center justify-between">
      <h1 class="font-display text-2xl md:text-3xl font-bold text-ink-900">
        Budget Bulanan
      </h1>

      <button
        type="button"
        @click="openModal()"
        class="inline-flex items-center justify-center gap-2 px-5 py-3 bg-violet-600 text-paper-0 rounded-2xl font-bold text-sm shadow-violet btn-bounce cursor-pointer"
      >
        <Plus class="w-4 h-4 stroke-[2.5]" />
        <span>Buat Budget</span>
      </button>
    </div>

    <!-- Hero Banner Card -->
    <div
      class="bg-violet-100/70 border border-violet-200/50 rounded-3xl p-6 sm:p-8 shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-6"
    >
      <div class="space-y-2">
        <span class="text-xs font-semibold text-ink-600 block">
          Total Pengeluaran / Budget
        </span>
        <div class="flex items-baseline gap-2 flex-wrap">
          <span
            class="font-mono-money font-black text-3xl sm:text-4xl text-violet-600"
          >
            {{ formatRupiah(totalBudgetSpent) }}
          </span>
          <span
            class="font-mono-money font-extrabold text-xl sm:text-2xl text-ink-900"
          >
            / {{ formatRupiah(totalBudgetLimit) }}
          </span>
        </div>
      </div>

      <div class="w-full md:w-72 space-y-2">
        <div
          class="flex items-center justify-between text-xs font-bold text-ink-600"
        >
          <span>Tersisa {{ remainingDaysInMonth }} Hari</span>
          <span>{{ totalBudgetPercentage }}% Terpakai</span>
        </div>
        <div class="w-full bg-violet-200/60 h-3 rounded-full overflow-hidden">
          <div
            class="bg-violet-600 h-full rounded-full transition-all duration-500"
            :style="{ width: `${totalBudgetPercentage}%` }"
          ></div>
        </div>
      </div>
    </div>

    <!-- List Cards Budget Per Kategori -->
    <div class="space-y-4">
      <template v-if="isLoading">
        <div
          v-for="i in 3"
          :key="i"
          class="h-28 bg-paper-0 border border-line-200 rounded-3xl p-6 space-y-4 animate-pulse"
        >
          <div class="flex justify-between">
            <div class="w-32 h-5 bg-base-100 rounded"></div>
            <div class="w-24 h-5 bg-base-100 rounded"></div>
          </div>
          <div class="w-full h-3 bg-base-100 rounded-full"></div>
        </div>
      </template>

      <template v-else-if="budgets.length === 0">
        <div
          class="py-16 text-center bg-paper-0 border border-line-200 rounded-3xl space-y-3 shadow-soft"
        >
          <Target class="w-10 h-10 text-ink-300 mx-auto" />
          <p class="text-sm font-semibold text-ink-600">
            Belum ada budget yang diset untuk bulan ini.
          </p>
        </div>
      </template>

      <template v-else>
        <div
          v-for="b in budgets"
          :key="b.id"
          class="bg-paper-0 border border-line-200 rounded-3xl p-6 shadow-soft hover:shadow-card transition-all space-y-4 group relative"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <div
                class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-soft"
                :style="{
                  backgroundColor: `${b.category?.color || '#6C4CF1'}18`,
                  color: b.category?.color || '#6C4CF1',
                }"
              >
                <component
                  :is="getCategoryIcon(b.category?.icon)"
                  class="w-6 h-6 stroke-[2.2]"
                />
              </div>

              <h3
                class="font-display font-bold text-base md:text-lg text-ink-900"
              >
                {{ b.category?.name }}
              </h3>
            </div>

            <div class="flex items-center gap-4">
              <div class="text-right">
                <span
                  class="font-mono-money font-black text-base md:text-lg block"
                  :class="
                    b.spent_amount > b.amount_limit
                      ? 'text-expense-600'
                      : 'text-ink-900'
                  "
                >
                  {{ formatRupiah(b.spent_amount) }}
                </span>
                <span
                  class="font-mono-money font-semibold text-xs md:text-sm text-ink-400 block"
                >
                  / {{ formatRupiah(b.amount_limit) }}
                </span>
              </div>

              <!-- Quick Action Edit & Delete -->
              <div
                class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <button
                  @click="openModal(b)"
                  class="p-1.5 text-ink-400 hover:text-violet-600 rounded-lg hover:bg-violet-50 cursor-pointer"
                >
                  <Pencil class="w-4 h-4" />
                </button>
                <button
                  @click="confirmDeleteBudget(b)"
                  class="p-1.5 text-ink-400 hover:text-expense-600 rounded-lg hover:bg-expense-50 cursor-pointer"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div class="w-full bg-violet-100 h-3 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500"
              :class="{
                'bg-emerald-500': b.percentage < 80,
                'bg-amber-500': b.percentage >= 80 && b.percentage <= 100,
                'bg-rose-500': b.percentage > 100,
              }"
              :style="{ width: `${Math.min(100, b.percentage)}%` }"
            ></div>
          </div>
        </div>
      </template>
    </div>

    <!-- Modal Set / Edit Limit Budget -->
    <div
      v-if="isModalOpen"
      class="fixed inset-0 z-50 bg-ink-900/40 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        class="w-full max-w-md bg-paper-0 border border-line-200 rounded-3xl shadow-card overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        <div
          class="px-6 py-4 border-b border-line-200 flex items-center justify-between"
        >
          <h3 class="font-display font-bold text-base text-ink-900">
            {{ editingBudgetId ? "Edit Budget" : "Buat Budget Baru" }}
          </h3>
          <button
            @click="isModalOpen = false"
            class="p-1 text-ink-600 hover:text-ink-900 rounded-full cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <form @submit.prevent="handleSaveBudget" class="p-6 space-y-4">
          <div class="space-y-1.5">
            <label
              class="block text-[11px] font-bold text-ink-300 uppercase tracking-wider"
            >
              KATEGORI PENGELUARAN
            </label>
            <select
              v-model="form.category_id"
              required
              :disabled="!!editingBudgetId"
              class="w-full px-4 h-11 border border-line-200 rounded-xl bg-paper-0 focus:border-violet-600 text-xs font-semibold text-ink-900 focus:outline-none disabled:opacity-60"
            >
              <option value="" disabled>Pilih Kategori</option>
              <option
                v-for="cat in categories.filter((c) => c.type === 'expense')"
                :key="cat.id"
                :value="cat.id"
              >
                {{ cat.name }}
              </option>
            </select>
          </div>

          <div class="space-y-1.5">
            <label
              class="block text-[11px] font-bold text-ink-300 uppercase tracking-wider"
            >
              BATAS LIMIT NOMINAL
            </label>
            <div class="relative flex items-center">
              <span class="absolute left-4 text-sm font-bold text-violet-600"
                >Rp</span
              >
              <input
                v-model="formattedAmountLimit"
                type="text"
                required
                placeholder="0"
                class="w-full pl-11 pr-4 h-11 border border-line-200 rounded-xl bg-paper-0 focus:border-violet-600 focus:outline-none text-sm font-mono-money font-extrabold text-ink-900"
              />
            </div>
          </div>

          <div class="pt-2 flex gap-2">
            <button
              type="button"
              @click="isModalOpen = false"
              class="flex-1 h-11 bg-base-50 text-ink-600 font-bold text-xs rounded-xl cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="flex-1 h-11 bg-violet-600 text-paper-0 font-bold text-xs rounded-xl shadow-violet flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Loader2 v-if="isSubmitting" class="w-4 h-4 animate-spin" />
              <span>Simpan Budget</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Konfirmasi Hapus Budget -->
    <div
      v-if="isDeleteModalOpen"
      class="fixed inset-0 z-50 bg-ink-900/40 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        class="w-full max-w-sm bg-paper-0 border border-line-200 rounded-3xl p-6 shadow-card space-y-4 text-center animate-in fade-in zoom-in-95 duration-150"
      >
        <div
          class="w-12 h-12 rounded-full bg-expense-100 text-expense-600 flex items-center justify-center mx-auto"
        >
          <AlertTriangle class="w-6 h-6" />
        </div>
        <div>
          <h3 class="font-display font-bold text-base text-ink-900">
            Hapus Limit Budget?
          </h3>
          <p class="text-xs text-ink-600 mt-1">
            Budget untuk kategori
            <span class="font-bold text-ink-900">{{
              budgetToDelete?.category?.name
            }}</span>
            akan dihapus dari alokasi bulan ini.
          </p>
        </div>
        <div class="grid grid-cols-2 gap-2 pt-2">
          <button
            @click="isDeleteModalOpen = false"
            class="py-2.5 bg-base-50 text-ink-600 font-semibold text-xs rounded-xl hover:bg-base-100 transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            @click="handleDeleteBudget"
            :disabled="isDeleting"
            class="py-2.5 bg-expense-600 text-paper-0 font-semibold text-xs rounded-xl shadow-soft hover:bg-expense-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Loader2 v-if="isDeleting" class="w-3.5 h-3.5 animate-spin" />
            <span>{{ isDeleting ? "Menghapus..." : "Ya, Hapus" }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
