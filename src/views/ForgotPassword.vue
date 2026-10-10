<script setup>
import AuthLayout from "@/components/AuthLayout.vue";
import { ref } from "vue";
import api from "@/lib/axios";
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from "lucide-vue-next";
const email = ref("");
const loading = ref(false);
const sent = ref(false);
const message = ref("");
async function submit() {
  loading.value = true;
  message.value = "";
  try {
    const { data } = await api.post("/api/forgot-password", {
      email: email.value,
    });
    sent.value = true;
    message.value = data.message;
  } catch (e) {
    message.value =
      e.response?.data?.message ||
      "Permintaan belum dapat diproses. Coba lagi.";
  } finally {
    loading.value = false;
  }
}
</script>
<template>
  <AuthLayout>
    <div class="space-y-6">
      <div class="text-center space-y-3">
        <h1 class="font-display text-2xl font-bold">Lupa kata sandi</h1>
        <p class="text-sm text-ink-600">
          Masukkan email akun. Kami akan mengirim tautan atur ulang kata sandi.
        </p>
      </div>
      <div
        v-if="sent"
        class="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 flex gap-3"
      >
        <CheckCircle2 class="w-5 h-5 shrink-0" /><span>{{ message }}</span>
      </div>
      <form v-else @submit.prevent="submit" class="space-y-4">
        <div>
          <label
            for="reset-email"
            class="block text-xs font-medium text-ink-600 mb-1.5"
            >Alamat Email</label
          >
          <div class="relative">
            <Mail class="absolute left-3 top-3 w-4 h-4 text-ink-400" /><input
              id="reset-email"
              v-model.trim="email"
              required
              type="email"
              autocomplete="email"
              class="w-full h-10 pl-9 pr-3 border border-line-200 rounded-lg focus:border-indigo-600 focus:outline-none"
              placeholder="nama@email.com"
            />
          </div>
        </div>
        <p v-if="message" class="text-xs text-rose-600">{{ message }}</p>
        <button
          :disabled="loading"
          class="w-full h-10 rounded-lg bg-indigo-600 text-white font-semibold text-sm disabled:opacity-50 flex justify-center items-center gap-2"
        >
          <Loader2 v-if="loading" class="w-4 h-4 animate-spin" />Kirim Link
          Reset
        </button>
      </form>
      <router-link
        to="/login"
        class="flex justify-center items-center gap-2 text-xs font-semibold text-indigo-600"
        ><ArrowLeft class="w-4 h-4" />Kembali ke halaman masuk</router-link
      >
    </div>
  </AuthLayout>
</template>
