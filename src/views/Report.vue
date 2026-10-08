<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ReceiptText,
  TrendingDown,
  Wallet,
  LoaderCircle,
  AlertCircle,
  ArrowRight,
} from "lucide-vue-next";
import VueApexCharts from "vue3-apexcharts";
import api from "@/lib/axios";
import { formatRupiah } from "@/utils/formatters";
import { localDate, localMonth } from "@/utils/dates";

const mode = ref("month");
const month = ref(localMonth());
const from = ref(`${localMonth()}-01`);
const to = ref(localDate());
const report = ref(null);
const loading = ref(false);
const error = ref("");
const validation = ref("");
const applied = ref(null);
let controller;
let version = 0;
const dateLabel = (value) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
const periodLabel = computed(() => {
  if (!report.value) return "";
  if (applied.value?.month)
    return new Date(`${applied.value.month}-01T00:00:00`).toLocaleDateString(
      "id-ID",
      { month: "long", year: "numeric" },
    );
  return `${dateLabel(report.value.from)} – ${dateLabel(report.value.to)}`;
});
const pagination = computed(() => report.value?.transactions.meta);
const comparison = computed(() => {
  if (!report.value || report.value.previous_expense === null) return "";
  const difference = report.value.expense - report.value.previous_expense;
  if (!difference) return "Sama dengan bulan sebelumnya";
  return `${formatRupiah(Math.abs(difference))} ${difference > 0 ? "lebih banyak" : "lebih sedikit"} dari bulan sebelumnya`;
});

async function load(params, page = 1) {
  const current = ++version;
  controller?.abort();
  controller = new AbortController();
  loading.value = true;
  error.value = "";
  try {
    const response = await api.get("/api/reports/expenses", {
      params: { ...params, page },
      signal: controller.signal,
    });
    if (current !== version) return;
    report.value = response.data.data;
    applied.value = { ...params };
  } catch (exception) {
    if (current === version && exception.code !== "ERR_CANCELED")
      error.value =
        exception.response?.data?.message ||
        "Rekap belum dapat dimuat. Periksa koneksi, lalu coba lagi.";
  } finally {
    if (current === version) loading.value = false;
  }
}
const trendSeries = computed(() => [
  {
    name: "Pengeluaran",
    data: (report.value?.trend || []).map((item) => item.expense),
  },
  {
    name: "Pemasukan",
    data: (report.value?.trend || []).map((item) => item.income),
  },
]);
const trendOptions = computed(() => ({
  chart: { type: "bar", toolbar: { show: false }, fontFamily: "inherit" },
  colors: ["#ef4444", "#10b981"],
  dataLabels: { enabled: false },
  plotOptions: { bar: { borderRadius: 3, columnWidth: "55%" } },
  xaxis: {
    categories: (report.value?.trend || []).map((item) => item.date),
    labels: { rotate: -35 },
  },
  yaxis: {
    labels: {
      formatter: (value) =>
        new Intl.NumberFormat("id-ID", { notation: "compact" }).format(value),
    },
  },
  tooltip: { y: { formatter: formatRupiah } },
  legend: { position: "top" },
}));
function apply() {
  validation.value = "";
  if (mode.value === "month" && !/^\d{4}-\d{2}$/.test(month.value)) {
    validation.value = "Pilih bulan dan tahun terlebih dahulu.";
    return;
  }
  if (
    mode.value === "range" &&
    (!from.value || !to.value || from.value > to.value)
  ) {
    validation.value =
      "Isi tanggal awal dan akhir. Tanggal akhir harus sama atau setelah tanggal awal.";
    return;
  }
  return load(
    mode.value === "month"
      ? { month: month.value }
      : { from: from.value, to: to.value },
  );
}
function moveMonth(offset) {
  if (!month.value) return;
  const [year, value] = month.value.split("-").map(Number);
  month.value = localMonth(new Date(year, value - 1 + offset, 1));
  apply();
}
function preset(kind) {
  if (kind === "month") {
    mode.value = "month";
    month.value = localMonth();
  } else {
    mode.value = "range";
    to.value = localDate();
    const start = new Date();
    if (kind === "week") start.setDate(start.getDate() - 6);
    from.value = localDate(start);
  }
  apply();
}
function refresh() {
  if (applied.value && !loading.value)
    load(applied.value, pagination.value?.current_page || 1);
}
onMounted(() => {
  apply();
  window.addEventListener("ledger:data-changed", refresh);
});
onUnmounted(() => {
  version++;
  controller?.abort();
  window.removeEventListener("ledger:data-changed", refresh);
});
</script>

