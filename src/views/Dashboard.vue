<!-- ledger-web/src/views/Dashboard.vue -->
<script setup>
import { ref, onMounted } from "vue";
import { useAccountStore } from "@/stores/account";
import { formatRupiah } from "@/utils/formatters";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Plus,
  Wallet,
  Sparkles,
} from "lucide-vue-next";
import api from "@/lib/axios";

const accountStore = useAccountStore();
const recentTransactions = ref([]);
const isLoadingTransactions = ref(false);

onMounted(async () => {
  accountStore.fetchAccounts();
  fetchRecentTransactions();
});

async function fetchRecentTransactions() {
  isLoadingTransactions.value = true;
  try {
    const res = await api.get("/api/transactions?limit=5");
    // Mendukung penanganan response jika data terbungkus dalam res.data.data atau res.data
    recentTransactions.value = res.data.data || res.data || [];
  } catch (err) {
    // Tangkap error 404/network secara halus tanpa menghentikan aplikasi
    console.warn(
      "Info: API Transaksi belum tersedia atau mengembalikan 404.",
      err.message,
    );
    recentTransactions.value = [];
  } finally {
    isLoadingTransactions.value = false;
  }
}
</script>

<template>
  <div class="space-y-8">
    <!-- HEADER HALAMAN (Voice & Tone v2.0) -->
    <div
      class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
    >
      <div>
        <h1 class="font-display text-2xl md:text-3xl font-bold text-ink-900">
          Gimana kabar dompetmu bulan ini? 👋
        </h1>
        <p class="text-ink-600 text-sm mt-1">
          Uangmu jelas, terpantau rapi, dan siap dikontrol.
        </p>
      </div>

      <router-link
        to="/transactions/create"
        class="inline-flex items-center justify-center gap-2 px-5 py-3 bg-violet-600 text-paper-0 rounded-md font-semibold text-sm shadow-violet btn-bounce self-start sm:self-auto"
      >
        <Plus class="w-4 h-4 stroke-[2.5]" />
        <span>Catat Transaksi</span>
      </router-link>
    </div>

    <!-- HERO CARD (Lavender Section v2.0) -->
    <section
      class="bg-lavender-50 border border-violet-100 rounded-lg p-6 md:p-8 shadow-soft flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden"
    >
      <div class="space-y-2 relative z-10">
        <div
          class="flex items-center gap-2 text-violet-600 text-xs font-bold uppercase tracking-wider"
        >
          <Sparkles class="w-4 h-4" />
          <span>Total Saldo Gabungan</span>
        </div>
        <div
          class="font-mono-money font-bold text-3xl md:text-4xl text-ink-900 tracking-tight"
        >
          {{ formatRupiah(accountStore.totalBalance) }}
        </div>
      </div>

      <div class="flex items-center gap-3 w-full md:w-auto relative z-10">
        <router-link
          to="/accounts"
          class="px-4 py-2.5 bg-paper-0 text-violet-600 rounded-md font-semibold text-xs border border-violet-100 hover:bg-violet-100 transition-colors shadow-soft flex-1 md:flex-none text-center btn-bounce"
        >
          Kelola Dompet
        </router-link>
      </div>
    </section>

    <!-- MAIN GRID -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- DAFTAR AKUN -->
      <section class="space-y-4">
        <div class="flex items-center justify-between">
          <h2
            class="font-display text-lg font-bold text-ink-900 flex items-center gap-2"
          >
            <Wallet class="w-4 h-4 text-violet-600" />
            <span>Daftar Akun</span>
          </h2>
          <router-link
            to="/accounts"
            class="text-xs font-semibold text-violet-600 hover:underline"
            >Kelola</router-link
          >
        </div>

        <div class="space-y-3">
          <div
            v-if="accountStore.isLoading"
            class="p-5 bg-paper-0 border border-line-200 rounded-md text-center text-xs text-ink-600"
          >
            Memuat akun...
          </div>

          <!-- Empty State Playful v2.0 -->
          <div
            v-else-if="accountStore.accounts.length === 0"
            class="p-6 bg-mint-50 border border-income-100 rounded-md text-center space-y-3"
          >
            <p class="text-xs font-medium text-ink-600">
              Belum ada dompet terdaftar nih.
            </p>
            <router-link
              to="/accounts"
              class="inline-block px-4 py-2 bg-income-600 text-paper-0 rounded-md text-xs font-semibold shadow-soft btn-bounce"
            >
              + Tambah Dompet
            </router-link>
          </div>

          <div
            v-else
            v-for="acc in accountStore.accounts"
            :key="acc.id"
            class="p-4 bg-paper-0 border border-line-200 rounded-md flex items-center justify-between shadow-soft hover:-translate-y-0.5 transition-transform"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-9 h-9 rounded-full bg-violet-600 text-paper-0 flex items-center justify-center font-display font-bold text-xs uppercase shadow-violet"
              >
                {{ acc.name[0] }}
              </div>
              <div>
                <p class="text-sm font-bold text-ink-900">{{ acc.name }}</p>
                <p class="text-xs text-ink-600 capitalize">{{ acc.type }}</p>
              </div>
            </div>

            <span class="font-mono-money text-sm font-bold text-ink-900">
              {{ formatRupiah(acc.balance) }}
            </span>
          </div>
        </div>
      </section>

      <!-- LEDGER ROW TRANSAKSI (v2.0) -->
      <section class="lg:col-span-2 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="font-display text-lg font-bold text-ink-900">
            Transaksi Terakhir
          </h2>
          <router-link
            to="/transactions"
            class="text-xs font-semibold text-violet-600 hover:underline"
            >Lihat Semua</router-link
          >
        </div>

        <div
          class="bg-paper-0 border border-line-200 rounded-md p-5 shadow-soft"
        >
          <div
            v-if="isLoadingTransactions"
            class="py-8 text-center text-xs text-ink-600"
          >
            Memuat transaksi...
          </div>

          <!-- Empty State v2.0 -->
          <div
            v-else-if="recentTransactions.length === 0"
            class="py-8 text-center space-y-3"
          >
            <p class="text-sm font-medium text-ink-600">
              Masih sepi nih. Transaksi pertamamu, gas!
            </p>
            <router-link
              to="/transactions/create"
              class="inline-block px-5 py-2.5 bg-violet-600 text-paper-0 text-xs font-semibold rounded-md shadow-violet btn-bounce"
            >
              Catat Transaksi Sekarang
            </router-link>
          </div>

          <!-- List Ledger Row v2.0 -->
          <div v-else class="divide-y divide-line-200">
            <div
              v-for="tx in recentTransactions"
              :key="tx.id"
              class="py-3.5 flex items-center justify-between first:pt-0 last:pb-0 hover:bg-base-50/50 px-2 rounded-sm transition-colors"
            >
              <div class="flex items-center gap-3.5">
                <!-- Pill Kategori Solid & Vivid v2.0 -->
                <div
                  class="w-10 h-10 rounded-full flex items-center justify-center text-paper-0 shrink-0 shadow-soft"
                  :class="{
                    'bg-income-600': tx.type === 'income',
                    'bg-expense-600': tx.type === 'expense',
                    'bg-violet-600': tx.type === 'transfer',
                  }"
                >
                  <ArrowDownLeft v-if="tx.type === 'income'" class="w-5 h-5" />
                  <ArrowUpRight
                    v-else-if="tx.type === 'expense'"
                    class="w-5 h-5"
                  />
                  <ArrowLeftRight v-else class="w-5 h-5" />
                </div>

                <div>
                  <p class="text-sm font-bold text-ink-900">
                    {{ tx.note || tx.category?.name || "Transaksi" }}
                  </p>
                  <p class="text-xs text-ink-600 font-medium">
                    {{ tx.category?.name || "Umum" }} · {{ tx.date }}
                  </p>
                </div>
              </div>

              <!-- Space Mono Nominal v2.0 -->
              <div
                class="font-mono-money font-bold text-sm"
                :class="{
                  'text-income-600': tx.type === 'income',
                  'text-expense-600': tx.type === 'expense',
                  'text-ink-900': tx.type === 'transfer',
                }"
              >
                <span v-if="tx.type === 'income'">+</span>
                <span v-else-if="tx.type === 'expense'">-</span>
                {{ formatRupiah(tx.amount) }}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
