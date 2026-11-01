// ledger-web/src/stores/account.js
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import api from "@/lib/axios";
import { addDecimal, compareDecimal } from "@/utils/decimal";

export const useAccountStore = defineStore("account", () => {
  const accounts = ref([]);
  const allocationSummary = ref([]);
  const allocationSummaryLoaded = ref(false);
  const isLoading = ref(false);

  // Menghitung total saldo (dipastikan konversi ke Number/parseFloat)
  const totalBalance = computed(() => {
    return accounts.value
      .filter(
        (account) =>
          !account.is_archived &&
          ["cash", "bank", "ewallet"].includes(account.type),
      )
      .reduce(
        (total, account) => addDecimal(total, account.balance || "0"),
        "0.00",
      );
  });
  const cashAvailableTotal = computed(() =>
    allocationSummaryLoaded.value
      ? accounts.value
          .filter(
            (account) =>
              !account.is_archived &&
              account.purpose !== "savings" &&
              ["cash", "bank", "ewallet"].includes(account.type),
          )
          .reduce((total, account) => {
            const summary = allocationSummary.value.find(
              (entry) => Number(entry.account_id) === Number(account.id),
            );
            const available = summary?.unallocated ?? account.balance ?? "0";
            return addDecimal(
              total,
              compareDecimal(available, "0.00") > 0 ? available : "0.00",
            );
          }, "0.00")
      : "0.00",
  );
  const savingsCashTotal = computed(() =>
    accounts.value
      .filter(
        (account) =>
          !account.is_archived &&
          ["cash", "bank", "ewallet"].includes(account.type),
      )
      .reduce((total, account) => {
        const summary = allocationSummary.value.find(
          (entry) => Number(entry.account_id) === Number(account.id),
        );
        const balance =
          compareDecimal(account.balance || "0", "0.00") > 0
            ? account.balance
            : "0.00";
        const saved =
          account.purpose === "savings"
            ? balance
            : (summary?.allocated ?? "0.00");
        return addDecimal(total, saved);
      }, "0.00"),
  );

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
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchAllocationSummary() {
    try {
      const response = await api.get("/api/cash-allocations/accounts");
      allocationSummary.value = Array.isArray(response.data.data)
        ? response.data.data
        : [];
      allocationSummaryLoaded.value = true;
    } catch (error) {
      console.warn("Gagal memuat alokasi kas:", error.message);
      allocationSummary.value = [];
      allocationSummaryLoaded.value = false;
    }
  }

  async function addAccount(payload) {
    const response = await api.post("/api/accounts", payload);
    const newAccount = response.data.data || response.data;
    accounts.value.unshift(newAccount);
    return newAccount;
  }
  // ledger-web/src/stores/account.js
  async function updateAccount(id, payload) {
    const response = await api.put(`/api/accounts/${id}`, payload);
    const updated = response.data.data || response.data;

    const index = accounts.value.findIndex((a) => a.id === id);
    if (index !== -1) {
      accounts.value[index] = updated;
    }
    return updated;
  }

  async function deleteAccount(id) {
    await api.delete(`/api/accounts/${id}`);
    accounts.value = accounts.value.filter((a) => a.id !== id);
  }

  // Jangan lupa return updateAccount & deleteAccount di store

  return {
    accounts,
    allocationSummary,
    allocationSummaryLoaded,
    totalBalance,
    cashAvailableTotal,
    savingsCashTotal,
    isLoading,
    fetchAccounts,
    fetchAllocationSummary,
    addAccount,
    updateAccount,
    deleteAccount,
  };
});
