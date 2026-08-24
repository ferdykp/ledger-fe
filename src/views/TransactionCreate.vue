<!-- ledger-web/src/views/TransactionCreate.vue -->
<script setup>
import { ref, onMounted, computed, watch } from "vue";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { useAccountStore } from "@/stores/account";
import { useCategoryStore } from "@/stores/category";
import { useNotificationStore } from "@/stores/notification";
import {
  X,
  Plus,
  Tag,
  Utensils,
  Car,
  ShoppingBag,
  MoreHorizontal,
  Wallet,
  Building2,
  CreditCard,
  Loader2,
  Check,
  Zap,
  Film,
  HeartPulse,
  GraduationCap,
  Home,
  Plane,
  Receipt,
  AlertTriangle,
} from "lucide-vue-next";
import api from "@/lib/axios";

const router = useRouter();
const accountStore = useAccountStore();
const categoryStore = useCategoryStore();
const notifyStore = useNotificationStore();

const { categories } = storeToRefs(categoryStore);
const { accounts } = storeToRefs(accountStore);

const isLoading = ref(false);

// State Modal Quick Add Category
const isAddCategoryModalOpen = ref(false);
const isCreatingCategory = ref(false);

// State Delete Kategori
const isDeleteCategoryModalOpen = ref(false);
const categoryToDelete = ref(null);
const isDeletingCategory = ref(false);

// State Modal Quick Add Account (Sumber Dana)
const isAddAccountModalOpen = ref(false);
const isCreatingAccount = ref(false);

// Form State Transaksi
const form = ref({
  type: "expense",
  amount: "",
  category_id: null,
  account_id: "",
  to_account_id: "",
  date: new Date().toISOString().split("T")[0],
  note: "",
});

// Form State Quick Add Category
const newCategoryForm = ref({
  name: "",
  type: "expense",
  color: "#6C4CF1",
  icon: "utensils",
});

// Form State Quick Add Account
const newAccountForm = ref({
  name: "",
  type: "cash",
  balance: 0,
});

// Otomatis pilih akun pertama jika account_id masih kosong
watch(
  accounts,
  (newAccounts) => {
    if (newAccounts.length > 0 && !form.value.account_id) {
      form.value.account_id = newAccounts[0].id;
    }
  },
  { immediate: true, deep: true },
);

const colorSwatches = [
  "#6C4CF1",
  "#17B978",
  "#FFB020",
  "#00AED6",
  "#F0473E",
  "#EC4899",
];

const availableIcons = [
  { id: "utensils", label: "Makanan", icon: Utensils },
  { id: "car", label: "Transport", icon: Car },
  { id: "shopping-bag", label: "Belanja", icon: ShoppingBag },
  { id: "zap", label: "Tagihan", icon: Zap },
  { id: "film", label: "Hiburan", icon: Film },
  { id: "heart-pulse", label: "Kesehatan", icon: HeartPulse },
  { id: "graduation-cap", label: "Edukasi", icon: GraduationCap },
  { id: "home", label: "Rumah", icon: Home },
  { id: "plane", label: "Travel", icon: Plane },
  { id: "receipt", label: "Pajak/Gaji", icon: Receipt },
  { id: "wallet", label: "Dompet", icon: Wallet },
  { id: "more-horizontal", label: "Lainnya", icon: MoreHorizontal },
];

const iconMap = {
  utensils: Utensils,
  car: Car,
  "shopping-bag": ShoppingBag,
  zap: Zap,
  film: Film,
  "heart-pulse": HeartPulse,
  "graduation-cap": GraduationCap,
  home: Home,
  plane: Plane,
  receipt: Receipt,
  wallet: Wallet,
  "more-horizontal": MoreHorizontal,
};

function getCategoryIcon(iconName) {
  return iconMap[iconName] || Tag;
}

