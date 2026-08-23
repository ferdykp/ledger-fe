// ledger-web/src/stores/account.js
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import api from "@/lib/axios";

export const useAccountStore = defineStore("account", () => {
  const accounts = ref([]);
  const isLoading = ref(false);

  // Menghitung total saldo (dipastikan konversi ke Number/parseFloat)
  const totalBalance = computed(() => {
    return accounts.value.reduce((total, acc) => {
      const val = parseFloat(acc.balance);
      return total + (isNaN(val) ? 0 : val);
    }, 0);
  });

  // Ambil daftar akun dari backend Laravel
  async function fetchAccounts() {
    isLoading.value = true;
    try {
      const response = await api.get("/api/accounts");
      // PERBAIKAN: Tangkap response.data.data dari AccountResource
      if (Array.isArray(response.data.data)) {
        accounts.value = response.data.data;
      } else if (Array.isArray(response.data)) {
        accounts.value = response.data;
      } else {
        accounts.value = [];
      }
    } catch (error) {
      console.warn("Gagal memuat akun:", error.message);
      accounts.value = [];
    } finally {
      isLoading.value = false;
    }
  }

  async function addAccount(payload) {
    const response = await api.post("/api/accounts", payload);
    const newAccount = response.data.data || response.data;
    accounts.value.unshift(newAccount);
    return newAccount;
  }

  return { accounts, totalBalance, isLoading, fetchAccounts, addAccount };
});
