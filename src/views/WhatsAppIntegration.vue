
<script setup>
import { computed, onMounted, ref, onUnmounted } from "vue";
import {
  MessageCircle,
  ShieldCheck,
  CheckCircle2,
  Smartphone,
  ArrowRight,
  RefreshCw,
  Unplug,
  ExternalLink,
  LoaderCircle,
  AlertCircle,
  Wallet,
  LockKeyhole,
  ArrowLeft,
} from "lucide-vue-next";
import api from "@/lib/axios";
import { useNotificationStore } from "@/stores/notification";

const notify = useNotificationStore();

const status = ref({ connected: false });
const pageLoading = ref(true);
const loading = ref(false);
const error = ref("");

const phone = ref("");
const otp = ref("");
const pendingPhone = ref("");
const step = ref("phone");

const countdown = ref(0);
let timer = null;

// Isi melalui VITE_LEDGER_WHATSAPP_NUMBER.
// Nomor ini adalah nomor bot Ledger, bukan nomor user.
const botNumber = import.meta.env.VITE_LEDGER_WHATSAPP_NUMBER || "";

const connected = computed(() => Boolean(status.value?.connected));

const maskedPhone = computed(() => {
  const value = status.value?.phone_number || "";
  if (!value) return "-";
  if (value.length <= 7) return value;
  return `+${value.slice(0, 4)} **** ${value.slice(-4)}`;
});

const formattedPendingPhone = computed(() =>
  pendingPhone.value ? `+${pendingPhone.value}` : ""
);

const whatsappUrl = computed(() => {
  const number = String(botNumber).replace(/\D/g, "");
  if (!number) return "";
  return `https://wa.me/${number}?text=${encodeURIComponent("Halo Ledger")}`;
});

function getErrorMessage(err) {
  const data = err?.response?.data;

  if (data?.errors) {
    const first = Object.values(data.errors).flat()[0];
    if (first) return String(first);
  }

  return data?.message || err?.message || "Terjadi kesalahan. Silakan coba lagi.";
}

function normalizePhone(value) {
  let number = String(value || "").replace(/\D/g, "");

  if (number.startsWith("0")) {
    number = `62${number.slice(1)}`;
  } else if (number.startsWith("8")) {
    number = `62${number}`;
  }

  return number;
}

function notifyUser(message, type = "success") {
  notify.notify({ message, type });
}

function startCountdown(seconds = 60) {
  if (timer) clearInterval(timer);

  countdown.value = Number(seconds) || 60;

  timer = setInterval(() => {
    countdown.value = Math.max(0, countdown.value - 1);

    if (countdown.value === 0) {
      clearInterval(timer);
      timer = null;
    }
  }, 1000);
}

async function load() {
  pageLoading.value = true;
  error.value = "";

  try {
    const { data } = await api.get("/api/integrations/whatsapp");
    status.value = data?.data || { connected: false };

    if (status.value.connected) {
      step.value = "connected";
    } else if (step.value === "connected") {
      step.value = "phone";
    }
  } catch (err) {
    error.value = getErrorMessage(err);
  } finally {
    pageLoading.value = false;
  }
}

async function sendOtp() {
  error.value = "";

  const number = normalizePhone(phone.value);

  if (!/^62[0-9]{8,13}$/.test(number)) {
    error.value = "Masukkan nomor WhatsApp Indonesia yang valid.";
    return;
  }

  loading.value = true;

  try {
    const { data } = await api.post(
      "/api/integrations/whatsapp/otp/send",
      { phone_number: number }
    );

    pendingPhone.value = data?.data?.phone_number || number;
    otp.value = "";
    step.value = "verify";

    startCountdown(data?.data?.resend_after || 60);
    notifyUser("Kode verifikasi berhasil diminta. Periksa WhatsApp Anda.");
  } catch (err) {
    error.value = getErrorMessage(err);
  } finally {
    loading.value = false;
  }
}

