<!-- ledger-web/src/views/Dashboard.vue -->
<script setup>
import { ref, onMounted, computed } from "vue";
import { storeToRefs } from "pinia";
import { useAccountStore } from "@/stores/account";
import { useAuthStore } from "@/stores/auth";
import { formatRupiah } from "@/utils/formatters";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Utensils,
  Car,
  ShoppingBag,
  Briefcase,
  Plane,
  Tag,
} from "lucide-vue-next";
import api from "@/lib/axios";

const accountStore = useAccountStore();
const authStore = useAuthStore();
const { totalBalance } = storeToRefs(accountStore);

const recentTransactions = ref([]);
const allMonthlyTransactions = ref([]);
const isLoadingTransactions = ref(false);

// Budget bulanan acuan (Dapat disesuaikan atau diambil dari Budget Store nanti)
const monthlyBudgetLimit = ref();

// Map Ikon untuk Transaksi
const iconMap = {
  makanan: Utensils,
  transportasi: Car,
  belanja: ShoppingBag,
  pendapatan: Briefcase,
  gaji: Briefcase,
};

function getCategoryIcon(categoryName) {
  if (!categoryName) return Tag;
  const key = categoryName.toLowerCase();
  for (const k in iconMap) {
    if (key.includes(k)) return iconMap[k];
  }
  return Tag;
}

// 1. Hitung Total Pemasukan Bulan Ini secara Dinamis
const monthlyIncome = computed(() => {
  return allMonthlyTransactions.value
    .filter((tx) => tx.type === "income")
    .reduce((total, tx) => total + parseFloat(tx.amount || 0), 0);
});

// 2. Hitung Total Pengeluaran Bulan Ini secara Dinamis
const monthlyExpense = computed(() => {
  return allMonthlyTransactions.value
    .filter((tx) => tx.type === "expense")
    .reduce((total, tx) => total + parseFloat(tx.amount || 0), 0);
});

// 3. Hitung Sisa Budget Bulanan secara Dinamis
const remainingBudget = computed(() => {
  const remaining = monthlyBudgetLimit.value - monthlyExpense.value;
  return remaining < 0 ? 0 : remaining;
});

// 4. Hitung Persentase Pengeluaran terhadap Budget
const budgetUsedPercentage = computed(() => {
  if (monthlyBudgetLimit.value === 0) return 0;
  const percent = Math.round(
    (monthlyExpense.value / monthlyBudgetLimit.value) * 100,
  );
  return percent > 100 ? 100 : percent;
});

onMounted(async () => {
  accountStore.fetchAccounts();
  fetchTransactionsData();
});

async function fetchTransactionsData() {
  isLoadingTransactions.value = true;
  try {
    // Ambil 5 transaksi terakhir untuk widget list
    const resRecent = await api.get("/api/transactions?limit=5");
    recentTransactions.value = resRecent.data.data || resRecent.data || [];

    // Ambil seluruh transaksi bulan ini untuk kalkulasi agregat Pemasukan/Pengeluaran
    const resAll = await api.get("/api/transactions");
    allMonthlyTransactions.value = resAll.data.data || resAll.data || [];
  } catch (err) {
    console.warn("Gagal memuat data transaksi:", err.message);
    recentTransactions.value = [];
    allMonthlyTransactions.value = [];
  } finally {
    isLoadingTransactions.value = false;
  }
}
</script>

