<!-- ledger-web/src/views/AccountCreate.vue -->
<script setup>
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useAccountStore } from "@/stores/account";
import { useNotificationStore } from "@/stores/notification";
import {
  X,
  Wallet,
  Building2,
  Smartphone,
  CreditCard,
  Check,
  Loader2,
} from "lucide-vue-next";

// Define Emits untuk penanganan saat digunakan sebagai Modal
const emit = defineEmits(["close", "created"]);

const router = useRouter();
const accountStore = useAccountStore();
const notifyStore = useNotificationStore();

const isLoading = ref(false);

// Form State
const form = ref({
  name: "",
  type: "bank", // 'cash' | 'bank' | 'ewallet' | 'credit_card'
  balance: 0,
  color: "#6C4CF1",
  icon: "building-bank",
});

// Pilihan Jenis Akun
const accountTypes = [
  { id: "bank", label: "Bank", icon: Building2 },
  { id: "ewallet", label: "E-Wallet", icon: Smartphone },
  { id: "cash", label: "Tunai", icon: Wallet },
  { id: "credit_card", label: "Kartu Kredit", icon: CreditCard },
];

// Swatch Warna Cepat
const colorSwatches = [
  "#6C4CF1", // Violet Default
  "#17B978", // Emerald / Mint
  "#FFB020", // Amber / Cash
  "#00AED6", // GoPay Blue
  "#F0473E", // Red Expense
  "#EC4899", // Pink
];

// Formatter Tampilan Input Nominal
const formattedBalance = computed({
  get() {
    if (!form.value.balance) return "";
    return Number(form.value.balance).toLocaleString("id-ID");
  },
  set(newValue) {
    const rawValue = newValue.replace(/\D/g, "");
    form.value.balance = rawValue ? Number(rawValue) : 0;
  },
});

function handleClose() {
  emit("close");
  // Jika dibuka sebagai halaman langsung, lakukan navigasi back
  //   if (window.history.state?.back) {
  //     router.back();
  //   } else {
  //     router.push("/accounts");
  //   }
}

async function handleSubmit() {
  if (!form.value.name.trim()) {
    notifyStore.notify({
      message: "Nama dompet wajib diisi.",
      type: "error",
    });
    return;
  }

  isLoading.value = true;
  try {
    await accountStore.addAccount(form.value);

    notifyStore.notify({
      message: "Sumber dana berhasil ditambahkan!",
      type: "success",
    });

    emit("created");
    emit("close");

    // Redirect ke daftar akun
    router.push("/accounts");
  } catch (err) {
    notifyStore.notify({
      message: err.response?.data?.message || "Gagal membuat dompet.",
      type: "error",
    });
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div class="flex items-center justify-center p-2 sm:p-4 font-body">
    <!-- Card Modal Wrapper -->
    <div
      class="w-full max-w-lg bg-paper-0 border border-line-200 rounded-3xl shadow-card overflow-hidden"
    >
      <!-- Header -->
      <div
        class="px-6 py-5 border-b border-line-200 flex items-center justify-between"
      >
        <h2 class="font-display font-bold text-lg text-ink-900">
          Tambah Sumber Dana
        </h2>
        <button
          type="button"
          @click="handleClose"
          class="p-1 text-ink-600 hover:text-ink-900 rounded-full hover:bg-base-50 transition-colors cursor-pointer"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Form Content -->
      <form @submit.prevent="handleSubmit" class="p-6 space-y-6">
        <!-- Jenis Dompet (Pill Selector) -->
        <div class="space-y-3">
          <label
            class="block text-[11px] font-bold text-ink-300 uppercase tracking-wider"
          >
            JENIS DOMPET
          </label>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              v-for="item in accountTypes"
              :key="item.id"
              type="button"
              @click="form.type = item.id"
              class="flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-2xl border text-xs font-semibold transition-all cursor-pointer btn-bounce"
              :class="
                form.type === item.id
                  ? 'border-violet-600 bg-violet-50/60 text-violet-600 ring-2 ring-violet-600/20'
                  : 'border-line-200 bg-paper-0 text-ink-600 hover:border-line-300'
              "
            >
              <component :is="item.icon" class="w-5 h-5" />
              <span>{{ item.label }}</span>
            </button>
          </div>
        </div>

        <!-- Nama Dompet -->
        <div class="space-y-2">
          <label
            class="block text-[11px] font-bold text-ink-300 uppercase tracking-wider"
          >
            NAMA DOMPET / AKUN
          </label>
          <input
            v-model="form.name"
            type="text"
            required
            placeholder="Contoh: BCA Utama, GoPay, Cash"
            class="w-full px-4 h-12 border border-line-200 rounded-xl bg-paper-0 focus:border-violet-600 focus:outline-none text-sm font-medium text-ink-900 transition-colors placeholder:text-ink-300"
          />
        </div>

        <!-- Saldo Awal (Big Amount Input) -->
        <div class="text-center space-y-1 py-1">
          <p
            class="text-[11px] font-bold text-ink-300 uppercase tracking-wider"
          >
            SALDO AWAL
          </p>
          <div class="flex items-center justify-center gap-1.5">
            <span class="text-violet-600 font-bold text-xl md:text-2xl mt-1">
              Rp
            </span>
            <input
              v-model="formattedBalance"
              type="text"
              placeholder="0"
              class="w-full max-w-[280px] font-mono-money font-extrabold text-3xl md:text-4xl text-ink-900 text-center bg-transparent border-none focus:outline-none placeholder:text-ink-300"
            />
          </div>
        </div>

        <!-- Pilih Warna Kartu -->
        <div class="space-y-3">
          <label
            class="block text-[11px] font-bold text-ink-300 uppercase tracking-wider"
          >
            WARNA KARTU
          </label>
          <div class="flex items-center gap-3">
            <button
              v-for="color in colorSwatches"
              :key="color"
              type="button"
              @click="form.color = color"
              class="w-9 h-9 rounded-full flex items-center justify-center transition-transform cursor-pointer btn-bounce"
              :style="{ backgroundColor: color }"
            >
              <Check v-if="form.color === color" class="w-5 h-5 text-paper-0" />
            </button>

            <!-- Custom Color Picker Input -->
            <label
              class="w-9 h-9 rounded-full border border-line-200 flex items-center justify-center cursor-pointer overflow-hidden relative"
            >
              <input
                v-model="form.color"
                type="color"
                class="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <span class="text-xs font-bold text-ink-600">+</span>
            </label>
          </div>
        </div>

        <!-- Submit Button -->
        <div class="pt-2">
          <button
            type="submit"
            :disabled="isLoading"
            class="w-full h-12 bg-violet-600 text-paper-0 font-bold text-sm rounded-2xl shadow-violet btn-bounce cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Loader2 v-if="isLoading" class="w-5 h-5 animate-spin" />
            <span>{{ isLoading ? "Menyimpan..." : "Simpan Sumber Dana" }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
