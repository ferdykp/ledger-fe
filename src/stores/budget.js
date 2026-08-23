// ledger-web/src/stores/budget.js
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import api from "@/lib/axios";

export const useBudgetStore = defineStore("budget", () => {
  const budgets = ref([]);
  const isLoading = ref(false);

  // Total keseluruhan limit & pengeluaran bulan ini
  const totalBudgetLimit = computed(() => {
    return budgets.value.reduce(
      (total, b) => total + parseFloat(b.amount_limit || 0),
      0,
    );
  });

  const totalBudgetSpent = computed(() => {
    return budgets.value.reduce(
      (total, b) => total + parseFloat(b.spent_amount || 0),
      0,
    );
  });

  const totalBudgetRemaining = computed(() => {
    return Math.max(0, totalBudgetLimit.value - totalBudgetSpent.value);
  });

  const totalBudgetPercentage = computed(() => {
    if (totalBudgetLimit.value === 0) return 0;
    const percent = Math.round(
      (totalBudgetSpent.value / totalBudgetLimit.value) * 100,
    );
    return percent > 100 ? 100 : percent;
  });

  // Fetch daftar budget berdasarkan bulan (e.g. YYYY-MM)
  async function fetchBudgets(month = null) {
    isLoading.value = true;
    try {
      const url = month ? `/api/budgets?month=${month}` : "/api/budgets";
      const response = await api.get(url);
      const data = response.data.data || response.data;
      budgets.value = Array.isArray(data) ? data : [];
    } catch (error) {
      console.warn("Gagal memuat budget:", error.message);
      budgets.value = [];
    } finally {
      isLoading.value = false;
    }
  }

  // Set / Update limit budget
  async function saveBudget(payload) {
    const response = await api.post("/api/budgets", payload);
    const newBudget = response.data.data || response.data;

    const index = budgets.value.findIndex(
      (b) => b.category_id === newBudget.category_id,
    );
    if (index !== -1) {
      budgets.value[index] = newBudget;
    } else {
      budgets.value.push(newBudget);
    }
    return newBudget;
  }

  // Hapus limit budget
  async function deleteBudget(id) {
    await api.delete(`/api/budgets/${id}`);
    budgets.value = budgets.value.filter((b) => b.id !== id);
  }

  return {
    budgets,
    isLoading,
    totalBudgetLimit,
    totalBudgetSpent,
    totalBudgetRemaining,
    totalBudgetPercentage,
    fetchBudgets,
    saveBudget,
    deleteBudget,
  };
});
