<!-- ledger-web/src/views/Dashboard.vue -->
<script setup>
import { ref, onMounted, computed } from "vue";
import { storeToRefs } from "pinia";
import { useAccountStore } from "@/stores/account";
import { useAuthStore } from "@/stores/auth";
import { useBudgetStore } from "@/stores/budget";
import { useGoalStore } from "@/stores/goal";
import { formatRupiah } from "@/utils/formatters";
import VueApexCharts from "vue3-apexcharts";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Utensils,
  Car,
  ShoppingBag,
  Briefcase,
  Tag,
  Target,
  Wallet,
  Flame,
  Plane,
  Laptop,
  Home,
  Smartphone,
  Gift,
  Coins,
} from "lucide-vue-next";
import api from "@/lib/axios";

const accountStore = useAccountStore();
const authStore = useAuthStore();
const budgetStore = useBudgetStore();
const goalStore = useGoalStore();

const { totalBalance } = storeToRefs(accountStore);
const {
  budgets,
  isLoading: isLoadingBudget,
  totalBudgetLimit,
  totalBudgetSpent,
  totalBudgetPercentage,
} = storeToRefs(budgetStore);
const { goals, isLoading: isLoadingGoals } = storeToRefs(goalStore);

const recentTransactions = ref([]);
const allMonthlyTransactions = ref([]);
const isLoadingTransactions = ref(false);

const cashFlowMonths = ref([]);
const cashFlowIncome = ref([]);
const cashFlowExpense = ref([]);
const isLoadingCashFlow = ref(true);

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

// Sama seperti iconMap di Goal.vue, supaya ikon goal konsisten di seluruh app
const goalIconMap = {
  plane: Plane,
  laptop: Laptop,
  car: Car,
  home: Home,
  smartphone: Smartphone,
  gift: Gift,
  coins: Coins,
};
function getGoalIcon(iconName) {
  return goalIconMap[iconName] || Target;
}

function getCurrentMonthStr() {
  // Format sama seperti currentMonth di Budget.vue: new Date().toISOString().slice(0, 7)
  return new Date().toISOString().slice(0, 7);
}
const currentMonthStr = computed(() => getCurrentMonthStr());

