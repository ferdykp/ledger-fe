<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { localDate } from "@/utils/dates";
import { formatRupiah } from "@/utils/formatters";
import MoneyInput from "@/components/MoneyInput.vue";
import {
  addDecimal,
  compareDecimal,
  divideDecimal,
  multiplyDecimal,
} from "@/utils/decimal";
import { useNotificationStore } from "@/stores/notification";
import api from "@/lib/axios";

const route = useRoute();
const router = useRouter();
const notify = useNotificationStore();
const tab = ref("goals");
const showGoalForm = ref(false);
const showAssetForm = ref(false);
const goals = ref([]);
const accounts = ref([]);
const assets = ref([]);
const selectedGoalId = ref(null);
const selectedAssetId = ref(null);
const funding = ref(null);
const contributions = ref([]);
const contributionNextPage = ref(null);
const contributionHasMore = ref(false);
const cashHistory = ref([]);
const loading = ref(true);
const busy = ref(false);
const error = ref("");

const templates = {
  Lamaran: [
    "Mahar",
    "Cincin",
    "Venue",
    "Dekorasi",
    "Dokumentasi",
    "Konsumsi",
    "Dana cadangan",
  ],
  Pernikahan: [
    "Akad",
    "Resepsi",
    "Wedding organizer",
    "Catering",
    "Dekorasi",
    "Makeup",
    "Dokumentasi",
    "Dana cadangan",
  ],
  Liburan: [
    "Transportasi",
    "Penginapan",
    "Konsumsi",
    "Transportasi lokal",
    "Tiket wisata",
    "Dana cadangan",
  ],
  "Dana darurat": ["Dana darurat"],
  Custom: ["Kebutuhan 1"],
};
const goalForm = ref({ name: "", target_date: "", icon: "target", items: [] });
const contribution = ref({ amount: "", date: localDate(), note: "" });
const cashForm = ref({
  account_id: "",
  amount: "",
  action: "allocate",
  note: "",
});
const itemForm = ref({ name: "", quantity: "1", unit_price: "", notes: "" });
const obligationForm = ref({
  goal_item_id: "",
  name: "",
  amount: "",
  due_date: "",
  payee: "",
});
const assetForm = ref({
  type: "gold",
  name: "",
  provider: "",
  identifier: "",
  storage_type: "physical",
});
const assetTrade = ref({
  type: "purchase",
  status: "settled",
  calc_mode: "actual",
  cash_account_id: "",
  amount: "",
  quantity: "",
  unit_price: "",
  price_unit_grams: "1.00000000",
  fees: "0",
  cash_debited: true,
  transaction_date: localDate(),
  notes: "",
});
const customPriceUnit = ref("");
const priceForm = ref({
  price: "",
  captured_at: localDate(),
  source: "manual",
});
const assetAllocation = ref({ goal_id: "", quantity: "", action: "allocate" });
const pendingForm = ref({
  quantity: "",
  unit_price: "",
  amount: "",
  fees: "0",
  cash_account_id: "",
  cash_debited: true,
});

const selectedGoal = computed(
  () => goals.value.find((goal) => goal.id === selectedGoalId.value) || null,
);
const selectedAsset = computed(
  () =>
    assets.value.find((asset) => asset.id === selectedAssetId.value) || null,
);
const accountChoices = computed(() =>
  accounts.value.filter((account) => !account.is_archived),
);
const totalGoalBudget = computed(() =>
  goals.value.reduce(
    (sum, goal) =>
      addDecimal(sum, goal.budget_total || goal.target_amount || 0),
    "0.00",
  ),
);
const totalSavingsJournal = computed(() =>
  goals.value.reduce(
    (sum, goal) => addDecimal(sum, goal.current_amount || 0),
    "0.00",
  ),
);

