<script setup>
import AuthLayout from "@/components/AuthLayout.vue";
import { ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "@/lib/axios";
import { Lock, Loader2 } from "lucide-vue-next";
const route = useRoute(),
  router = useRouter();
const email = ref(route.query.email || "");
const token = ref(route.query.token || "");
const password = ref(""),
  confirmation = ref(""),
  loading = ref(false),
  error = ref("");
const valid = computed(() => token.value && email.value);
async function submit() {
  if (password.value !== confirmation.value) {
    error.value = "Konfirmasi password tidak sama.";
    return;
  }
  loading.value = true;
  error.value = "";
  try {
    await api.post("/api/reset-password", {
      email: email.value,
      token: token.value,
      password: password.value,
      password_confirmation: confirmation.value,
    });
    router.replace({ path: "/login", query: { reset: "success" } });
  } catch (e) {
    error.value =
      e.response?.data?.errors?.email?.[0] ||
      e.response?.data?.errors?.password?.[0] ||
      e.response?.data?.message ||
      "Tautan reset tidak valid atau sudah kedaluwarsa.";
  } finally {
    loading.value = false;
  }
}
</script>
<template>
  <AuthLayout>
    <div class="space-y-6">
      <div class="text-center">
        <h1 class="font-display text-2xl font-bold text-ink-900">
          Buat kata sandi baru
        </h1>
        <p class="text-sm text-ink-600 mt-2">
          Minimal 8 karakter dan mengandung huruf serta angka.
        </p>
      </div>
      <div
        v-if="!valid"
        class="p-3 bg-rose-50 text-rose-600 text-sm rounded-lg"
      >
        Tautan reset tidak lengkap. Minta link reset baru.
      </div>
      <form v-else @submit.prevent="submit" class="space-y-4">
        <input
          aria-label="Alamat email"
          :value="email"
          disabled
          class="w-full h-10 px-3 rounded-lg border border-line-200 bg-paper-50 text-sm"
        />
        <div class="relative">
          <Lock class="absolute left-3 top-3 w-4 h-4 text-ink-400" /><input
            aria-label="Kata sandi baru"
            v-model="password"
            required
            minlength="8"
            type="password"
            autocomplete="new-password"
            placeholder="kata sandi baru"
            class="w-full h-10 pl-9 pr-3 rounded-lg border border-line-200 focus:border-indigo-600 focus:outline-none"
          />
        </div>
        <div class="relative">
          <Lock class="absolute left-3 top-3 w-4 h-4 text-ink-400" /><input
            aria-label="Konfirmasi kata sandi baru"
            v-model="confirmation"
            required
            minlength="8"
            type="password"
            autocomplete="new-password"
            placeholder="Ulangi kata sandi baru"
            class="w-full h-10 pl-9 pr-3 rounded-lg border border-line-200 focus:border-indigo-600 focus:outline-none"
          />
        </div>
        <p v-if="error" class="text-xs text-rose-600">{{ error }}</p>
        <button
          :disabled="loading"
          class="w-full h-10 bg-indigo-600 text-white rounded-lg font-semibold text-sm flex justify-center items-center gap-2 disabled:opacity-50"
        >
          <Loader2 v-if="loading" class="w-4 h-4 animate-spin" />Simpan kata
          sandi baru
        </button>
      </form>
      <router-link
        to="/login"
        class="block text-center text-xs font-semibold text-indigo-600"
        >Kembali ke halaman masuk</router-link
      >
    </div>
  </AuthLayout>
</template>
