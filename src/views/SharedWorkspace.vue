<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { UsersRound, Plus, ArrowDownLeft, ArrowUpRight, Coins, RefreshCw, Trash2, Pencil } from "@lucide/vue";
import MoneyInput from "@/components/MoneyInput.vue";
import api from "@/lib/axios";
import { localDate } from "@/utils/dates";
import { formatQuantity, formatRupiah } from "@/utils/formatters";
import { addDecimal } from "@/utils/decimal";
import { useNotificationStore } from "@/stores/notification";

const route = useRoute();
const router = useRouter();
const notification = useNotificationStore();
const loading = ref(true);
const busy = ref(false);
const error = ref("");
const workspaces = ref([]);
const workspace = ref(null);
const accounts = ref([]);
const invitations = ref([]);
const inviteLink = ref("");
const inviteEmailSent = ref(false);
const actionModalOpen = ref(false);
const activeAction = ref("");
const deletion = ref(null);
const workspaceForm = ref({ name: "" });
const inviteForm = ref({ email: "" });
const contributionForm = ref({ source_account_id: "", amount: "", entry_date: localDate(), note: "" });
const goalForm = ref({ name: "", target_amount: "", target_date: "" });
const goalAllocationForm = ref({ goal_id: "", action: "allocate", amount: "", allocation_date: localDate(), note: "" });
const assetForm = ref({ name: "Emas bersama", provider: "" });
const selectedAssetId = ref(null);
const transactionForm = ref({ action: "purchase", amount: "", quantity: "", fees: "0", unit_price: "", transaction_date: localDate(), note: "" });
const withdrawalForm = ref({ destination_account_id: "", amount: "", entry_date: localDate(), note: "" });
const selectedAsset = computed(() => workspace.value?.assets?.find((asset) => Number(asset.id) === Number(selectedAssetId.value)) || null);
const myCashBalance = computed(() => workspace.value?.members?.find((member) => Number(member.id) === Number(workspace.value?.current_user_id))?.cash_available || "0.00");
const selectedGoal = computed(() => workspace.value?.goals?.find((goal) => Number(goal.id) === Number(goalAllocationForm.value.goal_id)) || null);
const myGoalAllocation = computed(() => selectedGoal.value?.allocations?.find((row) => Number(row.user_id) === Number(workspace.value?.current_user_id))?.amount || "0.00");
const maxGoalAllocation = computed(() => goalAllocationForm.value.action === "allocate" ? myCashBalance.value : myGoalAllocation.value);
const totalCashAvailable = computed(() => (workspace.value?.members || []).reduce((total, member) => addDecimal(total, member.cash_available || "0.00"), "0.00"));
const availableAccounts = computed(() => accounts.value.filter((account) => !account.is_archived && ["cash", "bank", "ewallet"].includes(account.type)));
const totalHoldingsValue = computed(() => (workspace.value?.assets || []).reduce((total, asset) => addDecimal(total, asset.estimated_value || "0.00"), "0.00"));
const totalBasis = computed(() => (workspace.value?.assets || []).reduce((total, asset) => addDecimal(total, asset.cost_basis || "0.00"), "0.00"));

const actionTitles = {
  workspace: "Buat ruang bersama",
  "workspace-edit": "Ubah nama ruang",
  invite: "Undang anggota",
  contribution: "Setor ke kas bersama",
  withdrawal: "Tarik kas bersama",
  goal: "Buat target bersama",
  "goal-edit": "Ubah target bersama",
  allocation: "Cadangkan kas untuk target",
  asset: "Tambah aset emas",
  "asset-edit": "Ubah aset bersama",
  purchase: "Catat pembelian emas",
  sale: "Catat penjualan emas",
  valuation: "Perbarui valuasi emas",
};

function openActionMenu() {
  activeAction.value = "";
  actionModalOpen.value = true;
}
function openAction(action, context = {}) {
  activeAction.value = action;
  actionModalOpen.value = true;
  if (action === "allocation") {
    goalAllocationForm.value = {
      goal_id: context.goalId || workspace.value?.goals?.[0]?.id || "",
      action: "allocate",
      amount: "",
      allocation_date: localDate(),
      note: "",
    };
  }
  if (action === "workspace-edit" && workspace.value) {
    workspaceForm.value = { name: workspace.value.name };
  }
  if (action === "goal-edit" && context.goal) {
    goalForm.value = { id: context.goal.id, name: context.goal.name, target_amount: context.goal.target_amount, target_date: context.goal.target_date || "" };
  }
  if (action === "asset-edit" && context.asset) {
    assetForm.value = { name: context.asset.name, provider: context.asset.provider || "" };
    selectedAssetId.value = context.asset.id;
  }
  if (context.assetId) selectedAssetId.value = context.assetId;
  if (["purchase", "sale", "valuation"].includes(action)) {
    transactionForm.value = {
      action,
      amount: "",
      quantity: "",
      fees: "0",
      unit_price: "",
      transaction_date: localDate(),
      note: "",
    };
  }
}
function closeAction() {
  actionModalOpen.value = false;
  activeAction.value = "";
}
function requestDelete(type, item) {
  actionModalOpen.value = false;
  activeAction.value = "";
  deletion.value = { type, id: item.id, name: item.name };
}
async function performDelete() {
  if (!workspace.value || !deletion.value || busy.value) return;
  busy.value = true;
  const workspaceId = workspace.value.id;
  const currentDeletion = deletion.value;
  try {
    if (currentDeletion.type === "workspace") {
      await api.delete(`/api/shared-workspaces/${workspaceId}`);
      deletion.value = null;
      workspace.value = null;
      selectedAssetId.value = null;
      await router.replace({ path: "/kolaborasi" });
      await load();
      notification.notify({ message: "Ruang bersama berhasil dihapus.", type: "success" });
      return;
    }
    const endpoint = currentDeletion.type === "asset"
      ? `/api/shared-workspaces/${workspaceId}/assets/${currentDeletion.id}`
      : `/api/shared-workspaces/${workspaceId}/goals/${currentDeletion.id}`;
    const { data } = await api.delete(endpoint);
    workspace.value = data.data;
    if (currentDeletion.type === "asset") {
      selectedAssetId.value = workspace.value.assets[0]?.id || null;
      notification.notify({ message: "Aset bersama dan riwayatnya berhasil dihapus.", type: "success" });
    } else {
      goalAllocationForm.value.goal_id = workspace.value.goals[0]?.id || "";
      notification.notify({ message: "Target bersama berhasil dihapus.", type: "success" });
    }
    deletion.value = null;
  } catch (err) {
    fail(err, "Data bersama gagal dihapus.");
  } finally {
    busy.value = false;
  }
}