watch(
  () => newCategoryForm.value.name,
  (newName) => {
    const query = newName.toLowerCase().trim();
    if (!query) return;

    if (/(makan|minum|kopi|cafe|restoran|food|snack|kuliner)/i.test(query)) {
      newCategoryForm.value.icon = "utensils";
    } else if (
      /(trans|mobil|motor|bensin|bbm|gojek|grab|parkir|tol|bus|kereta|flight)/i.test(
        query,
      )
    ) {
      newCategoryForm.value.icon = "car";
    } else if (
      /(belanja|shop|mall|baju|sepatu|tokopedia|shopee|indomaret|alfa)/i.test(
        query,
      )
    ) {
      newCategoryForm.value.icon = "shopping-bag";
    } else if (
      /(listrik|air|pdam|wifi|pulsa|paket|token|tagihan|bill)/i.test(query)
    ) {
      newCategoryForm.value.icon = "zap";
    } else if (
      /(nonton|bioskop|netflix|game|spotify|hiburan|rekreasi)/i.test(query)
    ) {
      newCategoryForm.value.icon = "film";
    } else if (
      /(sehat|obat|dokter|rumah sakit|klinik|skincare|gym)/i.test(query)
    ) {
      newCategoryForm.value.icon = "heart-pulse";
    } else if (/(sekolah|kuliah|kursus|buku|edukasi|pelatihan)/i.test(query)) {
      newCategoryForm.value.icon = "graduation-cap";
    } else if (/(rumah|kos|kontrakan|properti|perabot)/i.test(query)) {
      newCategoryForm.value.icon = "home";
    } else if (/(gaji|salary|bonus|pendapatan|income|invois)/i.test(query)) {
      newCategoryForm.value.icon = "receipt";
      newCategoryForm.value.color = "#17B978";
    }
  },
);

const availableCategories = computed(() => {
  return categories.value.filter((cat) => cat.type === form.value.type);
});

onMounted(async () => {
  if (accountStore.accounts.length === 0) {
    await accountStore.fetchAccounts();
  }
  if (accountStore.accounts.length > 0 && !form.value.account_id) {
    form.value.account_id = accountStore.accounts[0].id;
  }
  if (categoryStore.categories.length === 0) {
    await categoryStore.fetchCategories();
  }
});

const formattedAmount = computed({
  get() {
    if (!form.value.amount) return "";
    return Number(form.value.amount).toLocaleString("id-ID");
  },
  set(newValue) {
    const rawValue = newValue.replace(/\D/g, "");
    form.value.amount = rawValue ? Number(rawValue) : "";
  },
});

const formattedNewBalance = computed({
  get() {
    if (!newAccountForm.value.balance) return "";
    return Number(newAccountForm.value.balance).toLocaleString("id-ID");
  },
  set(newValue) {
    const rawValue = newValue.replace(/\D/g, "");
    newAccountForm.value.balance = rawValue ? Number(rawValue) : 0;
  },
});

function getAccountIcon(type) {
  if (type === "bank") return Building2;
  if (type === "credit_card") return CreditCard;
  return Wallet;
}

function openAddCategoryModal() {
  newCategoryForm.value.type = form.value.type;
  newCategoryForm.value.name = "";
  newCategoryForm.value.icon = "utensils";
  isAddCategoryModalOpen.value = true;
}

function openAddAccountModal() {
  newAccountForm.value = { name: "", type: "cash", balance: 0 };
  isAddAccountModalOpen.value = true;
}

function confirmDeleteCategory(cat, event) {
  event.stopPropagation();
  categoryToDelete.value = cat;
  isDeleteCategoryModalOpen.value = true;
}

async function handleDeleteCategory() {
  if (!categoryToDelete.value) return;
  isDeletingCategory.value = true;
  try {
    await categoryStore.deleteCategory(categoryToDelete.value.id);
    if (form.value.category_id === categoryToDelete.value.id) {
      form.value.category_id = null;
    }
    notifyStore.notify({
      message: "Kategori berhasil dihapus.",
      type: "success",
    });
    isDeleteCategoryModalOpen.value = false;
  } catch (err) {
    notifyStore.notify({
      message: err.response?.data?.message || "Gagal menghapus kategori.",
      type: "error",
    });
  } finally {
    isDeletingCategory.value = false;
    categoryToDelete.value = null;
  }
}