<template>
  <div class="space-y-6 font-body">
    <!-- Subtitle Tanggal & Header Salam -->
    <div
      class="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
    >
      <div>
        <p class="text-xs font-semibold text-ink-400">
          {{
            new Date().toLocaleDateString("id-ID", {
              month: "long",
              year: "numeric",
            })
          }}
        </p>
        <h1
          class="font-display text-2xl md:text-3xl font-bold text-ink-900 mt-0.5"
        >
          Gimana kabar dompetmu bulan ini, {{ authStore.user?.name || "User" }}?
        </h1>
      </div>

      <router-link
        to="/transactions/create"
        class="inline-flex items-center justify-center gap-2 px-5 py-3 bg-violet-600 text-paper-0 rounded-2xl font-bold text-sm shadow-violet btn-bounce self-start sm:self-auto"
      >
        <Plus class="w-4 h-4 stroke-[2.5]" />
        <span>Transaksi Baru</span>
      </router-link>
    </div>

    <!-- MAIN GRID DASHBOARD -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <!-- KOLOM KIRI (7/12) -->
      <div class="lg:col-span-7 space-y-6">
        <!-- Hero Balance Card -->
        <div
          class="bg-violet-100/60 border border-violet-200/50 rounded-3xl p-6 sm:p-8 space-y-6 shadow-soft"
        >
          <div class="space-y-1">
            <span
              class="text-xs font-bold text-violet-600 uppercase tracking-wider block"
            >
              Total Saldo (Semua Akun)
            </span>
            <div
              class="font-mono-money font-black text-3xl sm:text-4xl md:text-5xl text-violet-950 tracking-tight"
            >
              {{ formatRupiah(totalBalance) }}
            </div>
          </div>

          <!-- Ringkasan Pemasukan & Pengeluaran Dinamis -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div
              class="bg-paper-0/80 backdrop-blur-sm rounded-2xl p-3.5 flex items-center gap-3 shadow-soft border border-paper-0"
            >
              <div
                class="w-9 h-9 rounded-full bg-income-100 text-income-600 flex items-center justify-center shrink-0"
              >
                <TrendingUp class="w-4 h-4" />
              </div>
              <div>
                <span
                  class="text-[10px] font-bold text-ink-400 uppercase tracking-wider block"
                  >PEMASUKAN</span
                >
                <span
                  class="font-mono-money font-extrabold text-sm text-ink-900"
                >
                  {{ formatRupiah(monthlyIncome) }}
                </span>
              </div>
            </div>

            <div
              class="bg-paper-0/80 backdrop-blur-sm rounded-2xl p-3.5 flex items-center gap-3 shadow-soft border border-paper-0"
            >
              <div
                class="w-9 h-9 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center shrink-0"
              >
                <TrendingDown class="w-4 h-4" />
              </div>
              <div>
                <span
                  class="text-[10px] font-bold text-ink-400 uppercase tracking-wider block"
                  >PENGELUARAN</span
                >
                <span
                  class="font-mono-money font-extrabold text-sm text-ink-900"
                >
                  {{ formatRupiah(monthlyExpense) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Arus Kas Chart Section -->
        <div
          class="bg-paper-0 border border-line-200 rounded-3xl p-6 shadow-soft space-y-6"
        >
          <div class="flex items-center justify-between">
            <h2 class="font-display font-bold text-base text-ink-900">
              Arus Kas (6 Bulan Terakhir)
            </h2>
            <div
              class="px-3 py-1 bg-base-50 rounded-full text-xs font-semibold text-ink-600 border border-line-200"
            >
              Bulan Ini
            </div>
          </div>

          <div
            class="h-56 bg-violet-50/30 rounded-2xl border border-dashed border-violet-200 flex items-center justify-center relative overflow-hidden"
          >
            <div
              class="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-6 text-xs font-semibold text-ink-600"
            >
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-violet-300"></span>
                <span>Pemasukan</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-rose-300"></span>
                <span>Pengeluaran</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- KOLOM KANAN (5/12) -->
      <div class="lg:col-span-5 space-y-6">
        <!-- Sisa Budget Bulanan Widget Dinamis -->
        <div
          class="bg-violet-100/60 border border-violet-200/50 rounded-3xl p-6 shadow-soft space-y-3"
        >
          <span class="text-xs font-bold text-ink-600 block"
            >Sisa Budget Bulanan</span
          >
          <div
            class="font-mono-money font-black text-2xl sm:text-3xl text-violet-700"
          >
            {{ formatRupiah(remainingBudget) }}
          </div>
          <div class="space-y-1 pt-1">
            <div
              class="w-full bg-violet-200/60 h-2.5 rounded-full overflow-hidden"
            >
              <div
                class="bg-violet-600 h-full rounded-full transition-all duration-500"
                :style="{ width: `${budgetUsedPercentage}%` }"
              ></div>
            </div>
            <p class="text-[11px] font-bold text-ink-400 text-right">
              {{ budgetUsedPercentage }}% Terpakai
            </p>
          </div>
        </div>

        <!-- Goals Card Widget -->
        <div
          class="bg-paper-0 border border-line-200 rounded-3xl p-5 shadow-soft flex items-center justify-between"
        >
          <div class="space-y-1">
            <h3 class="font-display font-bold text-base text-ink-900">Goals</h3>
            <p class="text-xs text-ink-600 font-medium">Liburan Jepang (75%)</p>
          </div>
          <div
            class="w-12 h-12 rounded-2xl bg-amber-100/80 text-amber-700 flex items-center justify-center shrink-0"
          >
            <Plane class="w-6 h-6" />
          </div>
        </div>

        <!-- Transaksi Terakhir Section -->
        <div
          class="bg-paper-0 border border-line-200 rounded-3xl p-6 shadow-soft space-y-4"
        >
          <div class="flex items-center justify-between">
            <h2 class="font-display font-bold text-base text-ink-900">
              Transaksi Terakhir
            </h2>
            <router-link
              to="/transactions"
              class="text-xs font-bold text-violet-600 hover:underline"
            >
              Lihat Semua
            </router-link>
          </div>

          <div
            v-if="isLoadingTransactions"
            class="py-8 text-center text-xs text-ink-400"
          >
            Memuat transaksi...
          </div>

          <div
            v-else-if="recentTransactions.length === 0"
            class="py-8 text-center space-y-2"
          >
            <p class="text-xs font-semibold text-ink-400">
              Belum ada transaksi recorded.
            </p>
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="tx in recentTransactions"
              :key="tx.id"
              class="flex items-center justify-between p-2 rounded-2xl hover:bg-base-50/80 transition-colors"
            >
              <div class="flex items-center gap-3">
                <div
                  class="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  :class="
                    tx.type === 'income'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-rose-100 text-rose-500'
                  "
                >
                  <component
                    :is="getCategoryIcon(tx.category?.name)"
                    class="w-5 h-5"
                  />
                </div>
                <div>
                  <h4
                    class="font-display font-bold text-xs sm:text-sm text-ink-900 line-clamp-1"
                  >
                    {{ tx.note || tx.category?.name || "Transaksi" }}
                  </h4>
                  <p class="text-[11px] text-ink-400 font-medium">
                    {{ tx.category?.name || "Umum" }} · {{ tx.date }}
                  </p>
                </div>
              </div>

              <div
                class="font-mono-money font-bold text-xs sm:text-sm text-right shrink-0"
                :class="
                  tx.type === 'income' ? 'text-income-600' : 'text-rose-500'
                "
              >
                {{ tx.type === "income" ? "+Rp " : "-Rp " }}
                {{ Number(tx.amount).toLocaleString("id-ID") }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
