import { ref, onMounted } from "vue";
import api from "@/lib/axios";
import { useAccountStore } from "@/stores/account";
import { localDate } from "@/utils/dates";
import { useNotificationStore } from "@/stores/notification";

export function useBills() {
  const notify = useNotificationStore();
  const accountStore = useAccountStore();
  const bills = ref([]),
    loading = ref(false),
    saving = ref(false),
    open = ref(false),
    editing = ref(null);
  const defaults = () => ({
    name: "",
    amount: "",
    due_date: localDate(),
    frequency: "",
    status: "",
    category: "",
    note: "",
    reminder_enabled: true,
    auto_pay_enabled: false,
    auto_pay_account_id: "",
  });
  const form = ref(defaults());
  const summary = ref({ active_count: 0, monthly_total: 0, overdue_count: 0, auto_pay_attention_count: 0 });
  const page = ref(1);
  const lastPage = ref(1);
  const loadError = ref(false);
  async function load(targetPage = 1) {
    loading.value = true;
    loadError.value = false;
    try {
      const { data } = await api.get("/api/bills", {
        params: { page: targetPage, today: localDate() },
      });
      if (data.current_page > data.last_page) return await load(data.last_page);
      bills.value = data.data;
      summary.value = data.summary;
      page.value = data.current_page;
      lastPage.value = data.last_page;
    } catch {
      loadError.value = true;
    } finally {
      loading.value = false;
    }
  }
  function add() {
    if (saving.value) return;
    editing.value = null;
    form.value = defaults();
    open.value = true;
  }
  function edit(bill) {
    if (saving.value) return;
    editing.value = bill;
    form.value = {
      ...bill,
      due_date: String(bill.due_date).slice(0, 10),
      auto_pay_enabled: Boolean(bill.auto_pay_enabled),
      auto_pay_account_id: bill.auto_pay_account_id || "",
    };
    open.value = true;
  }
  function close() {
    if (!saving.value) open.value = false;
  }
  async function mutate(action, message) {
    if (saving.value) return;
    saving.value = true;
    try {
      await action();
      open.value = false;
      await load(page.value);
      notify.notify({ message });
    } catch (error) {
      notify.notify({
        message:
          error.response?.data?.message ||
          "Perubahan belum tersimpan. Silakan coba lagi.",
        type: "error",
      });
    } finally {
      saving.value = false;
    }
  }
  function save() {
    const payload = { ...form.value, amount: Number(form.value.amount) };
    if (!payload.auto_pay_enabled) payload.auto_pay_account_id = null;
    return mutate(
      () =>
        editing.value
          ? api.put(`/api/bills/${editing.value.id}`, payload)
          : api.post("/api/bills", payload),
      "Tagihan berhasil disimpan.",
    );
  }
  function paid(bill) {
    return mutate(
      () => api.post(`/api/bills/${bill.id}/paid`),
      "Tagihan ditandai lunas. Jadwal berikutnya disiapkan untuk tagihan berulang.",
    );
  }
  function del(bill) {
    if (confirm(`Hapus tagihan ${bill.name}?`))
      return mutate(
        () => api.delete(`/api/bills/${bill.id}`),
        "Tagihan dihapus.",
      );
  }
  function dueLabel(value) {
    return new Date(
      String(value).slice(0, 10) + "T00:00:00",
    ).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }
  onMounted(() => {
    load();
    if (!accountStore.accounts.length) accountStore.fetchAccounts();
  });
  return {
    bills,
    accounts: accountStore.accounts,
    loading,
    saving,
    open,
    editing,
    form,
    summary,
    page,
    lastPage,
    loadError,
    load,
    add,
    edit,
    close,
    save,
    paid,
    del,
    dueLabel,
  };
}