function newKey() {
  return window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
function formatError(err, fallback) {
  return err.response?.data?.message || Object.values(err.response?.data?.errors || {})[0]?.[0] || fallback;
}
function fail(err, fallback) {
  notification.notify({ message: formatError(err, fallback), type: "error" });
}
async function loadWorkspace(id) {
  if (!id) { workspace.value = null; return; }
  const { data } = await api.get(`/api/shared-workspaces/${id}`);
  workspace.value = data.data;
  selectedAssetId.value = selectedAssetId.value && workspace.value.assets.some((item) => Number(item.id) === Number(selectedAssetId.value))
    ? selectedAssetId.value : workspace.value.assets[0]?.id || null;
}
async function load() {
  loading.value = true;
  error.value = "";
  try {
    const [workspaceRes, accountRes, invitationRes] = await Promise.all([
      api.get("/api/shared-workspaces"), api.get("/api/accounts"), api.get("/api/shared-workspaces/invitations/pending"),
    ]);
    workspaces.value = workspaceRes.data.data || [];
    accounts.value = accountRes.data.data || [];
    invitations.value = invitationRes.data.data || [];
    const selectedId = route.query.workspace || workspace.value?.id || workspaces.value[0]?.id;
    workspace.value = workspaces.value.find((item) => Number(item.id) === Number(selectedId)) || null;
    if (workspace.value) await loadWorkspace(workspace.value.id);
  } catch (err) {
    error.value = formatError(err, "Ruang bersama gagal dimuat.");
  } finally {
    loading.value = false;
  }
}
async function createWorkspace() {
  if (!workspaceForm.value.name.trim() || busy.value) return;
  busy.value = true;
  try {
    const { data } = await api.post("/api/shared-workspaces", workspaceForm.value);
    workspaceForm.value.name = "";
    await load();
    await selectWorkspace(data.data.id);
    closeAction();
    notification.notify({ message: "Ruang keuangan bersama berhasil dibuat.", type: "success" });
  } catch (err) { fail(err, "Ruang bersama gagal dibuat."); }
  finally { busy.value = false; }
}
async function updateWorkspace() {
  if (!workspace.value || !workspaceForm.value.name.trim() || busy.value) return;
  busy.value = true;
  try {
    const { data } = await api.put(`/api/shared-workspaces/${workspace.value.id}`, workspaceForm.value);
    workspace.value = data.data;
    workspaces.value = workspaces.value.map((item) => Number(item.id) === Number(workspace.value.id) ? { ...item, name: workspace.value.name } : item);
    closeAction();
    notification.notify({ message: "Nama ruang berhasil diperbarui.", type: "success" });
  } catch (err) { fail(err, "Nama ruang gagal diperbarui."); }
  finally { busy.value = false; }
}
async function selectWorkspace(id) {
  workspace.value = workspaces.value.find((item) => Number(item.id) === Number(id)) || workspace.value;
  selectedAssetId.value = null;
  await loadWorkspace(id);
  router.replace({ path: "/kolaborasi", query: { workspace: id } });
}
async function acceptInvitation(invitationToken) {
  if (busy.value) return;
  busy.value = true;
  try {
    const { data } = await api.post("/api/shared-workspaces/invitations/accept", { token: invitationToken });
    await router.replace({ path: "/kolaborasi", query: { workspace: data.data.id } });
    await load();
    notification.notify({ message: `Anda bergabung ke ruang ${data.data.name}.`, type: "success" });
  } catch (err) { fail(err, "Undangan tidak dapat diterima."); }
  finally { busy.value = false; }
}
async function acceptPendingInvitation(invitationId) {
  if (busy.value) return;
  busy.value = true;
  try {
    const { data } = await api.post(`/api/shared-workspaces/invitations/${invitationId}/accept`);
    await router.replace({ path: "/kolaborasi", query: { workspace: data.data.id } });
    await load();
    notification.notify({ message: `Anda bergabung ke ruang ${data.data.name}.`, type: "success" });
  } catch (err) { fail(err, "Undangan tidak dapat diterima."); }
  finally { busy.value = false; }
}
async function sendInvite() {
  if (!workspace.value || busy.value || !inviteForm.value.email) return;
  busy.value = true;
  try {
    const { data } = await api.post(`/api/shared-workspaces/${workspace.value.id}/invitations`, inviteForm.value);
    inviteLink.value = data.data.invite_url;
    inviteEmailSent.value = data.data.email_sent;
    inviteForm.value.email = "";
    await loadWorkspace(workspace.value.id);
    notification.notify({ message: data.data.email_sent ? "Undangan berhasil dikirim." : "Undangan dibuat, tetapi email gagal dikirim. Salin tautan untuk dibagikan.", type: data.data.email_sent ? "success" : "error" });
    closeAction();
  } catch (err) { fail(err, "Undangan gagal dibuat."); }
  finally { busy.value = false; }
}
async function revokeInvite(invitation) {
  if (!workspace.value || !window.confirm(`Batalkan undangan untuk ${invitation.email}?`)) return;
  busy.value = true;
  try {
    await api.delete(`/api/shared-workspaces/${workspace.value.id}/invitations/${invitation.id}`);
    await loadWorkspace(workspace.value.id);
    notification.notify({ message: "Undangan berhasil dibatalkan.", type: "success" });
  } catch (err) { fail(err, "Undangan gagal dibatalkan."); }
  finally { busy.value = false; }
}
async function copyInvite() {
  try { await navigator.clipboard.writeText(inviteLink.value); notification.notify({ message: "Tautan undangan disalin.", type: "success" }); }
  catch { notification.notify({ message: inviteLink.value, type: "info" }); }
}
async function contribute() {
  if (!workspace.value || busy.value) return;
  busy.value = true;
  try {
    await api.post(`/api/shared-workspaces/${workspace.value.id}/contributions`, { ...contributionForm.value, idempotency_key: newKey() });
    contributionForm.value = { source_account_id: "", amount: "", entry_date: localDate(), note: "" };
    await load();
    notification.notify({ message: "Setoran Anda tercatat di kas bersama.", type: "success" });
    closeAction();
  } catch (err) { fail(err, "Setoran gagal dicatat."); }
  finally { busy.value = false; }
}
async function createGoal() {
  if (!workspace.value || busy.value) return;
  busy.value = true;
  try {
    await api.post(`/api/shared-workspaces/${workspace.value.id}/goals`, goalForm.value);
    goalForm.value = { name: "", target_amount: "", target_date: "" };
    await loadWorkspace(workspace.value.id);
    notification.notify({ message: "Target bersama berhasil dibuat.", type: "success" });
    closeAction();
  } catch (err) { fail(err, "Target bersama gagal dibuat."); }
  finally { busy.value = false; }
}
async function updateGoal() {
  if (!workspace.value || !goalForm.value.id || busy.value) return;
  busy.value = true;
  try {
    const { data } = await api.put(`/api/shared-workspaces/${workspace.value.id}/goals/${goalForm.value.id}`, goalForm.value);
    workspace.value = data.data;
    closeAction();
    notification.notify({ message: "Target bersama berhasil diperbarui.", type: "success" });
  } catch (err) { fail(err, "Target bersama gagal diperbarui."); }
  finally { busy.value = false; }
}
async function allocateGoal() {
  if (!workspace.value || !goalAllocationForm.value.goal_id || busy.value) return;
  busy.value = true;
  try {
    await api.post(`/api/shared-workspaces/${workspace.value.id}/goals/${goalAllocationForm.value.goal_id}/allocations`, {
      ...goalAllocationForm.value, idempotency_key: newKey(),
    });
    goalAllocationForm.value = { ...goalAllocationForm.value, amount: "", note: "" };
    await loadWorkspace(workspace.value.id);
    notification.notify({ message: goalAllocationForm.value.action === "allocate" ? "Kas berhasil dicadangkan untuk target." : "Cadangan kas berhasil dilepas.", type: "success" });
    closeAction();
  } catch (err) { fail(err, "Alokasi target gagal disimpan."); }
  finally { busy.value = false; }
}
async function createAsset() {
  if (!workspace.value || busy.value) return;
  busy.value = true;
  try {
    const { data } = await api.post(`/api/shared-workspaces/${workspace.value.id}/assets`, assetForm.value);
    await loadWorkspace(workspace.value.id);
    selectedAssetId.value = data.data.assets[data.data.assets.length - 1]?.id || null;
    notification.notify({ message: "Aset bersama berhasil ditambahkan.", type: "success" });
    closeAction();
  } catch (err) { fail(err, "Aset bersama gagal dibuat."); }
  finally { busy.value = false; }
}
async function updateAsset() {
  if (!workspace.value || !selectedAsset.value || busy.value) return;
  busy.value = true;
  try {
    const { data } = await api.put(`/api/shared-workspaces/${workspace.value.id}/assets/${selectedAsset.value.id}`, assetForm.value);
    workspace.value = data.data;
    closeAction();
    notification.notify({ message: "Aset bersama berhasil diperbarui.", type: "success" });
  } catch (err) { fail(err, "Aset bersama gagal diperbarui."); }
  finally { busy.value = false; }
}
async function transactAsset() {
  if (!workspace.value || !selectedAsset.value || busy.value) return;
  busy.value = true;
  try {
    const payload = { ...transactionForm.value, idempotency_key: newKey() };
    if (payload.action === "valuation") { payload.amount = undefined; payload.quantity = undefined; payload.fees = undefined; }
    const { data } = await api.post(`/api/shared-workspaces/${workspace.value.id}/assets/${selectedAsset.value.id}/transactions`, payload);
    workspace.value = data.data;
    transactionForm.value = { ...transactionForm.value, amount: "", quantity: "", fees: "0", unit_price: "", note: "" };
    notification.notify({ message: transactionForm.value.action === "valuation" ? "Valuasi aset diperbarui." : "Transaksi aset bersama dicatat.", type: "success" });
    closeAction();
  } catch (err) { fail(err, "Transaksi aset gagal dicatat."); }
  finally { busy.value = false; }
}
async function withdraw() {
  if (!workspace.value || busy.value) return;
  busy.value = true;
  try {
    await api.post(`/api/shared-workspaces/${workspace.value.id}/withdrawals`, { ...withdrawalForm.value, idempotency_key: newKey() });
    withdrawalForm.value = { destination_account_id: "", amount: "", entry_date: localDate(), note: "" };
    await load();
    notification.notify({ message: "Penarikan dari kas bersama berhasil dicatat.", type: "success" });
    closeAction();
  } catch (err) { fail(err, "Penarikan gagal dicatat."); }
  finally { busy.value = false; }
}
async function removeMember(member) {
  if (!workspace.value || !window.confirm(`Keluarkan ${member.name} dari ruang bersama?`)) return;
  busy.value = true;
  try {
    await api.delete(`/api/shared-workspaces/${workspace.value.id}/members/${member.id}`);
    await loadWorkspace(workspace.value.id);
    notification.notify({ message: "Anggota berhasil dikeluarkan.", type: "success" });
  } catch (err) { fail(err, "Anggota belum dapat dikeluarkan. Pastikan saldo dan porsi asetnya sudah diselesaikan."); }
  finally { busy.value = false; }
}
onMounted(async () => {
  if (route.query.invite) await acceptInvitation(String(route.query.invite));
  await load();
});
watch(() => route.query.workspace, async (id) => { if (id && !loading.value) await loadWorkspace(id); });
</script>

<template>
  <main class="app-page space-y-6 pb-8">
    <header class="financial-page-header workspace-page-header">
      <div class="financial-page-title">
        <p class="eyebrow">Ruang kolaborasi</p>
        <h1>Keuangan bersama</h1>
        <p class="text-sm text-ink-500">Kelola setoran, pembelian, dan porsi aset bersama tanpa membuka ledger pribadi.</p>
      </div>
      <div class="workspace-header-actions">
        <label v-if="workspaces.length" class="financial-field workspace-picker">Pilih ruang
          <select :value="workspace?.id || ''" @change="selectWorkspace(Number($event.target.value))">
            <option v-for="item in workspaces" :key="item.id" :value="item.id">{{ item.name }}</option>
          </select>
        </label>
        <button v-if="!loading && !error" class="primary-button workspace-action-trigger" @click="openActionMenu">
          <Plus class="h-4 w-4" /> {{ workspace ? 'Tambah aktivitas' : 'Buat ruang' }}
        </button>
      </div>
    </header>

    <section v-if="loading" class="surface-card p-8 text-center text-sm text-ink-500">Memuat ruang bersama…</section>
    <section v-else-if="error" class="surface-card p-6">
      <p class="text-sm text-expense-600">{{ error }}</p><button class="secondary-button mt-3" @click="load"><RefreshCw class="h-4 w-4" /> Coba lagi</button>
    </section>

    <template v-else>
      <section v-if="invitations.length" class="surface-card p-5 sm:p-6">
        <div class="flex items-start gap-3"><span class="workspace-icon"><UsersRound /></span><div><h2 class="font-bold">Undangan untuk Anda</h2><p class="mt-1 text-sm text-ink-500">Undangan hanya berlaku untuk akun dengan alamat email penerima.</p></div></div>
        <article v-for="invite in invitations" :key="invite.id" class="mt-4 flex flex-col gap-3 rounded-2xl border border-line-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div><b>{{ invite.workspace_name }}</b><p class="text-sm text-ink-500">Diundang oleh {{ invite.invited_by_name }} · berlaku sampai {{ invite.expires_at.slice(0, 10) }}</p></div>
          <button class="primary-button" :disabled="busy" @click="acceptPendingInvitation(invite.id)">Terima undangan</button>
        </article>
      </section>

      <section v-if="!workspaces.length" class="workspace-empty surface-card p-6 sm:p-10">
        <span class="workspace-icon workspace-icon-large"><UsersRound /></span>
        <p class="eyebrow mt-4">Ruang baru</p><h2 class="mt-2 text-2xl font-bold">Mulai mengelola keuangan bersama</h2>
        <p class="mx-auto mt-2 max-w-xl text-sm text-ink-500">Buat ruang privat untuk orang yang Anda undang. Setoran mengurangi rekening penyetor dan tercatat di kas bersama; aset dibagi menurut kontribusi.</p>
        <button class="primary-button mx-auto mt-6" @click="openAction('workspace')"><Plus class="h-4 w-4" /> Buat ruang pertama</button>
      </section>

      <template v-if="workspace">
        <section class="workspace-overview-grid">
          <article class="surface-card workspace-overview-primary"><p>Kas bersama</p><b>{{ formatRupiah(workspace.cash_balance) }}</b><small>Termasuk cadangan target · kas bebas {{ formatRupiah(totalCashAvailable) }}</small></article>
          <article class="surface-card"><p>Nilai aset bersama</p><b>{{ formatRupiah(totalHoldingsValue) }}</b><small>Nilai mengikuti harga yang terakhir dicatat</small></article>
          <article class="surface-card"><p>Modal tercatat</p><b>{{ formatRupiah(totalBasis) }}</b><small>Modal dibagi berdasarkan setoran anggota</small></article>
          <article class="surface-card"><p>Anggota</p><b>{{ workspace.members.length }}</b><small>{{ workspace.name }}</small></article>
        </section>

        <div v-if="workspace.is_owner" class="flex justify-end">
          <button class="secondary-button" @click="openAction('workspace-edit')"><Pencil class="h-4 w-4" /> Ubah nama ruang</button>
        </div>

        <section class="workspace-content-grid">
          <article class="surface-card workspace-panel p-5 sm:p-6">
            <div class="workspace-section-heading"><div><h2 class="text-lg font-bold">Anggota dan porsi kas</h2><p class="mt-1 text-sm text-ink-500">Kas anggota menunjukkan hak atas dana bersama yang belum dibelikan aset.</p></div><span class="workspace-icon"><UsersRound /></span></div>
            <div class="mt-4 divide-y divide-line-200">
              <div v-for="member in workspace.members" :key="member.id" class="flex items-center gap-3 py-3">
                <span class="workspace-avatar">{{ member.name?.charAt(0)?.toUpperCase() || "A" }}</span>
                <div class="min-w-0 flex-1"><b>{{ member.name }} <span v-if="member.role === 'owner'" class="workspace-role">Pemilik</span></b><p class="text-xs text-ink-500">Kas bebas {{ formatRupiah(member.cash_available) }} · dicadangkan {{ formatRupiah(member.cash_reserved) }}</p></div>
                <strong class="whitespace-nowrap text-sm sm:text-base">{{ formatRupiah(member.cash_balance) }}</strong>
                <button v-if="workspace.is_owner && member.role !== 'owner' && Number(member.cash_balance) === 0 && !workspace.assets.some(asset => asset.holdings.some(holding => Number(holding.user_id) === Number(member.id) && Number(holding.quantity) > 0))" class="workspace-remove-member" :disabled="busy" :aria-label="`Keluarkan ${member.name}`" @click="removeMember(member)">×</button>
              </div>
            </div>
            <div class="workspace-inline-actions">
              <button class="secondary-button" @click="openAction('contribution')"><ArrowDownLeft class="h-4 w-4" /> Setor</button>
              <button class="secondary-button" :disabled="Number(myCashBalance) <= 0" @click="openAction('withdrawal')"><ArrowUpRight class="h-4 w-4" /> Tarik</button>
              <button v-if="workspace.can_invite" class="secondary-button" @click="openAction('invite')"><UsersRound class="h-4 w-4" /> Undang</button>
            </div>
            <div v-if="workspace.pending_invitations?.length" class="mt-4 border-t border-line-200 pt-3"><p class="text-xs font-semibold text-ink-500">Undangan menunggu</p><div v-for="invite in workspace.pending_invitations" :key="invite.id" class="mt-2 flex items-center justify-between gap-3 rounded-xl bg-base-50 p-3"><span class="min-w-0 break-all text-xs">{{ invite.email }}<small class="block text-ink-500">Berlaku sampai {{ invite.expires_at.slice(0, 10) }}</small></span><button class="secondary-button !min-h-10 !px-3 !py-1 text-xs" :disabled="busy" @click="revokeInvite(invite)">Batalkan</button></div></div>
            <div v-if="inviteLink" class="mt-4 rounded-xl border border-line-200 bg-base-50 p-3"><p class="text-sm font-semibold">{{ inviteEmailSent ? 'Email undangan terkirim' : 'Email belum terkirim' }}</p><p class="mt-1 break-all text-xs text-ink-500">{{ inviteLink }}</p><button class="secondary-button mt-2 w-full" @click="copyInvite">Salin tautan undangan</button></div>
          </article>

          <article class="surface-card workspace-panel p-5 sm:p-6">
            <div class="workspace-section-heading"><div><h2 class="text-lg font-bold">Target bersama</h2><p class="mt-1 text-sm text-ink-500">Cadangan target tetap bagian dari kas, tetapi tidak ikut dipakai untuk beli aset atau ditarik.</p></div><span class="workspace-icon"><span class="text-xl">◎</span></span></div>
            <div v-if="workspace.goals?.length" class="mt-4 space-y-3">
              <section v-for="goal in workspace.goals" :key="goal.id" class="rounded-2xl border border-line-200 p-4">
                <div class="flex items-start justify-between gap-3"><div><b>{{ goal.name }}</b><small v-if="goal.target_date" class="block text-ink-500">Target {{ goal.target_date }}</small></div><b class="whitespace-nowrap text-sm">{{ goal.progress_percent }}%</b></div>
                <div class="mt-3 h-2 overflow-hidden rounded-full bg-base-100"><div class="h-full rounded-full bg-primary-600" :style="{ width: `${goal.progress_percent}%` }" /></div>
                <p class="mt-2 text-xs text-ink-500">{{ formatRupiah(goal.funded_amount) }} dari {{ formatRupiah(goal.target_amount) }} · kurang {{ formatRupiah(goal.remaining_amount) }}</p>
                <div class="mt-2 flex flex-wrap gap-2"><span v-for="part in goal.allocations" :key="part.user_id" class="workspace-role">{{ part.name }} {{ formatRupiah(part.amount) }}</span></div>
                <button class="secondary-button mt-3 w-full sm:w-auto" @click="openAction('allocation', { goalId: goal.id })">Atur cadangan kas</button>
                <button v-if="workspace.is_owner" class="secondary-button mt-3 w-full sm:ml-2 sm:w-auto" @click="openAction('goal-edit', { goal })"><Pencil class="h-4 w-4" /> Ubah target</button>
                <button v-if="workspace.is_owner" class="workspace-delete-button mt-3 w-full sm:ml-2 sm:w-auto" :disabled="Number(goal.funded_amount) !== 0" @click="requestDelete('goal', goal)"><Trash2 class="h-4 w-4" /> {{ Number(goal.funded_amount) === 0 ? 'Hapus target' : 'Lepas cadangan dahulu' }}</button>
              </section>
            </div>
            <div v-else class="workspace-empty-state mt-4">Belum ada target bersama.</div>
            <div class="workspace-inline-actions">
              <button class="primary-button" @click="openAction('goal')"><Plus class="h-4 w-4" /> Buat target</button>
              <button v-if="workspace.goals?.length" class="secondary-button" @click="openAction('allocation')">Cadangkan kas</button>
            </div>
          </article>

          <article class="surface-card workspace-panel workspace-panel-wide p-5 sm:p-6">
            <div class="workspace-section-heading"><div><h2 class="text-lg font-bold">Aset bersama</h2><p class="mt-1 text-sm text-ink-500">Nilai dan kepemilikan emas dihitung dari gram aktual serta kontribusi pembelian setiap anggota.</p></div><button class="secondary-button" @click="openAction('asset')"><Plus class="h-4 w-4" /> Tambah emas</button></div>
            <div v-if="!workspace.assets.length" class="workspace-empty-state mt-4">Belum ada aset bersama. Tambahkan aset untuk mulai mencatat pembelian.</div>
            <div v-else class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <button v-for="asset in workspace.assets" :key="asset.id" class="shared-asset-card text-left" :class="{ 'is-selected': Number(selectedAssetId) === Number(asset.id) }" @click="selectedAssetId = asset.id">
                <div class="flex items-center justify-between gap-2"><span class="workspace-icon"><Coins /></span><span class="workspace-type-pill">Emas digital</span></div>
                <b class="mt-3 block">{{ asset.name }}</b><small class="text-ink-500">{{ asset.provider || 'Penyedia belum diisi' }}</small>
                <div class="mt-4 flex justify-between gap-2 text-sm"><span>{{ formatQuantity(asset.quantity) }} gram</span><strong>{{ asset.estimated_value === null ? 'Belum dinilai' : formatRupiah(asset.estimated_value) }}</strong></div>
                <p v-if="asset.profit_loss !== null" class="mt-1 text-xs" :class="Number(asset.profit_loss) >= 0 ? 'text-income-600' : 'text-expense-600'">{{ Number(asset.profit_loss) >= 0 ? 'Untung' : 'Rugi' }} {{ formatRupiah(Math.abs(Number(asset.profit_loss))) }}</p>
              </button>
            </div>
            <div v-if="selectedAsset" class="mt-5 rounded-2xl border border-line-200 p-4 sm:p-5">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h3 class="font-bold">{{ selectedAsset.name }} · pembagian kepemilikan</h3><p class="mt-1 text-sm text-ink-500">Unit emas dibagi berdasarkan dana tiap anggota pada pembelian.</p></div><div class="flex flex-wrap gap-2"><button v-if="workspace.is_owner" class="secondary-button" @click="openAction('asset-edit', { asset: selectedAsset })"><Pencil class="h-4 w-4" /> Ubah aset</button><button class="secondary-button" @click="openAction('purchase', { assetId: selectedAsset.id })"><Plus class="h-4 w-4" /> Catat transaksi</button></div></div>
              <div class="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                <div v-for="holding in selectedAsset.holdings" :key="holding.user_id" class="flex justify-between gap-3 rounded-xl bg-base-50 p-3 text-sm"><span>{{ holding.name }}<small class="block text-ink-500">Modal {{ formatRupiah(holding.cost_basis) }}<template v-if="holding.estimated_value !== null"> · Nilai {{ formatRupiah(holding.estimated_value) }}</template></small></span><b class="whitespace-nowrap">{{ formatQuantity(holding.quantity) }} g</b></div>
              </div>
              <div class="mt-3 flex flex-wrap gap-2"><button class="secondary-button" @click="openAction('sale', { assetId: selectedAsset.id })">Catat penjualan</button><button class="secondary-button" @click="openAction('valuation', { assetId: selectedAsset.id })">Perbarui harga</button></div>
              <div v-if="selectedAsset.transactions?.length" class="mt-5 border-t border-line-200 pt-4"><h4 class="text-sm font-bold">Riwayat aset</h4><div v-for="tx in selectedAsset.transactions.slice(0,8)" :key="tx.id" class="mt-2 flex flex-wrap justify-between gap-2 text-xs text-ink-500"><span>{{ tx.transaction_date }} · {{ tx.action === 'purchase' ? 'Beli' : tx.action === 'sale' ? 'Jual' : 'Valuasi' }}<template v-if="tx.action !== 'valuation'"> · {{ formatQuantity(tx.quantity) }} gram</template></span><b>{{ tx.action === 'valuation' ? `${formatRupiah(tx.unit_price)} / gram` : formatRupiah(tx.amount) }}</b></div></div>
              <div v-if="workspace.is_owner" class="workspace-danger-zone mt-5"><p v-if="Number(selectedAsset.quantity) > 0" class="text-xs text-ink-500">Aset masih memiliki {{ formatQuantity(selectedAsset.quantity) }} gram. Jual seluruh kepemilikan sebelum menghapusnya.</p><button class="workspace-delete-button" :disabled="Number(selectedAsset.quantity) > 0" @click="requestDelete('asset', selectedAsset)"><Trash2 class="h-4 w-4" /> Hapus aset bersama</button></div>
            </div>
          </article>

          <article class="surface-card workspace-panel workspace-panel-wide p-5 sm:p-6">
            <div class="workspace-section-heading"><div><h2 class="text-lg font-bold">Aktivitas kas bersama</h2><p class="mt-1 text-sm text-ink-500">Riwayat setoran, pembelian aset, hasil penjualan, dan penarikan.</p></div><span class="workspace-icon"><ArrowDownLeft /></span></div>
            <div v-if="!workspace.cash_entries?.length" class="workspace-empty-state mt-4">Belum ada aktivitas kas.</div>
            <div v-else class="mt-3 divide-y divide-line-200 sm:grid sm:grid-cols-2 sm:gap-x-8 sm:divide-y-0"><div v-for="entry in workspace.cash_entries.slice(0,10)" :key="entry.id" class="flex items-start gap-3 py-3 sm:border-b sm:border-line-200"><span class="workspace-mini-icon"><ArrowDownLeft v-if="entry.direction === 'in'" /><ArrowUpRight v-else /></span><div class="min-w-0 flex-1"><b class="block text-sm">{{ entry.type === 'contribution' ? `Setoran · ${entry.member_name}` : entry.type === 'asset_purchase' ? 'Pembelian aset' : entry.type === 'asset_sale' ? 'Hasil penjualan aset' : `Penarikan · ${entry.member_name}` }}</b><small class="text-ink-500">{{ entry.entry_date }}<template v-if="entry.note"> · {{ entry.note }}</template></small></div><strong class="whitespace-nowrap text-sm">{{ entry.direction === 'in' ? '+' : '−' }}{{ formatRupiah(entry.amount) }}</strong></div></div>
          </article>
        </section>
      </template>
    </template>

    <div v-if="actionModalOpen" v-dialog="closeAction" class="workspace-modal-backdrop" @click.self="closeAction">
      <section class="workspace-action-sheet" role="dialog" aria-modal="true" :aria-label="activeAction ? actionTitles[activeAction] : 'Pilih aktivitas'">
        <header class="workspace-modal-header">
          <button v-if="activeAction && workspace" class="workspace-back-button" type="button" aria-label="Kembali ke daftar aktivitas" @click="activeAction = ''">‹</button>
          <div class="min-w-0 flex-1"><p class="eyebrow">{{ activeAction ? 'Formulir' : 'Aksi ruang' }}</p><h2 class="truncate text-xl font-bold">{{ activeAction ? actionTitles[activeAction] : 'Apa yang ingin dilakukan?' }}</h2></div>
          <button class="workspace-close-button" type="button" aria-label="Tutup" @click="closeAction">×</button>
        </header>

        <div v-if="!activeAction" class="workspace-action-menu">
          <p class="mb-4 text-sm text-ink-500">Pilih satu aktivitas. Form hanya akan muncul setelah dipilih.</p>
          <div class="workspace-action-grid">
            <button v-if="!workspace" class="workspace-action-option" @click="openAction('workspace')"><span class="workspace-icon"><Plus /></span><span><b>Buat ruang</b><small>Mulai ruang keuangan bersama</small></span></button>
            <template v-else>
              <button class="workspace-action-option" @click="openAction('contribution')"><span class="workspace-icon"><ArrowDownLeft /></span><span><b>Setor kas</b><small>Tambah porsi kas Anda</small></span></button>
              <button class="workspace-action-option" :disabled="Number(myCashBalance) <= 0" @click="openAction('withdrawal')"><span class="workspace-icon"><ArrowUpRight /></span><span><b>Tarik kas</b><small>Ke rekening pribadi</small></span></button>
              <button class="workspace-action-option" @click="openAction('goal')"><span class="workspace-icon"><span class="text-xl">◎</span></span><span><b>Buat target</b><small>Rencanakan kebutuhan bersama</small></span></button>
              <button v-if="workspace.goals?.length" class="workspace-action-option" @click="openAction('allocation')"><span class="workspace-icon"><span class="text-xl">◉</span></span><span><b>Cadangkan kas</b><small>Alokasikan ke target</small></span></button>
              <button class="workspace-action-option" @click="openAction('asset')"><span class="workspace-icon"><Coins /></span><span><b>Tambah emas</b><small>Daftarkan aset bersama</small></span></button>
              <button v-if="selectedAsset" class="workspace-action-option" @click="openAction('purchase')"><span class="workspace-icon"><Plus /></span><span><b>Transaksi emas</b><small>Pembelian {{ selectedAsset.name }}</small></span></button>
              <button v-if="workspace.can_invite" class="workspace-action-option" @click="openAction('invite')"><span class="workspace-icon"><UsersRound /></span><span><b>Undang anggota</b><small>Tambahkan anggota lewat email</small></span></button>
              <button class="workspace-action-option" @click="openAction('workspace')"><span class="workspace-icon"><Plus /></span><span><b>Buat ruang lain</b><small>Pisahkan tujuan bersama</small></span></button>
              <button v-if="workspace.is_owner" class="workspace-action-option workspace-danger-option" @click="requestDelete('workspace', workspace)"><span class="workspace-icon"><Trash2 /></span><span><b>Hapus ruang ini</b><small>Hapus ruang dan seluruh data kolaborasinya</small></span></button>
            </template>
          </div>
        </div>

        <form v-else-if="['workspace', 'workspace-edit'].includes(activeAction)" class="workspace-modal-form" @submit.prevent="activeAction === 'workspace-edit' ? updateWorkspace() : createWorkspace()"><p class="text-sm text-ink-500">{{ activeAction === 'workspace-edit' ? 'Perbarui nama ruang yang terlihat oleh seluruh anggota.' : 'Ruang privat untuk mengelola kas, target, dan aset bersama.' }}</p><label class="financial-field">Nama ruang<input v-model="workspaceForm.name" required placeholder="Contoh: Emas Bareng" /></label><button class="primary-button w-full" :disabled="busy"><Pencil v-if="activeAction === 'workspace-edit'" class="h-4 w-4" /><Plus v-else class="h-4 w-4" /> {{ activeAction === 'workspace-edit' ? 'Simpan perubahan' : 'Buat ruang' }}</button></form>

        <form v-else-if="activeAction === 'invite'" class="workspace-modal-form" @submit.prevent="sendInvite"><p class="text-sm text-ink-500">Penerima harus masuk dengan alamat email yang sama dengan undangan.</p><label class="financial-field">Email anggota<input v-model="inviteForm.email" type="email" autocomplete="email" placeholder="nama@email.com" required /></label><button class="primary-button w-full" :disabled="busy">Kirim undangan</button></form>

        <form v-else-if="activeAction === 'contribution'" class="workspace-modal-form" @submit.prevent="contribute"><p class="text-sm text-ink-500">Setoran mengurangi saldo rekening pribadi dan menambah porsi kas Anda di ruang ini.</p><label class="financial-field">Rekening pribadi<select v-model="contributionForm.source_account_id" required><option value="" disabled>-- Pilih rekening --</option><option v-for="account in availableAccounts" :key="account.id" :value="account.id">{{ account.name }} · {{ formatRupiah(account.balance) }}</option></select></label><label class="financial-field">Nominal setoran<MoneyInput v-model="contributionForm.amount" min="1" step="1" placeholder="Contoh: 500.000" required /></label><label class="financial-field">Tanggal<input v-model="contributionForm.entry_date" type="date" required /></label><label class="financial-field">Catatan (opsional)<input v-model="contributionForm.note" placeholder="Contoh: Setoran emas bulan ini" /></label><button class="primary-button w-full" :disabled="busy">Catat setoran</button></form>

        <form v-else-if="activeAction === 'withdrawal'" class="workspace-modal-form" @submit.prevent="withdraw"><p class="text-sm text-ink-500">Penarikan dibatasi oleh saldo kas bebas Anda: <b>{{ formatRupiah(myCashBalance) }}</b>.</p><label class="financial-field">Rekening tujuan<select v-model="withdrawalForm.destination_account_id" required><option value="" disabled>-- Pilih rekening --</option><option v-for="account in availableAccounts" :key="account.id" :value="account.id">{{ account.name }}</option></select></label><label class="financial-field">Nominal penarikan<MoneyInput v-model="withdrawalForm.amount" min="1" step="1" :max="myCashBalance" placeholder="Nominal rupiah" required /></label><label class="financial-field">Tanggal<input v-model="withdrawalForm.entry_date" type="date" required /></label><label class="financial-field">Catatan (opsional)<input v-model="withdrawalForm.note" placeholder="Catatan penarikan" /></label><button class="primary-button w-full" :disabled="busy">Tarik ke rekening</button></form>

        <form v-else-if="['goal', 'goal-edit'].includes(activeAction)" class="workspace-modal-form" @submit.prevent="activeAction === 'goal-edit' ? updateGoal() : createGoal()"><p class="text-sm text-ink-500">{{ activeAction === 'goal-edit' ? 'Perbarui detail target tanpa mengubah riwayat cadangan kas.' : 'Buat tujuan bersama, lalu cadangkan kas anggota untuk melacak progresnya.' }}</p><label class="financial-field">Nama target<input v-model="goalForm.name" required placeholder="Contoh: Liburan akhir tahun" /></label><label class="financial-field">Target nominal<MoneyInput v-model="goalForm.target_amount" min="1" step="1" placeholder="Contoh: 15.000.000" required /></label><label class="financial-field">Tanggal target (opsional)<input v-model="goalForm.target_date" type="date" /></label><button class="primary-button w-full" :disabled="busy">{{ activeAction === 'goal-edit' ? 'Simpan perubahan' : 'Buat target bersama' }}</button></form>

        <form v-else-if="activeAction === 'allocation'" class="workspace-modal-form" @submit.prevent="allocateGoal"><p class="text-sm text-ink-500">Cadangan mengunci sebagian kas Anda dari pembelian aset dan penarikan.</p><label class="financial-field">Target<select v-model="goalAllocationForm.goal_id" required><option value="" disabled>-- Pilih target --</option><option v-for="goal in workspace.goals" :key="goal.id" :value="goal.id">{{ goal.name }}</option></select></label><label class="financial-field">Tindakan<select v-model="goalAllocationForm.action"><option value="allocate">Cadangkan kas</option><option value="release">Lepas cadangan</option></select></label><label class="financial-field">Nominal<MoneyInput v-model="goalAllocationForm.amount" min="1" step="1" :max="maxGoalAllocation" placeholder="Nominal rupiah" required /></label><label class="financial-field">Tanggal<input v-model="goalAllocationForm.allocation_date" type="date" required /></label><label class="financial-field">Catatan (opsional)<input v-model="goalAllocationForm.note" placeholder="Catatan alokasi" /></label><button class="primary-button w-full" :disabled="busy">Simpan cadangan</button></form>

        <form v-else-if="['asset', 'asset-edit'].includes(activeAction)" class="workspace-modal-form" @submit.prevent="activeAction === 'asset-edit' ? updateAsset() : createAsset()"><p class="text-sm text-ink-500">{{ activeAction === 'asset-edit' ? 'Perbarui nama dan penyedia tanpa mengubah riwayat pembelian atau kepemilikan.' : 'Tambahkan produk emas digital yang dipakai untuk tabungan bersama.' }}</p><label class="financial-field">Nama aset<input v-model="assetForm.name" required placeholder="Contoh: Emas bersama" /></label><label class="financial-field">Penyedia / platform<input v-model="assetForm.provider" placeholder="Contoh: Tring" /></label><button class="primary-button w-full" :disabled="busy">{{ activeAction === 'asset-edit' ? 'Simpan perubahan' : 'Tambah aset' }}</button></form>

        <form v-else-if="['purchase', 'sale', 'valuation'].includes(activeAction) && selectedAsset" class="workspace-modal-form" @submit.prevent="transactAsset"><p class="text-sm text-ink-500">{{ selectedAsset.name }} · {{ activeAction === 'purchase' ? 'Pembelian menggunakan kas bersama dan gram dibagi menurut porsi kas anggota.' : activeAction === 'sale' ? 'Unit yang dijual dan hasilnya dibagi sesuai gram milik tiap anggota.' : 'Masukkan harga buyback terbaru dari penyedia.' }}</p><label class="financial-field">Tanggal transaksi<input v-model="transactionForm.transaction_date" type="date" required /></label><template v-if="activeAction !== 'valuation'"><label class="financial-field">{{ activeAction === 'purchase' ? 'Nominal pembelian' : 'Hasil penjualan' }}<MoneyInput v-model="transactionForm.amount" min="0.01" step="0.01" placeholder="Nominal rupiah" required /></label><label class="financial-field">{{ activeAction === 'purchase' ? 'Gram diterima' : 'Gram dijual' }}<MoneyInput v-model="transactionForm.quantity" min="0.00000001" step="0.00000001" :precision="8" :show-prefix="false" placeholder="Gram aktual" required /></label><label class="financial-field">Biaya transaksi<MoneyInput v-model="transactionForm.fees" min="0" step="0.01" placeholder="0" /></label></template><label v-else class="financial-field">Harga buyback per gram<MoneyInput v-model="transactionForm.unit_price" min="0.00000001" step="0.00000001" :precision="8" placeholder="Harga terbaru" required /></label><label class="financial-field">Catatan (opsional)<input v-model="transactionForm.note" placeholder="Catatan transaksi" /></label><button class="primary-button w-full" :disabled="busy">Simpan {{ actionTitles[activeAction].toLowerCase() }}</button></form>
      </section>
    </div>

    <div v-if="deletion" class="workspace-modal-backdrop workspace-delete-backdrop" @click.self="deletion = null">
      <section class="workspace-action-sheet workspace-delete-sheet" role="alertdialog" aria-modal="true" aria-labelledby="delete-title">
        <header class="workspace-modal-header"><span class="workspace-icon workspace-delete-icon"><Trash2 /></span><div class="min-w-0 flex-1"><p class="eyebrow">Konfirmasi penghapusan</p><h2 id="delete-title" class="truncate text-xl font-bold">Hapus {{ deletion.type === 'workspace' ? 'ruang' : deletion.type === 'asset' ? 'aset' : 'target' }}?</h2></div><button class="workspace-close-button" type="button" aria-label="Tutup" @click="deletion = null">×</button></header>
        <div class="workspace-delete-copy"><p><b>{{ deletion.name }}</b> akan dihapus permanen.</p><p v-if="deletion.type === 'workspace'">Kas bersama harus sudah Rp 0 dan seluruh kepemilikan emas harus sudah diselesaikan. Data anggota, target, undangan, transaksi, dan riwayat bersama akan dihapus. Transaksi yang sudah tercatat di ledger pribadi tidak dibatalkan.</p><p v-else-if="deletion.type === 'asset'">Aset harus sudah tidak memiliki gram tersisa. Detail transaksi, valuasi, dan kepemilikan aset dihapus. Catatan arus kas pembelian/penjualan tetap tersimpan di riwayat kas bersama.</p><p v-else>Seluruh cadangan kas pada target harus dilepas terlebih dahulu. Riwayat alokasi target ikut dihapus.</p></div>
        <div class="workspace-delete-actions"><button class="secondary-button" :disabled="busy" @click="deletion = null">Batal</button><button class="workspace-delete-confirm" :disabled="busy" @click="performDelete"><Trash2 class="h-4 w-4" /> {{ busy ? 'Menghapus…' : 'Hapus permanen' }}</button></div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.workspace-page-header { align-items: flex-end; }
.workspace-header-actions { display: flex; align-items: flex-end; gap: .75rem; }
.workspace-picker { width: min(100%, 18rem); }
.workspace-action-trigger { min-height: 3rem; white-space: nowrap; }
.workspace-empty { text-align: center; }
.workspace-empty-state { display: grid; min-height: 7rem; place-items: center; border: 1px dashed var(--color-line-300); border-radius: 1.25rem; padding: 1.25rem; text-align: center; color: var(--color-ink-500); font-size: .9rem; }
.workspace-content-grid { display: grid; align-items: start; gap: 1.25rem; }
.workspace-panel { min-width: 0; }
.workspace-panel-wide { grid-column: 1 / -1; }
.workspace-section-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
.workspace-inline-actions { display: flex; flex-wrap: wrap; gap: .6rem; margin-top: 1rem; border-top: 1px solid var(--color-line-200); padding-top: 1rem; }
.workspace-danger-zone { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .75rem; border-top: 1px solid var(--color-line-200); padding-top: 1rem; }
.workspace-delete-button, .workspace-delete-confirm { display: inline-flex; min-height: 2.75rem; align-items: center; justify-content: center; gap: .5rem; border: 1px solid #d9a39f; border-radius: .9rem; background: var(--color-paper-0); padding: .65rem .9rem; color: #a52d27; font-weight: 700; transition: background-color .16s ease, border-color .16s ease; }
.workspace-delete-button:hover, .workspace-delete-confirm:hover { border-color: #b9382e; background: #fff1ef; }
.workspace-delete-button:disabled { cursor: not-allowed; opacity: .52; }
.workspace-danger-option { border-color: #e6bfbb; }
.workspace-danger-option .workspace-icon, .workspace-delete-icon { background: #fbe7e4; color: #a52d27; }
.workspace-delete-sheet { max-width: 36rem; }
.workspace-delete-copy { display: grid; gap: .75rem; color: var(--color-ink-700); font-size: .9rem; line-height: 1.6; }
.workspace-delete-actions { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; margin-top: 1.25rem; }
.workspace-delete-actions > button { min-height: 3rem; }
.workspace-delete-confirm { border-color: #a52d27; background: #a52d27; color: white; }
.workspace-delete-confirm:hover { border-color: #85221e; background: #85221e; }
.workspace-delete-confirm:disabled { cursor: wait; opacity: .65; }
.workspace-modal-backdrop { position: fixed; z-index: 100; inset: 0; display: flex; align-items: flex-end; justify-content: center; background: rgb(12 25 23 / 58%); padding: 0; backdrop-filter: blur(5px); }
.workspace-action-sheet { width: 100%; max-height: min(92dvh, 56rem); overflow-y: auto; overscroll-behavior: contain; border: 1px solid var(--color-line-200); border-bottom: 0; border-radius: 1.75rem 1.75rem 0 0; background: var(--color-paper-0); padding: 1.25rem 1rem calc(1.25rem + env(safe-area-inset-bottom)); color: var(--color-ink-900); box-shadow: 0 -1rem 3rem rgb(0 0 0 / 18%); }
.workspace-modal-header { position: sticky; z-index: 1; top: -1.25rem; display: flex; align-items: center; gap: .75rem; margin: -1.25rem -1rem 1rem; border-bottom: 1px solid var(--color-line-200); background: var(--color-paper-0); padding: 1rem; }
.workspace-modal-header h2 { line-height: 1.25; }
.workspace-back-button, .workspace-close-button { display: grid; width: 2.75rem; height: 2.75rem; flex: 0 0 auto; place-items: center; border: 1px solid var(--color-line-200); border-radius: .9rem; background: var(--color-base-50); color: var(--color-ink-800); font-size: 1.65rem; line-height: 1; }
.workspace-action-menu, .workspace-modal-form { max-width: 44rem; margin-inline: auto; }
.workspace-action-grid { display: grid; grid-template-columns: 1fr; gap: .65rem; }
.workspace-action-option { display: flex; min-height: 4.5rem; align-items: center; gap: .85rem; border: 1px solid var(--color-line-200); border-radius: 1rem; background: var(--color-paper-0); padding: .75rem; text-align: left; transition: border-color .16s ease, background-color .16s ease; }
.workspace-action-option:hover, .workspace-action-option:focus-visible { border-color: var(--color-primary-600); background: var(--color-base-50); }
.workspace-action-option:disabled { cursor: not-allowed; opacity: .5; }
.workspace-action-option b, .workspace-action-option small { display: block; }
.workspace-action-option small { margin-top: .15rem; color: var(--color-ink-500); font-size: .75rem; }
.workspace-modal-form { display: grid; gap: 1rem; }
.workspace-modal-form .financial-field { min-width: 0; }
.workspace-modal-form > button { min-height: 3.1rem; margin-top: .25rem; }
.workspace-icon { display: inline-grid; width: 2.75rem; height: 2.75rem; flex: 0 0 auto; place-items: center; border-radius: 1rem; background: var(--color-primary-100, #dff1eb); color: var(--color-primary-700, #08796d); }
.workspace-icon :deep(svg) { width: 1.25rem; height: 1.25rem; }
.workspace-icon-large { width: 4rem; height: 4rem; border-radius: 1.25rem; }
.workspace-icon-large :deep(svg) { width: 1.8rem; height: 1.8rem; }
.workspace-avatar { display: grid; width: 2.5rem; height: 2.5rem; flex: 0 0 auto; place-items: center; border-radius: 50%; background: var(--color-base-100); color: var(--color-ink-700); font-weight: 700; }
.workspace-role, .workspace-type-pill { display: inline-flex; align-items: center; border-radius: 999px; background: var(--color-base-100); color: var(--color-ink-700); padding: .2rem .55rem; font-size: .7rem; font-weight: 700; }
.workspace-remove-member { display: grid; width: 2rem; height: 2rem; place-items: center; border-radius: 50%; color: var(--color-ink-500); }
.workspace-remove-member:hover { background: #fce9e7; color: #b9382e; }
.shared-asset-card { width: 100%; border: 1px solid var(--color-line-200); border-radius: 1.25rem; background: var(--color-paper-0); padding: 1rem; transition: border-color .16s ease, box-shadow .16s ease; }
.shared-asset-card:hover, .shared-asset-card.is-selected { border-color: var(--color-primary-600); box-shadow: 0 0 0 2px rgb(8 121 109 / 10%); }
.workspace-overview-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1rem; }
.workspace-overview-grid > article { min-width: 0; padding: 1.25rem; }
.workspace-overview-grid p { color: var(--color-ink-500); font-size: .8rem; }
.workspace-overview-grid b { display: block; margin-top: .45rem; overflow-wrap: anywhere; font-size: clamp(1.25rem, 2vw, 1.75rem); }
.workspace-overview-grid small { display: block; margin-top: .4rem; color: var(--color-ink-500); font-size: .75rem; }
.workspace-overview-primary { background: linear-gradient(135deg, #0b554e, #08796d); color: white; }
.workspace-overview-primary p, .workspace-overview-primary small { color: #d9efea; }
.workspace-mini-icon { display: grid; width: 2rem; height: 2rem; flex: 0 0 auto; place-items: center; border-radius: .7rem; background: var(--color-base-100); color: var(--color-primary-600); }
.workspace-mini-icon :deep(svg) { width: 1rem; height: 1rem; }
.dark .workspace-icon, .dark .workspace-mini-icon { color: #7ee3ce; }
.dark .workspace-overview-grid:not(.workspace-overview-primary) { color: var(--color-ink-900); }
.dark .bg-primary-600 { background-color: #20a48d; }
.dark .workspace-danger-option { border-color: #714340; }
.dark .workspace-delete-button { border-color: #85524e; color: #ffaaa2; }
.dark .workspace-delete-button:hover { background: #351e1c; }
.dark .workspace-danger-option .workspace-icon, .dark .workspace-delete-icon { background: #422725; color: #ffaaa2; }
.dark .workspace-delete-copy { color: var(--color-ink-700); }
@media (min-width: 700px) { .workspace-content-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .workspace-action-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .workspace-modal-backdrop { align-items: center; padding: 1rem; } .workspace-action-sheet { width: min(100%, 42rem); max-height: min(88dvh, 58rem); border: 1px solid var(--color-line-200); border-radius: 1.5rem; padding: 1.5rem; } .workspace-modal-header { top: -1.5rem; margin: -1.5rem -1.5rem 1.25rem; padding: 1.25rem 1.5rem; } }
@media (max-width: 760px) { .workspace-overview-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .65rem; } .workspace-overview-grid > article { padding: .95rem; } .workspace-page-header { align-items: stretch; } .workspace-header-actions { align-items: stretch; flex-direction: column; } .workspace-picker, .workspace-action-trigger { width: 100%; } }
@media (max-width: 390px) { .workspace-overview-grid { grid-template-columns: 1fr; } .workspace-inline-actions > button { flex: 1 1 100%; } }
</style>
