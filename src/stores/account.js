// ledger-web/src/stores/account.js
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import api from "@/lib/axios";

export const useAccountStore = defineStore("account", () => {
  const accounts = ref([]);
  const isLoading = ref(false);

  // Menghitung total saldo dari seluruh akun
  const totalBalance = computed(() => {
    return accounts.value.reduce(
      (total, acc) => total + Number(acc.balance || 0),
      0,
    );
  });

  // Ambil daftar akun dari backend Laravel
  async function fetchAccounts() {
    isLoading.value = true;
    try {
      const response = await api.get("/api/accounts");
      accounts.value = response.data.data || response.data;
    } catch (error) {
      console.warn("API Accounts belum siap atau 404:", error.message);
      accounts.value = []; // Set default array kosong
    } finally {
      isLoading.value = false;
    }
  }

  // Tambah akun/dompet baru
  async function addAccount(payload) {
    const response = await api.post("/api/accounts", payload);
    accounts.value.push(response.data);
    return response.data;
  }

  return { accounts, totalBalance, isLoading, fetchAccounts, addAccount };
});
