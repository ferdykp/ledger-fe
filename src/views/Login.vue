<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { useNotificationStore } from "../stores/notification";
import logoImg from "../assets/ledger-icon.png";
import { Mail, Lock, Eye, EyeOff } from "lucide-vue-next";

const router = useRouter();
const authStore = useAuthStore();
const notificationStore = useNotificationStore();

const showPassword = ref(false);

const form = ref({
  email: "",
  password: "",
});

const isLoading = ref(false);
const errorMessage = ref("");

async function handleSubmit() {
  isLoading.value = true;
  errorMessage.value = "";

  try {
    await authStore.login(form.value);
    await router.push("/dashboard");
  } catch (err) {
    const msg = err.response?.data?.message || "Email atau password salah.";
    errorMessage.value = msg;

    notificationStore.notify({
      message: msg,
      type: "error",
    });
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div
    class="min-h-screen bg-lavender-50 flex items-center justify-center p-4 text-ink-900 font-body"
  >
    <div
      class="w-full max-w-md bg-paper-0 border border-line-200 rounded-md p-6 md:p-8 shadow-card space-y-6"
    >
      <!-- Header -->
      <div class="space-y-4 text-center">
        <div class="flex w-full items-center justify-center">
          <div class="w-22 bg-lavender-50 rounded-2xl">
            <img :src="logoImg" alt="Ledger Logo" />
          </div>
        </div>
        <h1 class="font-display text-2xl md:text-3xl font-bold text-ink-900">
          Welcome Back
        </h1>
        <p class="text-ink-600 font-medium text-md">
          Masuk ke akun Ledger kamu untuk lanjut atur keuangan.
        </p>
      </div>

      <!-- Alert Error -->
      <div
        v-if="errorMessage"
        class="p-3 bg-expense-100 border border-expense-600/20 text-expense-600 text-xs rounded-sm flex items-start gap-2"
      >
        <span>{{ errorMessage }}</span>
      </div>

      <!-- Form Login -->
      <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Input Email -->
        <div class="space-y-1.5">
          <label for="email" class="block text-xs font-medium text-ink-600"
            >Alamat Email</label
          >
          <div class="relative flex items-center">
            <Mail
              class="absolute left-3 w-4 h-4 text-ink-600 pointer-events-none"
            />
            <input
              id="email"
              v-model="form.email"
              type="email"
              required
              placeholder="nama@email.com"
              class="w-full h-10 pl-9 pr-3 border border-line-200 rounded-sm bg-paper-50 focus:bg-paper-0 focus:border-indigo-600 focus:outline-none text-sm text-ink-900 transition-colors"
            />
          </div>
        </div>

        <!-- Input Password dengan Link Lupa Password & Toggle Visibility -->
        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <label for="password" class="block text-xs font-medium text-ink-600"
              >Password</label
            >
            <router-link
              to="/forgot-password"
              class="text-xs font-medium text-indigo-600 hover:underline"
            >
              Lupa password?
            </router-link>
          </div>
          <div class="relative flex items-center">
            <Lock
              class="absolute left-3 w-4 h-4 text-ink-600 pointer-events-none"
            />
            <input
              id="password"
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              required
              placeholder="••••••••"
              class="w-full h-10 pl-9 pr-10 border border-line-200 rounded-sm bg-paper-50 focus:bg-paper-0 focus:border-indigo-600 focus:outline-none text-sm text-ink-900 transition-colors"
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
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          :disabled="isLoading"
          class="w-full h-10 bg-indigo-600 text-paper-0 font-medium text-sm rounded-md hover:bg-indigo-600/90 transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center"
        >
          <span v-if="!isLoading">Masuk</span>
          <span v-else class="text-xs">Memproses...</span>
        </button>
      </form>

      <!-- Footer -->
      <div
        class="pt-4 border-t border-line-200 text-center text-xs text-ink-600"
      >
        Belum memiliki akun?
        <router-link
          to="/register"
          class="text-indigo-600 font-medium hover:underline"
        >
          Daftar sekarang
        </router-link>
      </div>
    </div>
  </div>
</template>