async function verifyOtp() {
  error.value = "";

  const code = String(otp.value).replace(/\D/g, "");

  if (!/^\d{6}$/.test(code)) {
    error.value = "Masukkan kode verifikasi 6 digit.";
    return;
  }

  loading.value = true;

  try {
    await api.post("/api/integrations/whatsapp/otp/verify", {
      code,
    });

    otp.value = "";
    notifyUser("WhatsApp berhasil terhubung ke Ledger.");

    await load();
  } catch (err) {
    error.value = getErrorMessage(err);
  } finally {
    loading.value = false;
  }
}

async function resendOtp() {
  if (loading.value || countdown.value > 0) return;

  error.value = "";
  loading.value = true;

  try {
    const { data } = await api.post(
      "/api/integrations/whatsapp/otp/send",
      { phone_number: pendingPhone.value }
    );

    otp.value = "";
    startCountdown(data?.data?.resend_after || 60);

    notifyUser("Kode verifikasi baru telah diminta.");
  } catch (err) {
    error.value = getErrorMessage(err);
  } finally {
    loading.value = false;
  }
}

async function disconnect() {
  if (!window.confirm("Putuskan koneksi WhatsApp dari Ledger?")) return;

  error.value = "";
  loading.value = true;

  try {
    await api.delete("/api/integrations/whatsapp");

    status.value = { connected: false };
    phone.value = "";
    otp.value = "";
    pendingPhone.value = "";
    step.value = "phone";

    if (timer) clearInterval(timer);
    countdown.value = 0;

    notifyUser("Koneksi WhatsApp berhasil diputuskan.");
  } catch (err) {
    error.value = getErrorMessage(err);
  } finally {
    loading.value = false;
  }
}

function backToPhone() {
  step.value = "phone";
  otp.value = "";
  error.value = "";
}

function openWhatsApp() {
  if (!whatsappUrl.value) {
    notifyUser("Nomor bot Ledger belum dikonfigurasi.", "error");
    return;
  }

  window.open(whatsappUrl.value, "_blank", "noopener,noreferrer");
}

onMounted(load);

