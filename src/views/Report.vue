<!-- ledger-web/src/views/Report.vue -->
<script setup>
import { ref, onMounted, computed } from "vue";
import { formatRupiah } from "@/utils/formatters";
import {
  Calendar,
  ArrowDownRight,
  ArrowUpRight,
  Wallet,
  Sparkles,
  ChevronDown,
  ArrowRight,
} from "lucide-vue-next";
import api from "@/lib/axios";

const selectedMonth = ref("2026-08");
const isLoading = ref(false);
const transactions = ref([]);

onMounted(() => {
  fetchReportData();
});

async function fetchReportData() {
  isLoading.value = true;
  try {
    const res = await api.get(`/api/transactions?month=${selectedMonth.value}`);
    transactions.value = res.data.data || res.data || [];
  } catch (err) {
    console.warn("Gagal memuat data laporan:", err.message);
    transactions.value = [];
  } finally {
    isLoading.value = false;
  }
}

// Total Pemasukan
const totalIncome = computed(() => {
  return transactions.value
    .filter((t) => t.type === "income")
    .reduce((acc, t) => acc + parseFloat(t.amount || 0), 0);
});

// Total Pengeluaran
const totalExpense = computed(() => {
  return transactions.value
    .filter((t) => t.type === "expense")
    .reduce((acc, t) => acc + parseFloat(t.amount || 0), 0);
});

// Tabungan Bersih (Net Savings)
const netSavings = computed(() => {
  return totalIncome.value - totalExpense.value;
});

// Breakdown Pengeluaran per Kategori
const categoryBreakdown = computed(() => {
  const map = {};
  transactions.value
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      const name = t.category?.name || "Lainnya";
      map[name] = (map[name] || 0) + parseFloat(t.amount || 0);
    });

  const colors = ["#F0473E", "#6C4CF1", "#FFB020", "#94A3B8"];
  return Object.keys(map).map((name, idx) => ({
    name,
    amount: map[name],
    color: colors[idx % colors.length],
  }));
});
</script>