function formatRupiahShort(value) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}M`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}jt`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}rb`;
  return `${Math.round(value)}`;
}

// 1. Total Pemasukan Bulan Ini (real, difilter bulan berjalan)
const monthlyIncome = computed(() =>
  allMonthlyTransactions.value
    .filter((tx) => tx.type === "income")
    .reduce((total, tx) => total + parseFloat(tx.amount || 0), 0),
);

// 2. Total Pengeluaran Bulan Ini (real, difilter bulan berjalan)
const monthlyExpense = computed(() =>
  allMonthlyTransactions.value
    .filter((tx) => tx.type === "expense")
    .reduce((total, tx) => total + parseFloat(tx.amount || 0), 0),
);

// 3. Sisa Budget Bulanan — REAL, dari budget store (bukan dihitung ulang dari transaksi,
// karena totalBudgetSpent di store sudah dihitung per kategori yang di-budget-kan)
const hasBudgetSet = computed(() => budgets.value.length > 0);
const remainingBudget = computed(() => {
  const remaining = totalBudgetLimit.value - totalBudgetSpent.value;
  return remaining < 0 ? 0 : remaining;
});

// 4. Kategori Pengeluaran Terbesar Bulan Ini (real, insight baru)
const topSpendingCategory = computed(() => {
  const map = {};
  allMonthlyTransactions.value
    .filter((tx) => tx.type === "expense")
    .forEach((tx) => {
      const name = tx.category?.name || "Lainnya";
      map[name] = (map[name] || 0) + parseFloat(tx.amount || 0);
    });
  const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
  return entries.length > 0
    ? { name: entries[0][0], amount: entries[0][1] }
    : null;
});

// 5. Goal prioritas — REAL, dari goal store (progress_percent & remaining_amount
// sudah dihitung backend, sama seperti priorityGoal di Goal.vue)
const activeGoal = computed(() => goals.value[0] || null);

// Apex chart config: Arus Kas 6 Bulan Terakhir
const cashFlowSeries = computed(() => [
  { name: "Pemasukan", data: cashFlowIncome.value },
  { name: "Pengeluaran", data: cashFlowExpense.value },
]);

const cashFlowChartOptions = computed(() => ({
  chart: {
    type: "area",
    toolbar: { show: false },
    fontFamily: "inherit",
    parentHeightOffset: 0,
  },
  dataLabels: { enabled: false },
  stroke: { curve: "smooth", width: 2.5 },
  colors: ["#10B981", "#EF4444"],
  fill: { type: "gradient", gradient: { opacityFrom: 0.35, opacityTo: 0 } },
  grid: { borderColor: "#EDEBF3", strokeDashArray: 4 },
  legend: { show: false },
  xaxis: {
    categories: cashFlowMonths.value.map((m) => m.label),
    labels: { style: { fontSize: "11px", fontWeight: 700, colors: "#8B8698" } },
    axisBorder: { show: false },
    axisTicks: { show: false },
  },
  yaxis: {
    labels: {
      style: { fontSize: "11px", fontWeight: 600, colors: "#8B8698" },
      formatter: (val) => formatRupiahShort(val),
    },
  },
  tooltip: { y: { formatter: (val) => formatRupiah(val) } },
}));

function getLastNMonths(n) {
  const months = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("id-ID", { month: "short" });
    months.push({ monthStr, label });
  }
  return months;
}

onMounted(async () => {
  accountStore.fetchAccounts();
  fetchTransactionsData();
  fetchCashFlowData();
  budgetStore.fetchBudgets(currentMonthStr.value);
  goalStore.fetchGoals();
});

async function fetchTransactionsData() {
  isLoadingTransactions.value = true;
  try {
    const resRecent = await api.get("/api/transactions?limit=5");
    recentTransactions.value = resRecent.data.data || resRecent.data || [];

    // FIX: sebelumnya tidak difilter bulan, jadi ikut menjumlahkan transaksi
    // sepanjang waktu padahal labelnya "bulan ini".
    const resAll = await api.get(
      `/api/transactions?month=${currentMonthStr.value}`,
    );
    allMonthlyTransactions.value = resAll.data.data || resAll.data || [];
  } catch (err) {
    console.warn("Gagal memuat data transaksi:", err.message);
    recentTransactions.value = [];
    allMonthlyTransactions.value = [];
  } finally {
    isLoadingTransactions.value = false;
  }
}

async function fetchCashFlowData() {
  isLoadingCashFlow.value = true;
  cashFlowMonths.value = getLastNMonths(6);
  try {
    // CATATAN: ini melakukan 6 request paralel (per bulan). Kalau backend
    // punya endpoint ringkasan seperti /api/transactions/summary?months=6,
    // sebaiknya diganti ke situ supaya lebih efisien.
    const results = await Promise.all(
      cashFlowMonths.value.map((m) =>
        api.get(`/api/transactions?month=${m.monthStr}`),
      ),
    );
    cashFlowIncome.value = results.map((res) => {
      const list = res.data.data || res.data || [];
      return list
        .filter((t) => t.type === "income")
        .reduce((a, t) => a + parseFloat(t.amount || 0), 0);
    });
    cashFlowExpense.value = results.map((res) => {
      const list = res.data.data || res.data || [];
      return list
        .filter((t) => t.type === "expense")
        .reduce((a, t) => a + parseFloat(t.amount || 0), 0);
    });
  } catch (err) {
    console.warn("Gagal memuat data arus kas:", err.message);
    cashFlowIncome.value = cashFlowMonths.value.map(() => 0);
    cashFlowExpense.value = cashFlowMonths.value.map(() => 0);
  } finally {
    isLoadingCashFlow.value = false;
  }
}
</script>

<template>
  <div class="space-y-6 font-body max-w-[1400px] mx-auto">
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

        <!-- Arus Kas Chart Section — REAL, dari 6 bulan transaksi -->
        <div
          class="bg-paper-0 border border-line-200 rounded-3xl p-6 shadow-soft space-y-4"
        >
          <div class="flex items-center justify-between">
            <h2 class="font-display font-bold text-base text-ink-900">
              Arus Kas (6 Bulan Terakhir)
            </h2>
            <div class="flex items-center gap-4 text-xs font-semibold">
              <div class="flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span class="text-ink-600">Pemasukan</span>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <span class="text-ink-600">Pengeluaran</span>
              </div>
            </div>
          </div>

          <div
            v-if="isLoadingCashFlow"
            class="h-56 flex items-center justify-center text-xs text-ink-400"
          >
            Memuat data arus kas...
          </div>
          <VueApexCharts
            v-else
            type="area"
            height="230"
            :options="cashFlowChartOptions"
            :series="cashFlowSeries"
          />
        </div>

        <!-- Insight Kategori Pengeluaran Terbesar — REAL, baru -->
        <div
          v-if="topSpendingCategory"
          class="bg-paper-0 border border-line-200 rounded-3xl p-5 shadow-soft flex items-center gap-4"
        >
          <div
            class="w-11 h-11 rounded-2xl bg-rose-100 text-rose-500 flex items-center justify-center shrink-0"
          >
            <Flame class="w-5 h-5" />
          </div>
          <div>
            <p
              class="text-[11px] font-bold text-ink-400 uppercase tracking-wider"
            >
              Pengeluaran Terbesar Bulan Ini
            </p>
            <p class="font-display font-bold text-sm text-ink-900">
              {{ topSpendingCategory.name }} ·
              {{ formatRupiah(topSpendingCategory.amount) }}
            </p>
          </div>
        </div>
      </div>

      <!-- KOLOM KANAN (5/12) -->
      <div class="lg:col-span-5 space-y-6">
        <!-- Sisa Budget Bulanan Widget — REAL, dari budget store -->
        <div
          class="bg-violet-100/60 border border-violet-200/50 rounded-3xl p-6 shadow-soft space-y-3"
        >
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-ink-600 block"
              >Sisa Budget Bulanan</span
            >
            <Wallet class="w-4 h-4 text-violet-600" />
          </div>

          <div v-if="isLoadingBudget" class="text-xs text-ink-400 py-2">
            Memuat budget...
          </div>

          <template v-else-if="hasBudgetSet">
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
                  class="h-full rounded-full transition-all duration-500"
                  :class="
                    totalBudgetPercentage >= 90
                      ? 'bg-rose-500'
                      : 'bg-violet-600'
                  "
                  :style="{ width: `${Math.min(100, totalBudgetPercentage)}%` }"
                ></div>
              </div>
              <p class="text-[11px] font-bold text-ink-400 text-right">
                {{ totalBudgetPercentage }}% Terpakai
              </p>
            </div>
          </template>

          <div v-else class="space-y-2 py-1">
            <p class="text-xs font-semibold text-ink-600">
              Belum ada budget bulan ini.
            </p>
            <router-link
              to="/budget"
              class="inline-flex items-center gap-1.5 text-xs font-bold text-violet-600 hover:underline"
            >
              Atur Budget Bulanan →
            </router-link>
          </div>
        </div>

        <!-- Goals Card Widget — REAL, dari goal store -->
        <div
          class="bg-paper-0 border border-line-200 rounded-3xl p-5 shadow-soft"
        >
          <div v-if="isLoadingGoals" class="text-xs text-ink-400 py-2">
            Memuat goals...
          </div>

          <router-link
            v-else-if="activeGoal"
            to="/goals"
            class="flex items-center justify-between"
          >
            <div class="space-y-1">
              <h3 class="font-display font-bold text-base text-ink-900">
                Goals
              </h3>
              <p class="text-xs text-ink-600 font-medium">
                {{ activeGoal.name }} ({{ activeGoal.progress_percent }}%)
              </p>
            </div>
            <div
              class="w-12 h-12 rounded-2xl bg-amber-100/80 text-amber-700 flex items-center justify-center shrink-0"
            >
              <component :is="getGoalIcon(activeGoal.icon)" class="w-6 h-6" />
            </div>
          </router-link>

          <div v-else class="flex items-center justify-between">
            <div class="space-y-1">
              <h3 class="font-display font-bold text-base text-ink-900">
                Goals
              </h3>
              <router-link
                to="/goals"
                class="text-xs font-bold text-violet-600 hover:underline"
              >
                Buat Goal Pertama →
              </router-link>
            </div>
            <div
              class="w-12 h-12 rounded-2xl bg-base-50 text-ink-300 flex items-center justify-center shrink-0"
            >
              <Target class="w-6 h-6" />
            </div>
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
              Belum ada transaksi tercatat.
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
