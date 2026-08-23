// ledger-web/src/stores/category.js
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import api from "@/lib/axios";

export const useCategoryStore = defineStore("category", () => {
  const categories = ref([]);
  const isLoading = ref(false);

  // Filter kategori bertipe 'expense'
  const expenseCategories = computed(() => {
    return categories.value.filter((cat) => cat.type === "expense");
  });

  // Filter kategori bertipe 'income'
  const incomeCategories = computed(() => {
    return categories.value.filter((cat) => cat.type === "income");
  });

  // Ambil semua daftar kategori dari API
  async function fetchCategories(type = null) {
    isLoading.value = true;
    try {
      const url = type ? `/api/categories?type=${type}` : "/api/categories";
      const response = await api.get(url);

      const data = response.data.data || response.data;
      categories.value = Array.isArray(data) ? data : [];
    } catch (error) {
      console.warn("Gagal memuat kategori:", error.message);
      categories.value = [];
    } finally {
      isLoading.value = false;
    }
  }

  // Tambah kategori baru
  async function addCategory(payload) {
    const response = await api.post("/api/categories", payload);
    const newCategory = response.data.data || response.data;

    categories.value.push(newCategory);
    return newCategory;
  }

  // Update kategori
  async function updateCategory(id, payload) {
    const response = await api.put(`/api/categories/${id}`, payload);
    const updated = response.data.data || response.data;

    const index = categories.value.findIndex((c) => c.id === id);
    if (index !== -1) {
      categories.value[index] = updated;
    }
    return updated;
  }

  // Hapus kategori
  async function deleteCategory(id) {
    await api.delete(`/api/categories/${id}`);
    categories.value = categories.value.filter((c) => c.id !== id);
  }

  return {
    categories,
    expenseCategories,
    incomeCategories,
    isLoading,
    fetchCategories,
    addCategory,
    updateCategory,
    deleteCategory,
  };
});