function normalizeError(err, fallback) {
  return (
    err.response?.data?.message ||
    Object.values(err.response?.data?.errors || {})[0]?.[0] ||
    fallback
  );
}
function notifyError(err, fallback) {
  notify.notify({ message: normalizeError(err, fallback), type: "error" });
}
function newIdempotencyKey() {
  return (
    window.crypto?.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}
function selectGoal(id) {
  selectedGoalId.value = id;
  fetchGoalDetails();
}
function switchTab(nextTab) {
  tab.value = nextTab;
  selectedGoalId.value = null;
  selectedAssetId.value = null;
  showGoalForm.value = false;
  showAssetForm.value = false;
}
function backToGoalList() {
  selectedGoalId.value = null;
}
function backToAssetList() {
  selectedAssetId.value = null;
}
function addTemplate(name) {
  goalForm.value.name = name === "Custom" ? "" : name;
  goalForm.value.items = templates[name].map((label) => ({
    name: label,
    quantity: "1",
    unit_price: "",
  }));
}
function lineTotal(item) {
  return multiplyDecimal(item.quantity || "0", item.unit_price || "0", 4, 2, 2);
}
const newGoalBudget = computed(() =>
  goalForm.value.items.reduce(
    (sum, item) => addDecimal(sum, lineTotal(item)),
    "0.00",
  ),
);
const effectivePriceUnit = computed(() =>
  assetTrade.value.price_unit_grams === "custom"
    ? customPriceUnit.value
    : assetTrade.value.price_unit_grams,
);
const tradePreview = computed(() => {
  const { calc_mode, amount, quantity, unit_price } = assetTrade.value;
  const priceUnit =
    selectedAsset.value?.type === "gold"
      ? effectivePriceUnit.value || "1"
      : "1";
  const pricePerGram = divideDecimal(unit_price || "0", priceUnit, 8, 8, 8);
  if (calc_mode === "by_amount")
    return {
      quantity: divideDecimal(amount || "0", pricePerGram, 2, 8, 8),
      amount: String(amount || "0"),
    };
  if (calc_mode === "by_quantity") {
    const pricedUnits = divideDecimal(quantity || "0", priceUnit, 8, 8, 8);
    return {
      quantity: String(quantity || "0"),
      amount: multiplyDecimal(pricedUnits, unit_price || "0", 8, 8, 2),
    };
  }
  return { quantity: String(quantity || "0"), amount: String(amount || "0") };
});

async function fetchAll() {
  loading.value = true;
  error.value = "";
  try {
    const [goalRes, accountRes, assetRes] = await Promise.all([
      api.get("/api/goals"),
      api.get("/api/accounts"),
      api.get("/api/assets"),
    ]);
    goals.value = goalRes.data.data || [];
    accounts.value = accountRes.data.data || [];
    assets.value = assetRes.data.data || [];
    if (selectedGoalId.value) await fetchGoalDetails();
  } catch (err) {
    error.value = normalizeError(
      err,
      "Data rencana keuangan belum dapat dimuat.",
    );
  } finally {
    loading.value = false;
  }
}

async function fetchGoalDetails() {
  if (!selectedGoalId.value) return;
  try {
    const [fundingRes, contributionRes, cashRes] = await Promise.all([
      api.get(`/api/goals/${selectedGoalId.value}/funding`),
      api.get(`/api/goals/${selectedGoalId.value}/contributions?page=1`),
      api.get(`/api/goals/${selectedGoalId.value}/cash-allocations`),
    ]);
    funding.value = fundingRes.data.data;
    contributions.value = contributionRes.data.data || [];
    contributionNextPage.value = contributionRes.data.meta?.current_page
      ? contributionRes.data.meta.current_page + 1
      : null;
    contributionHasMore.value = Boolean(
      contributionRes.data.meta?.current_page &&
      contributionRes.data.meta.current_page <
        contributionRes.data.meta.last_page,
    );
    cashHistory.value = cashRes.data.history?.data || [];
  } catch (err) {
    notifyError(err, "Rincian target gagal dimuat.");
  }
}

async function loadMoreContributions() {
  if (!selectedGoalId.value || !contributionNextPage.value || busy.value)
    return;
  busy.value = true;
  try {
    const { data } = await api.get(
      `/api/goals/${selectedGoalId.value}/contributions?page=${contributionNextPage.value}`,
    );
    contributions.value.push(...(data.data || []));
    contributionNextPage.value =
      data.meta?.current_page < data.meta?.last_page
        ? data.meta.current_page + 1
        : null;
    contributionHasMore.value = Boolean(contributionNextPage.value);
  } catch (err) {
    notifyError(err, "Riwayat setoran gagal dimuat.");
  } finally {
    busy.value = false;
  }
}

async function refreshAll() {
  await fetchAll();
}
watch(selectedAssetId, () => {
  if (selectedAsset.value)
    pendingForm.value = {
      quantity: selectedAsset.value.quantity,
      unit_price: selectedAsset.value.latest_price || "",
      amount: "",
      fees: "0",
      cash_account_id: "",
      cash_debited: true,
    };
});
watch(
  () => [
    contribution.value.amount,
    contribution.value.date,
    contribution.value.note,
  ],
  () => {
    contribution.value.idempotency_key = null;
  },
);
watch(
  () => [
    cashForm.value.account_id,
    cashForm.value.amount,
    cashForm.value.action,
    cashForm.value.note,
  ],
  () => {
    cashForm.value.idempotency_key = null;
  },
);
watch(
  () => [
    assetTrade.value.type,
    assetTrade.value.status,
    assetTrade.value.cash_account_id,
    assetTrade.value.amount,
    assetTrade.value.quantity,
    assetTrade.value.unit_price,
    assetTrade.value.price_unit_grams,
    assetTrade.value.fees,
    assetTrade.value.transaction_date,
  ],
  () => {
    assetTrade.value.idempotency_key = null;
  },
);
watch(
  () => [
    assetAllocation.value.goal_id,
    assetAllocation.value.quantity,
    assetAllocation.value.action,
  ],
  () => {
    assetAllocation.value.idempotency_key = null;
  },
);

async function createGoal() {
  if (busy.value) return;
  if (
    !goalForm.value.name.trim() ||
    compareDecimal(newGoalBudget.value, "0.00") <= 0
  ) {
    notify.notify({
      message:
        "Isi nama target dan sedikitnya satu rincian dengan nominal anggaran.",
      type: "error",
    });
    return;
  }
  busy.value = true;
  let created = null;
  try {
    const result = await api.post("/api/goals", {
      name: goalForm.value.name.trim(),
      target_amount: newGoalBudget.value,
      current_amount: "0.00",
      target_date: goalForm.value.target_date || null,
      icon: goalForm.value.icon,
    });
    created = result.data.data;
    for (const item of goalForm.value.items.filter(
      (row) => row.name.trim() && compareDecimal(row.unit_price, "0.00") > 0,
    )) {
      await api.post(`/api/goals/${created.id}/items`, {
        ...item,
        name: item.name.trim(),
        unit_price: String(item.unit_price),
      });
    }
    selectedGoalId.value = created.id;
    showGoalForm.value = false;
    goalForm.value = { name: "", target_date: "", icon: "target", items: [] };
    notify.notify({
      message: "Target dan rincian anggaran berhasil dibuat.",
      type: "success",
    });
    await refreshAll();
  } catch (err) {
    if (created?.id) {
      try {
        await api.delete(`/api/goals/${created.id}`);
      } catch {
        /* Keep the draft visible if rollback is unavailable. */
      }
    }
    notifyError(err, "Target gagal dibuat.");
  } finally {
    busy.value = false;
  }
}

async function addContribution() {
  if (busy.value || !selectedGoal.value) return;
  busy.value = true;
  try {
    if (!contribution.value.idempotency_key)
      contribution.value.idempotency_key = newIdempotencyKey();
    await api.post(
      `/api/goals/${selectedGoal.value.id}/contributions`,
      contribution.value,
    );
    contribution.value = { amount: "", date: localDate(), note: "" };
    notify.notify({
      message: "Setoran dicatat di riwayat target.",
      type: "success",
    });
    await refreshAll();
  } catch (err) {
    notifyError(err, "Setoran gagal dicatat.");
  } finally {
    busy.value = false;
  }
}

async function allocateCash() {
  if (busy.value || !selectedGoal.value) return;
  busy.value = true;
  try {
    if (!cashForm.value.idempotency_key)
      cashForm.value.idempotency_key = newIdempotencyKey();
    await api.post(
      `/api/goals/${selectedGoal.value.id}/cash-allocations`,
      cashForm.value,
    );
    cashForm.value.amount = "";
    cashForm.value.idempotency_key = null;
    notify.notify({
      message:
        cashForm.value.action === "allocate"
          ? "Dana berhasil dialokasikan."
          : "Alokasi dana berhasil dilepas.",
      type: "success",
    });
    await refreshAll();
  } catch (err) {
    notifyError(err, "Alokasi dana gagal.");
  } finally {
    busy.value = false;
  }
}

async function addItem() {
  if (busy.value || !selectedGoal.value) return;
  busy.value = true;
  try {
    await api.post(`/api/goals/${selectedGoal.value.id}/items`, itemForm.value);
    itemForm.value = { name: "", quantity: "1", unit_price: "", notes: "" };
    await refreshAll();
    notify.notify({
      message: "Rincian anggaran ditambahkan.",
      type: "success",
    });
  } catch (err) {
    notifyError(err, "Rincian gagal ditambahkan.");
  } finally {
    busy.value = false;
  }
}

async function removeItem(item) {
  if (!window.confirm(`Hapus rincian “${item.name}”?`)) return;
  try {
    await api.delete(`/api/goals/${selectedGoal.value.id}/items/${item.id}`);
    await refreshAll();
  } catch (err) {
    notifyError(err, "Rincian tidak dapat dihapus.");
  }
}

async function addObligation() {
  if (busy.value || !selectedGoal.value || !obligationForm.value.goal_item_id)
    return;
  busy.value = true;
  try {
    const { goal_item_id, ...payload } = obligationForm.value;
    await api.post(
      `/api/goals/${selectedGoal.value.id}/items/${goal_item_id}/obligations`,
      payload,
    );
    obligationForm.value = {
      goal_item_id: "",
      name: "",
      amount: "",
      due_date: "",
      payee: "",
    };
    await refreshAll();
    notify.notify({
      message: "Jadwal pembayaran ditambahkan.",
      type: "success",
    });
  } catch (err) {
    notifyError(err, "Jadwal pembayaran gagal dibuat.");
  } finally {
    busy.value = false;
  }
}

function payObligation(obligation) {
  router.push({
    path: "/transactions/create",
    query: {
      type: "expense",
      goal_obligation_id: obligation.id,
      amount: obligation.remaining_amount,
      note: `${obligation.item || "Target"}: ${obligation.name}`,
    },
  });
}

async function createAsset() {
  if (busy.value) return;
  busy.value = true;
  try {
    const { data } = await api.post("/api/assets", assetForm.value);
    selectedAssetId.value = data.data.id;
    showAssetForm.value = false;
    assetForm.value = {
      type: "gold",
      name: "",
      provider: "",
      identifier: "",
      storage_type: "physical",
    };
    await refreshAll();
    notify.notify({ message: "Aset berhasil ditambahkan.", type: "success" });
  } catch (err) {
    notifyError(err, "Aset gagal ditambahkan.");
  } finally {
    busy.value = false;
  }
}

async function recordTrade() {
  if (busy.value || !selectedAsset.value) return;
  if (
    compareDecimal(tradePreview.value.quantity, "0.00000000", 8) <= 0 ||
    compareDecimal(tradePreview.value.amount, "0.00") <= 0
  ) {
    notify.notify({
      message: "Isi nominal dan jumlah unit/gram transaksi yang valid.",
      type: "error",
    });
    return;
  }
  busy.value = true;
  try {
    const payload = {
      ...assetTrade.value,
      quantity: tradePreview.value.quantity,
      amount: tradePreview.value.amount,
      price_unit_grams:
        selectedAsset.value.type === "gold"
          ? effectivePriceUnit.value
          : "1.00000000",
      type:
        selectedAsset.value.type === "gold"
          ? assetTrade.value.type
          : assetTrade.value.type === "purchase"
            ? "subscription"
            : assetTrade.value.type === "sale"
              ? "redemption"
              : assetTrade.value.type,
      status:
        selectedAsset.value.type === "gold"
          ? "settled"
          : assetTrade.value.status,
    };
    delete payload.calc_mode;
    if (payload.price_unit_grams === "custom")
      payload.price_unit_grams = customPriceUnit.value;
    if (!payload.cash_account_id) delete payload.cash_account_id;
    if (!assetTrade.value.idempotency_key)
      assetTrade.value.idempotency_key = newIdempotencyKey();
    payload.idempotency_key = assetTrade.value.idempotency_key;
    await api.post(
      `/api/assets/${selectedAsset.value.id}/transactions`,
      payload,
    );
    assetTrade.value = {
      ...assetTrade.value,
      amount: "",
      quantity: "",
      unit_price: "",
      fees: "0",
      transaction_date: localDate(),
      notes: "",
      idempotency_key: null,
    };
    await refreshAll();
    notify.notify({ message: "Transaksi aset dicatat.", type: "success" });
  } catch (err) {
    notifyError(err, "Transaksi aset gagal dicatat.");
  } finally {
    busy.value = false;
  }
}

async function savePrice() {
  if (busy.value || !selectedAsset.value) return;
  busy.value = true;
  try {
    await api.post(
      `/api/assets/${selectedAsset.value.id}/prices`,
      priceForm.value,
    );
    await refreshAll();
    notify.notify({ message: "Valuasi terbaru disimpan.", type: "success" });
  } catch (err) {
    notifyError(err, "Valuasi gagal disimpan.");
  } finally {
    busy.value = false;
  }
}

async function allocateAsset() {
  if (busy.value || !selectedAsset.value || !assetAllocation.value.goal_id)
    return;
  busy.value = true;
  try {
    const { goal_id, ...payload } = assetAllocation.value;
    if (!assetAllocation.value.idempotency_key)
      assetAllocation.value.idempotency_key = newIdempotencyKey();
    payload.idempotency_key = assetAllocation.value.idempotency_key;
    await api.post(
      `/api/goals/${goal_id}/assets/${selectedAsset.value.id}/allocations`,
      payload,
    );
    assetAllocation.value.idempotency_key = null;
    await refreshAll();
    notify.notify({
      message: "Alokasi aset ke target disimpan.",
      type: "success",
    });
  } catch (err) {
    notifyError(err, "Aset gagal dialokasikan.");
  } finally {
    busy.value = false;
  }
}

async function transitionAsset(tx, status) {
  if (busy.value) return;
  busy.value = true;
  try {
    const payload = {
      status,
      ...pendingForm.value,
      cash_debited: tx.cash_debited || pendingForm.value.cash_debited,
    };
    if (!payload.cash_account_id) delete payload.cash_account_id;
    await api.post(`/api/assets/transactions/${tx.id}/status`, payload);
    await refreshAll();
    notify.notify({
      message: "Status transaksi aset diperbarui.",
      type: "success",
    });
  } catch (err) {
    notifyError(err, "Status transaksi aset gagal diperbarui.");
  } finally {
    busy.value = false;
  }
}

onMounted(async () => {
  if (route.query.tab === "assets") tab.value = "assets";
  await fetchAll();
});
</script>

<template>
  <main class="app-page financial-workspace space-y-6 pb-8">
    <header class="financial-page-header">
      <div class="financial-page-title">
        <p class="eyebrow">Perencanaan keuangan</p>
        <h1>Target & aset</h1>
        <p class="text-sm text-ink-500">
          Rencanakan kebutuhan, cadangkan dana, dan pantau aset dari satu
          tempat.
        </p>
      </div>
      <div
        class="financial-tabs"
        role="tablist"
        aria-label="Bagian perencanaan"
      >
        <button
          role="tab"
          :aria-selected="tab === 'goals'"
          class="financial-tab"
          :class="{ 'is-active': tab === 'goals' }"
          @click="switchTab('goals')"
        >
          Target
        </button>
        <button
          role="tab"
          :aria-selected="tab === 'assets'"
          class="financial-tab"
          :class="{ 'is-active': tab === 'assets' }"
          @click="switchTab('assets')"
        >
          Aset
        </button>
      </div>
    </header>

    <div
      v-if="loading"
      class="surface-card p-8 text-center text-sm text-ink-500"
    >
      Memuat perencanaan keuangan…
    </div>
    <div v-else-if="error" class="surface-card p-6">
      <p class="text-sm text-expense-600">{{ error }}</p>
      <button class="primary-button mt-4" @click="fetchAll">Coba lagi</button>
    </div>

    <template v-else-if="tab === 'goals'">
      <section v-if="!selectedGoal" class="goal-summary-grid">
        <article class="surface-card goal-summary-card goal-summary-primary">
          <p class="text-xs text-ink-500">Total anggaran target</p>
          <p class="mt-2 text-xl font-bold">
            {{ formatRupiah(totalGoalBudget) }}
          </p>
        </article>
        <article class="surface-card goal-summary-card">
          <p class="text-xs text-ink-500">Jurnal setoran</p>
          <p class="mt-2 text-xl font-bold">
            {{ formatRupiah(totalSavingsJournal) }}
          </p>
          <p class="mt-1 text-xs text-ink-500">
            Catatan setoran; tidak otomatis menambah saldo rekening.
          </p>
        </article>
        <article class="surface-card goal-summary-card">
          <p class="text-xs text-ink-500">Target aktif</p>
          <p class="mt-2 text-xl font-bold">{{ goals.length }}</p>
        </article>
      </section>

      <section
        class="goal-planner-layout"
        :class="selectedGoal ? 'is-detail-view' : 'is-list-view'"
      >
        <div v-if="!selectedGoal" class="goal-planner-sidebar space-y-4">
          <article v-if="showGoalForm" class="surface-card planner-card">
            <div class="planner-card-heading">
              <div>
                <h2 class="font-bold">Buat target</h2>
                <p>Pilih contoh, lalu sesuaikan anggarannya.</p>
              </div>
              <button
                type="button"
                class="goal-close-create"
                aria-label="Tutup formulir target"
                @click="showGoalForm = false"
              >
                ×
              </button>
            </div>
            <div class="goal-template-list">
              <button
                v-for="name in Object.keys(templates)"
                :key="name"
                class="goal-template-chip"
                @click="addTemplate(name)"
              >
                {{ name }}
              </button>
            </div>
            <form class="goal-create-form" @submit.prevent="createGoal">
              <label class="financial-field"
                >Nama target<input
                  v-model="goalForm.name"
                  required
                  placeholder="Contoh: Liburan akhir tahun"
              /></label>
              <label class="financial-field"
                >Tanggal target<input
                  v-model="goalForm.target_date"
                  type="date"
              /></label>
              <div class="goal-budget-section">
                <div class="goal-budget-heading">
                  <span>Rincian anggaran</span
                  ><button
                    type="button"
                    class="text-xs font-semibold text-primary-600"
                    @click="
                      goalForm.items.push({
                        name: '',
                        quantity: '1',
                        unit_price: '',
                      })
                    "
                  >
                    + Tambah rincian
                  </button>
                </div>
                <div
                  v-for="(item, index) in goalForm.items"
                  :key="index"
                  class="goal-budget-line"
                >
                  <div class="goal-budget-line-heading">
                    <label class="financial-field"
                      >Kebutuhan<input
                        v-model="item.name"
                        placeholder="Contoh: Penginapan"
                    /></label>
                    <button
                      type="button"
                      class="goal-remove-button"
                      aria-label="Hapus rincian"
                      title="Hapus rincian"
                      @click="goalForm.items.splice(index, 1)"
                    >
                      ×
                    </button>
                  </div>
                  <div class="goal-budget-line-fields">
                    <label class="financial-field"
                      >Jumlah<input
                        v-model="item.quantity"
                        type="number"
                        min="0.0001"
                        step="0.0001"
                        aria-label="Jumlah"
                    /></label>
                    <label class="financial-field"
                      >Harga per unit<MoneyInput
                        v-model="item.unit_price"
                        min="0"
                        step="0.01"
                        placeholder="0"
                        aria-label="Harga per unit"
                    /></label>
                  </div>
                </div>
              </div>
              <div class="goal-budget-total">
                <span>Total anggaran</span
                ><strong>{{ formatRupiah(newGoalBudget) }}</strong>
              </div>
              <button class="primary-button w-full" :disabled="busy">
                {{ busy ? "Menyimpan…" : "Simpan target" }}
              </button>
            </form>
          </article>
          <article class="surface-card planner-card goal-list-panel">
            <div class="goal-list-heading">
              <div>
                <h2 class="font-bold">Target Anda</h2>
                <p>Lihat progres setiap rencana keuangan.</p>
              </div>
              <button
                type="button"
                class="primary-button goal-add-button"
                @click="showGoalForm = true"
              >
                <span>+</span> Buat target
              </button>
            </div>
            <div
              v-if="!goals.length"
              class="goal-list-empty"
            >
              <span class="goal-empty-mark">◎</span>
              <strong>Belum ada target</strong>
              <p>Buat target pertama untuk mulai merencanakan kebutuhan Anda.</p>
              <button
                type="button"
                class="secondary-button"
                @click="showGoalForm = true"
              >
                Buat target pertama
              </button>
            </div>
            <div v-else class="goal-card-grid">
              <button
                v-for="goal in goals"
                :key="goal.id"
                class="goal-list-card"
                @click="selectGoal(goal.id)"
              >
                <div class="goal-list-card-copy">
                  <span class="goal-list-card-icon">◎</span>
                  <span class="goal-list-card-text">
                    <strong>{{ goal.name }}</strong>
                    <small>{{ goal.target_date || "Tanpa tenggat" }}</small>
                  </span>
                  <svg
                    class="goal-progress-ring"
                    viewBox="0 0 48 48"
                    role="img"
                    :aria-label="`Progres ${Math.round(Number(goal.progress_percent) || 0)} persen`"
                  >
                    <circle class="goal-progress-track" cx="24" cy="24" r="20" />
                    <circle
                      class="goal-progress-value"
                      cx="24"
                      cy="24"
                      r="20"
                      :style="{
                        strokeDasharray: '125.66',
                        strokeDashoffset: `${125.66 - 1.2566 * Math.min(100, Math.max(0, Number(goal.progress_percent) || 0))}`,
                      }"
                    />
                    <text x="24" y="26" text-anchor="middle">
                      {{ Math.round(Number(goal.progress_percent) || 0) }}%
                    </text>
                  </svg>
                </div>
                <div class="goal-list-card-values">
                  <span>{{ formatRupiah(goal.current_amount) }} terkumpul</span>
                  <b>{{ formatRupiah(goal.budget_total || goal.target_amount) }}</b>
                </div>
                <div class="goal-list-progress-track">
                  <span
                    :style="{
                      width: `${Math.min(100, Math.max(0, Number(goal.progress_percent) || 0))}%`,
                    }"
                  ></span>
                </div>
                <span class="goal-list-open">Lihat detail <span>›</span></span>
              </button>
            </div>
          </article>
        </div>

        <div v-if="selectedGoal" class="goal-detail-layout">
          <button
            type="button"
            class="workspace-back-button"
            @click="backToGoalList"
          >
            <span aria-hidden="true">‹</span> Semua target
          </button>
          <section class="surface-card goal-funding-card">
            <div
              class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
            >
              <div>
                <p
                  class="text-xs font-semibold uppercase tracking-wide text-primary-600"
                >
                  Ruang target
                </p>
                <h2 class="mt-1 text-xl font-bold">{{ selectedGoal.name }}</h2>
                <p class="mt-1 text-xs text-ink-500">
                  {{
                    selectedGoal.target_date
                      ? `Target ${selectedGoal.target_date}`
                      : "Tanggal target belum ditentukan"
                  }}
                </p>
              </div>
              <button
                class="rounded-xl border border-line-200 px-3 py-2 text-xs font-semibold"
                @click="refreshAll"
              >
                Perbarui data
              </button>
            </div>
            <div v-if="funding" class="goal-funding-metrics">
              <div class="goal-funding-metric">
                <p>Total anggaran</p>
                <b>{{ formatRupiah(funding.budget_total) }}</b>
              </div>
              <div class="goal-funding-metric">
                <p>Sudah dibayar</p>
                <b>{{ formatRupiah(funding.paid_expenses) }}</b>
              </div>
              <div class="goal-funding-metric">
                <p>Kas yang dialokasikan</p>
                <b>{{ formatRupiah(funding.allocated_cash) }}</b>
              </div>
              <div class="goal-funding-metric is-highlight">
                <p>Kesenjangan pendanaan</p>
                <b>{{ formatRupiah(funding.funding_gap) }}</b>
              </div>
            </div>
            <div
              v-if="funding?.payment_readiness"
              class="goal-payment-readiness"
              :class="
                funding.payment_readiness.ready ? 'is-ready' : 'needs-cash'
              "
            >
              <b>{{
                funding.payment_readiness.ready
                  ? "Kas siap untuk pembayaran berikutnya"
                  : "Perlu menyiapkan kas untuk pembayaran berikutnya"
              }}</b>
              <p>
                {{ funding.payment_readiness.name }} jatuh tempo
                {{ funding.payment_readiness.due_date }} · tersedia
                {{ formatRupiah(funding.payment_readiness.cash_available) }} ·
                kekurangan kas
                {{ formatRupiah(funding.payment_readiness.cash_shortfall) }}
              </p>
              <p
                v-if="
                  !funding.payment_readiness.ready &&
                  compareDecimal(funding.allocated_assets_value, '0.00') > 0
                "
              >
                Sebagian pendanaan berada dalam aset investasi dan belum
                dihitung sebagai kas siap pakai.
              </p>
            </div>
            <div v-if="funding" class="mt-4">
              <div class="mb-1 flex justify-between text-xs">
                <span
                  >Cakupan pendanaan
                  <b>{{ funding.funding_coverage_percent }}%</b></span
                ><span>{{
                  funding.monthly_funding_required
                    ? `${formatRupiah(funding.monthly_funding_required)} / bulan`
                    : "Atur tanggal target untuk proyeksi"
                }}</span>
              </div>
              <div class="h-2 overflow-hidden rounded-full bg-base-100">
                <div
                  class="h-full rounded-full bg-primary-600"
                  :style="{ width: `${funding.funding_coverage_percent}%` }"
                ></div>
              </div>
              <p class="mt-1 text-[11px] text-ink-500">
                Cakupan menghitung biaya terbayar, kas yang dialokasikan, dan
                nilai aset teralokasi. Jurnal setoran ditampilkan terpisah.
              </p>
            </div>
          </section>

          <section class="goal-detail-grid">
            <article class="surface-card goal-detail-card">
              <div class="flex items-center justify-between gap-3">
                <h3 class="font-bold">Rincian kebutuhan</h3>
                <span class="text-xs text-ink-500"
                  >{{ selectedGoal.items?.length || 0 }} item</span
                >
              </div>
              <div
                v-if="!selectedGoal.items?.length"
                class="py-4 text-sm text-ink-500"
              >
                Tambahkan kebutuhan untuk membentuk anggaran target.
              </div>
              <div
                v-for="item in selectedGoal.items"
                :key="item.id"
                class="mt-3 rounded-xl border border-line-200 p-3"
              >
                <div class="flex justify-between gap-2">
                  <div>
                    <b class="text-sm">{{ item.name }}</b>
                    <p class="text-xs text-ink-500">
                      {{ item.quantity }} ×
                      {{ formatRupiah(item.unit_price) }} · dibayar
                      {{ formatRupiah(item.paid_amount) }}
                    </p>
                  </div>
                  <div class="text-right">
                    <b class="text-sm">{{
                      formatRupiah(item.estimated_amount)
                    }}</b
                    ><button
                      class="ml-2 text-xs text-expense-600"
                      @click="removeItem(item)"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
                <div
                  v-for="obligation in item.obligations || []"
                  :key="obligation.id"
                  class="mt-2 flex items-center justify-between rounded-lg bg-base-50 px-2.5 py-2 text-xs"
                >
                  <span
                    >{{ obligation.name }} ·
                    {{ obligation.due_date || "tanpa tanggal" }} · sisa
                    {{ formatRupiah(obligation.remaining_amount) }}</span
                  ><button
                    v-if="
                      compareDecimal(obligation.remaining_amount, '0.00') > 0
                    "
                    class="font-semibold text-primary-600"
                    @click="payObligation({ ...obligation, item: item.name })"
                  >
                    Bayar
                  </button>
                </div>
              </div>
              <form
                class="mt-4 grid gap-2 sm:grid-cols-[1fr_95px_130px_auto]"
                @submit.prevent="addItem"
              >
                <input
                  v-model="itemForm.name"
                  required
                  class="rounded-xl border border-line-200 bg-paper-0 px-3 py-2 text-sm"
                  placeholder="Nama kebutuhan"
                /><input
                  v-model="itemForm.quantity"
                  type="number"
                  min="0.0001"
                  step="0.0001"
                  class="rounded-xl border border-line-200 bg-paper-0 px-3 py-2 text-sm"
                  aria-label="Jumlah"
                /><MoneyInput
                  v-model="itemForm.unit_price"
                  min="0"
                  step="0.01"
                  required
                  class="rounded-xl border border-line-200 bg-paper-0 px-3 py-2 text-sm"
                  placeholder="0"
                /><button class="primary-button" :disabled="busy">
                  Tambah
                </button>
              </form>
            </article>
            <article class="surface-card p-5">
              <h3 class="font-bold">Jadwal pembayaran</h3>
              <p class="mt-1 text-xs text-ink-500">
                Catat uang muka atau termin vendor, lalu hubungkan transaksi
                saat membayar.
              </p>
              <form
                class="mt-3 grid gap-2 sm:grid-cols-2"
                @submit.prevent="addObligation"
              >
                <select
                  v-model="obligationForm.goal_item_id"
                  required
                  aria-label="Kebutuhan untuk jadwal pembayaran"
                  class="rounded-xl border border-line-200 bg-paper-0 px-3 py-2 text-sm"
                >
                  <option value="">Pilih kebutuhan</option>
                  <option
                    v-for="item in selectedGoal.items || []"
                    :key="item.id"
                    :value="item.id"
                  >
                    {{ item.name }}
                  </option></select
                ><input
                  v-model="obligationForm.name"
                  required
                  class="rounded-xl border border-line-200 bg-paper-0 px-3 py-2 text-sm"
                  placeholder="Contoh: DP 30%"
                /><MoneyInput
                  v-model="obligationForm.amount"
                  min="0.01"
                  step="0.01"
                  required
                  aria-label="Nominal kewajiban pembayaran"
                  class="rounded-xl border border-line-200 bg-paper-0 px-3 py-2 text-sm"
                  placeholder="0"
                /><input
                  v-model="obligationForm.due_date"
                  type="date"
                  aria-label="Tanggal jatuh tempo pembayaran"
                  class="rounded-xl border border-line-200 bg-paper-0 px-3 py-2 text-sm"
                /><input
                  v-model="obligationForm.payee"
                  class="rounded-xl border border-line-200 bg-paper-0 px-3 py-2 text-sm sm:col-span-2"
                  placeholder="Vendor / penerima (opsional)"
                /><button class="primary-button sm:col-span-2" :disabled="busy">
                  Tambah jadwal
                </button>
              </form>
              <div
                v-if="funding?.upcoming_obligations?.length"
                class="mt-4 space-y-2"
              >
                <div
                  v-for="obligation in funding.upcoming_obligations"
                  :key="obligation.id"
                  class="flex items-center justify-between rounded-xl bg-base-50 p-3 text-xs"
                >
                  <div>
                    <b>{{ obligation.name }} · {{ obligation.item }}</b>
                    <p class="text-ink-500">
                      {{ obligation.payee || "Penerima belum diisi" }} ·
                      {{ obligation.due_date }}
                      <span v-if="obligation.overdue" class="text-expense-600"
                        >· terlambat</span
                      >
                    </p>
                  </div>
                  <div class="text-right">
                    <b>{{ formatRupiah(obligation.remaining_amount) }}</b
                    ><button
                      class="block font-semibold text-primary-600"
                      @click="payObligation(obligation)"
                    >
                      Catat pembayaran
                    </button>
                  </div>
                </div>
              </div>
              <div
                v-else
                class="mt-4 rounded-xl bg-base-50 p-3 text-xs text-ink-500"
              >
                Belum ada kewajiban pembayaran aktif.
              </div>
            </article>
          </section>

          <section class="goal-detail-grid">
            <article class="surface-card goal-detail-card">
              <h3 class="font-bold">Setoran & riwayat menabung</h3>
              <p class="mt-1 text-xs text-ink-500">
                Setoran adalah jurnal tabungan target; catat transfer rekening
                secara terpisah agar saldo akun tetap akurat.
              </p>
              <form
                class="mt-3 grid gap-2 sm:grid-cols-[1fr_140px_1fr_auto]"
                @submit.prevent="addContribution"
              >
                <MoneyInput
                  v-model="contribution.amount"
                  min="0.01"
                  step="0.01"
                  required
                  aria-label="Nominal setoran"
                  class="rounded-xl border border-line-200 bg-paper-0 px-3 py-2 text-sm"
                  placeholder="0"
                /><input
                  v-model="contribution.date"
                  type="date"
                  required
                  aria-label="Tanggal setoran"
                  class="rounded-xl border border-line-200 bg-paper-0 px-3 py-2 text-sm"
                /><input
                  v-model="contribution.note"
                  class="rounded-xl border border-line-200 bg-paper-0 px-3 py-2 text-sm"
                  placeholder="Catatan opsional"
                /><button class="primary-button" :disabled="busy">Catat</button>
              </form>
              <div
                v-if="contributions.length"
                class="mt-4 divide-y divide-line-200"
              >
                <div
                  v-for="row in contributions"
                  :key="row.id"
                  class="flex justify-between py-2 text-sm"
                >
                  <span
                    >{{ row.date }}
                    <small class="text-ink-500">{{ row.note }}</small></span
                  ><b>{{ formatRupiah(row.amount) }}</b>
                </div>
                <button
                  v-if="contributionHasMore"
                  class="mt-3 text-xs font-semibold text-primary-600"
                  :disabled="busy"
                  @click="loadMoreContributions"
                >
                  Muat setoran sebelumnya
                </button>
              </div>
              <p v-else class="mt-4 text-xs text-ink-500">
                Belum ada setoran. Saldo awal
                {{ formatRupiah(selectedGoal.opening_balance) }}.
              </p>
            </article>
            <article class="surface-card p-5">
              <h3 class="font-bold">Alokasi kas dari rekening</h3>
              <p class="mt-1 text-xs text-ink-500">
                Alokasi hanya mencadangkan uang yang ada; tidak mengubah saldo
                rekening.
              </p>
              <form
                class="mt-3 grid gap-2 sm:grid-cols-2"
                @submit.prevent="allocateCash"
              >
                <select
                  v-model="cashForm.account_id"
                  required
                  aria-label="Rekening untuk alokasi kas"
                  class="rounded-xl border border-line-200 bg-paper-0 px-3 py-2 text-sm"
                >
                  <option value="">Pilih rekening</option>
                  <option
                    v-for="account in accountChoices"
                    :key="account.id"
                    :value="account.id"
                  >
                    {{ account.name }} · {{ formatRupiah(account.balance) }}
                  </option></select
                ><select
                  v-model="cashForm.action"
                  aria-label="Tindakan alokasi kas"
                  class="rounded-xl border border-line-200 bg-paper-0 px-3 py-2 text-sm"
                >
                  <option value="allocate">Alokasikan</option>
                  <option value="release">Lepaskan alokasi</option></select
                ><MoneyInput
                  v-model="cashForm.amount"
                  min="0.01"
                  step="0.01"
                  required
                  aria-label="Nominal alokasi kas"
                  class="rounded-xl border border-line-200 bg-paper-0 px-3 py-2 text-sm"
                  placeholder="0"
                /><input
                  v-model="cashForm.note"
                  class="rounded-xl border border-line-200 bg-paper-0 px-3 py-2 text-sm"
                  placeholder="Catatan opsional"
                /><button class="primary-button sm:col-span-2" :disabled="busy">
                  Simpan alokasi
                </button>
              </form>
              <div class="mt-4 space-y-1">
                <div
                  v-for="row in cashHistory"
                  :key="row.id"
                  class="flex justify-between text-xs text-ink-600"
                >
                  <span
                    >{{ row.created_at?.slice(0, 10) }} ·
                    {{ row.account?.name }} · {{ row.action }}</span
                  ><b>{{ formatRupiah(row.amount) }}</b>
                </div>
              </div>
              <p v-if="funding" class="mt-3 text-xs text-ink-500">
                Estimasi nilai aset yang dialokasikan:
                {{ formatRupiah(funding.allocated_assets_value) }}.
              </p>
            </article>
          </section>
        </div>
        <div v-else class="surface-card p-8 text-center text-sm text-ink-500">
          Pilih target atau buat target baru untuk melihat rincian.
        </div>
      </section>
    </template>

    <template v-else>
      <section v-if="!selectedAsset" class="asset-summary-grid">
        <article class="surface-card asset-summary-card asset-summary-primary">
          <p>Nilai aset terestimasi</p>
          <b>{{
            formatRupiah(
              assets.reduce(
                (sum, a) => addDecimal(sum, a.estimated_value || 0),
                "0.00",
              ),
            )
          }}</b>
        </article>
        <article class="surface-card asset-summary-card">
          <p>Modal tersisa</p>
          <b>{{
            formatRupiah(
              assets.reduce(
                (sum, a) => addDecimal(sum, a.cost_basis || 0),
                "0.00",
              ),
            )
          }}</b>
        </article>
        <article class="surface-card asset-summary-card">
          <p>Keuntungan / kerugian belum terealisasi</p>
          <b>{{
            formatRupiah(
              assets.reduce(
                (sum, a) => addDecimal(sum, a.unrealized_profit_loss || 0),
                "0.00",
              ),
            )
          }}</b>
        </article>
      </section>
      <section
        class="asset-workspace-layout"
        :class="selectedAsset ? 'has-selected-asset' : 'is-list-view'"
      >
        <div v-if="!selectedAsset" class="asset-workspace-sidebar">
          <article v-if="showAssetForm" class="surface-card planner-card">
            <div class="planner-card-heading">
              <div>
                <h2 class="font-bold">Tambah aset</h2>
                <p>Catat produk emas atau reksa dana pasar uang.</p>
              </div>
              <button
                type="button"
                class="goal-close-create"
                aria-label="Tutup formulir aset"
                @click="showAssetForm = false"
              >
                ×
              </button>
            </div>
            <form class="asset-create-form" @submit.prevent="createAsset">
              <label class="financial-field"
                >Jenis aset<select v-model="assetForm.type">
                  <option value="gold">Emas</option>
                  <option value="rdpu">Reksa dana pasar uang</option>
                </select></label
              ><label class="financial-field"
                >Nama aset<input
                  v-model="assetForm.name"
                  required
                  :placeholder="
                    assetForm.type === 'gold'
                      ? 'Contoh: Emas Antam'
                      : 'Nama produk RDPU'
                  " /></label
              ><label class="financial-field"
                >Penyedia / platform<input
                  v-model="assetForm.provider"
                  placeholder="Opsional" /></label
              ><label class="financial-field"
                >Kode produk<input
                  v-model="assetForm.identifier"
                  placeholder="Opsional" /></label
              ><label v-if="assetForm.type === 'gold'" class="financial-field"
                >Penyimpanan<select v-model="assetForm.storage_type">
                  <option value="physical">Emas fisik</option>
                  <option value="digital">Emas digital</option>
                </select></label
              ><button class="primary-button w-full" :disabled="busy">
                Buat aset
              </button>
            </form>
          </article>
          <article class="surface-card planner-card asset-list-panel">
            <div class="goal-list-heading">
              <div>
                <h2 class="font-bold">Portofolio aset</h2>
                <p>Emas dan RDPU yang Anda catat.</p>
              </div>
              <button
                type="button"
                class="primary-button goal-add-button"
                @click="showAssetForm = true"
              >
                <span>+</span> Tambah aset
              </button>
            </div>
            <div v-if="!assets.length" class="goal-list-empty">
              <span class="asset-empty-mark">Au</span>
              <strong>Portofolio masih kosong</strong>
              <p>Tambahkan emas atau RDPU untuk mulai mencatat aset.</p>
              <button
                type="button"
                class="secondary-button"
                @click="showAssetForm = true"
              >
                Tambah aset pertama
              </button>
            </div>
            <div v-else class="asset-portfolio-grid">
              <button
                v-for="asset in assets"
                :key="asset.id"
                class="asset-portfolio-card"
                @click="selectedAssetId = asset.id"
              >
                <div class="asset-portfolio-card-identity">
                  <span
                    class="asset-type-mark"
                    :class="asset.type === 'gold' ? 'is-gold' : 'is-rdpu'"
                    aria-hidden="true"
                    >{{ asset.type === "gold" ? "Au" : "RD" }}</span
                  >
                  <span class="asset-identity-copy">
                    <b>{{ asset.name }}</b>
                    <small>{{ asset.provider || (asset.type === "gold" ? "Emas" : "RDPU") }}</small>
                  </span>
                  <span class="asset-type-pill">{{ asset.type === "gold" ? "Emas" : "RDPU" }}</span>
                </div>
                <div class="asset-portfolio-card-value">
                  <span>Nilai estimasi</span>
                  <b>{{
                    asset.estimated_value
                      ? formatRupiah(asset.estimated_value)
                      : "Belum ada valuasi"
                  }}</b>
                </div>
                <div class="asset-portfolio-card-footer">
                  <span>{{ asset.quantity }} {{ asset.type === "gold" ? "gram" : "unit" }}</span>
                  <span
                    v-if="asset.unrealized_profit_loss != null"
                    :class="Number(asset.unrealized_profit_loss) >= 0 ? 'is-gain' : 'is-loss'"
                    >{{ formatRupiah(asset.unrealized_profit_loss) }}</span
                  >
                </div>
                <div class="asset-portfolio-card-open">Lihat detail <span>›</span></div>
              </button>
            </div>
          </article>
        </div>
        <div v-if="selectedAsset" class="asset-detail-layout">
          <button
            type="button"
            class="workspace-back-button"
            @click="backToAssetList"
          >
            <span aria-hidden="true">‹</span> Semua aset
          </button>
          <section class="surface-card asset-detail-card">
            <div class="asset-detail-heading">
              <div>
                <p
                  class="text-xs font-semibold uppercase tracking-wide text-primary-600"
                >
                  {{
                    selectedAsset.type === "gold"
                      ? "Emas"
                      : "Reksa dana pasar uang"
                  }}
                </p>
                <h2 class="mt-1 text-xl font-bold">{{ selectedAsset.name }}</h2>
                <p class="mt-1 text-xs text-ink-500">
                  {{ selectedAsset.provider || "Penyedia belum dicatat" }} ·
                  {{ selectedAsset.identifier || "Tanpa kode produk" }}
                </p>
              </div>
              <div class="asset-detail-holding">
                <b
                  >{{ selectedAsset.quantity }}
                  {{ selectedAsset.type === "gold" ? "gram" : "unit" }}</b
                >
                <p>Modal {{ formatRupiah(selectedAsset.cost_basis) }}</p>
              </div>
            </div>
            <div class="asset-valuation-grid">
              <div>
                <small>Nilai estimasi</small
                ><b>{{
                  selectedAsset.estimated_value
                    ? formatRupiah(selectedAsset.estimated_value)
                    : "Belum dinilai"
                }}</b>
              </div>
              <div>
                <small>{{
                  selectedAsset.type === "gold"
                    ? "Harga buyback/gram"
                    : "NAB/unit"
                }}</small
                ><b>{{
                  selectedAsset.latest_price
                    ? formatRupiah(selectedAsset.latest_price)
                    : "Belum dicatat"
                }}</b>
              </div>
              <div>
                <small>P/L belum terealisasi</small
                ><b>{{
                  selectedAsset.unrealized_profit_loss == null
                    ? "—"
                    : formatRupiah(selectedAsset.unrealized_profit_loss)
                }}</b>
              </div>
            </div>
            <form class="asset-price-form" @submit.prevent="savePrice">
              <label class="financial-field"
                >{{
                  selectedAsset.type === "gold"
                    ? "Harga buyback per gram"
                    : "NAB per unit"
                }}<MoneyInput
                  v-model="priceForm.price"
                  min="0.00000001"
                  step="0.00000001"
                  :precision="8"
                  required /></label
              ><label class="financial-field"
                >Tanggal valuasi<input
                  v-model="priceForm.captured_at"
                  type="date"
                  required /></label
              ><label class="financial-field"
                >Sumber harga<input
                  v-model="priceForm.source"
                  placeholder="Contoh: platform / toko emas" /></label
              ><button class="primary-button" :disabled="busy">
                Simpan valuasi
              </button>
            </form>
          </section>
          <section class="grid gap-4 lg:grid-cols-2">
            <article class="surface-card p-5">
              <h3 class="font-bold">Catat transaksi aset</h3>
              <form class="asset-trade-form" @submit.prevent="recordTrade">
                <label class="financial-field"
                  >Jenis transaksi<select v-model="assetTrade.type">
                    <option value="purchase">
                      {{
                        selectedAsset.type === "gold"
                          ? "Pembelian"
                          : "Pembelian / subscription"
                      }}
                    </option>
                    <option value="sale">
                      {{
                        selectedAsset.type === "gold"
                          ? "Penjualan"
                          : "Pencairan / redemption"
                      }}
                    </option>
                  </select></label
                >
                <label class="financial-field"
                  >Cara hitung<select v-model="assetTrade.calc_mode">
                    <option value="by_quantity">
                      Hitung dari
                      {{ selectedAsset.type === "gold" ? "gram" : "unit" }}
                    </option>
                    <option value="by_amount">Hitung dari nominal</option>
                    <option value="actual">Masukkan data aktual</option>
                  </select></label
                >
                <label
                  v-if="
                    selectedAsset.type === 'rdpu' &&
                    assetTrade.type === 'purchase'
                  "
                  class="financial-field"
                  >Status pembelian<select v-model="assetTrade.status">
                    <option value="pending">Menunggu konfirmasi</option>
                    <option value="confirmed">Sudah terkonfirmasi</option>
                  </select></label
                >
                <label class="financial-field"
                  >{{
                    assetTrade.type === "sale"
                      ? "Rekening penerima"
                      : "Rekening sumber"
                  }}<select v-model="assetTrade.cash_account_id">
                    <option value="">Pilih rekening</option>
                    <option
                      v-for="account in accountChoices"
                      :key="account.id"
                      :value="account.id"
                    >
                      {{ account.name }}
                    </option>
                  </select></label
                >
                <label class="financial-field"
                  >Nominal transaksi<MoneyInput
                    v-model="assetTrade.amount"
                    min="0"
                    step="0.01"
                    :placeholder="
                      assetTrade.type === 'sale'
                        ? 'Hasil jual aktual'
                        : 'Nominal transaksi'
                    "
                /></label>
                <label class="financial-field"
                  >{{
                    selectedAsset.type === "gold"
                      ? "Berat emas"
                      : "Jumlah unit"
                  }}<input
                    v-model="assetTrade.quantity"
                    type="number"
                    min="0.00000001"
                    step="0.00000001"
                    :placeholder="
                      selectedAsset.type === 'gold' ? 'Gram' : 'Unit'
                    "
                /></label>
                <label class="financial-field"
                  >{{
                    selectedAsset.type === "gold"
                      ? "Harga satuan"
                      : "NAB per unit"
                  }}<MoneyInput
                    v-model="assetTrade.unit_price"
                    min="0.00000001"
                    step="0.00000001"
                    :precision="8"
                    :placeholder="
                      selectedAsset.type === 'gold'
                        ? 'Harga per satuan harga'
                        : 'NAB per unit'
                    "
                /></label>
                <label
                  v-if="selectedAsset.type === 'gold'"
                  class="financial-field"
                  >Basis harga<select v-model="assetTrade.price_unit_grams">
                    <option value="0.01000000">Per 0,01 gram</option>
                    <option value="0.10000000">Per 0,1 gram</option>
                    <option value="1.00000000">Per 1 gram</option>
                    <option value="custom">Satuan khusus…</option>
                  </select></label
                >
                <label
                  v-if="
                    selectedAsset.type === 'gold' &&
                    assetTrade.price_unit_grams === 'custom'
                  "
                  class="financial-field"
                  >Gram per satuan harga<input
                    v-model="customPriceUnit"
                    type="number"
                    min="0.00000001"
                    step="0.00000001"
                    placeholder="Contoh: 0,5"
                /></label>
                <label class="financial-field"
                  >Biaya transaksi<MoneyInput
                    v-model="assetTrade.fees"
                    min="0"
                    step="0.01"
                    placeholder="Opsional"
                /></label>
                <label class="financial-field"
                  >Tanggal transaksi<input
                    v-model="assetTrade.transaction_date"
                    type="date"
                    required
                /></label>
                <label
                  v-if="
                    selectedAsset.type === 'rdpu' &&
                    assetTrade.type === 'purchase' &&
                    assetTrade.status === 'pending'
                  "
                  class="flex items-center gap-2 text-xs sm:col-span-2"
                  ><input
                    v-model="assetTrade.cash_debited"
                    type="checkbox"
                  />Dana sudah benar-benar keluar dari rekening</label
                >
                <div class="asset-trade-preview">
                  Pratinjau: {{ tradePreview.quantity }}
                  {{ selectedAsset.type === "gold" ? "gram" : "unit" }} ·
                  {{ formatRupiah(tradePreview.amount) }}
                  <span v-if="assetTrade.unit_price">
                    pada harga {{ formatRupiah(assetTrade.unit_price) }} /
                    {{
                      selectedAsset.type === "gold"
                        ? `${effectivePriceUnit} gram`
                        : "unit"
                    }}</span
                  >
                </div>
                <label class="financial-field sm:col-span-2"
                  >Catatan<input
                    v-model="assetTrade.notes"
                    placeholder="Opsional"
                /></label>
                <button class="primary-button sm:col-span-2" :disabled="busy">
                  Catat transaksi
                </button>
              </form>
              <p class="mt-2 text-[11px] text-ink-500">
                Transaksi aset tidak dihitung sebagai pemasukan/pengeluaran
                konsumtif. Saldo rekening berubah hanya jika arus kas aktual
                dicatat.
              </p>
            </article>
            <article class="surface-card p-5">
              <h3 class="font-bold">Alokasikan aset ke target</h3>
              <p class="mt-1 text-xs text-ink-500">
                Jumlah emas/unit dicadangkan untuk target; nilai Rupiah
                mengikuti valuasi terbaru.
              </p>
              <form
                class="mt-3 grid gap-2 sm:grid-cols-2"
                @submit.prevent="allocateAsset"
              >
                <select
                  v-model="assetAllocation.goal_id"
                  required
                  aria-label="Target alokasi aset"
                  class="rounded-xl border border-line-200 bg-paper-0 px-3 py-2 text-sm"
                >
                  <option value="">Pilih target</option>
                  <option v-for="goal in goals" :key="goal.id" :value="goal.id">
                    {{ goal.name }}
                  </option></select
                ><input
                  v-model="assetAllocation.quantity"
                  type="number"
                  min="0.00000001"
                  step="0.00000001"
                  required
                  aria-label="Jumlah aset untuk dialokasikan"
                  class="rounded-xl border border-line-200 bg-paper-0 px-3 py-2 text-sm"
                  :placeholder="selectedAsset.type === 'gold' ? 'Gram' : 'Unit'"
                /><select
                  v-model="assetAllocation.action"
                  aria-label="Tindakan alokasi aset"
                  class="rounded-xl border border-line-200 bg-paper-0 px-3 py-2 text-sm"
                >
                  <option value="allocate">Alokasikan</option>
                  <option value="release">Lepaskan</option></select
                ><button class="primary-button" :disabled="busy">Simpan</button>
              </form>
              <div class="mt-4 rounded-xl bg-base-50 p-3 text-xs">
                Dialokasikan:
                <b
                  >{{ selectedAsset.allocated_quantity }}
                  {{ selectedAsset.type === "gold" ? "gram" : "unit" }}</b
                >
                · Belum dialokasikan:
                <b>{{ selectedAsset.unallocated_quantity }}</b>
              </div>
              <div class="mt-4">
                <h4 class="text-sm font-semibold">Riwayat aset</h4>
                <div
                  v-for="tx in selectedAsset.transactions || []"
                  :key="tx.id"
                  class="mt-2 rounded-xl border border-line-200 p-3 text-xs"
                >
                  <div class="flex justify-between">
                    <b>{{ tx.type }} · {{ tx.status }}</b
                    ><span>{{ tx.transaction_date }}</span>
                  </div>
                  <p class="mt-1">
                    {{ tx.quantity }}
                    {{ selectedAsset.type === "gold" ? "gram" : "unit" }} ·
                    {{ formatRupiah(tx.amount) }}
                    <span v-if="tx.fees"
                      >· biaya {{ formatRupiah(tx.fees) }}</span
                    >
                  </p>
                  <p v-if="tx.notes" class="mt-1 text-ink-500">
                    {{ tx.notes }}
                  </p>
                  <div
                    v-if="tx.status === 'pending'"
                    class="mt-3 grid gap-2 sm:grid-cols-2"
                  >
                    <template v-if="tx.type === 'redemption'"
                      ><input
                        v-model="pendingForm.quantity"
                        type="number"
                        min="0.00000001"
                        step="0.00000001"
                        class="rounded-lg border border-line-200 bg-paper-0 px-2 py-1.5"
                        aria-label="Jumlah unit aktual"
                        placeholder="Unit dicairkan"
                      /><MoneyInput
                        v-model="pendingForm.amount"
                        min="0.01"
                        step="0.01"
                        class="rounded-lg border border-line-200 bg-paper-0 px-2 py-1.5"
                        aria-label="Nominal pencairan"
                        placeholder="0"
                      /><select
                        v-model="pendingForm.cash_account_id"
                        aria-label="Rekening penerima pencairan"
                        class="rounded-lg border border-line-200 bg-paper-0 px-2 py-1.5"
                      >
                        <option value="">Rekening penerima</option>
                        <option
                          v-for="account in accountChoices"
                          :key="account.id"
                          :value="account.id"
                        >
                          {{ account.name }}
                        </option>
                      </select></template
                    ><template v-else
                      ><input
                        v-model="pendingForm.quantity"
                        type="number"
                        min="0.00000001"
                        step="0.00000001"
                        class="rounded-lg border border-line-200 bg-paper-0 px-2 py-1.5"
                        aria-label="Jumlah unit aktual"
                        placeholder="Unit aktual"
                      /><MoneyInput
                        v-model="pendingForm.unit_price"
                        min="0.00000001"
                        step="0.00000001"
                        :precision="8"
                        class="rounded-lg border border-line-200 bg-paper-0 px-2 py-1.5"
                        aria-label="NAB aktual"
                        placeholder="0"
                      /><template v-if="!tx.cash_debited"
                        ><select
                          v-model="pendingForm.cash_account_id"
                          aria-label="Rekening sumber pembelian"
                          class="rounded-lg border border-line-200 bg-paper-0 px-2 py-1.5"
                        >
                          <option value="">Rekening sumber</option>
                          <option
                            v-for="account in accountChoices"
                            :key="account.id"
                            :value="account.id"
                          >
                            {{ account.name }}
                          </option></select
                        ><label class="flex items-center gap-2"
                          ><input
                            v-model="pendingForm.cash_debited"
                            type="checkbox"
                          />Dana sudah dibayar</label
                        ></template
                      ></template
                    ><button
                      class="rounded-lg bg-primary-100 px-3 py-1.5 font-semibold text-primary-700 sm:col-span-2"
                      @click="
                        transitionAsset(
                          tx,
                          tx.type === 'redemption' ? 'settled' : 'confirmed',
                        )
                      "
                    >
                      {{
                        tx.type === "redemption"
                          ? "Catat pencairan selesai"
                          : "Konfirmasi unit"
                      }}
                    </button>
                  </div>
                </div>
              </div>
            </article>
          </section>
        </div>
        <div v-else class="surface-card p-8 text-center text-sm text-ink-500">
          Tambahkan aset terlebih dahulu.
        </div>
      </section>
    </template>
  </main>
</template>
