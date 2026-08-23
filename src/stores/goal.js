// ledger-web/src/stores/goal.js
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import api from "@/lib/axios";

export const useGoalStore = defineStore("goal", () => {
  const goals = ref([]);
  const isLoading = ref(false);

  // Kalkulasi Total Terkumpul & Total Target
  const totalTargetAmount = computed(() => {
    return goals.value.reduce(
      (acc, g) => acc + parseFloat(g.target_amount || 0),
      0,
    );
  });

  const totalCurrentAmount = computed(() => {
    return goals.value.reduce(
      (acc, g) => acc + parseFloat(g.current_amount || 0),
      0,
    );
  });

  const overallProgressPercent = computed(() => {
    if (totalTargetAmount.value === 0) return 0;
    return Math.min(
      100,
      Math.round((totalCurrentAmount.value / totalTargetAmount.value) * 100),
    );
  });

  // Fetch semua daftar impian tabungan
  async function fetchGoals() {
    isLoading.value = true;
    try {
      const response = await api.get("/api/goals");
      const data = response.data.data || response.data;
      goals.value = Array.isArray(data) ? data : [];
    } catch (error) {
      console.warn("Gagal memuat target tabungan:", error.message);
      goals.value = [];
    } finally {
      isLoading.value = false;
    }
  }

  // Buat target tabungan baru
  async function addGoal(payload) {
    const response = await api.post("/api/goals", payload);
    const newGoal = response.data.data || response.data;
    goals.value.unshift(newGoal);
    return newGoal;
  }

  // Update target tabungan
  async function updateGoal(id, payload) {
    const response = await api.put(`/api/goals/${id}`, payload);
    const updated = response.data.data || response.data;
    const index = goals.value.findIndex((g) => g.id === id);
    if (index !== -1) goals.value[index] = updated;
    return updated;
  }

  // Setor tabungan (add contribution)
  async function addContribution(goalId, payload) {
    const response = await api.post(
      `/api/goals/${goalId}/contributions`,
      payload,
    );
    const updatedGoal = response.data.data || response.data;
    const index = goals.value.findIndex((g) => g.id === goalId);
    if (index !== -1) goals.value[index] = updatedGoal;
    return updatedGoal;
  }

  // Hapus target tabungan
  async function deleteGoal(id) {
    await api.delete(`/api/goals/${id}`);
    goals.value = goals.value.filter((g) => g.id !== id);
  }

  return {
    goals,
    isLoading,
    totalTargetAmount,
    totalCurrentAmount,
    overallProgressPercent,
    fetchGoals,
    addGoal,
    updateGoal,
    addContribution,
    deleteGoal,
  };
});
