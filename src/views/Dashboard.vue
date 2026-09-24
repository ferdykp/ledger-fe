<!-- ledger-web/src/views/Dashboard.vue -->
<script setup>
import { ref, onMounted, onUnmounted, computed } from "vue";
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
  Eye,
  EyeOff,
  ArrowUpRight,
  ArrowDownLeft,
  ScanLine,
  Send,
  ChevronRight,
  Sparkles,
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
const balanceVisible = ref(localStorage.getItem("ledger:balance-visible") !== "false");
function toggleBalanceVisibility() {
  balanceVisible.value = !balanceVisible.value;
  localStorage.setItem("ledger:balance-visible", String(balanceVisible.value));
}
function privateMoney(value) {
  return balanceVisible.value ? formatRupiah(value) : "Rp ••••••••";
}
function privateTxMoney(tx) {
  if (!balanceVisible.value) return "Rp ••••••";
  return `${tx.type === "income" ? "+" : "-"}${formatRupiah(Number(tx.amount || 0))}`;
}
const monthlySavings = computed(() => monthlyIncome.value - monthlyExpense.value);
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

let liveTimer;
async function refreshDashboard() {
  await Promise.all([accountStore.fetchAccounts(), fetchTransactionsData(), fetchCashFlowData(), budgetStore.fetchBudgets(currentMonthStr.value), goalStore.fetchGoals()]);
}
onMounted(() => {
  refreshDashboard();
  window.addEventListener("focus", refreshDashboard);
  window.addEventListener("ledger:data-changed", refreshDashboard);
  liveTimer = setInterval(refreshDashboard, 30000);
});
onUnmounted(() => {
  window.removeEventListener("focus", refreshDashboard);
  window.removeEventListener("ledger:data-changed", refreshDashboard);
  clearInterval(liveTimer);
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
    const res = await api.get("/api/reports/cash-flow", { params: { months: 6 } });
    const rows = res.data.data || [];
    cashFlowMonths.value = rows.map((r) => ({ monthStr: r.month, label: r.label }));
    cashFlowIncome.value = rows.map((r) => Number(r.income || 0));
    cashFlowExpense.value = rows.map((r) => Number(r.expense || 0));
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
  <div class="bank-dashboard">
    <header class="bank-topbar">
      <div>
        <p class="bank-kicker">{{ new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" }) }}</p>
        <h1>Selamat datang, {{ authStore.user?.name || "User" }}.</h1>
        <p class="bank-subtitle">Ringkasan keuanganmu hari ini.</p>
      </div>
      <div class="bank-header-actions">
        <router-link to="/scan" class="bank-icon-action" title="Scan bukti"><ScanLine class="w-5 h-5" /></router-link>
        <router-link to="/transactions/create" class="bank-primary-action"><Plus class="w-4 h-4"/> Transaksi Baru</router-link>
      </div>
    </header>

    <section class="bank-hero-grid">
      <article class="bank-balance-card">
        <div class="bank-balance-top">
          <div><span class="bank-card-label">TOTAL SALDO</span><span class="bank-live-pill"><i></i> Semua akun</span></div>
          <button class="bank-eye" @click="toggleBalanceVisibility" :aria-label="balanceVisible ? 'Sembunyikan nominal' : 'Tampilkan nominal'" :title="balanceVisible ? 'Sembunyikan nominal' : 'Tampilkan nominal'">
            <Eye v-if="balanceVisible" class="w-5 h-5"/><EyeOff v-else class="w-5 h-5"/>
          </button>
        </div>
        <div class="bank-main-balance" :class="{ 'bank-masked': !balanceVisible }">{{ privateMoney(totalBalance) }}</div>
        <div class="bank-balance-meta"><span>Saldo tersedia dari {{ accountStore.accounts?.length || 0 }} akun</span><router-link to="/accounts">Kelola akun <ChevronRight class="w-4 h-4"/></router-link></div>
        <div class="bank-quick-actions">
          <router-link to="/transactions/create?type=income"><span><ArrowDownLeft/></span><b>Pemasukan</b></router-link>
          <router-link to="/transactions/create?type=expense"><span><ArrowUpRight/></span><b>Pengeluaran</b></router-link>
          <router-link to="/transactions/create?type=transfer"><span><Send/></span><b>Transfer</b></router-link>
          <router-link to="/scan"><span><ScanLine/></span><b>Scan Bukti</b></router-link>
        </div>
      </article>

      <div class="bank-metrics">
        <article class="bank-metric-card income">
          <div class="bank-metric-head"><span><ArrowDownLeft/></span><small>Bulan ini</small></div>
          <p>Pemasukan</p><strong>{{ privateMoney(monthlyIncome) }}</strong>
          <div class="bank-metric-foot">Dana masuk bulan berjalan</div>
        </article>
        <article class="bank-metric-card expense">
          <div class="bank-metric-head"><span><ArrowUpRight/></span><small>Bulan ini</small></div>
          <p>Pengeluaran</p><strong>{{ privateMoney(monthlyExpense) }}</strong>
          <div class="bank-metric-foot">Total belanja bulan berjalan</div>
        </article>
        <article class="bank-metric-card savings">
          <div class="bank-metric-head"><span><Sparkles/></span><small>Net cash</small></div>
          <p>Selisih Kas</p><strong>{{ privateMoney(monthlySavings) }}</strong>
          <div class="bank-metric-foot">Pemasukan dikurangi pengeluaran</div>
        </article>
      </div>
    </section>

    <section class="bank-content-grid">
      <article class="bank-panel bank-chart-panel">
        <div class="bank-panel-head"><div><span class="bank-section-kicker">ANALITIK</span><h2>Arus Kas</h2><p>Pergerakan uang 6 bulan terakhir</p></div><router-link to="/report" class="bank-text-link">Laporan lengkap <ChevronRight/></router-link></div>
        <div class="bank-chart-legend"><span><i class="income-dot"></i>Pemasukan</span><span><i class="expense-dot"></i>Pengeluaran</span></div>
        <div v-if="isLoadingCashFlow" class="bank-loading">Memuat arus kas...</div>
        <VueApexCharts v-else type="area" height="285" :options="cashFlowChartOptions" :series="cashFlowSeries" />
      </article>

      <aside class="bank-side-stack">
        <article class="bank-panel bank-budget">
          <div class="bank-panel-head compact"><div><span class="bank-section-kicker">PERENCANAAN</span><h2>Budget Bulanan</h2></div><Wallet/></div>
          <div v-if="isLoadingBudget" class="bank-loading small">Memuat budget...</div>
          <template v-else-if="hasBudgetSet">
            <strong>{{ privateMoney(remainingBudget) }}</strong><p>tersisa dari {{ privateMoney(totalBudgetLimit) }}</p>
            <div class="bank-progress"><i :style="{width: `${Math.min(100,totalBudgetPercentage)}%`}"></i></div>
            <div class="bank-progress-label"><span>{{ totalBudgetPercentage }}% terpakai</span><router-link to="/budget">Kelola</router-link></div>
          </template>
          <div v-else class="bank-empty-compact"><p>Belum ada budget untuk bulan ini.</p><router-link to="/budget">Atur budget <ChevronRight/></router-link></div>
        </article>

        <article class="bank-panel bank-goal">
          <div class="bank-panel-head compact"><div><span class="bank-section-kicker">TARGET</span><h2>Goal Utama</h2></div><Target/></div>
          <template v-if="activeGoal"><div class="bank-goal-row"><span class="bank-goal-icon"><component :is="getGoalIcon(activeGoal.icon)"/></span><div><b>{{ activeGoal.name }}</b><p>{{ activeGoal.progress_percent }}% tercapai</p></div></div><div class="bank-progress"><i :style="{width:`${Math.min(100,activeGoal.progress_percent || 0)}%`}"></i></div></template>
          <div v-else class="bank-empty-compact"><p>Belum ada target tabungan.</p><router-link to="/goals">Buat goal <ChevronRight/></router-link></div>
        </article>
      </aside>
    </section>

    <section class="bank-bottom-grid">
      <article class="bank-panel bank-transactions">
        <div class="bank-panel-head"><div><span class="bank-section-kicker">AKTIVITAS</span><h2>Transaksi Terakhir</h2></div><router-link to="/transactions" class="bank-text-link">Lihat semua <ChevronRight/></router-link></div>
        <div v-if="isLoadingTransactions" class="bank-loading">Memuat transaksi...</div>
        <div v-else-if="recentTransactions.length===0" class="bank-empty-compact roomy"><p>Belum ada transaksi. Mulai catat aktivitas keuanganmu.</p><router-link to="/transactions/create">Tambah transaksi <ChevronRight/></router-link></div>
        <div v-else class="bank-tx-list"><div v-for="tx in recentTransactions" :key="tx.id" class="bank-tx-row"><span class="bank-tx-icon" :class="tx.type"><component :is="getCategoryIcon(tx.category?.name)"/></span><div class="bank-tx-main"><b>{{ tx.note || tx.category?.name || 'Transaksi' }}</b><span>{{ tx.category?.name || 'Umum' }} · {{ tx.date }}</span></div><strong :class="tx.type">{{ privateTxMoney(tx) }}</strong></div></div>
      </article>

      <article class="bank-panel bank-insight">
        <span class="bank-section-kicker">INSIGHT BULAN INI</span>
        <div class="bank-insight-icon"><Sparkles/></div>
        <h2 v-if="topSpendingCategory">Pengeluaran terbesar ada di {{ topSpendingCategory.name }}</h2>
        <h2 v-else>Mulai bangun pola keuanganmu</h2>
        <p v-if="topSpendingCategory">Kamu sudah mengeluarkan <b>{{ privateMoney(topSpendingCategory.amount) }}</b> pada kategori ini.</p>
        <p v-else>Tambahkan transaksi agar Ledger dapat menampilkan insight yang lebih berguna.</p>
        <router-link to="/report">Lihat analisis <ArrowUpRight/></router-link>
      </article>
    </section>
  </div>
</template>
