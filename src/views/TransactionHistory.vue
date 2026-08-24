<!-- ledger-web/src/views/TransactionHistory.vue -->
<script setup>
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { useAccountStore } from "@/stores/account";
import { useCategoryStore } from "@/stores/category";
import { formatRupiah } from "@/utils/formatters";
import {
  Plus,
  Search,
  ChevronDown,
  Utensils,
  Car,
  ShoppingBag,
  Building2,
  Tag,
  X,
  History,
  Trash2,
  AlertTriangle,
  Loader2,
} from "lucide-vue-next";
import api from "@/lib/axios";

const router = useRouter();
const accountStore = useAccountStore();
const categoryStore = useCategoryStore();

const { accounts } = storeToRefs(accountStore);
const { categories } = storeToRefs(categoryStore);

const transactions = ref([]);
const isLoading = ref(false);

// Filter & Search State
const searchQuery = ref("");
const selectedTime = ref("all");
const selectedCategory = ref("all");
const selectedAccount = ref("all");
const selectedType = ref("all");

// State Delete Modal
const isDeleteModalOpen = ref(false);
const transactionToDelete = ref(null);
const isDeleting = ref(false);

const iconMap = {
  makanan: Utensils,
  transportasi: Car,
  belanja: ShoppingBag,
  pendapatan: Building2,
};

function getCategoryIcon(categoryName) {
  if (!categoryName) return Tag;
  const key = categoryName.toLowerCase();
  for (const k in iconMap) {
    if (key.includes(k)) return iconMap[k];
  }
  return Tag;
}

onMounted(async () => {
  fetchTransactions();
  if (accounts.value.length === 0) accountStore.fetchAccounts();
  if (categories.value.length === 0) categoryStore.fetchCategories();
});

async function fetchTransactions() {
  isLoading.value = true;
  try {
    const res = await api.get("/api/transactions");
    transactions.value = res.data.data || res.data || [];
  } catch (err) {
    console.warn("Gagal memuat riwayat transaksi:", err.message);
    transactions.value = [];
  } finally {
    isLoading.value = false;
  }
}

// Filtering Logic
const filteredTransactions = computed(() => {
  return transactions.value.filter((tx) => {
    // Search Filter
    const query = searchQuery.value.toLowerCase();
    const noteMatch = tx.note?.toLowerCase().includes(query);
    const categoryMatch = tx.category?.name?.toLowerCase().includes(query);
    const accountMatch = tx.account?.name?.toLowerCase().includes(query);
    const matchesSearch = !query || noteMatch || categoryMatch || accountMatch;

    // Category Filter
    const matchesCategory =
      selectedCategory.value === "all" ||
      String(tx.category_id) === String(selectedCategory.value);

    // Account Filter
    const matchesAccount =
      selectedAccount.value === "all" ||
      String(tx.account_id) === String(selectedAccount.value);

    // Type Filter
    const matchesType =
      selectedType.value === "all" || tx.type === selectedType.value;

    return matchesSearch && matchesCategory && matchesAccount && matchesType;
  });
});

// Group Transactions by Date
const groupedTransactions = computed(() => {
  const groups = {};

  filteredTransactions.value.forEach((tx) => {
    const dateKey = tx.date;
    if (!groups[dateKey]) {
      groups[dateKey] = {
        dateLabel: formatDateLabel(dateKey),
        transactions: [],
        dailyTotal: 0,
      };
    }

    groups[dateKey].transactions.push(tx);

    const amount = parseFloat(tx.amount || 0);
    if (tx.type === "income") {
      groups[dateKey].dailyTotal += amount;
    } else if (tx.type === "expense") {
      groups[dateKey].dailyTotal -= amount;
    }
  });

  return Object.values(groups).sort(
    (a, b) =>
      new Date(b.transactions[0].date) - new Date(a.transactions[0].date),
  );
});

function formatDateLabel(dateStr) {
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  const dateObj = new Date(dateStr);
  const formattedDate = dateObj.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  if (dateStr === today) return `Hari Ini, ${formattedDate}`;
  if (dateStr === yesterday) return `Kemarin, ${formattedDate}`;
  return formattedDate;
}