<template>
  <div class="space-y-8 font-body">
    <!-- Header Halaman -->
    <div
      class="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
    >
      <div>
        <h1 class="font-display text-2xl md:text-3xl font-bold text-ink-900">
          Laporan Keuangan
        </h1>
        <p class="text-ink-600 text-sm mt-1">
          Ringkasan performa finansialmu bulan ini.
        </p>
      </div>

      <!-- Month Selector -->
      <div class="relative self-start sm:self-auto">
        <div
          class="flex items-center gap-2 px-4 py-2.5 bg-paper-0 border border-line-200 rounded-2xl shadow-soft text-xs font-bold text-ink-900 cursor-pointer"
        >
          <Calendar class="w-4 h-4 text-violet-600" />
          <input
            v-model="selectedMonth"
            type="month"
            @change="fetchReportData"
            class="bg-transparent border-none focus:outline-none cursor-pointer font-bold"
          />
          <ChevronDown class="w-3.5 h-3.5 text-ink-400" />
        </div>
      </div>
    </div>

    <!-- 3 TOP STAT CARDS -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- Total Pemasukan Card -->
      <div
        class="bg-paper-0 border border-line-200 rounded-3xl p-6 shadow-soft space-y-3 relative overflow-hidden"
      >
        <div class="flex items-center justify-between">
          <span
            class="text-[11px] font-bold text-ink-400 uppercase tracking-wider block"
          >
            TOTAL PEMASUKAN
          </span>
          <div
            class="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center"
          >
            <ArrowDownRight class="w-5 h-5" />
          </div>
        </div>
        <div>
          <div
            class="font-mono-money font-black text-2xl sm:text-3xl text-ink-900"
          >
            {{ formatRupiah(totalIncome) }}
          </div>
          <span
            class="inline-block mt-2 px-2.5 py-0.5 bg-emerald-100/80 text-emerald-700 font-bold text-[10px] rounded-md"
          >
            +12% vs last month
          </span>
        </div>
      </div>

      <!-- Total Pengeluaran Card -->
      <div
        class="bg-paper-0 border border-line-200 rounded-3xl p-6 shadow-soft space-y-3 relative overflow-hidden"
      >
        <div class="flex items-center justify-between">
          <span
            class="text-[11px] font-bold text-ink-400 uppercase tracking-wider block"
          >
            TOTAL PENGELUARAN
          </span>
          <div
            class="w-9 h-9 rounded-2xl bg-rose-100 text-rose-500 flex items-center justify-center"
          >
            <ArrowUpRight class="w-5 h-5" />
          </div>
        </div>
        <div>
          <div
            class="font-mono-money font-black text-2xl sm:text-3xl text-ink-900"
          >
            {{ formatRupiah(totalExpense) }}
          </div>
          <span
            class="inline-block mt-2 px-2.5 py-0.5 bg-rose-100/80 text-rose-600 font-bold text-[10px] rounded-md"
          >
            +5% vs last month
          </span>
        </div>
      </div>

      <!-- Tabungan Bersih Card -->
      <div
        class="bg-paper-0 border border-line-200 rounded-3xl p-6 shadow-soft space-y-3 relative overflow-hidden"
      >
        <div class="flex items-center justify-between">
          <span
            class="text-[11px] font-bold text-ink-400 uppercase tracking-wider block"
          >
            TABUNGAN BERSIH
          </span>
          <div
            class="w-9 h-9 rounded-2xl bg-violet-100 text-violet-600 flex items-center justify-center"
          >
            <Wallet class="w-5 h-5" />
          </div>
        </div>
        <div>
          <div
            class="font-mono-money font-black text-2xl sm:text-3xl text-violet-600"
          >
            {{ formatRupiah(netSavings) }}
          </div>
          <span
            class="inline-block mt-2 px-2.5 py-0.5 bg-violet-100/80 text-violet-700 font-bold text-[10px] rounded-md"
          >
            On track for Goal A
          </span>
        </div>
      </div>
    </div>

    <!-- MAIN CHART AREA: TREND KEUANGAN -->
    <div
      class="bg-violet-50/40 border border-violet-100 rounded-3xl p-6 md:p-8 shadow-soft space-y-6"
    >
      <div class="flex items-center justify-between">
        <h2 class="font-display font-bold text-lg text-ink-900">
          Trend Keuangan
        </h2>
        <div class="flex items-center gap-4 text-xs font-bold">
          <div class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded-full bg-emerald-500"></span>
            <span class="text-ink-600">Pemasukan</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded-full bg-rose-500"></span>
            <span class="text-ink-600">Pengeluaran</span>
          </div>
        </div>
      </div>

      <!-- Curve Graphic Representation Placeholder -->
      <div
        class="h-64 relative flex flex-col justify-between pt-4 border-b border-line-200"
      >
        <svg
          class="w-full h-full overflow-visible"
          viewBox="0 0 400 150"
          preserveAspectRatio="none"
        >
          <!-- Area Gradient Green Pemasukan -->
          <defs>
            <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#10B981" stop-opacity="0.2" />
              <stop offset="100%" stop-color="#10B981" stop-opacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M 0,80 Q 100,20 200,40 T 400,10 L 400,150 L 0,150 Z"
            fill="url(#incomeGrad)"
          />
          <path
            d="M 0,80 Q 100,20 200,40 T 400,10"
            fill="none"
            stroke="#10B981"
            stroke-width="3"
          />

          <!-- Red Line Pengeluaran -->
          <path
            d="M 0,130 Q 100,100 200,85 T 400,75"
            fill="none"
            stroke="#EF4444"
            stroke-width="3"
          />
        </svg>

        <!-- X-Axis Labels -->
        <div
          class="flex justify-between text-[11px] font-bold text-ink-400 pt-2"
        >
          <span>Week 1</span>
          <span>Week 2</span>
          <span>Week 3</span>
          <span>Week 4</span>
        </div>
      </div>
    </div>

    <!-- BOTTOM SECTION: BREAKDOWN KATEGORI & INSIGHT LEDGER -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      <!-- Breakdown Kategori (Card Kiri) -->
      <div
        class="lg:col-span-7 bg-paper-0 border border-line-200 rounded-3xl p-6 sm:p-8 shadow-soft flex flex-col justify-between space-y-6"
      >
        <h2 class="font-display font-bold text-lg text-ink-900">
          Breakdown Kategori
        </h2>

        <div class="flex items-center justify-center py-4">
          <!-- Ring Donut Visual -->
          <div class="relative w-48 h-48 flex items-center justify-center">
            <svg class="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                class="text-rose-400"
                stroke-width="4.5"
                stroke-dasharray="35, 100"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                class="text-violet-600"
                stroke-width="4.5"
                stroke-dasharray="25, 100"
                stroke-dashoffset="-35"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                class="text-amber-400"
                stroke-width="4.5"
                stroke-dasharray="20, 100"
                stroke-dashoffset="-60"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                class="text-slate-300"
                stroke-width="4.5"
                stroke-dasharray="20, 100"
                stroke-dashoffset="-80"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div
              class="absolute inset-0 flex flex-col items-center justify-center text-center"
            >
              <span
                class="text-[10px] font-bold text-ink-400 uppercase tracking-wider block"
                >Total</span
              >
              <span class="font-mono-money font-black text-lg text-ink-900">
                {{ formatRupiah(totalExpense) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Category Legends -->
        <div
          class="flex items-center justify-center gap-4 flex-wrap text-xs font-semibold text-ink-600"
        >
          <div class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded-full bg-rose-500"></span>
            <span>Food</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded-full bg-violet-600"></span>
            <span>Transport</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded-full bg-amber-400"></span>
            <span>Rent</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded-full bg-slate-300"></span>
            <span>Other</span>
          </div>
        </div>
      </div>

      <!-- Insight Ledger (Card Kanan Gradient Purple) -->
      <div
        class="lg:col-span-5 bg-gradient-to-br from-violet-600 via-violet-700 to-indigo-800 text-paper-0 rounded-3xl p-8 shadow-violet flex flex-col justify-between space-y-6 relative overflow-hidden"
      >
        <div class="space-y-4">
          <div
            class="flex items-center gap-2 text-violet-200 text-xs font-bold uppercase tracking-wider"
          >
            <Sparkles class="w-4 h-4 text-amber-300" />
            <span>Insight Ledger</span>
          </div>

          <p
            class="font-display font-medium text-lg leading-relaxed text-violet-100"
          >
            "Bulan ini jajanmu agak naik nih, tapi kamu berhasil nabung lebih
            banyak dari bulan lalu! 🚀"
          </p>
        </div>

        <div>
          <button
            type="button"
            class="px-6 py-3 bg-rose-500 hover:bg-rose-600 text-paper-0 rounded-2xl font-bold text-xs shadow-soft flex items-center gap-2 cursor-pointer transition-all btn-bounce"
          >
            <span>Lihat Detail Analisa</span>
            <ArrowRight class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