async function handleCreateCategory() {
  if (!newCategoryForm.value.name.trim()) return;
  isCreatingCategory.value = true;
  try {
    const createdCat = await categoryStore.addCategory(newCategoryForm.value);
    notifyStore.notify({
      message: "Kategori baru berhasil ditambahkan!",
      type: "success",
    });
    form.value.category_id = createdCat.id;
    isAddCategoryModalOpen.value = false;
  } catch (err) {
    notifyStore.notify({
      message: err.response?.data?.message || "Gagal membuat kategori.",
      type: "error",
    });
  } finally {
    isCreatingCategory.value = false;
  }
}

async function handleCreateAccount() {
  if (!newAccountForm.value.name.trim()) return;
  isCreatingAccount.value = true;
  try {
    const createdAcc = await accountStore.addAccount(newAccountForm.value);
    notifyStore.notify({
      message: "Sumber dana baru berhasil ditambahkan!",
      type: "success",
    });
    form.value.account_id = createdAcc.id;
    isAddAccountModalOpen.value = false;
  } catch (err) {
    notifyStore.notify({
      message: err.response?.data?.message || "Gagal menambah sumber dana.",
      type: "error",
    });
  } finally {
    isCreatingAccount.value = false;
  }
}

async function handleSubmit() {
  if (!form.value.amount || Number(form.value.amount) <= 0) {
    notifyStore.notify({
      message: "Nominal transaksi wajib diisi.",
      type: "error",
    });
    return;
  }

  if (!form.value.account_id) {
    notifyStore.notify({
      message: "Silakan pilih Sumber Dana / Akun terlebih dahulu.",
      type: "error",
    });
    return;
  }

  if (form.value.type === "transfer" && !form.value.to_account_id) {
    notifyStore.notify({
      message: "Silakan pilih Akun Tujuan Transfer.",
      type: "error",
    });
    return;
  }

  isLoading.value = true;
  try {
    await api.post("/api/transactions", form.value);
    notifyStore.notify({
      message: "Transaksi berhasil dicatat!",
      type: "success",
    });
    await accountStore.fetchAccounts();
    router.push("/dashboard");
  } catch (err) {
    notifyStore.notify({
      message: err.response?.data?.message || "Gagal mencatat transaksi.",
      type: "error",
    });
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div
    class="min-h-[85vh] flex items-center justify-center p-2 sm:p-4 font-body"
  >
    <div
      class="w-full max-w-lg bg-paper-0 border border-line-200 rounded-3xl shadow-card overflow-hidden"
    >
      <!-- Header -->
      <div
        class="px-6 py-5 border-b border-line-200 flex items-center justify-between"
      >
        <h2 class="font-display font-bold text-lg text-ink-900">
          Tambah Transaksi
        </h2>
        <button
          @click="router.back()"
          class="p-1 text-ink-600 hover:text-ink-900 rounded-full hover:bg-base-50 cursor-pointer"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="p-6 space-y-6">
        <!-- Segmented Type -->
        <div class="bg-violet-50/60 p-1 rounded-full flex items-center">
          <button
            type="button"
            @click="
              form.type = 'expense';
              form.category_id = null;
            "
            class="flex-1 py-2 rounded-full text-xs font-bold transition-all cursor-pointer text-center"
            :class="
              form.type === 'expense'
                ? 'bg-violet-600 text-paper-0 shadow-soft'
                : 'text-ink-600 hover:text-ink-900'
            "
          >
            Pengeluaran
          </button>
          <button
            type="button"
            @click="
              form.type = 'income';
              form.category_id = null;
            "
            class="flex-1 py-2 rounded-full text-xs font-bold transition-all cursor-pointer text-center"
            :class="
              form.type === 'income'
                ? 'bg-violet-600 text-paper-0 shadow-soft'
                : 'text-ink-600 hover:text-ink-900'
            "
          >
            Pemasukan
          </button>
          <button
            type="button"
            @click="
              form.type = 'transfer';
              form.category_id = null;
            "
            class="flex-1 py-2 rounded-full text-xs font-bold transition-all cursor-pointer text-center"
            :class="
              form.type === 'transfer'
                ? 'bg-violet-600 text-paper-0 shadow-soft'
                : 'text-ink-600 hover:text-ink-900'
            "
          >
            Transfer
          </button>
        </div>

        <!-- Big Amount Input -->
        <div class="text-center space-y-1 py-1">
          <p
            class="text-[11px] font-bold text-ink-300 uppercase tracking-wider"
          >
            JUMLAH NOMINAL
          </p>
          <div class="flex items-center justify-center gap-1.5">
            <span class="text-violet-600 font-bold text-xl md:text-2xl mt-1"
              >Rp</span
            >
            <input
              v-model="formattedAmount"
              type="text"
              placeholder="0"
              required
              class="w-full max-w-[280px] font-mono-money font-extrabold text-3xl md:text-4xl text-ink-900 text-center bg-transparent border-none focus:outline-none placeholder:text-ink-300"
            />
          </div>
        </div>

        <!-- Kategori (Kecuali Transfer) -->
        <div v-if="form.type !== 'transfer'" class="space-y-3">
          <div class="flex items-center justify-between">
            <label
              class="block text-[11px] font-bold text-ink-300 uppercase tracking-wider"
            >
              KATEGORI
            </label>
            <button
              type="button"
              @click="openAddCategoryModal"
              class="text-xs font-bold text-violet-600 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus class="w-3.5 h-3.5" />
              <span>Kategori</span>
            </button>
          </div>

          <div class="grid grid-cols-4 gap-3">
            <div
              v-for="cat in availableCategories"
              :key="cat.id"
              class="relative flex flex-col items-center group cursor-pointer"
              @click="
                form.category_id = form.category_id === cat.id ? null : cat.id
              "
            >
              <!-- Tombol Delete Kategori (Hover) -->
              <button
                type="button"
                @click="confirmDeleteCategory(cat, $event)"
                class="absolute -top-1 -right-1 w-5 h-5 bg-expense-600 text-paper-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-soft cursor-pointer"
                title="Hapus Kategori"
              >
                <X class="w-3 h-3 stroke-[3]" />
              </button>

              <div
                class="w-13 h-13 rounded-full flex items-center justify-center transition-all btn-bounce mb-2"
                :class="
                  form.category_id === cat.id
                    ? 'bg-rose-500 text-paper-0 shadow-soft ring-2 ring-rose-300 ring-offset-2'
                    : 'bg-violet-100 text-violet-600 hover:bg-violet-200'
                "
                :style="
                  form.category_id === cat.id && cat.color
                    ? { backgroundColor: cat.color }
                    : {}
                "
              >
                <component
                  :is="getCategoryIcon(cat.icon)"
                  class="w-5 h-5 stroke-[2.2]"
                />
              </div>
              <span
                class="text-[11px] font-semibold text-ink-900 truncate max-w-[70px] text-center"
              >
                {{ cat.name }}
              </span>
            </div>

            <!-- Tombol Quick Add Kategori -->
            <button
              type="button"
              @click="openAddCategoryModal"
              class="flex flex-col items-center gap-2 group cursor-pointer"
            >
              <div
                class="w-13 h-13 rounded-full border-2 border-dashed border-line-300 group-hover:border-violet-600 flex items-center justify-center text-ink-400 group-hover:text-violet-600 transition-colors"
              >
                <Plus class="w-5 h-5" />
              </div>
              <span
                class="text-[11px] font-semibold text-ink-400 group-hover:text-violet-600"
              >
                Tambah
              </span>
            </button>
          </div>
        </div>

        <!-- Sumber Dana -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <label
              class="block text-[11px] font-bold text-ink-300 uppercase tracking-wider"
            >
              {{ form.type === "transfer" ? "DARI DOMPET" : "SUMBER DANA" }}
            </label>
            <button
              type="button"
              @click="openAddAccountModal"
              class="text-xs font-bold text-violet-600 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus class="w-3.5 h-3.5" />
              <span>Sumber Dana</span>
            </button>
          </div>

          <div
            class="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar"
          >
            <!-- Chip Daftar Akun/Sumber Dana -->
            <button
              v-for="acc in accountStore.accounts"
              :key="acc.id"
              type="button"
              @click="form.account_id = acc.id"
              class="flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-semibold shrink-0 transition-all cursor-pointer btn-bounce"
              :class="
                form.account_id === acc.id
                  ? 'border-violet-600 bg-violet-50 text-violet-700 ring-2 ring-violet-600/30 font-bold'
                  : 'border-line-200 bg-paper-0 text-ink-600 hover:border-line-300'
              "
            >
              <component
                :is="getAccountIcon(acc.type)"
                class="w-4 h-4 text-violet-600"
              />
              <span>{{ acc.name }}</span>
            </button>

            <!-- Tombol Lingkaran Putus-Putus Tambah Sumber Dana -->
            <button
              type="button"
              @click="openAddAccountModal"
              class="flex items-center gap-1.5 px-3 py-2 rounded-full border-2 border-dashed border-line-300 hover:border-violet-600 text-ink-400 hover:text-violet-600 text-xs font-semibold shrink-0 transition-colors cursor-pointer group"
              title="Tambah Sumber Dana"
            >
              <div
                class="w-5 h-5 rounded-full border border-dashed border-ink-400 group-hover:border-violet-600 flex items-center justify-center"
              >
                <Plus class="w-3 h-3" />
              </div>
              <span>Tambah</span>
            </button>
          </div>
        </div>

        <!-- Akun Tujuan (Khusus Tipe Transfer) -->
        <div v-if="form.type === 'transfer'" class="space-y-3">
          <label
            class="block text-[11px] font-bold text-ink-300 uppercase tracking-wider"
          >
            KE DOMPET TUJUAN
          </label>
          <div
            class="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar"
          >
            <button
              v-for="acc in accountStore.accounts.filter(
                (a) => a.id !== form.account_id,
              )"
              :key="acc.id"
              type="button"
              @click="form.to_account_id = acc.id"
              class="flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-semibold shrink-0 transition-all cursor-pointer btn-bounce"
              :class="
                form.to_account_id === acc.id
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-600/30 font-bold'
                  : 'border-line-200 bg-paper-0 text-ink-600 hover:border-line-300'
              "
            >
              <component
                :is="getAccountIcon(acc.type)"
                class="w-4 h-4 text-emerald-600"
              />
              <span>{{ acc.name }}</span>
            </button>
          </div>
        </div>

        <!-- Tanggal Input -->
        <div class="space-y-2">
          <label
            class="block text-[11px] font-bold text-ink-300 uppercase tracking-wider"
          >
            TANGGAL
          </label>
          <input
            v-model="form.date"
            type="date"
            required
            class="w-full px-4 h-12 border border-line-200 rounded-xl bg-paper-0 focus:border-violet-600 focus:outline-none text-sm font-medium text-ink-900 transition-colors"
          />
        </div>

        <!-- Catatan -->
        <div class="space-y-2">
          <label
            class="block text-[11px] font-bold text-ink-300 uppercase tracking-wider"
          >
            CATATAN (OPSIONAL)
          </label>
          <textarea
            v-model="form.note"
            rows="2"
            placeholder="Tambahkan deskripsi..."
            class="w-full px-4 py-3 border border-line-200 rounded-xl bg-paper-0 focus:border-violet-600 focus:outline-none text-sm text-ink-900 transition-colors placeholder:text-ink-300 resize-none"
          ></textarea>
        </div>

        <!-- Submit Button -->
        <div class="pt-2">
          <button
            type="submit"
            :disabled="isLoading"
            class="w-full h-12 bg-violet-600 text-paper-0 font-bold text-sm rounded-2xl shadow-violet btn-bounce cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Loader2 v-if="isLoading" class="w-5 h-5 animate-spin" />
            <span>{{ isLoading ? "Menyimpan..." : "Catat Transaksi" }}</span>
          </button>
        </div>
      </form>
    </div>

    <!-- Quick Modal Tambah Kategori -->
    <div
      v-if="isAddCategoryModalOpen"
      class="fixed inset-0 z-50 bg-ink-900/40 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        class="w-full max-w-md bg-paper-0 border border-line-200 rounded-3xl shadow-card overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        <div
          class="px-6 py-4 border-b border-line-200 flex items-center justify-between"
        >
          <h3 class="font-display font-bold text-base text-ink-900">
            Tambah Kategori Baru
          </h3>
          <button
            @click="isAddCategoryModalOpen = false"
            class="p-1 text-ink-600 hover:text-ink-900 rounded-full cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <form @submit.prevent="handleCreateCategory" class="p-6 space-y-4">
          <div class="space-y-1.5">
            <label
              class="block text-[11px] font-bold text-ink-300 uppercase tracking-wider"
            >
              Nama Kategori
            </label>
            <input
              v-model="newCategoryForm.name"
              type="text"
              required
              placeholder="Contoh: Transportasi, Bensin, Gojek"
              class="w-full px-4 h-11 border border-line-200 rounded-xl bg-paper-0 focus:border-violet-600 focus:outline-none text-sm font-medium text-ink-900"
            />
          </div>

          <div class="space-y-2">
            <label
              class="block text-[11px] font-bold text-ink-300 uppercase tracking-wider"
            >
              Pilih Ikon
            </label>
            <div
              class="grid grid-cols-6 gap-2 bg-base-50 p-2 rounded-2xl border border-line-200 max-h-36 overflow-y-auto no-scrollbar"
            >
              <button
                v-for="item in availableIcons"
                :key="item.id"
                type="button"
                @click="newCategoryForm.icon = item.id"
                class="w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer"
                :class="
                  newCategoryForm.icon === item.id
                    ? 'bg-violet-600 text-paper-0 shadow-soft scale-105'
                    : 'text-ink-600 hover:bg-paper-0'
                "
                :title="item.label"
              >
                <component :is="item.icon" class="w-5 h-5 stroke-[2.2]" />
              </button>
            </div>
          </div>

          <div class="space-y-2">
            <label
              class="block text-[11px] font-bold text-ink-300 uppercase tracking-wider"
            >
              Warna
            </label>
            <div class="flex items-center gap-2.5">
              <button
                v-for="color in colorSwatches"
                :key="color"
                type="button"
                @click="newCategoryForm.color = color"
                class="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer btn-bounce"
                :style="{ backgroundColor: color }"
              >
                <Check
                  v-if="newCategoryForm.color === color"
                  class="w-3.5 h-3.5 text-paper-0"
                />
              </button>
            </div>
          </div>

          <div class="pt-2 flex gap-2">
            <button
              type="button"
              @click="isAddCategoryModalOpen = false"
              class="flex-1 h-11 bg-base-50 text-ink-600 font-bold text-xs rounded-xl cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="isCreatingCategory"
              class="flex-1 h-11 bg-violet-600 text-paper-0 font-bold text-xs rounded-xl shadow-violet flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Loader2 v-if="isCreatingCategory" class="w-4 h-4 animate-spin" />
              <span>Simpan</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Quick Modal Tambah Sumber Dana (Akun / Dompet) -->
    <div
      v-if="isAddAccountModalOpen"
      class="fixed inset-0 z-50 bg-ink-900/40 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        class="w-full max-w-md bg-paper-0 border border-line-200 rounded-3xl shadow-card overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        <div
          class="px-6 py-4 border-b border-line-200 flex items-center justify-between"
        >
          <h3 class="font-display font-bold text-base text-ink-900">
            Tambah Sumber Dana Baru
          </h3>
          <button
            @click="isAddAccountModalOpen = false"
            class="p-1 text-ink-600 hover:text-ink-900 rounded-full cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <form @submit.prevent="handleCreateAccount" class="p-6 space-y-4">
          <div class="space-y-1.5">
            <label
              class="block text-[11px] font-bold text-ink-300 uppercase tracking-wider"
            >
              Nama Dompet / Rekening
            </label>
            <input
              v-model="newAccountForm.name"
              type="text"
              required
              placeholder="Contoh: BCA Utama, Gopay, Dompet Tunai"
              class="w-full px-4 h-11 border border-line-200 rounded-xl bg-paper-0 focus:border-violet-600 focus:outline-none text-sm font-medium text-ink-900"
            />
          </div>

          <div class="space-y-1.5">
            <label
              class="block text-[11px] font-bold text-ink-300 uppercase tracking-wider"
            >
              Tipe Dompet
            </label>
            <select
              v-model="newAccountForm.type"
              class="w-full px-4 h-11 border border-line-200 rounded-xl bg-paper-0 focus:border-violet-600 focus:outline-none text-xs font-semibold text-ink-900"
            >
              <option value="cash">Tunai (Cash)</option>
              <option value="bank">Bank</option>
              <option value="ewallet">E-Wallet</option>
              <option value="credit_card">Kartu Kredit</option>
            </select>
          </div>

          <div class="space-y-1.5">
            <label
              class="block text-[11px] font-bold text-ink-300 uppercase tracking-wider"
            >
              Saldo Awal
            </label>
            <div class="relative flex items-center">
              <span class="absolute left-4 text-sm font-bold text-violet-600"
                >Rp</span
              >
              <input
                v-model="formattedNewBalance"
                type="text"
                placeholder="0"
                class="w-full pl-11 pr-4 h-11 border border-line-200 rounded-xl bg-paper-0 focus:border-violet-600 focus:outline-none text-sm font-mono-money font-extrabold text-ink-900"
              />
            </div>
          </div>

          <div class="pt-2 flex gap-2">
            <button
              type="button"
              @click="isAddAccountModalOpen = false"
              class="flex-1 h-11 bg-base-50 text-ink-600 font-bold text-xs rounded-xl cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="isCreatingAccount"
              class="flex-1 h-11 bg-violet-600 text-paper-0 font-bold text-xs rounded-xl shadow-violet flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Loader2 v-if="isCreatingAccount" class="w-4 h-4 animate-spin" />
              <span>Simpan Sumber Dana</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Konfirmasi Hapus Kategori -->
    <div
      v-if="isDeleteCategoryModalOpen"
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
            Hapus Kategori?
          </h3>
          <p class="text-xs text-ink-600 mt-1">
            Kategori
            <span class="font-bold text-ink-900">{{
              categoryToDelete?.name
            }}</span>
            akan dihapus dari daftar.
          </p>
        </div>
        <div class="grid grid-cols-2 gap-2 pt-2">
          <button
            @click="isDeleteCategoryModalOpen = false"
            class="py-2.5 bg-base-50 text-ink-600 font-semibold text-xs rounded-xl hover:bg-base-100 transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            @click="handleDeleteCategory"
            :disabled="isDeletingCategory"
            class="py-2.5 bg-expense-600 text-paper-0 font-semibold text-xs rounded-xl shadow-soft hover:bg-expense-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Loader2
              v-if="isDeletingCategory"
              class="w-3.5 h-3.5 animate-spin"
            />
            <span>{{ isDeletingCategory ? "Menghapus..." : "Ya, Hapus" }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