function confirmDelete(tx) {
  transactionToDelete.value = tx;
  isDeleteModalOpen.value = true;
}

async function handleDelete() {
  if (!transactionToDelete.value) return;
  isDeleting.value = true;
  try {
    await api.delete(`/api/transactions/${transactionToDelete.value.id}`);
    transactions.value = transactions.value.filter(
      (t) => t.id !== transactionToDelete.value.id,
    );
    await accountStore.fetchAccounts();
    isDeleteModalOpen.value = false;
  } catch (err) {
    console.error("Gagal menghapus transaksi:", err.message);
  } finally {
    isDeleting.value = false;
    transactionToDelete.value = null;
  }
}
</script>

<template>
  <div class="space-y-6 font-body">
    <!-- Header Halaman -->
    <div
      class="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
    >
      <div>
        <h1 class="font-display text-2xl md:text-3xl font-bold text-ink-900">
          Riwayat Transaksi
        </h1>
        <p class="text-ink-600 text-sm mt-1">
          Kelola dan pantau semua aktivitas keuangan Anda.
        </p>
      </div>

      <router-link
        to="/transactions/create"
        class="inline-flex items-center justify-center gap-2 px-5 py-3 bg-violet-600 text-paper-0 rounded-2xl font-bold text-sm shadow-violet btn-bounce self-start sm:self-auto"
      >
        <Plus class="w-4 h-4 stroke-[2.5]" />
        <span>Tambah Transaksi</span>
      </router-link>
    </div>

    <!-- FILTER & SEARCH BAR -->
    <div
      class="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3"
    >
      <!-- Pill Selectors Group -->
      <div
        class="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 no-scrollbar"
      >
        <!-- Filter Waktu -->
        <div class="relative shrink-0">
          <select
            v-model="selectedTime"
            class="appearance-none pl-4 pr-8 py-2 bg-paper-0 border border-violet-600/40 focus:border-violet-600 text-violet-700 rounded-full text-xs font-bold cursor-pointer focus:outline-none"
          >
            <option value="all">Semua Waktu</option>
            <option value="this_month">Bulan Ini</option>
            <option value="last_month">Bulan Lalu</option>
          </select>
          <ChevronDown
            class="w-3.5 h-3.5 text-violet-600 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
          />
        </div>

        <!-- Filter Kategori -->
        <div class="relative shrink-0">
          <select
            v-model="selectedCategory"
            class="appearance-none pl-4 pr-8 py-2 bg-paper-0 border border-line-200 focus:border-violet-600 text-ink-700 rounded-full text-xs font-semibold cursor-pointer focus:outline-none"
          >
            <option value="all">Kategori: Semua</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">
              {{ cat.name }}
            </option>
          </select>
          <ChevronDown
            class="w-3.5 h-3.5 text-ink-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
          />
        </div>

        <!-- Filter Akun -->
        <div class="relative shrink-0">
          <select
            v-model="selectedAccount"
            class="appearance-none pl-4 pr-8 py-2 bg-paper-0 border border-line-200 focus:border-violet-600 text-ink-700 rounded-full text-xs font-semibold cursor-pointer focus:outline-none"
          >
            <option value="all">Akun: Semua</option>
            <option v-for="acc in accounts" :key="acc.id" :value="acc.id">
              {{ acc.name }}
            </option>
          </select>
          <ChevronDown
            class="w-3.5 h-3.5 text-ink-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
          />
        </div>

        <!-- Filter Jenis Transaksi -->
        <div class="relative shrink-0">
          <select
            v-model="selectedType"
            class="appearance-none pl-4 pr-8 py-2 bg-paper-0 border border-line-200 focus:border-violet-600 text-ink-700 rounded-full text-xs font-semibold cursor-pointer focus:outline-none"
          >
            <option value="all">Jenis Transaksi</option>
            <option value="expense">Pengeluaran</option>
            <option value="income">Pemasukan</option>
            <option value="transfer">Transfer</option>
          </select>
          <ChevronDown
            class="w-3.5 h-3.5 text-ink-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
          />
        </div>
      </div>

      <!-- Search Input Field -->
      <div class="relative min-w-[240px]">
        <Search
          class="w-4 h-4 text-ink-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
        />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari transaksi..."
          class="w-full pl-9 pr-4 h-9 border border-line-200 rounded-xl bg-paper-0 focus:border-violet-600 focus:outline-none text-xs text-ink-900 placeholder:text-ink-300 transition-colors"
        />
        <button
          v-if="searchQuery"
          @click="searchQuery = ''"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-900 cursor-pointer"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    <!-- LIST TRANSAKSI BERDASARKAN TANGGAL -->
    <div class="space-y-6">
      <template v-if="isLoading">
        <div v-for="i in 3" :key="i" class="space-y-3">
          <div class="w-32 h-4 bg-base-100 rounded animate-pulse"></div>
          <div
            class="h-16 bg-paper-0 border border-line-200 rounded-2xl animate-pulse"
          ></div>
        </div>
      </template>

      <template v-else-if="groupedTransactions.length === 0">
        <div
          class="py-16 text-center bg-paper-0 border border-line-200 rounded-3xl space-y-3 shadow-soft"
        >
          <History class="w-10 h-10 text-ink-300 mx-auto" />
          <p class="text-sm font-semibold text-ink-600">
            Tidak ada transaksi yang cocok dengan pencarian Anda.
          </p>
        </div>
      </template>

      <template v-else>
        <div
          v-for="group in groupedTransactions"
          :key="group.dateLabel"
          class="space-y-3"
        >
          <!-- Date Header & Daily Total -->
          <div class="flex items-center justify-between px-1">
            <h3 class="font-display font-bold text-sm text-ink-900">
              {{ group.dateLabel }}
            </h3>
            <span
              class="font-mono-money font-bold text-xs"
              :class="
                group.dailyTotal >= 0 ? 'text-violet-600' : 'text-rose-500'
              "
            >
              {{ group.dailyTotal >= 0 ? "+ " : "- " }}
              {{ formatRupiah(Math.abs(group.dailyTotal)) }}
            </span>
          </div>

          <!-- Transaction Card Item -->
          <div class="space-y-2">
            <div
              v-for="tx in group.transactions"
              :key="tx.id"
              class="bg-paper-0 border border-line-200/80 rounded-2xl p-4 shadow-soft hover:shadow-card transition-all flex items-center justify-between group cursor-pointer"
            >
              <div class="flex items-center gap-3.5">
                <div
                  class="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-soft"
                  :class="
                    tx.type === 'income'
                      ? 'bg-violet-600 text-paper-0'
                      : 'bg-rose-500 text-paper-0'
                  "
                >
                  <component
                    :is="getCategoryIcon(tx.category?.name)"
                    class="w-5 h-5 stroke-[2.2]"
                  />
                </div>

                <div>
                  <h4
                    class="font-display font-bold text-sm text-ink-900 group-hover:text-violet-600 transition-colors"
                  >
                    {{ tx.note || tx.category?.name || "Transaksi" }}
                  </h4>
                  <p class="text-xs text-ink-600 font-medium">
                    {{ tx.category?.name || "Umum" }} •
                    {{ tx.account?.name || "Dompet" }}
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-3">
                <div
                  class="font-mono-money font-bold text-sm sm:text-base text-right"
                  :class="
                    tx.type === 'income' ? 'text-violet-600' : 'text-rose-500'
                  "
                >
                  {{ tx.type === "income" ? "+ " : "- " }}
                  {{ formatRupiah(tx.amount) }}
                </div>

                <!-- Delete Button -->
                <button
                  @click.stop="confirmDelete(tx)"
                  class="p-1.5 text-gray-500 hover:text-expense-600 rounded-lg hover:bg-expense-50 group-hover:transition-all cursor-pointer"
                  title="Hapus Transaksi"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Modal Konfirmasi Hapus Transaksi -->
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
            Hapus Transaksi?
          </h3>
          <p class="text-xs text-ink-600 mt-1">
            Transaksi
            <span class="font-bold text-ink-900">{{
              transactionToDelete?.note || "ini"
            }}</span>
            akan dihapus dan saldo dompet akan dikembalikan.
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
            @click="handleDelete"
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

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