onUnmounted(() => {
  if (timer) clearInterval(timer);
});
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-6 pb-12">
    <!-- Header -->
    <div class="space-y-2">
      <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-ink-500">
        <MessageCircle :size="15" />
        Integrations
      </div>

      <h1 class="font-display text-2xl font-bold tracking-tight text-ink-900 md:text-3xl">
        WhatsApp Integration
      </h1>

      <p class="max-w-2xl text-sm leading-6 text-ink-600">
        Hubungkan nomor WhatsApp Anda untuk mencatat pemasukan,
        pengeluaran, dan transfer langsung melalui chat.
      </p>
    </div>

    <!-- Loading -->
    <div
      v-if="pageLoading"
      class="flex min-h-72 items-center justify-center rounded-3xl border border-ink-200 bg-white"
    >
      <LoaderCircle :size="26" class="animate-spin text-ink-500" />
    </div>

    <div v-else class="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
      <!-- Main -->
      <section class="min-w-0 rounded-3xl border border-ink-200 bg-white p-5 shadow-sm sm:p-7">
        <div class="mb-7 flex items-start gap-3">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-ink-900 text-white">
            <MessageCircle :size="23" />
          </div>

          <div class="min-w-0 flex-1">
            <h2 class="font-semibold text-ink-900">Koneksi WhatsApp</h2>
            <p class="mt-1 text-sm text-ink-600">
              {{
                connected
                  ? "Nomor Anda sudah terverifikasi."
                  : "Verifikasi nomor untuk mulai menggunakan Ledger melalui WhatsApp."
              }}
            </p>
          </div>

          <span
            class="shrink-0 rounded-full px-3 py-1 text-xs font-semibold"
            :class="connected
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-ink-100 text-ink-600'"
          >
            {{ connected ? "Connected" : "Not connected" }}
          </span>
        </div>

        <!-- Error -->
        <div
          v-if="error"
          role="alert"
          class="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <AlertCircle :size="18" class="mt-0.5 shrink-0" />
          <p class="flex-1">{{ error }}</p>
          <button
            type="button"
            class="font-semibold underline"
            @click="error = ''"
          >
            Tutup
          </button>
        </div>

        <!-- Step 1: Phone -->
        <div v-if="!connected && step === 'phone'" class="space-y-6">
          <div class="space-y-2">
            <label for="wa-phone" class="block text-sm font-semibold text-ink-900">
              Nomor WhatsApp
            </label>

            <div class="relative">
              <Smartphone
                :size="19"
                class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-500"
              />

              <input
                id="wa-phone"
                v-model="phone"
                type="tel"
                inputmode="tel"
                autocomplete="tel"
                placeholder="0812 3456 7890"
                :disabled="loading"
                class="w-full rounded-2xl border border-ink-200 bg-white py-3.5 pl-12 pr-4 text-sm text-ink-900 outline-none transition focus:border-ink-900 focus:ring-2 focus:ring-ink-900/10 disabled:opacity-60"
                @keyup.enter="sendOtp"
              />
            </div>

            <p class="text-xs leading-5 text-ink-500">
              Gunakan nomor WhatsApp aktif yang dapat menerima pesan.
              Format 08..., 628..., atau +628... didukung.
            </p>
          </div>

          <button
            type="button"
            :disabled="loading || !phone.trim()"
            class="flex w-full items-center justify-center gap-2 rounded-2xl bg-ink-900 px-5 py-3.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            @click="sendOtp"
          >
            <LoaderCircle v-if="loading" :size="18" class="animate-spin" />
            <ShieldCheck v-else :size="18" />
            {{ loading ? "Mengirim kode..." : "Kirim Kode Verifikasi" }}
            <ArrowRight v-if="!loading" :size="17" />
          </button>

          <div class="flex items-start gap-3 rounded-2xl bg-ink-50 p-4">
            <LockKeyhole :size="18" class="mt-0.5 shrink-0 text-ink-600" />
            <p class="text-xs leading-5 text-ink-600">
              Ledger menggunakan kode OTP untuk memastikan nomor
              WhatsApp tersebut benar-benar berada dalam kendali Anda.
            </p>
          </div>
        </div>

        <!-- Step 2: OTP -->
        <div v-else-if="!connected && step === 'verify'" class="space-y-6">
          <div class="rounded-2xl border border-ink-200 bg-ink-50 p-5">
            <div class="flex items-center gap-2">
              <ShieldCheck :size="20" class="text-ink-900" />
              <h3 class="font-semibold text-ink-900">Verifikasi nomor</h3>
            </div>

            <p class="mt-3 text-sm leading-6 text-ink-600">
              Kami telah meminta pengiriman kode 6 digit ke
              <span class="font-semibold text-ink-900">
                {{ formattedPendingPhone }}
              </span>.
              Masukkan kode yang diterima melalui WhatsApp.
            </p>
          </div>

          <div class="space-y-2">
            <label for="wa-otp" class="block text-sm font-semibold text-ink-900">
              Kode verifikasi
            </label>

            <input
              id="wa-otp"
              v-model="otp"
              type="text"
              inputmode="numeric"
              autocomplete="one-time-code"
              maxlength="6"
              placeholder="000000"
              :disabled="loading"
              class="w-full rounded-2xl border border-ink-200 bg-white px-4 py-4 text-center font-mono text-2xl font-bold tracking-[0.45em] text-ink-900 outline-none transition focus:border-ink-900 focus:ring-2 focus:ring-ink-900/10 disabled:opacity-60"
              @input="otp = otp.replace(/\D/g, '').slice(0, 6)"
              @keyup.enter="verifyOtp"
            />

            <p class="text-xs text-ink-500">
              Kode berlaku selama 10 menit sejak dikirim.
            </p>
          </div>

          <button
            type="button"
            :disabled="loading || otp.length !== 6"
            class="flex w-full items-center justify-center gap-2 rounded-2xl bg-ink-900 px-5 py-3.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            @click="verifyOtp"
          >
            <LoaderCircle v-if="loading" :size="18" class="animate-spin" />
            <CheckCircle2 v-else :size="18" />
            {{ loading ? "Memverifikasi..." : "Verifikasi WhatsApp" }}
          </button>

          <div class="flex flex-wrap items-center justify-between gap-3 text-sm">
            <button
              type="button"
              class="inline-flex items-center gap-2 font-medium text-ink-600 hover:text-ink-900"
              :disabled="loading"
              @click="backToPhone"
            >
              <ArrowLeft :size="16" />
              Ubah nomor
            </button>

            <button
              type="button"
              class="font-semibold text-ink-900 disabled:cursor-not-allowed disabled:text-ink-400"
              :disabled="loading || countdown > 0"
              @click="resendOtp"
            >
              {{
                countdown > 0
                  ? `Kirim ulang (${countdown}s)`
                  : "Kirim ulang kode"
              }}
            </button>
          </div>
        </div>

        <!-- Step 3: Connected -->
        <div v-else-if="connected" class="space-y-6">
          <div class="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <div class="flex items-center gap-3">
              <CheckCircle2 :size="26" class="shrink-0 text-emerald-700" />
              <div>
                <p class="font-semibold text-emerald-900">
                  WhatsApp berhasil terhubung
                </p>
                <p class="mt-1 text-sm text-emerald-800">
                  Anda sekarang dapat mencatat transaksi melalui chat.
                </p>
              </div>
            </div>

            <div class="mt-5 rounded-xl border border-emerald-200 bg-white/80 p-4">
              <p class="text-xs text-ink-500">Nomor terverifikasi</p>
              <p class="mt-1 font-semibold text-ink-900">
                {{ maskedPhone }}
              </p>
            </div>
          </div>

          <div class="space-y-3">
            <button
              type="button"
              :disabled="!whatsappUrl"
              class="flex w-full items-center justify-center gap-2 rounded-2xl bg-ink-900 px-5 py-3.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              @click="openWhatsApp"
            >
              <MessageCircle :size="19" />
              Buka WhatsApp Ledger
              <ExternalLink :size="16" />
            </button>

            <p v-if="!whatsappUrl" class="text-xs text-amber-700">
              Nomor bot Ledger belum dikonfigurasi.
            </p>

            <button
              type="button"
              :disabled="loading"
              class="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
              @click="disconnect"
            >
              <LoaderCircle v-if="loading" :size="17" class="animate-spin" />
              <Unplug v-else :size="17" />
              Putuskan WhatsApp
            </button>
          </div>
        </div>
      </section>

      <!-- Right information panel -->
      <aside class="space-y-5">
        <section class="rounded-3xl border border-ink-200 bg-white p-5 shadow-sm sm:p-6">
          <div class="mb-4 flex items-center gap-2">
            <Wallet :size="19" class="text-ink-900" />
            <h3 class="font-semibold text-ink-900">Contoh transaksi</h3>
          </div>

          <div class="space-y-3">
            <div
              v-for="(example, index) in [
                { label: 'Pengeluaran', text: 'bensin 50rb bca' },
                { label: 'Pengeluaran', text: 'makan 35k gopay' },
                { label: 'Pemasukan', text: 'gaji 8jt masuk bca' },
              ]"
              :key="index"
              class="rounded-2xl border border-ink-200 bg-ink-50 p-3.5"
            >
              <p class="mb-1 text-xs font-medium text-ink-500">
                {{ example.label }}
              </p>
              <p class="text-sm font-semibold text-ink-900">
                {{ example.text }}
              </p>
            </div>
          </div>
        </section>

        <section class="rounded-3xl border border-ink-200 bg-white p-5 shadow-sm sm:p-6">
          <div class="flex items-center gap-2">
            <ShieldCheck :size="19" class="text-ink-900" />
            <h3 class="font-semibold text-ink-900">Keamanan transaksi</h3>
          </div>

          <p class="mt-3 text-sm leading-6 text-ink-600">
            Ledger akan meminta konfirmasi sebelum transaksi disimpan.
            Parser lokal memproses pesan terlebih dahulu dan Groq
            digunakan sebagai fallback bila diperlukan.
          </p>
        </section>
      </aside>
    </div>
  </div>
</template>
