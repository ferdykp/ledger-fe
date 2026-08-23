<!-- ledger-web/src/views/Register.vue -->
<script setup>
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import logoImg from "@/assets/ledger-icon.png";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-vue-next";

const router = useRouter();
const authStore = useAuthStore();

const showPassword = ref(false);
const showPasswordConfirm = ref(false);

const form = ref({
  name: "",
  email: "",
  password: "",
  password_confirmation: "",
});

const isLoading = ref(false);
const errors = ref({});
const generalError = ref("");

// REALTIME VALIDATIONS (COMPUTED)
const isMinLength = computed(() => form.value.password.length >= 8);

const isPasswordMatch = computed(() => {
  if (!form.value.password_confirmation) return null;
  return form.value.password === form.value.password_confirmation;
});

const isFormValid = computed(() => {
  return (
    form.value.name.trim() !== "" &&
    form.value.email.trim() !== "" &&
    isMinLength.value &&
    isPasswordMatch.value === true
  );
});

async function handleSubmit() {
  if (!isFormValid.value) return;

  isLoading.value = true;
  errors.value = {};
  generalError.value = "";

  try {
    await authStore.register(form.value);
    await router.push("/login");
  } catch (err) {
    if (err.response?.status === 422) {
      errors.value = err.response.data.errors || {};
    } else {
      generalError.value =
        err.response?.data?.message ||
        "Gagal mendaftar. Silakan coba beberapa saat lagi.";
    }
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div
    class="min-h-screen bg-base-50 flex items-center justify-center p-4 text-ink-900 font-body"
  >
    <div
      class="w-full max-w-md bg-paper-0 border border-line-200 rounded-md p-6 md:p-8 shadow-soft space-y-6"
    >
      <!-- Header v2.0 -->
      <div class="space-y-3 text-center">
        <div class="flex items-center justify-center">
          <div class="flex items-center gap-4 rounded-md p-2">
            <!-- Gambar/Ikon Logo (Diperbesar dari 8 ke 12) -->
            <img
              :src="logoImg"
              alt="Ledger Logo"
              class="w-16 h-16 object-contain"
            />
            <!-- Teks Nama Aplikasi (Diperbesar dari xl ke 3xl) -->
            <span class="text-3xl font-semibold text-ink-900 tracking-tight"
              >Ledger</span
            >
          </div>
        </div>
        <h1 class="font-display text-2xl md:text-3xl font-bold text-ink-900">
          Yuk, Mulai Atur Uangmu
        </h1>
        <p class="text-ink-600 text-sm font-medium">
          Buat akun untuk perjalanan finansial yang lebih baik
        </p>
      </div>

      <!-- Alert General Error -->
      <div
        v-if="generalError"
        class="p-3 bg-expense-100 border border-expense-600/20 text-expense-600 text-xs rounded-sm flex items-start gap-2"
      >
        <AlertCircle class="w-4 h-4 shrink-0 mt-0.5" />
        <span>{{ generalError }}</span>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <!-- Field Name -->
        <div class="space-y-1">
          <label for="name" class="block text-xs font-semibold text-ink-600"
            >Nama Lengkap</label
          >
          <div class="relative flex items-center">
            <User
              class="absolute left-3 w-4 h-4 text-ink-600 pointer-events-none"
            />
            <input
              id="name"
              v-model="form.name"
              type="text"
              required
              placeholder="John Doe"
              :class="errors.name ? 'border-expense-600' : 'border-line-200'"
              class="w-full pl-9 pr-3 h-10 border rounded-sm bg-base-50 focus:bg-paper-0 focus:border-violet-600 focus:outline-none text-sm text-ink-900 transition-colors placeholder:text-ink-300"
            />
          </div>
          <p
            v-if="errors.name"
            class="text-xs text-expense-600 font-medium pt-0.5"
          >
            {{ errors.name[0] }}
          </p>
        </div>

        <!-- Field Email -->
        <div class="space-y-1">
          <label for="email" class="block text-xs font-semibold text-ink-600"
            >Alamat Email</label
          >
          <div class="relative flex items-center">
            <Mail
              class="absolute left-3 h-4 w-4 text-ink-600 pointer-events-none"
            />
            <input
              id="email"
              v-model="form.email"
              type="email"
              required
              placeholder="nama@email.com"
              :class="errors.email ? 'border-expense-600' : 'border-line-200'"
              class="w-full pl-9 pr-3 h-10 border rounded-sm bg-base-50 focus:bg-paper-0 focus:border-violet-600 focus:outline-none text-sm text-ink-900 transition-colors placeholder:text-ink-300"
            />
          </div>
          <p
            v-if="errors.email"
            class="text-xs text-expense-600 font-medium pt-0.5"
          >
            {{ errors.email[0] }}
          </p>
        </div>

        <!-- Field Password -->
        <div class="space-y-1">
          <label for="password" class="block text-xs font-semibold text-ink-600"
            >Password</label
          >
          <div class="relative flex items-center">
            <Lock
              class="absolute left-3 h-4 w-4 text-ink-600 pointer-events-none"
            />
            <input
              id="password"
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              required
              placeholder="Minimal 8 karakter"
              :class="
                errors.password ? 'border-expense-600' : 'border-line-200'
              "
              class="w-full pl-9 pr-10 h-10 border rounded-sm bg-base-50 focus:bg-paper-0 focus:border-violet-600 focus:outline-none text-sm text-ink-900 transition-colors placeholder:text-ink-300"
            />
            <button
              type="button"
              @click="showPassword = !showPassword"
              class="absolute right-3 text-ink-600 hover:text-ink-900 focus:outline-none cursor-pointer"
            >
              <EyeOff v-if="showPassword" class="w-4 h-4" />
              <Eye v-else class="w-4 h-4" />
            </button>
          </div>

          <!-- Realtime Indicator: Minimal 8 Karakter -->
          <div
            v-if="form.password"
            class="flex items-center gap-1.5 pt-1 text-xs"
          >
            <CheckCircle2
              v-if="isMinLength"
              class="w-3.5 h-3.5 text-income-600 shrink-0"
            />
            <XCircle v-else class="w-3.5 h-3.5 text-expense-600 shrink-0" />
            <span
              :class="isMinLength ? 'text-income-600' : 'text-expense-600'"
              class="font-medium"
            >
              Minimal 8 karakter
            </span>
          </div>

          <p
            v-if="errors.password"
            class="text-xs text-expense-600 font-medium pt-0.5"
          >
            {{ errors.password[0] }}
          </p>
        </div>

        <!-- Field Confirm Password -->
        <div class="space-y-1">
          <label
            for="password_confirmation"
            class="block text-xs font-semibold text-ink-600"
          >
            Konfirmasi Password
          </label>
          <div class="relative flex items-center">
            <Lock
              class="absolute left-3 h-4 w-4 text-ink-600 pointer-events-none"
            />
            <input
              id="password_confirmation"
              v-model="form.password_confirmation"
              :type="showPasswordConfirm ? 'text' : 'password'"
              required
              placeholder="Ulangi password"
              :class="{
                'border-line-200': isPasswordMatch === null,
                'border-income-600': isPasswordMatch === true,
                'border-expense-600': isPasswordMatch === false,
              }"
              class="w-full pl-9 pr-10 h-10 border rounded-sm bg-base-50 focus:bg-paper-0 focus:border-violet-600 focus:outline-none text-sm text-ink-900 transition-colors placeholder:text-ink-300"
            />
            <button
              type="button"
              @click="showPasswordConfirm = !showPasswordConfirm"
              class="absolute right-3 text-ink-600 hover:text-ink-900 focus:outline-none cursor-pointer"
            >
              <EyeOff v-if="showPasswordConfirm" class="w-4 h-4" />
              <Eye v-else class="w-4 h-4" />
            </button>
          </div>

          <!-- Realtime Indicator: Match Password -->
          <div
            v-if="form.password_confirmation"
            class="flex items-center gap-1.5 pt-1 text-xs"
          >
            <template v-if="isPasswordMatch">
              <CheckCircle2 class="w-3.5 h-3.5 text-income-600 shrink-0" />
              <span class="text-income-600 font-medium">Password cocok</span>
            </template>
            <template v-else>
              <XCircle class="w-3.5 h-3.5 text-expense-600 shrink-0" />
              <span class="text-expense-600 font-medium"
                >Password belum cocok</span
              >
            </template>
          </div>
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          :disabled="isLoading || !isFormValid"
          class="w-full h-11 bg-violet-600 text-paper-0 font-semibold text-sm rounded-md shadow-violet btn-bounce disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center mt-2"
        >
          <span v-if="!isLoading">Daftar Akun</span>
          <span v-else class="text-xs">Memproses...</span>
        </button>
      </form>

      <!-- Footer Link -->
      <div
        class="pt-4 border-t border-line-200 text-center text-xs text-ink-600"
      >
        Sudah memiliki akun?
        <router-link
          to="/login"
          class="text-violet-600 font-bold hover:underline ml-1"
        >
          Masuk di sini
        </router-link>
      </div>
    </div>
  </div>
</template>