<template>
  <div class="page-shell space-y-6">
    <header class="page-heading">
      <div>
        <span class="eyebrow">Laporan keuangan</span>
        <h1>Ke mana uangmu pergi?</h1>
        <p>
          Lihat total pengeluaran dan telusuri setiap transaksi dalam periode
          pilihanmu.
        </p>
      </div>
      <div class="flex items-center gap-2 text-xs text-ink-500">
        <CalendarDays class="w-4 h-4" />Rekap sesuai tanggal transaksi
      </div>
    </header>

    <section
      class="surface-card p-5 sm:p-6 space-y-5"
      aria-label="Pilih periode rekap"
    >
      <div class="flex flex-wrap justify-between items-center gap-3">
        <div
          class="inline-flex rounded-xl bg-base-100 p-1 gap-1"
          aria-label="Jenis periode"
        >
          <button
            type="button"
            :aria-pressed="mode === 'month'"
            @click="
              mode = 'month';
              validation = '';
            "
            class="px-4 py-2 rounded-lg text-sm font-semibold transition"
            :class="
              mode === 'month'
                ? 'bg-paper-0 text-primary-600 shadow-sm'
                : 'text-ink-500'
            "
          >
            Bulanan
          </button>
          <button
            type="button"
            :aria-pressed="mode === 'range'"
            @click="
              mode = 'range';
              validation = '';
            "
            class="px-4 py-2 rounded-lg text-sm font-semibold transition"
            :class="
              mode === 'range'
                ? 'bg-paper-0 text-primary-600 shadow-sm'
                : 'text-ink-500'
            "
          >
            Rentang tanggal
          </button>
        </div>
        <div class="flex flex-wrap gap-2 text-xs">
          <button class="secondary-button" @click="preset('today')">
            Hari ini</button
          ><button class="secondary-button" @click="preset('week')">
            7 hari terakhir</button
          ><button class="secondary-button" @click="preset('month')">
            Bulan ini
          </button>
        </div>
      </div>
      <form @submit.prevent="apply" class="flex flex-wrap items-end gap-3">
        <div v-if="mode === 'month'" class="flex-1 min-w-0 sm:min-w-64">
          <label for="recap-month" class="field-label">Bulan dan tahun</label>
          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="moveMonth(-1)"
              class="icon-button shrink-0"
              aria-label="Bulan sebelumnya"
            >
              <ChevronLeft class="w-5 h-5" /></button
            ><input
              id="recap-month"
              type="month"
              v-model="month"
              required
              class="w-full min-w-0 px-3 bg-paper-0"
            /><button
              type="button"
              @click="moveMonth(1)"
              class="icon-button shrink-0"
              aria-label="Bulan berikutnya"
            >
              <ChevronRight class="w-5 h-5" />
            </button>
          </div>
        </div>
        <template v-else>
          <label class="flex-1 min-w-40"
            ><span class="field-label">Tanggal awal</span
            ><input
              type="date"
              v-model="from"
              required
              :max="to || undefined"
              class="w-full px-3 bg-paper-0"
          /></label>
          <label class="flex-1 min-w-40"
            ><span class="field-label">Tanggal akhir</span
            ><input
              type="date"
              v-model="to"
              required
              :min="from || undefined"
              class="w-full px-3 bg-paper-0"
          /></label>
        </template>
        <button
          type="submit"
          :disabled="loading"
          class="primary-button w-full sm:w-auto"
        >
          <LoaderCircle
            v-if="loading"
            class="w-4 h-4 animate-spin"
          /><ReceiptText v-else class="w-4 h-4" />Tampilkan rekap
        </button>
      </form>
      <p v-if="validation" role="alert" class="text-sm text-expense-600">
        {{ validation }}
      </p>
      <p class="text-xs text-ink-500">
        Tanggal awal dan akhir ikut dihitung. Transfer antar dompet tidak
        dihitung sebagai pengeluaran.
      </p>
    </section>

    <div
      v-if="loading"
      role="status"
      class="surface-card p-12 flex items-center justify-center gap-3 text-ink-500"
    >
      <LoaderCircle class="w-5 h-5 animate-spin" />Menghitung rekap pengeluaran…
    </div>
    <div v-else-if="error" role="alert" class="surface-card p-6 space-y-3">
      <div class="flex items-center gap-2 text-expense-600">
        <AlertCircle class="w-5 h-5" />{{ error }}
      </div>
      <button @click="apply" class="secondary-button">Coba lagi</button>
    </div>
    <template v-else-if="report">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="text-lg font-bold text-ink-900">{{ periodLabel }}</h2>
        <span class="text-xs text-ink-500"
          >{{ report.days }} hari kalender · {{ report.count }} transaksi
          pengeluaran</span
        >
      </div>
      <section
        class="grid gap-4 lg:grid-cols-[1.4fr_1fr]"
        aria-label="Ringkasan periode"
      >
        <article
          class="rounded-3xl bg-primary-600 p-6 sm:p-8 text-white space-y-3"
        >
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium opacity-90">Total pengeluaran</span
            ><ArrowUpRight class="w-5 h-5 opacity-80" />
          </div>
          <p
            class="text-3xl sm:text-4xl font-extrabold tracking-tight break-words"
            data-testid="expense-total"
          >
            {{ formatRupiah(report.expense) }}
          </p>
          <p class="text-sm opacity-90">
            {{
              comparison ||
              "Semua pengeluaran dalam rentang tanggal yang dipilih."
            }}
          </p>
          <div
            class="pt-4 border-t border-white/20 flex flex-wrap gap-x-8 gap-y-3 text-sm"
          >
            <div>
              <span class="block text-xs opacity-75"
                >Rata-rata per hari kalender</span
              ><strong>{{ formatRupiah(report.daily_average) }}</strong>
            </div>
            <div>
              <span class="block text-xs opacity-75">Jumlah pengeluaran</span
              ><strong>{{ report.count }} transaksi</strong>
            </div>
          </div>
        </article>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <article class="surface-card p-5 flex gap-4 items-center">
            <div class="p-3 rounded-2xl bg-income-100 text-income-600">
              <TrendingDown class="w-5 h-5" />
            </div>
            <div>
              <p class="text-xs text-ink-500">Total pemasukan</p>
              <strong class="text-xl text-ink-900">{{
                formatRupiah(report.income)
              }}</strong>
            </div>
          </article>
          <article class="surface-card p-5 flex gap-4 items-center">
            <div class="p-3 rounded-2xl bg-base-100 text-primary-600">
              <Wallet class="w-5 h-5" />
            </div>
            <div>
              <p class="text-xs text-ink-500">
                Selisih pemasukan − pengeluaran
              </p>
              <strong
                class="text-xl"
                :class="report.net < 0 ? 'text-expense-600' : 'text-ink-900'"
                >{{ formatRupiah(report.net) }}</strong
              >
              <p class="text-xs text-ink-500 mt-1">
                Selisih periode, bukan saldo dompet.
              </p>
            </div>
          </article>
        </div>
      </section>
      <section
        v-if="report.trend.length"
        class="surface-card p-5 sm:p-6 min-w-0"
        aria-label="Grafik arus kas"
      >
        <h2 class="font-bold text-ink-900">Pola pemasukan dan pengeluaran</h2>
        <p class="text-sm text-ink-500 mt-1">
          {{
            report.trend_interval === "month"
              ? "Dikelompokkan per bulan untuk rentang panjang."
              : "Dikelompokkan per tanggal transaksi."
          }}
          Hanya periode dengan aktivitas yang ditampilkan.
        </p>
        <VueApexCharts
          type="bar"
          height="260"
          :options="trendOptions"
          :series="trendSeries"
        />
      </section>
      <section class="surface-card p-5 sm:p-6" aria-label="Rincian kategori">
        <h2 class="font-bold text-ink-900">Paling banyak untuk apa?</h2>
        <p class="text-sm text-ink-500 mt-1">
          Rincian kategori dari seluruh pengeluaran pada periode ini.
        </p>
        <p v-if="!report.count" class="py-8 text-center text-ink-500">
          Belum ada pengeluaran pada periode ini. Coba pilih bulan atau tanggal
          lain.
        </p>
        <div v-else class="grid md:grid-cols-2 gap-x-8 gap-y-5 mt-6">
          <div
            v-for="category in report.categories"
            :key="category.id ?? 'none'"
            class="min-w-0"
          >
            <div class="flex justify-between gap-3 text-sm">
              <span class="font-semibold text-ink-900 truncate">{{
                category.name
              }}</span
              ><strong class="shrink-0">{{
                formatRupiah(category.amount)
              }}</strong>
            </div>
            <div class="h-2 bg-base-100 rounded-full mt-2 overflow-hidden">
              <div
                class="h-full bg-primary-600 rounded-full"
                :style="{ width: `${category.percentage}%` }"
              />
            </div>
            <p class="text-xs text-ink-500 mt-1.5">
              {{ category.percentage }}% dari pengeluaran ·
              {{ category.count }} transaksi
            </p>
          </div>
        </div>
      </section>
      <section
        class="surface-card overflow-hidden"
        aria-label="Daftar pengeluaran"
      >
        <div class="p-5 sm:p-6 border-b border-line-200">
          <h2 class="font-bold text-ink-900">Pengeluarannya apa saja?</h2>
          <p class="text-sm text-ink-500 mt-1">
            Urutan terbaru lebih dahulu. Klik transaksi untuk melihat atau
            mengubah rinciannya.
          </p>
        </div>
        <div v-if="!report.count" class="p-10 text-center text-ink-500">
          <ReceiptText class="w-8 h-8 mx-auto mb-3" />
          <p>Tidak ada transaksi pengeluaran.</p>
        </div>
        <div v-else class="divide-y divide-line-200">
          <router-link
            v-for="tx in report.transactions.data"
            :key="tx.id"
            :to="`/transactions/${tx.id}/edit`"
            class="flex items-center gap-3 sm:gap-4 p-5 hover:bg-base-50 transition"
          >
            <div
              class="hidden sm:grid w-10 h-10 shrink-0 rounded-xl bg-expense-100 text-expense-600 place-items-center"
            >
              <ReceiptText class="w-4 h-4" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="font-semibold text-sm text-ink-900 truncate">
                {{
                  tx.note || tx.category?.name || "Pengeluaran tanpa catatan"
                }}
              </p>
              <p class="text-xs text-ink-500 mt-1 break-words">
                {{ dateLabel(tx.date) }} ·
                {{ tx.category?.name || "Tanpa kategori" }} ·
                {{ tx.account?.name || "Dompet tidak tersedia" }}
              </p>
            </div>
            <strong class="text-sm text-expense-600 shrink-0">{{
              formatRupiah(tx.amount)
            }}</strong
            ><ArrowRight class="w-4 h-4 text-ink-400 shrink-0" />
          </router-link>
        </div>
        <div
          v-if="report.count"
          class="border-t border-line-200 p-4 flex flex-wrap gap-3 items-center justify-between"
        >
          <p class="text-xs text-ink-500">
            {{ pagination.from }}–{{ pagination.to }} dari
            {{ pagination.total }} transaksi · Total di atas mencakup semua
            halaman.
          </p>
          <div class="flex gap-2">
            <button
              class="secondary-button"
              :disabled="pagination.current_page === 1"
              @click="load(applied, pagination.current_page - 1)"
            >
              Sebelumnya</button
            ><button
              class="secondary-button"
              :disabled="pagination.current_page === pagination.last_page"
              @click="load(applied, pagination.current_page + 1)"
            >
              Berikutnya
            </button>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>
