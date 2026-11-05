<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { localDate } from "@/utils/dates";
import { formatQuantity, formatRupiah } from "@/utils/formatters";
import MoneyInput from "@/components/MoneyInput.vue";
import AssetSavingConsistency from "@/components/financial/AssetSavingConsistency.vue";
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
const tab = computed(() => route.path.startsWith("/investasi") ? "assets" : "goals");
const showGoalForm = ref(false);
const showGoalEditForm = ref(false);
const goalEditForm = ref({ name: "", target_date: "", icon: "target" });
const showAssetForm = ref(false);
const showAssetEditForm = ref(false);
const assetEditForm = ref({ name: "", provider: "", identifier: "", storage_type: "", start_date: "", maturity_date: "" });
const deleteConfirmation = ref(null);
const isDeletingRecord = ref(false);
const deleteError = ref("");
const goals = ref([]);
const goalFundingSummaries = ref([]);
const accounts = ref([]);
const cashAllocationSummary = ref([]);
const assets = ref([]);
const savingConsistency = ref({ current_streak: 0, longest_streak: 0, active_months: 0, monthly_targets: [] });
const monthlyTargetForm = ref({ type: "rdpu", amount: "" });
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
const editingContributionId = ref(null);
const cashForm = ref({
  account_id: "",
  amount: "",
  action: "",
  note: "",
});
const itemForm = ref({ name: "", quantity: "1", unit_price: "", notes: "" });
const editingItemId = ref(null);
const editingObligationId = ref(null);
const obligationForm = ref({
  goal_item_id: "",
  name: "",
  amount: "",
  due_date: "",
  payee: "",
});
const assetForm = ref({
  type: "",
  name: "",
  provider: "",
  identifier: "",
  storage_type: "",
  ownership_source: "",
  opening_mode: "value_only",
  initial_quantity: "",
  initial_cost_basis: "",
  initial_current_value: "",
  initial_nav: "",
  initial_price: "",
  initial_date: localDate(),
  start_date: localDate(),
  maturity_date: "",
  purchase_amount: "",
  purchase_quantity: "",
  purchase_status: "pending",
  purchase_cash_account_id: "",
  purchase_cash_debited: true,
  purchase_fees: "0",
  purchase_date: localDate(),
});
const assetTrade = ref({
  form_mode: "simple",
  type: "",
  status: "",
  calc_mode: "",
  cash_account_id: "",
  amount: "",
  quantity: "",
  unit_price: "",
  price_unit_grams: "",
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
const assetAllocation = ref({ goal_id: "", quantity: "", action: "" });
const goalAssetAllocation = ref({ asset_id: "", quantity: "", action: "allocate" });
const completeUnitsForm = ref({ quantity: "", current_value: "", nav: "", cost_basis: "", captured_at: localDate() });
const historicalImport = ref({ reconcile_opening: false, idempotency_key: null, transactions: [{ action: "purchase", transaction_date: localDate(), amount: "", quantity: "", unit_price: "", fees: "0", notes: "" }] });
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
const selectedAssetUsesManualValue = computed(() =>
  selectedAsset.value &&
  ["rdpu", "deposit"].includes(selectedAsset.value.type) &&
  ["manual", "value_only"].includes(selectedAsset.value.valuation_mode),
);
const allAssetBasisKnown = computed(() => assets.value.every((asset) => asset.cost_basis_known !== false));
const accountChoices = computed(() =>
  accounts.value
    .filter(
      (account) =>
        !account.is_archived &&
        ["cash", "bank", "ewallet"].includes(account.type),
    )
    .map((account) => {
      const summary = cashAllocationSummary.value.find(
        (row) => Number(row.account_id) === Number(account.id),
      );
      return {
        ...account,
        unallocated_cash: summary?.unallocated ?? account.balance,
      };
    }),
);
const totalGoalBudget = computed(() =>
  goals.value.reduce(
    (sum, goal) =>
      addDecimal(sum, goal.budget_total || goal.target_amount || 0),
    "0.00",
  ),
);
const totalGoalFunding = computed(() =>
  goalFundingSummaries.value.reduce(
    (sum, row) => addDecimal(sum, row.funding_coverage || "0.00"),
    "0.00",
  ),
);
const displayGoals = computed(() =>
  goals.value.map((goal) => {
    const summary = goalFundingSummaries.value.find(
      (row) => Number(row.goal_id) === Number(goal.id),
    );
    return {
      ...goal,
      funded_amount: summary?.funding_coverage ?? "0.00",
      funding_progress_percent: summary?.funding_coverage_percent ?? 0,
      funding_gap:
        summary?.funding_gap ?? goal.budget_total ?? goal.target_amount,
    };
  }),
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
function backToGoalList() {
  selectedGoalId.value = null;
  showGoalEditForm.value = false;
}
function openGoalEdit() {
  if (!selectedGoal.value) return;
  goalEditForm.value = { name: selectedGoal.value.name, target_date: selectedGoal.value.target_date || "", icon: selectedGoal.value.icon || "target" };
  showGoalEditForm.value = !showGoalEditForm.value;
}
async function updateGoalMetadata() {
  if (!selectedGoal.value || busy.value || !goalEditForm.value.name.trim()) return;
  busy.value = true;
  try {
    await api.put(`/api/goals/${selectedGoal.value.id}`, {
      ...goalEditForm.value,
      target_amount: selectedGoal.value.target_amount,
    });
    showGoalEditForm.value = false;
    await refreshAll();
    notify.notify({ message: "Target berhasil diperbarui.", type: "success" });
  } catch (err) { notifyError(err, "Target gagal diperbarui."); }
  finally { busy.value = false; }
}
function backToAssetList() {
  selectedAssetId.value = null;
  showAssetEditForm.value = false;
}
function openAssetEdit() {
  if (!selectedAsset.value) return;
  assetEditForm.value = {
    name: selectedAsset.value.name || "",
    provider: selectedAsset.value.provider || "",
    identifier: selectedAsset.value.identifier || "",
    storage_type: selectedAsset.value.storage_type || "",
    start_date: selectedAsset.value.start_date || "",
    maturity_date: selectedAsset.value.maturity_date || "",
  };
  showAssetEditForm.value = true;
}
function requestDelete(type, item) {
  deleteError.value = "";
  deleteConfirmation.value = {
    type,
    id: item.id,
    name: item.name,
  };
}
function closeDeleteConfirmation() {
  if (isDeletingRecord.value) return;
  deleteConfirmation.value = null;
  deleteError.value = "";
}
async function deleteSelectedRecord() {
  const record = deleteConfirmation.value;
  if (!record || isDeletingRecord.value) return;

  isDeletingRecord.value = true;
  deleteError.value = "";
  try {
    const endpoint =
      record.type === "goal"
        ? `/api/goals/${record.id}`
        : `/api/assets/${record.id}`;
    await api.delete(endpoint);

    if (record.type === "goal") {
      selectedGoalId.value = null;
      funding.value = null;
      contributions.value = [];
      cashHistory.value = [];
      contributionNextPage.value = null;
      contributionHasMore.value = false;
    } else {
      selectedAssetId.value = null;
    }

    deleteConfirmation.value = null;
    notify.notify({
      message:
        record.type === "goal"
          ? "Target berhasil dihapus."
          : "Aset berhasil dihapus.",
      type: "success",
    });
    await fetchAll();
  } catch (err) {
    deleteError.value = normalizeError(
      err,
      record.type === "goal"
        ? "Target belum dapat dihapus. Coba lagi."
        : "Aset belum dapat dihapus. Saldo rekening tidak diubah.",
    );
  } finally {
    isDeletingRecord.value = false;
  }
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
  const { amount, quantity, unit_price } = assetTrade.value;
  if (selectedAsset.value?.type !== "gold") {
    return { quantity: String(quantity || "0"), amount: String(amount || "0") };
  }
  const calcMode = assetTrade.value.calc_mode;
  const priceUnit =
    selectedAsset.value?.type === "gold"
      ? effectivePriceUnit.value || "1"
      : "1";
  const pricePerGram = divideDecimal(unit_price || "0", priceUnit, 8, 8, 8);
  if (calcMode === "by_amount")
    return {
      quantity: divideDecimal(amount || "0", pricePerGram, 2, 8, 8),
      amount: String(amount || "0"),
    };
  if (calcMode === "by_quantity") {
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
    const [
      goalRes,
      accountRes,
      assetRes,
      fundingSummaryRes,
      cashAllocationRes,
      consistencyRes,
    ] = await Promise.all([
      api.get("/api/goals"),
      api.get("/api/accounts"),
      api.get("/api/assets"),
      api.get("/api/goals/funding-summary"),
      api.get("/api/cash-allocations/accounts"),
      api.get("/api/assets/saving-consistency").catch(() => ({ data: { data: savingConsistency.value } })),
    ]);
    goals.value = goalRes.data.data || [];
    accounts.value = accountRes.data.data || [];
    assets.value = assetRes.data.data || [];
    goalFundingSummaries.value = fundingSummaryRes.data.data || [];
    cashAllocationSummary.value = cashAllocationRes.data.data || [];
    savingConsistency.value = consistencyRes.data.data || savingConsistency.value;
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

async function saveMonthlyTarget() {
  if (busy.value || !monthlyTargetForm.value.amount) return;
  busy.value = true;
  try {
    await api.put("/api/assets/saving-consistency/target", monthlyTargetForm.value);
    monthlyTargetForm.value.amount = "";
    const { data } = await api.get("/api/assets/saving-consistency");
    savingConsistency.value = data.data;
    notify.notify({ message: "Target investasi bulanan disimpan.", type: "success" });
  } catch (err) {
    notifyError(err, "Target investasi bulanan gagal disimpan.");
  } finally {
    busy.value = false;
  }
}
async function deleteMonthlyTarget(type) {
  if (busy.value || !window.confirm(`Hapus target investasi bulanan ${type === 'gold' ? 'emas' : 'RDPU'}?`)) return;
  busy.value = true;
  try {
    await api.delete("/api/assets/saving-consistency/target", { data: { type } });
    await refreshAll();
    notify.notify({ message: "Target investasi bulanan dihapus.", type: "success" });
  } catch (err) { notifyError(err, "Target investasi bulanan gagal dihapus."); }
  finally { busy.value = false; }
}

function onAssetTradeTypeChange() {
  if (selectedAsset.value?.type === "gold") return;
  assetTrade.value.calc_mode = "actual";
  assetTrade.value.unit_price = "";
  assetTrade.value.quantity = "";
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
  if (selectedAsset.value) {
    pendingForm.value = {
      quantity: selectedAsset.value.quantity,
      unit_price:
        selectedAsset.value.type === "gold"
          ? selectedAsset.value.latest_price || ""
          : "",
      amount: "",
      fees: "0",
      cash_account_id: "",
      cash_debited: true,
    };
    if (selectedAsset.value.valuation_mode === 'value_only' || selectedAsset.value.type === 'deposit') {
      completeUnitsForm.value = { quantity: "", current_value: selectedAsset.value.manual_balance, nav: "", cost_basis: "", captured_at: localDate() };
    }
  }
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
watch(
  () => JSON.stringify({ reconcile_opening: historicalImport.value.reconcile_opening, transactions: historicalImport.value.transactions }),
  () => { historicalImport.value.idempotency_key = null; },
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
  const wasEditing = Boolean(editingContributionId.value);
  busy.value = true;
  try {
    if (wasEditing) {
      await api.put(`/api/goals/${selectedGoal.value.id}/contributions/${editingContributionId.value}`, contribution.value);
    } else if (!contribution.value.idempotency_key) {
      contribution.value.idempotency_key = newIdempotencyKey();
      await api.post(`/api/goals/${selectedGoal.value.id}/contributions`, contribution.value);
    } else {
      await api.post(`/api/goals/${selectedGoal.value.id}/contributions`, contribution.value);
    }
    contribution.value = { amount: "", date: localDate(), note: "" };
    editingContributionId.value = null;
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

function editContribution(row) {
  editingContributionId.value = row.id;
  contribution.value = { amount: String(row.amount), date: row.date, note: row.note || "" };
  const disclosure = document.querySelector(".goal-contribution-form")?.closest("details");
  if (disclosure) disclosure.open = true;
}

async function deleteContribution(row) {
  if (!window.confirm(`Hapus catatan setoran ${formatRupiah(row.amount)} tanggal ${row.date}? Progres target akan disesuaikan.`)) return;
  try {
    await api.delete(`/api/goals/${selectedGoal.value.id}/contributions/${row.id}`);
    await refreshAll();
    notify.notify({ message: "Catatan setoran dihapus dan progres target diperbarui.", type: "success" });
  } catch (err) { notifyError(err, "Catatan setoran tidak dapat dihapus."); }
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
  const wasEditing = Boolean(editingItemId.value);
  busy.value = true;
  try {
    if (wasEditing) {
      await api.put(`/api/goals/${selectedGoal.value.id}/items/${editingItemId.value}`, itemForm.value);
    } else {
      await api.post(`/api/goals/${selectedGoal.value.id}/items`, itemForm.value);
    }
    itemForm.value = { name: "", quantity: "1", unit_price: "", notes: "" };
    editingItemId.value = null;
    await refreshAll();
    notify.notify({
      message: wasEditing ? "Rincian anggaran diperbarui." : "Rincian anggaran ditambahkan.",
      type: "success",
    });
  } catch (err) {
    notifyError(err, "Rincian gagal ditambahkan.");
  } finally {
    busy.value = false;
  }
}

function editItem(item) {
  editingItemId.value = item.id;
  itemForm.value = {
    name: item.name,
    quantity: String(item.quantity),
    unit_price: String(item.unit_price),
    notes: item.notes || "",
  };
  const disclosure = document.querySelector(".goal-item-form")?.closest("details");
  if (disclosure) disclosure.open = true;
  document.querySelector(".goal-item-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
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

function editObligation(item, obligation) {
  editingObligationId.value = obligation.id;
  obligationForm.value = {
    goal_item_id: item.id,
    name: obligation.name,
    amount: String(obligation.amount),
    due_date: obligation.due_date || "",
    payee: obligation.payee || "",
  };
  const disclosure = document.querySelector(".goal-obligation-form")?.closest("details");
  if (disclosure) disclosure.open = true;
}

async function removeObligation(item, obligation) {
  if (Number(obligation.paid_amount || 0) > 0) return;
  if (!window.confirm(`Hapus jadwal pembayaran “${obligation.name}”?`)) return;
  try {
    await api.delete(`/api/goals/${selectedGoal.value.id}/items/${item.id}/obligations/${obligation.id}`);
    await refreshAll();
    notify.notify({ message: "Jadwal pembayaran dihapus.", type: "success" });
  } catch (err) { notifyError(err, "Jadwal pembayaran tidak dapat dihapus."); }
}

async function addObligation() {
  if (busy.value || !selectedGoal.value || !obligationForm.value.goal_item_id)
    return;
  const wasEditing = Boolean(editingObligationId.value);
  busy.value = true;
  try {
    const { goal_item_id, ...payload } = obligationForm.value;
    if (editingObligationId.value) {
      await api.put(`/api/goals/${selectedGoal.value.id}/items/${goal_item_id}/obligations/${editingObligationId.value}`, payload);
    } else {
      await api.post(`/api/goals/${selectedGoal.value.id}/items/${goal_item_id}/obligations`, payload);
    }
    editingObligationId.value = null;
    obligationForm.value = {
      goal_item_id: "",
      name: "",
      amount: "",
      due_date: "",
      payee: "",
    };
    await refreshAll();
    notify.notify({
      message: wasEditing ? "Jadwal pembayaran diperbarui." : "Jadwal pembayaran ditambahkan.",
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
    const payload = { ...assetForm.value };
    if (payload.type === "rdpu" || payload.type === "deposit") {
      payload.opening_mode = "value_only";
      if (payload.ownership_source === "new") {
        payload.purchase_status = "confirmed";
        payload.purchase_quantity = "";
        payload.purchase_cash_debited = true;
        if (payload.type === "deposit") payload.purchase_date = payload.start_date;
      } else {
        payload.initial_date = payload.type === "deposit" ? payload.start_date : payload.initial_date;
      }
    }
    if (payload.type === "gold" && payload.ownership_source === "existing") {
      payload.initial_nav = "";
    }
    const { data } = await api.post("/api/assets", payload);
    selectedAssetId.value = data.data.id;
    showAssetForm.value = false;
    assetForm.value = {
      type: "",
      name: "",
      provider: "",
      identifier: "",
      storage_type: "",
      ownership_source: "",
      opening_mode: "value_only",
      initial_quantity: "",
      initial_cost_basis: "",
      initial_current_value: "",
      initial_nav: "",
      initial_price: "",
      initial_date: localDate(),
      start_date: localDate(),
      maturity_date: "",
      purchase_amount: "",
      purchase_quantity: "",
      purchase_status: "pending",
      purchase_cash_account_id: "",
      purchase_cash_debited: true,
      purchase_fees: "0",
      purchase_date: localDate(),
    };
    await refreshAll();
    notify.notify({ message: "Aset berhasil ditambahkan.", type: "success" });
  } catch (err) {
    notifyError(err, "Aset gagal ditambahkan.");
  } finally {
    busy.value = false;
  }
}
async function updateAssetMetadata() {
  if (!selectedAsset.value || busy.value || !assetEditForm.value.name.trim()) return;
  busy.value = true;
  try {
    await api.put(`/api/assets/${selectedAsset.value.id}`, {
      ...assetEditForm.value,
      start_date: assetEditForm.value.start_date || null,
      maturity_date: assetEditForm.value.maturity_date || null,
    });
    showAssetEditForm.value = false;
    await refreshAll();
    notify.notify({ message: "Detail aset berhasil diperbarui.", type: "success" });
  } catch (err) { notifyError(err, "Detail aset gagal diperbarui."); }
  finally { busy.value = false; }
}

async function recordTrade() {
  if (busy.value || !selectedAsset.value) return;
  const manualValueAsset = ["rdpu", "deposit"].includes(selectedAsset.value.type) && ["manual", "value_only"].includes(selectedAsset.value.valuation_mode);
  if (
    compareDecimal(tradePreview.value.amount, "0.00") <= 0 ||
    ((selectedAsset.value.type === "gold" || (!manualValueAsset && (assetTrade.value.type === "sale" || assetTrade.value.status === "confirmed"))) &&
      compareDecimal(tradePreview.value.quantity, "0.00000000", 8) <= 0)
  ) {
    notify.notify({
      message:
        selectedAsset.value.type === "rdpu" && !manualValueAsset
          ? "Isi nominal dan jumlah unit aktual transaksi RDPU."
          : selectedAsset.value.type === "gold"
            ? "Isi nominal dan jumlah gram transaksi yang valid."
            : "Isi nominal transaksi yang valid.",
      type: "error",
    });
    return;
  }
  busy.value = true;
  try {
    const payload = {
      ...assetTrade.value,
      cash_debited: assetTrade.value.cash_debited,
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
        selectedAsset.value.type === "gold" || assetTrade.value.type === "sale" || manualValueAsset
          ? "settled"
          : assetTrade.value.status,
    };
    if (selectedAsset.value.type === "gold") {
      payload.quantity = tradePreview.value.quantity;
    } else if (manualValueAsset) {
      delete payload.quantity;
      delete payload.unit_price;
      delete payload.calc_mode;
      payload.cash_debited = assetTrade.value.type === "purchase";
    } else {
      if (assetTrade.value.type === "purchase" && assetTrade.value.status === "pending") {
        delete payload.quantity;
        delete payload.unit_price;
      } else {
        payload.quantity = tradePreview.value.quantity;
      }
      delete payload.calc_mode;
    }
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
      form_mode: "simple",
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

async function completeRdpuUnits() {
  if (busy.value || !selectedAsset.value) return;
  busy.value = true;
  try {
    await api.post(`/api/assets/${selectedAsset.value.id}/complete-units`, completeUnitsForm.value);
    await refreshAll();
    notify.notify({ message: "Unit RDPU dilengkapi dan nilai lama direkonsiliasi tanpa mengubah saldo rekening.", type: "success" });
  } catch (err) {
    notifyError(err, "Unit RDPU gagal dilengkapi.");
  } finally {
    busy.value = false;
  }
}

function addHistoryRow() {
  historicalImport.value.transactions.push({ action: "purchase", transaction_date: localDate(), amount: "", quantity: "", unit_price: "", fees: "0", notes: "" });
}

function removeHistoryRow(index) {
  if (historicalImport.value.transactions.length > 1) historicalImport.value.transactions.splice(index, 1);
}

async function importAssetHistory() {
  if (busy.value || !selectedAsset.value) return;
  busy.value = true;
  try {
    if (!historicalImport.value.idempotency_key) historicalImport.value.idempotency_key = newIdempotencyKey();
    await api.post(`/api/assets/${selectedAsset.value.id}/transactions/import`, historicalImport.value);
    historicalImport.value = { reconcile_opening: false, idempotency_key: null, transactions: [{ action: "purchase", transaction_date: localDate(), amount: "", quantity: "", unit_price: "", fees: "0", notes: "" }] };
    await refreshAll();
    notify.notify({ message: "Histori pembelian berhasil diimpor tanpa mengubah saldo rekening.", type: "success" });
  } catch (err) {
    notifyError(err, "Histori transaksi gagal diimpor.");
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

async function allocateGoalAsset() {
  if (busy.value || !selectedGoalId.value || !goalAssetAllocation.value.asset_id) return;
  busy.value = true;
  try {
    const payload = { quantity: goalAssetAllocation.value.quantity, action: goalAssetAllocation.value.action, idempotency_key: newIdempotencyKey() };
    await api.post(`/api/goals/${selectedGoalId.value}/assets/${goalAssetAllocation.value.asset_id}/allocations`, payload);
    goalAssetAllocation.value.quantity = "";
    await refreshAll();
    await fetchGoalDetails();
    notify.notify({ message: "Aset berhasil dialokasikan ke target.", type: "success" });
  } catch (err) {
    notifyError(err, "Alokasi aset gagal disimpan.");
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
  if (route.query.tab === "assets" && route.path === "/goals") {
    await router.replace("/investasi");
  }
  await fetchAll();
});
</script>

<template>
  <main class="app-page financial-workspace space-y-6 pb-8">
    <header class="financial-page-header">
      <div class="financial-page-title">
        <p class="eyebrow">Perencanaan keuangan</p>
        <h1>{{ tab === "goals" ? "Target tabungan" : "Aset investasi" }}</h1>
        <p class="text-sm text-ink-500">
          {{ tab === "goals" ? "Rencanakan kebutuhan, siapkan pendanaan, dan pantau progres target Anda." : "Pantau nilai, riwayat, dan perkembangan aset investasi Anda." }}
        </p>
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
          <p class="text-xs text-ink-500">Pendanaan target</p>
          <p class="mt-2 text-xl font-bold">
            {{ formatRupiah(totalGoalFunding) }}
          </p>
          <p class="mt-1 text-xs text-ink-500">
            Pembayaran target dan kas/aset yang sudah dialokasikan.
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
                      >Jumlah<MoneyInput
                        v-model="item.quantity"
                        min="0.0001"
                        step="0.0001"
                        :precision="4"
                        :show-prefix="false"
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
            <div v-if="!goals.length" class="goal-list-empty">
              <span class="goal-empty-mark">◎</span>
              <strong>Belum ada target</strong>
              <p>
                Buat target pertama untuk mulai merencanakan kebutuhan Anda.
              </p>
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
                v-for="goal in displayGoals"
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
                    :aria-label="`Progres pendanaan ${Math.round(Number(goal.funding_progress_percent) || 0)} persen`"
                  >
                    <circle
                      class="goal-progress-track"
                      cx="24"
                      cy="24"
                      r="20"
                    />
                    <circle
                      class="goal-progress-value"
                      cx="24"
                      cy="24"
                      r="20"
                      :style="{
                        strokeDasharray: '125.66',
                        strokeDashoffset: `${125.66 - 1.2566 * Math.min(100, Math.max(0, Number(goal.funding_progress_percent) || 0))}`,
                      }"
                    />
                    <text x="24" y="26" text-anchor="middle">
                      {{
                        Math.round(Number(goal.funding_progress_percent) || 0)
                      }}%
                    </text>
                  </svg>
                </div>
                <div class="goal-list-card-values">
                  <span>{{ formatRupiah(goal.funded_amount) }} terdanai</span>
                  <b>{{
                    formatRupiah(goal.budget_total || goal.target_amount)
                  }}</b>
                </div>
                <div class="goal-list-progress-track">
                  <span
                    :style="{
                      width: `${Math.min(100, Math.max(0, Number(goal.funding_progress_percent) || 0))}%`,
                    }"
                  ></span>
                </div>
                <span class="goal-list-open">Lihat detail <span>›</span></span>
              </button>
            </div>
          </article>
        </div>

        <div v-if="selectedGoal" class="goal-detail-layout">
          <div class="workspace-detail-toolbar">
            <button
              type="button"
              class="workspace-back-button"
              @click="backToGoalList"
            >
              <span aria-hidden="true">‹</span> Semua target
            </button>
            <button
              type="button"
              class="secondary-button"
              @click="openGoalEdit"
            >
              {{ showGoalEditForm ? 'Tutup edit' : 'Edit target' }}
            </button>
            <button
              type="button"
              class="workspace-delete-button"
              :aria-label="`Hapus target ${selectedGoal.name}`"
              @click="requestDelete('goal', selectedGoal)"
            >
              Hapus target
            </button>
          </div>
          <form v-if="showGoalEditForm" class="surface-card grid gap-3 p-4 sm:grid-cols-[1fr_220px_auto] sm:items-end" @submit.prevent="updateGoalMetadata">
            <label class="financial-field">Nama target<input v-model="goalEditForm.name" required maxlength="160" /></label>
            <label class="financial-field">Tanggal target<input v-model="goalEditForm.target_date" type="date" /></label>
            <button class="primary-button" :disabled="busy">Simpan perubahan</button>
          </form>
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
                      {{ formatQuantity(item.quantity, 4) }} ×
                      {{ formatRupiah(item.unit_price) }} · dibayar
                      {{ formatRupiah(item.paid_amount) }}
                    </p>
                  </div>
                  <div class="text-right">
                    <b class="text-sm">{{
                      formatRupiah(item.estimated_amount)
                    }}</b
                    ><button class="ml-2 text-xs font-semibold text-primary-600" @click="editItem(item)">Edit</button><button
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
                  ><div class="ml-2 flex shrink-0 flex-wrap justify-end gap-x-2 gap-y-1"><button
                    v-if="
                      compareDecimal(obligation.remaining_amount, '0.00') > 0
                    "
                    class="font-semibold text-primary-600"
                    @click="payObligation({ ...obligation, item: item.name })"
                  >
                    Bayar
                  </button><template v-if="Number(obligation.paid_amount || 0) === 0"><button class="font-semibold text-primary-600" @click="editObligation(item, obligation)">Edit</button><button class="font-semibold text-expense-600" @click="removeObligation(item, obligation)">Hapus</button></template></div>
                </div>
              </div>
              <details class="workspace-form-disclosure">
                <summary>Tambah rincian kebutuhan</summary>
                <form
                  class="goal-item-form mt-4 grid gap-2 sm:grid-cols-[1fr_95px_130px_auto]"
                  @submit.prevent="addItem"
                >
                  <input
                    v-model="itemForm.name"
                    required
                    class="rounded-xl border border-line-200 bg-paper-0 px-3 py-2 text-sm"
                    placeholder="Nama kebutuhan"
                  /><MoneyInput
                    v-model="itemForm.quantity"
                    min="0.0001"
                    step="0.0001"
                    :precision="4"
                    :show-prefix="false"
                    class="rounded-xl border border-line-200 bg-paper-0 px-3 py-2 text-sm"
                    aria-label="Jumlah"
                  /><MoneyInput
                    v-model="itemForm.unit_price"
                    min="0"
                    step="0.01"
                    required
                    class="rounded-xl border border-line-200 bg-paper-0 px-3 py-2 text-sm"
                    placeholder="0"
                  /><div class="flex flex-wrap gap-2"><button class="primary-button" :disabled="busy">
                    {{ editingItemId ? 'Simpan' : 'Tambah' }}
                  </button><button v-if="editingItemId" type="button" class="secondary-button" @click="editingItemId = null; itemForm = { name: '', quantity: '1', unit_price: '', notes: '' }">Batal</button></div>
                </form>
              </details>
            </article>
            <article class="surface-card p-5">
              <h3 class="font-bold">Jadwal pembayaran</h3>
              <p class="mt-1 text-xs text-ink-500">
                Catat uang muka atau termin vendor, lalu hubungkan transaksi
                saat membayar.
              </p>
              <details class="workspace-form-disclosure">
                <summary>{{ editingObligationId ? 'Ubah jadwal pembayaran' : 'Tambah jadwal pembayaran' }}</summary>
                <form
                  class="goal-obligation-form mt-3 grid gap-2 sm:grid-cols-2"
                  @submit.prevent="addObligation"
                >
                  <select
                    v-model="obligationForm.goal_item_id"
                    required
                    aria-label="Kebutuhan untuk jadwal pembayaran"
                    class="rounded-xl border border-line-200 bg-paper-0 px-3 py-2 text-sm"
                  >
                    <option value="" disabled>-- Pilih kebutuhan --</option>
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
                  /><div class="flex flex-wrap gap-2 sm:col-span-2"><button class="primary-button" :disabled="busy">
                    {{ editingObligationId ? 'Simpan perubahan' : 'Tambah jadwal' }}
                  </button><button v-if="editingObligationId" type="button" class="secondary-button" @click="editingObligationId = null; obligationForm = { goal_item_id: '', name: '', amount: '', due_date: '', payee: '' }">Batal</button></div>
                </form>
              </details>
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
              <h3 class="font-bold">Jurnal setoran manual</h3>
              <p class="mt-1 text-xs text-ink-500">
                Ini hanya catatan riwayat dan tidak mengubah saldo, kas
                tersedia, atau progres pendanaan. Untuk menyisihkan saldo akun
                ke target, gunakan bagian Sisihkan uang untuk target.
              </p>
              <details class="workspace-form-disclosure">
                <summary>{{ editingContributionId ? 'Edit catatan setoran' : 'Tambah catatan setoran' }}</summary>
                <form
                  class="goal-contribution-form mt-3 grid gap-2 sm:grid-cols-[1fr_140px_1fr_auto]"
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
                  /><div class="flex flex-wrap gap-2"><button class="primary-button" :disabled="busy">
                    {{ editingContributionId ? 'Simpan' : 'Catat' }}
                  </button><button v-if="editingContributionId" type="button" class="secondary-button" @click="editingContributionId = null; contribution = { amount: '', date: localDate(), note: '' }">Batal</button></div>
                </form>
              </details>
              <div
                v-if="contributions.length"
                class="mt-4 divide-y divide-line-200"
              >
                <div
                  v-for="row in contributions"
                  :key="row.id"
                  class="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                >
                  <span
                    >{{ row.date }}
                    <small class="text-ink-500">{{ row.note }}</small></span
                  ><div class="flex items-center gap-2"><b>{{ formatRupiah(row.amount) }}</b><button class="text-xs font-semibold text-primary-600" @click="editContribution(row)">Edit</button><button class="text-xs font-semibold text-expense-600" @click="deleteContribution(row)">Hapus</button></div>
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
              <h3 class="font-bold">Sisihkan uang untuk target</h3>
              <p class="mt-1 text-xs text-ink-500">
                Pilih akun dan nominal yang sudah tersedia. Ledger mencadangkan
                dana ini untuk target tanpa memindahkan atau mengurangi saldo
                akun.
              </p>
              <details class="workspace-form-disclosure">
                <summary>Alokasikan saldo rekening</summary>
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
                    <option value="" disabled>-- Pilih rekening --</option>
                    <option
                      v-for="account in accountChoices"
                      :key="account.id"
                      :value="account.id"
                    >
                      {{ account.name }} · belum dialokasikan
                      {{ formatRupiah(account.unallocated_cash) }}
                    </option></select
                  ><select
                    v-model="cashForm.action"
                    required
                    aria-label="Tindakan alokasi kas"
                    class="rounded-xl border border-line-200 bg-paper-0 px-3 py-2 text-sm"
                  >
                    <option value="" disabled>
                      -- Pilih tindakan alokasi --
                    </option>
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
                  /><button
                    class="primary-button sm:col-span-2"
                    :disabled="busy"
                  >
                    Simpan alokasi
                  </button>
                </form>
              </details>
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
            <article class="surface-card p-5 sm:col-span-2">
              <h3 class="font-bold">Sisihkan aset untuk {{ selectedGoal.name }}</h3>
              <p class="mt-1 text-xs text-ink-500">Pilih gram emas atau unit RDPU yang tersedia. Nilai aset mengikuti valuasi, sementara kuantitas yang dialokasikan tetap.</p>
              <details class="workspace-form-disclosure mt-3">
                <summary>Atur alokasi aset</summary>
                <form class="mt-3 grid gap-3 sm:grid-cols-2" @submit.prevent="allocateGoalAsset">
                  <label class="financial-field sm:col-span-2">Aset<select v-model="goalAssetAllocation.asset_id" required><option value="" disabled>-- Pilih aset --</option><option v-for="asset in assets" :key="asset.id" :value="asset.id" :disabled="asset.type === 'deposit' || (asset.type === 'rdpu' && ['manual', 'value_only'].includes(asset.valuation_mode))">{{ asset.name }} · {{ asset.type === 'gold' ? `${formatQuantity(asset.quantity)} gram` : asset.type === 'deposit' ? 'Tidak mendukung alokasi unit' : ['manual', 'value_only'].includes(asset.valuation_mode) ? 'Unit tidak dicatat' : `${formatQuantity(asset.quantity)} unit` }}</option></select></label>
                  <label class="financial-field">Jumlah<MoneyInput v-model="goalAssetAllocation.quantity" min="0.00000001" step="0.00000001" :precision="8" :show-prefix="false" placeholder="Gram / unit" required /></label>
                  <label class="financial-field">Tindakan<select v-model="goalAssetAllocation.action" required><option value="allocate">Sisihkan untuk target</option><option value="release">Kurangi alokasi</option></select></label>
                  <button class="primary-button sm:col-span-2" :disabled="busy">Simpan alokasi</button>
                </form>
              </details>
              <div v-if="funding?.allocated_assets?.length" class="mt-4 divide-y divide-line-200">
                <div v-for="row in funding.allocated_assets" :key="row.asset_id" class="flex flex-wrap justify-between gap-2 py-2 text-sm"><span>{{ row.name }} · {{ formatQuantity(row.quantity) }} {{ row.type === 'gold' ? 'gram' : 'unit' }}</span><b>{{ row.value == null ? 'Valuasi belum tersedia' : formatRupiah(row.value) }}</b></div>
              </div>
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
          <p>Modal tercatat</p>
          <b>{{
            allAssetBasisKnown ? formatRupiah(
              assets.reduce(
                (sum, a) => addDecimal(sum, a.cost_basis || 0),
                "0.00",
              ),
            ) : "Sebagian belum diketahui"
          }}</b>
        </article>
        <article class="surface-card asset-summary-card">
          <p>Keuntungan / kerugian belum terealisasi</p>
          <b>{{
            allAssetBasisKnown ? formatRupiah(
              assets.reduce(
                (sum, a) => addDecimal(sum, a.unrealized_profit_loss || 0),
                "0.00",
              ),
            ) : "Belum lengkap"
          }}</b>
        </article>
      </section>
      <AssetSavingConsistency v-if="!selectedAsset" v-model="monthlyTargetForm" :summary="savingConsistency" :busy="busy" @save="saveMonthlyTarget" @delete="deleteMonthlyTarget" />
      <section
        class="asset-workspace-layout"
        :class="selectedAsset ? 'has-selected-asset' : 'is-list-view'"
      >
        <div v-if="!selectedAsset" class="asset-workspace-sidebar">
          <article v-if="showAssetForm" class="surface-card planner-card">
            <div class="planner-card-heading">
              <div>
                <h2 class="font-bold">Tambah aset</h2>
                <p>Catat emas, RDPU, atau deposito dalam satu portofolio.</p>
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
              <label class="financial-field">Jenis aset<select v-model="assetForm.type" required><option value="" disabled>-- Pilih jenis aset --</option><option value="gold">Emas</option><option value="rdpu">Reksa dana pasar uang</option><option value="deposit">Deposito</option></select></label>
              <label class="financial-field">Nama aset<input v-model="assetForm.name" required :placeholder="assetForm.type === 'gold' ? 'Contoh: Emas digital Tring' : assetForm.type === 'rdpu' ? 'Contoh: Sucorinvest Money Market Fund' : assetForm.type === 'deposit' ? 'Contoh: Deposito BCA' : 'Pilih jenis aset terlebih dahulu'" /></label>
              <label class="financial-field">Penyedia / platform<input v-model="assetForm.provider" placeholder="Contoh: Tring, Bibit, BCA (opsional)" /></label>
              <label class="financial-field">Kode produk<input v-model="assetForm.identifier" placeholder="Opsional" /></label>
              <label v-if="assetForm.type === 'gold'" class="financial-field">Penyimpanan<select v-model="assetForm.storage_type" required><option value="" disabled>-- Pilih jenis penyimpanan --</option><option value="physical">Emas fisik</option><option value="digital">Emas digital</option></select></label>
              <div v-if="assetForm.type === 'deposit'" class="asset-opening-fields sm:col-span-2">
                <label class="financial-field">Tanggal penempatan<input v-model="assetForm.start_date" type="date" required /></label>
                <label class="financial-field">Tanggal jatuh tempo<input v-model="assetForm.maturity_date" type="date" :min="assetForm.start_date" required /></label>
              </div>
              <fieldset class="asset-ownership-choice sm:col-span-2"><legend>Asal kepemilikan</legend>
                <label class="asset-ownership-option"><input v-model="assetForm.ownership_source" type="radio" name="asset-ownership-source" value="existing" required /><span><strong>Sudah dimiliki sebelum Ledger</strong><small>Catat saldo awal tanpa mengurangi saldo rekening.</small></span></label>
                <label class="asset-ownership-option"><input v-model="assetForm.ownership_source" type="radio" name="asset-ownership-source" value="new" required /><span><strong>Pembelian atau penempatan baru</strong><small>Catat nominal dan rekening yang digunakan.</small></span></label>
              </fieldset>
              <div v-if="assetForm.ownership_source === 'existing'" class="asset-opening-fields sm:col-span-2">
                <label v-if="assetForm.type === 'gold'" class="financial-field">Jumlah emas saat ini (gram)<MoneyInput v-model="assetForm.initial_quantity" min="0.00000001" step="0.00000001" :precision="8" :show-prefix="false" placeholder="Contoh: 5 atau 0,5 gram" required /></label>
                <label v-else class="financial-field">{{ assetForm.type === 'deposit' ? 'Nilai deposito saat ini' : 'Nilai portofolio saat ini' }}<MoneyInput v-model="assetForm.initial_current_value" min="0.01" step="0.01" placeholder="Nilai yang terlihat di aplikasi" required /></label>
                <label class="financial-field">Modal awal / total setoran (opsional)<MoneyInput v-model="assetForm.initial_cost_basis" min="0" step="0.01" placeholder="Kosongkan jika belum diketahui" /><small class="asset-opening-help">Tanpa modal yang diketahui, Ledger tidak menghitung untung/rugi.</small></label>
                <label v-if="assetForm.type === 'gold'" class="financial-field">Harga buyback per gram saat ini<MoneyInput v-model="assetForm.initial_price" min="0.00000001" step="0.00000001" :precision="2" placeholder="Harga jual kembali saat ini" required /></label>
                <label v-if="assetForm.type !== 'deposit'" class="financial-field">Tanggal mulai dicatat<input v-model="assetForm.initial_date" type="date" required /></label>
                <p class="asset-opening-notice sm:col-span-2">Saldo awal hanya menambah aset di Ledger. Rekening tidak berubah karena kepemilikan ini sudah ada sebelumnya.</p>
              </div>
              <div v-if="assetForm.ownership_source === 'new'" class="asset-opening-fields sm:col-span-2">
                <label class="financial-field">{{ assetForm.type === 'deposit' ? 'Nominal penempatan' : 'Nominal pembelian' }}<MoneyInput v-model="assetForm.purchase_amount" min="1" step="1" placeholder="Jumlah uang yang dibayar" required /></label>
                <label v-if="assetForm.type === 'gold'" class="financial-field">Emas yang diterima (gram)<MoneyInput v-model="assetForm.purchase_quantity" min="0.00000001" step="0.00000001" :precision="8" :show-prefix="false" placeholder="Contoh: 0,5 gram" required /></label>
                <label class="financial-field">Rekening sumber<select v-model="assetForm.purchase_cash_account_id" required><option value="" disabled>-- Pilih rekening sumber --</option><option v-for="account in accountChoices" :key="account.id" :value="account.id">{{ account.name }} · {{ formatRupiah(account.balance) }}</option></select></label>
                <label v-if="assetForm.type !== 'deposit'" class="financial-field">Tanggal transaksi<input v-model="assetForm.purchase_date" type="date" required /></label>
                <p class="asset-opening-notice sm:col-span-2">Pembelian dicatat sebagai perpindahan kas ke aset, bukan pengeluaran konsumtif.</p>
              </div>
              <button class="primary-button w-full sm:col-span-2" :disabled="busy || !assetForm.ownership_source">{{ assetForm.ownership_source === 'new' ? 'Buat aset & catat pembelian' : 'Tambahkan saldo awal aset' }}</button>
            </form>
          </article>
          <article class="surface-card planner-card asset-list-panel">
            <div class="goal-list-heading">
              <div>
                <h2 class="font-bold">Portofolio aset</h2>
                <p>Ringkasan nilai dan kepemilikan aset investasi Anda.</p>
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
              <p>Tambahkan emas, RDPU, atau deposito untuk mulai mencatat aset.</p>
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
                    :class="asset.type === 'gold' ? 'is-gold' : asset.type === 'deposit' ? 'is-deposit' : 'is-rdpu'"
                    aria-hidden="true"
                    >{{ asset.type === "gold" ? "Au" : asset.type === "deposit" ? "DP" : "RD" }}</span
                  >
                  <span class="asset-identity-copy">
                    <b>{{ asset.name }}</b>
                    <small>{{
                      asset.provider ||
                      (asset.type === "gold" ? "Emas" : asset.type === "deposit" ? "Deposito" : "RDPU")
                    }}</small>
                  </span>
                  <span class="asset-type-pill">{{
                    asset.type === "gold" ? "Emas" : asset.type === "deposit" ? "Deposito" : "RDPU"
                  }}</span>
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
                  <span>{{
                    asset.type === "gold"
                      ? `${formatQuantity(asset.quantity)} gram`
                      : `${asset.type === 'deposit' ? 'Nilai deposito' : 'Nilai portofolio'} ${formatRupiah(asset.manual_balance)}`
                  }}</span>
                  <span
                    v-if="
                      asset.type === 'gold'
                        ? asset.unrealized_profit_loss != null
                        : asset.total_profit_loss != null
                    "
                    :class="
                      Number(
                        asset.type === 'gold'
                          ? asset.unrealized_profit_loss
                          : asset.total_profit_loss,
                      ) >= 0
                        ? 'is-gain'
                        : 'is-loss'
                    "
                    >{{
                      formatRupiah(
                        asset.type === "gold"
                          ? asset.unrealized_profit_loss
                          : asset.total_profit_loss,
                      )
                    }}</span
                  >
                </div>
                <div class="asset-portfolio-card-open">
                  Lihat detail <span>›</span>
                </div>
              </button>
            </div>
          </article>
        </div>
        <div v-if="selectedAsset" class="asset-detail-layout">
          <div class="workspace-detail-toolbar">
            <button
              type="button"
              class="workspace-back-button"
              @click="backToAssetList"
            >
              <span aria-hidden="true">‹</span> Semua aset
            </button>
            <button
              type="button"
              class="secondary-button"
              @click="openAssetEdit"
            >
              {{ showAssetEditForm ? 'Tutup edit' : 'Edit aset' }}
            </button>
            <button
              type="button"
              class="workspace-delete-button"
              :aria-label="`Hapus aset ${selectedAsset.name}`"
              title="Hapus aset dan data transaksinya"
              @click="requestDelete('asset', selectedAsset)"
            >
              Hapus aset
            </button>
          </div>
          <form v-if="showAssetEditForm" class="surface-card grid gap-3 p-4 sm:grid-cols-2" @submit.prevent="updateAssetMetadata">
            <label class="financial-field">Nama aset<input v-model="assetEditForm.name" required maxlength="160" /></label>
            <label class="financial-field">Penyedia / platform<input v-model="assetEditForm.provider" maxlength="160" /></label>
            <label class="financial-field">Kode produk<input v-model="assetEditForm.identifier" maxlength="100" /></label>
            <label v-if="selectedAsset.type === 'gold'" class="financial-field">Penyimpanan<select v-model="assetEditForm.storage_type"><option value="">-- Pilih penyimpanan --</option><option value="digital">Digital</option><option value="physical">Fisik</option></select></label>
            <template v-if="selectedAsset.type === 'deposit'"><label class="financial-field">Tanggal penempatan<input v-model="assetEditForm.start_date" type="date" required /></label><label class="financial-field">Tanggal jatuh tempo<input v-model="assetEditForm.maturity_date" type="date" :min="assetEditForm.start_date" required /></label></template>
            <button class="primary-button sm:col-span-2" :disabled="busy">Simpan detail aset</button>
          </form>
          <section class="surface-card asset-detail-card">
            <div class="asset-detail-heading">
              <div>
                <p
                  class="text-xs font-semibold uppercase tracking-wide text-primary-600"
                >
                  {{
                    selectedAsset.type === "gold" ? "Emas" : selectedAsset.type === "deposit" ? "Deposito" : "Reksa dana pasar uang"
                  }}
                </p>
                <h2 class="mt-1 text-xl font-bold">{{ selectedAsset.name }}</h2>
                <p class="mt-1 text-xs text-ink-500">
                  {{ selectedAsset.provider || "Penyedia belum dicatat" }} ·
                  {{ selectedAsset.identifier || "Tanpa kode produk" }}
                </p>
              </div>
              <div class="asset-detail-holding">
                <b>{{
                  selectedAsset.type === "gold"
                    ? `${formatQuantity(selectedAsset.quantity)} gram`
                    : `${selectedAsset.type === 'deposit' ? 'Nilai deposito' : 'Nilai portofolio'} ${formatRupiah(selectedAsset.manual_balance)}`
                }}</b>
                <p v-if="selectedAsset.type === 'gold'">
                  {{ selectedAsset.cost_basis_known ? `Modal ${formatRupiah(selectedAsset.cost_basis)}` : "Modal historis belum diketahui" }}
                </p>
                <p v-if="selectedAsset.type === 'deposit'">Jatuh tempo {{ selectedAsset.maturity_date || 'belum dicatat' }}</p>
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
                  selectedAsset.type === "gold" ? "Harga buyback/gram" : selectedAsset.type === "deposit" ? "Nilai deposito terakhir" : selectedAssetUsesManualValue ? "Nilai portofolio terakhir" : "NAB per unit"
                }}</small>
                <b>{{
                  selectedAsset.latest_price ? formatRupiah(selectedAsset.latest_price) : "Belum dicatat"
                }}</b>
              </div>
              <div>
                <small>{{
                  selectedAsset.type === "gold" ? "P/L belum terealisasi" : "Untung/rugi sejak mulai dicatat"
                }}</small
                ><b>{{
                  (selectedAsset.type === "gold" ? selectedAsset.unrealized_profit_loss : selectedAsset.total_profit_loss) == null
                    ? "—"
                    : formatRupiah(
                        selectedAsset.type === "gold" ? selectedAsset.unrealized_profit_loss : selectedAsset.total_profit_loss,
                      )
                }}</b>
              </div>
            </div>
            <details class="workspace-form-disclosure">
              <summary>
                {{
                  selectedAsset.type === "gold" ? "Perbarui harga buyback" : selectedAsset.type === "deposit" ? "Perbarui nilai deposito" : selectedAssetUsesManualValue ? "Perbarui nilai portofolio" : "Perbarui NAB"
                }}
              </summary>
              <form class="asset-price-form" @submit.prevent="savePrice">
                <label class="financial-field"
                  >{{
                    selectedAsset.type === "gold" ? "Harga buyback per gram" : selectedAssetUsesManualValue ? "Total nilai saat ini" : "NAB terbaru per unit"
                  }}<MoneyInput
                    v-model="priceForm.price"
                    :min="selectedAsset.type === 'gold' || !selectedAssetUsesManualValue ? '0.00000001' : '0.01'"
                    :step="selectedAsset.type === 'gold' || !selectedAssetUsesManualValue ? '0.00000001' : '0.01'"
                    :precision="selectedAsset.type === 'gold' || !selectedAssetUsesManualValue ? 8 : 2"
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
                  {{
                    selectedAsset.type === "gold" ? "Simpan harga buyback" : selectedAssetUsesManualValue ? "Simpan nilai terbaru" : "Simpan NAB"
                  }}
                </button>
              </form>
              <p class="mt-2 text-xs text-ink-500">
                {{
                  selectedAsset.type === "gold" ? "Nilai estimasi mengikuti harga buyback terbaru yang Anda catat." : selectedAssetUsesManualValue ? "Catat nilai terkini dari aplikasi penyedia. Ledger tidak meminta NAB atau unit." : "Masukkan NAB terbaru per unit. Nilai portofolio dihitung dari unit terkonfirmasi × NAB."
                }}
              </p>
            </details>
          </section>
          <section class="grid gap-4 lg:grid-cols-2">
            <article class="surface-card p-5">
              <h3 class="font-bold">Catat transaksi aset</h3>
              <details class="workspace-form-disclosure">
                <summary>Catat pembelian atau pencairan</summary>
                <p class="mt-2 text-xs text-ink-500">{{ selectedAssetUsesManualValue ? 'Catat nominal transaksi. Perubahan nilai RDPU atau deposito diperbarui terpisah dari aplikasi penyedia.' : 'Catat transaksi sesuai bukti pembelian atau penjualan.' }}</p>
                <form class="asset-trade-form" @submit.prevent="recordTrade">
                  <label class="financial-field"
                    >Jenis transaksi<select
                      v-model="assetTrade.type"
                      required
                      @change="onAssetTradeTypeChange"
                    >
                      <option value="" disabled>
                        -- Pilih jenis transaksi --
                      </option>
                      <option value="purchase">
                        {{
                          selectedAsset.type === "gold" ? "Pembelian" : selectedAsset.type === "deposit" ? "Penempatan deposito" : "Pembelian RDPU"
                        }}
                      </option>
                      <option value="sale">
                        {{
                          selectedAsset.type === "gold" ? "Penjualan" : selectedAsset.type === "deposit" ? "Pencairan deposito" : "Pencairan RDPU"
                        }}
                      </option>
                    </select></label
                  >
                  <label v-if="selectedAsset.type === 'gold'" class="financial-field">Mode input<select v-model="assetTrade.form_mode"><option value="simple">Sederhana</option><option value="detailed">Detail</option></select></label>
                  <label
                    v-if="assetTrade.form_mode === 'detailed' && selectedAsset.type === 'gold'"
                    class="financial-field"
                    >Cara hitung<select v-model="assetTrade.calc_mode" required>
                      <option value="" disabled>-- Pilih cara hitung --</option>
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
                      selectedAsset.type === 'rdpu' && !selectedAssetUsesManualValue &&
                      assetTrade.type === 'purchase'
                    "
                    class="financial-field"
                    >Status pembelian<select
                      v-model="assetTrade.status"
                      required
                    >
                      <option value="" disabled>
                        -- Pilih status pembelian --
                      </option>
                      <option value="pending">Belum dikonfirmasi</option>
                      <option value="confirmed">Sudah dikonfirmasi</option>
                    </select></label
                  >
                  <label class="financial-field"
                    >{{
                      assetTrade.type === "sale"
                        ? "Rekening penerima"
                        : "Rekening sumber"
                    }}<select
                      v-model="assetTrade.cash_account_id"
                      :required="
                        assetTrade.type === 'sale' ||
                        (assetTrade.type === 'purchase' &&
                          (selectedAsset.type === 'gold' || selectedAssetUsesManualValue ||
                            assetTrade.status === 'confirmed' ||
                            assetTrade.cash_debited))
                      "
                    >
                      <option value="">
                        {{
                          assetTrade.type === "sale"
                            ? "-- Tanpa rekening tujuan --"
                            : "-- Tanpa rekening sumber --"
                        }}
                      </option>
                      <option
                        v-for="account in accountChoices"
                        :key="account.id"
                        :value="account.id"
                      >
                        {{ account.name }}
                        <template v-if="assetTrade.type !== 'sale'">
                          · belum dialokasikan
                          {{ formatRupiah(account.unallocated_cash) }}
                        </template>
                      </option>
                    </select></label
                  >
                  <label class="financial-field"
                    >{{
                      selectedAsset.type !== "gold"
                        ? assetTrade.type === "sale"
                          ? (selectedAsset.type === "deposit" ? "Nominal pencairan" : "Nominal pencairan")
                          : (selectedAsset.type === "deposit" ? "Nominal penempatan" : "Nominal pembelian")
                        : "Nominal transaksi"
                    }}<MoneyInput
                      v-model="assetTrade.amount"
                      min="0"
                      step="0.01"
                      required
                      :placeholder="
                        assetTrade.type === 'sale'
                          ? 'Hasil jual aktual'
                          : 'Nominal transaksi'
                      "
                  /></label>
                  <label
                    v-if="selectedAsset.type === 'gold' || (selectedAsset.type === 'rdpu' && !selectedAssetUsesManualValue && (assetTrade.type === 'sale' || assetTrade.status === 'confirmed'))"
                    class="financial-field"
                    >{{
                      selectedAsset.type === "gold"
                        ? "Berat emas"
                        : "Jumlah unit"
                    }}<MoneyInput
                      v-model="assetTrade.quantity"
                      min="0.00000001"
                      step="0.00000001"
                      :precision="8"
                      :show-prefix="false"
                      :placeholder="
                        selectedAsset.type === 'gold' ? 'Gram' : 'Unit'
                      "
                  /></label>
                  <label
                    v-if="assetTrade.form_mode === 'detailed' && (selectedAsset.type === 'gold' || (selectedAsset.type === 'rdpu' && assetTrade.type === 'purchase' && assetTrade.status === 'confirmed'))"
                    class="financial-field"
                    >{{ selectedAsset.type === 'gold' ? "Harga satuan" : "NAB saat pembelian (opsional)"
                    }}<MoneyInput
                      v-model="assetTrade.unit_price"
                      min="0.00000001"
                      step="0.00000001"
                      :precision="8"
                      :placeholder="'Harga per satuan harga'"
                  /></label>
                  <label
                    v-if="assetTrade.form_mode === 'detailed' && selectedAsset.type === 'gold'"
                    class="financial-field"
                    >Basis harga<select
                      v-model="assetTrade.price_unit_grams"
                      required
                    >
                      <option value="" disabled>-- Pilih basis harga --</option>
                      <option value="0.01000000">Per 0,01 gram</option>
                      <option value="0.10000000">Per 0,1 gram</option>
                      <option value="1.00000000">Per 1 gram</option>
                      <option value="custom">Satuan khusus…</option>
                    </select></label
                  >
                  <label
                    v-if="
                      assetTrade.form_mode === 'detailed' && selectedAsset.type === 'gold' &&
                      assetTrade.price_unit_grams === 'custom'
                    "
                    class="financial-field"
                    >Gram per satuan harga<MoneyInput
                      v-model="customPriceUnit"
                      min="0.00000001"
                      step="0.00000001"
                      :precision="8"
                      :show-prefix="false"
                      placeholder="Contoh: 0,5"
                  /></label>
                  <label v-if="assetTrade.form_mode === 'detailed'" class="financial-field"
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
                      selectedAsset.type === 'rdpu' && !selectedAssetUsesManualValue &&
                      assetTrade.type === 'purchase' &&
                      assetTrade.status === 'pending'
                    "
                    class="flex items-center gap-2 text-xs sm:col-span-2"
                    ><input
                      v-model="assetTrade.cash_debited"
                      type="checkbox"
                    />Dana sudah benar-benar keluar dari rekening</label
                  >
                  <div
                    v-if="selectedAsset.type === 'gold'"
                class="asset-trade-preview"
                  >
                    Pratinjau: {{ formatQuantity(tradePreview.quantity) }} gram
                    · {{ formatRupiah(tradePreview.amount) }}
                    <span v-if="assetTrade.unit_price">
                      pada harga
                      {{ formatRupiah(assetTrade.unit_price) }}
                      / {{ effectivePriceUnit }} gram</span
                    >
                  </div>
                  <div v-else class="asset-trade-preview">
                    Nominal yang dicatat:
                    {{ formatRupiah(tradePreview.amount) }}
                  </div>
                  <p
                    v-if="selectedAssetUsesManualValue"
                    class="asset-opening-notice sm:col-span-2"
                  >
                    Catat nominal pembelian atau pencairan. Nilai aset bertambah/berkurang sesuai nominal; untuk mencerminkan imbal hasil, perbarui nilai terkini dari aplikasi penyedia.
                  </p>
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
              </details>
              <details v-if="!selectedAssetUsesManualValue && selectedAsset.type !== 'deposit'" class="workspace-form-disclosure">
                <summary>Impor histori investasi</summary>
                <p class="mt-2 text-xs text-ink-500">Masukkan pembelian dan penjualan lama dalam urutan tanggal. Histori tidak membuat arus kas saat ini. Jika ada saldo awal, saldo unit akhirnya harus sama.</p>
                <label v-if="(selectedAsset.transactions || []).some(tx => tx.origin === 'opening' && !tx.superseded_at)" class="mt-3 flex items-start gap-2 rounded-xl bg-base-50 p-3 text-sm"><input v-model="historicalImport.reconcile_opening" type="checkbox" required /><span>Ganti saldo awal dengan rincian pembelian lama yang saya masukkan.</span></label>
                <form class="mt-3 grid gap-3" @submit.prevent="importAssetHistory">
                  <div v-for="(row, index) in historicalImport.transactions" :key="index" class="grid gap-2 rounded-xl border border-line-200 p-3 sm:grid-cols-2">
                    <label class="financial-field">Aktivitas<select v-model="row.action"><option value="purchase">Pembelian</option><option value="sale">{{ selectedAsset.type === 'gold' ? 'Penjualan' : 'Pencairan' }}</option></select></label>
                    <label class="financial-field">Tanggal pembelian<input v-model="row.transaction_date" type="date" required /></label>
                    <label class="financial-field">{{ row.action === 'purchase' ? (selectedAsset.type === 'gold' ? 'Nominal pembelian' : 'Nominal investasi') : 'Hasil penjualan/pencairan' }}<MoneyInput v-model="row.amount" min="0.01" step="0.01" placeholder="Nominal aktual" required /></label>
                    <label class="financial-field">{{ row.action === 'purchase' ? (selectedAsset.type === 'gold' ? 'Gram diterima' : 'Unit dibeli') : (selectedAsset.type === 'gold' ? 'Gram dijual' : 'Unit dicairkan') }}<MoneyInput v-model="row.quantity" min="0.00000001" step="0.00000001" :precision="8" :show-prefix="false" placeholder="Jumlah aktual" required /></label>
                    <label class="financial-field">Harga per gram / NAB per unit (opsional)<MoneyInput v-model="row.unit_price" min="0.00000001" step="0.00000001" :precision="8" placeholder="Otomatis dari nominal ÷ jumlah" /></label>
                    <label class="financial-field">Biaya transaksi<MoneyInput v-model="row.fees" min="0" step="0.01" placeholder="0" /></label>
                    <label class="financial-field">Catatan<input v-model="row.notes" placeholder="Opsional" /></label>
                    <button v-if="historicalImport.transactions.length > 1" type="button" class="secondary-button sm:col-span-2" @click="removeHistoryRow(index)">Hapus baris ini</button>
                  </div>
                  <div class="flex flex-wrap gap-2"><button type="button" class="secondary-button" @click="addHistoryRow">Tambah transaksi lama</button><button class="primary-button" :disabled="busy">Impor {{ historicalImport.transactions.length }} transaksi</button></div>
                </form>
              </details>
            </article>
            <article class="surface-card p-5">
              <h3 class="font-bold">Alokasikan aset ke target</h3>
              <p class="mt-1 text-xs text-ink-500">
                {{ selectedAsset.type === "gold" ? "Jumlah emas dicadangkan untuk target sesuai valuasi terbaru." : "Aset nilai manual dicatat terpisah dan tidak membutuhkan alokasi unit." }}
              </p>
              <details v-if="!selectedAssetUsesManualValue && selectedAsset.type !== 'deposit'" class="workspace-form-disclosure">
                <summary>Alokasikan aset ke target</summary>
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
                    <option value="" disabled>-- Pilih target --</option>
                    <option
                      v-for="goal in goals"
                      :key="goal.id"
                      :value="goal.id"
                    >
                      {{ goal.name }}
                    </option></select
                  ><MoneyInput
                    v-model="assetAllocation.quantity"
                    min="0.00000001"
                    step="0.00000001"
                    :precision="8"
                    :show-prefix="false"
                    required
                    aria-label="Jumlah aset untuk dialokasikan"
                    class="rounded-xl border border-line-200 bg-paper-0 px-3 py-2 text-sm"
                    :placeholder="
                      selectedAsset.type === 'gold' ? 'Gram' : 'Unit penyertaan'
                    "
                  /><select
                    v-model="assetAllocation.action"
                    required
                    aria-label="Tindakan alokasi aset"
                    class="rounded-xl border border-line-200 bg-paper-0 px-3 py-2 text-sm"
                  >
                    <option value="" disabled>
                      -- Pilih tindakan alokasi --
                    </option>
                    <option value="allocate">Alokasikan</option>
                    <option value="release">Lepaskan</option></select
                  ><button class="primary-button" :disabled="busy">
                    Simpan
                  </button>
                </form>
              </details>
              <p v-if="selectedAssetUsesManualValue || selectedAsset.type === 'deposit'" class="mt-3 rounded-xl bg-base-50 p-3 text-xs">{{ selectedAsset.type === 'deposit' ? 'Deposito dicatat sebagai nilai tersimpan dan belum dapat dialokasikan berdasarkan unit.' : 'Alokasi target hanya tersedia untuk aset yang memiliki kuantitas aktual (gram atau unit).' }}</p>
              <div v-if="!selectedAssetUsesManualValue && selectedAsset.type !== 'deposit'" class="mt-4 rounded-xl bg-base-50 p-3 text-xs">
                Dialokasikan:
                <b>{{
                  selectedAsset.type === "rdpu"
                    ? `${formatQuantity(selectedAsset.allocated_quantity)} unit`
                    : `${formatQuantity(selectedAsset.allocated_quantity)} gram`
                }}</b>
                · Belum dialokasikan:
                <b>{{
                  selectedAsset.type === "rdpu"
                    ? `${formatQuantity(selectedAsset.unallocated_quantity)} unit`
                    : `${formatQuantity(selectedAsset.unallocated_quantity)} gram`
                }}</b>
              </div>
              <div class="mt-4">
                <h4 class="text-sm font-semibold">Riwayat aset</h4>
                <div
                  v-for="tx in selectedAsset.transactions || []"
                  :key="tx.id"
                  class="mt-2 rounded-xl border border-line-200 p-3 text-xs"
                >
                  <div class="flex justify-between">
                    <b>{{ tx.type === 'purchase' || tx.type === 'subscription' ? (selectedAsset.type === 'gold' ? 'Pembelian' : selectedAsset.type === 'deposit' ? 'Penempatan deposito' : 'Pembelian RDPU') : (selectedAsset.type === 'gold' ? 'Penjualan' : selectedAsset.type === 'deposit' ? 'Pencairan deposito' : 'Pencairan RDPU') }} · {{ tx.status }} · {{ tx.origin === 'opening' ? 'Saldo awal' : tx.origin === 'historical' ? 'Impor histori' : 'Transaksi baru' }}</b
                    ><span>{{ tx.transaction_date }}</span>
                  </div>
                  <p class="mt-1">
                    <template v-if="selectedAsset.type !== 'gold'">
                      {{ tx.origin === 'opening' ? 'Nilai saldo awal' : tx.type === "redemption" ? "Nominal pencairan" : selectedAsset.type === 'deposit' ? 'Nominal penempatan' : 'Nominal pembelian' }} {{ formatRupiah(tx.amount) }}
                      <span v-if="!selectedAssetUsesManualValue && Number(tx.quantity) > 0"> · {{ formatQuantity(tx.quantity) }} unit</span>
                      <span v-if="!selectedAssetUsesManualValue && Number(tx.unit_price) > 0"> · NAB {{ formatRupiah(tx.unit_price) }}/unit</span>
                    </template>
                    <template v-else>
                      {{ formatQuantity(tx.quantity) }} gram ·
                      {{ formatRupiah(tx.amount) }}
                    </template>
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
                    <MoneyInput
                      v-if="
                        tx.type === 'redemption' &&
                        selectedAsset.type === 'gold'
                      "
                      v-model="pendingForm.quantity"
                      min="0.00000001"
                      step="0.00000001"
                      :precision="8"
                      :show-prefix="false"
                      required
                      class="rounded-lg border border-line-200 bg-paper-0 px-2 py-1.5"
                      aria-label="Jumlah gram aktual"
                      placeholder="Gram dijual"
                    />
                    <MoneyInput
                      v-if="tx.type === 'redemption'"
                      v-model="pendingForm.amount"
                      min="0.01"
                      step="0.01"
                      class="rounded-lg border border-line-200 bg-paper-0 px-2 py-1.5"
                      aria-label="Nominal pencairan"
                      placeholder="Hasil pencairan aktual"
                    />
                    <MoneyInput
                      v-if="
                        tx.type === 'subscription' &&
                        selectedAsset.type === 'gold'
                      "
                      v-model="pendingForm.quantity"
                      min="0.00000001"
                      step="0.00000001"
                      :precision="8"
                      :show-prefix="false"
                      class="rounded-lg border border-line-200 bg-paper-0 px-2 py-1.5"
                      aria-label="Jumlah gram aktual"
                      placeholder="Gram aktual"
                    />
                    <MoneyInput
                      v-if="tx.type === 'subscription' && selectedAsset.type === 'rdpu' && !selectedAssetUsesManualValue"
                      v-model="pendingForm.quantity"
                      min="0.00000001"
                      step="0.00000001"
                      :precision="8"
                      :show-prefix="false"
                      required
                      class="rounded-lg border border-line-200 bg-paper-0 px-2 py-1.5"
                      aria-label="Unit RDPU aktual"
                      placeholder="Unit aktual pada bukti transaksi"
                    />
                    <MoneyInput
                      v-if="
                        tx.type === 'subscription' &&
                        selectedAsset.type === 'gold'
                      "
                      v-model="pendingForm.unit_price"
                      min="0.00000001"
                      step="0.00000001"
                      :precision="8"
                      class="rounded-lg border border-line-200 bg-paper-0 px-2 py-1.5"
                      aria-label="Harga emas aktual"
                      placeholder="Harga per gram"
                    />
                    <select
                      v-if="tx.type === 'redemption'"
                      v-model="pendingForm.cash_account_id"
                      aria-label="Rekening penerima pencairan"
                      class="rounded-lg border border-line-200 bg-paper-0 px-2 py-1.5"
                    >
                      <option value="">-- Pilih rekening penerima --</option>
                      <option
                        v-for="account in accountChoices"
                        :key="account.id"
                        :value="account.id"
                      >
                        {{ account.name }}
                      </option>
                    </select>
                    <template
                      v-if="tx.type === 'subscription' && !tx.cash_debited"
                    >
                      <select
                        v-model="pendingForm.cash_account_id"
                        aria-label="Rekening sumber pembelian"
                        class="rounded-lg border border-line-200 bg-paper-0 px-2 py-1.5"
                      >
                        <option value="">-- Pilih rekening sumber --</option>
                        <option
                          v-for="account in accountChoices"
                          :key="account.id"
                          :value="account.id"
                        >
                          {{ account.name }} ·
                          {{ formatRupiah(account.unallocated_cash) }}
                        </option>
                      </select>
                      <label class="flex items-center gap-2">
                        <input
                          v-model="pendingForm.cash_debited"
                          type="checkbox"
                        />Dana sudah dibayar
                      </label>
                    </template>
                    <button
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
                          : "Konfirmasi pembelian"
                      }}
                    </button>
                  </div>
                </div>
              </div>
              <details v-if="selectedAsset.audit_history?.length" class="workspace-form-disclosure mt-3">
                <summary>Riwayat yang direkonsiliasi ({{ selectedAsset.audit_history.length }})</summary>
                <div v-for="entry in selectedAsset.audit_history" :key="entry.id" class="mt-2 rounded-xl border border-line-200 p-3 text-xs text-ink-500">
                  <div class="flex justify-between gap-2"><b>{{ entry.origin === 'opening' ? 'Saldo awal' : 'Transaksi lama' }} · digantikan saat rekonsiliasi</b><span>{{ entry.transaction_date }}</span></div>
                  <p class="mt-1">{{ formatQuantity(entry.quantity) }} {{ selectedAsset.type === 'gold' ? 'gram' : 'unit' }} · {{ formatRupiah(entry.amount) }}</p>
                </div>
              </details>
            </article>
          </section>
        </div>
        <div v-else class="surface-card p-8 text-center text-sm text-ink-500">
          Tambahkan aset terlebih dahulu.
        </div>
      </section>
    </template>

    <div
      v-if="deleteConfirmation"
      v-dialog="closeDeleteConfirmation"
      class="dialog-backdrop fixed inset-0 z-[70] flex items-center justify-center bg-ink-900/45 p-4 backdrop-blur-sm"
      @click.self="closeDeleteConfirmation"
    >
      <section
        class="w-full max-w-md overflow-hidden rounded-3xl border border-line-200 bg-paper-0 shadow-card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-record-title"
        aria-describedby="delete-record-description"
      >
        <div class="p-5 sm:p-6">
          <span class="workspace-delete-icon" aria-hidden="true">!</span>
          <h2
            id="delete-record-title"
            class="mt-4 text-lg font-bold text-ink-900"
          >
            Hapus {{ deleteConfirmation.type === "goal" ? "target" : "aset" }}?
          </h2>
          <p class="mt-2 break-words text-sm font-semibold text-ink-800">
            {{ deleteConfirmation.name }}
          </p>
          <p
            id="delete-record-description"
            class="mt-2 text-sm leading-6 text-ink-600"
          >
            <template v-if="deleteConfirmation.type === 'goal'">
              Target, rincian kebutuhan, jadwal pembayaran, riwayat setoran,
              serta alokasi kas/aset khusus target akan dihapus. Transaksi
              pembayaran yang sudah tercatat tetap tersimpan dan saldo rekening
              tidak berubah.
            </template>
            <template v-else>
              Seluruh data aset, valuasi, riwayat transaksi, dan alokasi ke
              target akan dihapus. Arus kas pembelian, pencairan, serta refund
              terkait juga dihapus dan saldo rekeningnya dibalik. Jika dana
              pencairan sudah dipakai, saldo rekening dapat menjadi negatif.
            </template>
          </p>
          <p
            v-if="deleteError"
            role="alert"
            class="mt-3 text-sm font-semibold text-expense-600"
          >
            {{ deleteError }}
          </p>
        </div>
        <div
          class="flex flex-col-reverse gap-2 border-t border-line-200 bg-base-50 p-4 sm:flex-row sm:justify-end sm:px-6"
        >
          <button
            type="button"
            class="secondary-button px-4"
            :disabled="isDeletingRecord"
            @click="closeDeleteConfirmation"
          >
            Batal
          </button>
          <button
            type="button"
            class="workspace-delete-confirm px-4"
            :disabled="isDeletingRecord"
            @click="deleteSelectedRecord"
          >
            {{ isDeletingRecord ? "Menghapus…" : "Ya, hapus" }}
          </button>
        </div>
      </section>
    </div>
  </main>
</template>
