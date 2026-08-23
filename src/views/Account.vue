<!-- ledger-web/src/views/Account.vue -->
<script setup>
import { ref, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useAccountStore } from "@/stores/account";
import { useNotificationStore } from "@/stores/notification";
import { formatRupiah } from "@/utils/formatters";
import AccountCreateModal from "@/views/AccountCreate.vue";
import {
  Wallet,
  Building2,
  Smartphone,
  CreditCard,
  MoreVertical,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  Loader2,
  X,
  Check,
} from "lucide-vue-next";

const accountStore = useAccountStore();
const notifyStore = useNotificationStore();
const { accounts, totalBalance, isLoading } = storeToRefs(accountStore);

const isCreateModalOpen = ref(false);
const activeDropdownId = ref(null);

// State Edit Modal
const isEditModalOpen = ref(false);
const editForm = ref({
  id: null,
  name: "",
  type: "bank",
  balance: 0,
  color: "#6C4CF1",
});
const isUpdating = ref(false);

// State Delete Modal
const isDeleteModalOpen = ref(false);
const selectedAccount = ref(null);
const isDeleting = ref(false);

const accountTypes = [
  { id: "bank", label: "Bank", icon: Building2 },
  { id: "ewallet", label: "E-Wallet", icon: Smartphone },
  { id: "cash", label: "Tunai", icon: Wallet },
  { id: "credit_card", label: "Kartu Kredit", icon: CreditCard },
];

const colorSwatches = [
  "#6C4CF1",
  "#17B978",
  "#FFB020",
  "#00AED6",
  "#F0473E",
  "#EC4899",
];

onMounted(async () => {
  await accountStore.fetchAccounts();
});

function toggleDropdown(id, event) {
  event.stopPropagation();
  activeDropdownId.value = activeDropdownId.value === id ? null : id;
}

function getAccountIcon(type) {
  if (type === "bank") return Building2;
  if (type === "ewallet") return Smartphone;
  if (type === "credit_card") return CreditCard;
  return Wallet;
}

function getBalanceLabel(type) {
  if (type === "bank") return "SALDO UTAMA";
  if (type === "ewallet") return "SALDO AKTIF";
  if (type === "credit_card") return "SISA LIMIT";
  return "SALDO TERSEDIA";
}

// Buka Modal Edit
function openEditModal(acc) {
  activeDropdownId.value = null;
  editForm.value = { ...acc };
  isEditModalOpen.value = true;
}

// Submit Edit
async function handleUpdate() {
  if (!editForm.value.name.trim()) return;
  isUpdating.value = true;
  try {
    await accountStore.updateAccount(editForm.value.id, editForm.value);
    notifyStore.notify({
      message: "Akun berhasil diperbarui!",
      type: "success",
    });
    isEditModalOpen.value = false;
  } catch (err) {
    notifyStore.notify({
      message: err.response?.data?.message || "Gagal memperbarui akun.",
      type: "error",
    });
  } finally {
    isUpdating.value = false;
  }
}

// Modal Delete
function confirmDelete(acc) {
  activeDropdownId.value = null;
  selectedAccount.value = acc;
  isDeleteModalOpen.value = true;
}

async function handleDelete() {
  if (!selectedAccount.value) return;
  isDeleting.value = true;
  try {
    await accountStore.deleteAccount(selectedAccount.value.id);
    notifyStore.notify({
      message: "Sumber dana berhasil dihapus.",
      type: "success",
    });
    isDeleteModalOpen.value = false;
  } catch (err) {
    notifyStore.notify({
      message: err.response?.data?.message || "Gagal menghapus akun.",
      type: "error",
    });
  } finally {
    isDeleting.value = false;
    selectedAccount.value = null;
  }
}
</script>

<template>
  <div class="space-y-8 font-body" @click="activeDropdownId = null">
    <!-- Header Halaman -->
    <div
      class="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
    >
      <div>
        <h1 class="font-display text-2xl md:text-3xl font-bold text-ink-900">
          Daftar Akun
        </h1>
        <p class="text-ink-600 text-sm mt-1">
          Kelola semua dompet dan rekening bank Anda dalam satu tempat.
        </p>
      </div>

      <div class="text-left sm:text-right">
        <span
          class="text-[11px] font-bold text-ink-300 uppercase tracking-wider block"
        >
          TOTAL SALDO
        </span>
        <span
          class="font-mono-money font-extrabold text-2xl md:text-3xl text-violet-600"
        >
          {{ formatRupiah(totalBalance) }}
        </span>
      </div>
    </div>

    <!-- Grid Kartu Akun -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <template v-if="isLoading">
        <div
          v-for="i in 3"
          :key="i"
          class="h-44 bg-paper-0 border border-line-200 rounded-3xl p-6 space-y-4 animate-pulse"
        >
          <div class="flex items-center justify-between">
            <div class="w-10 h-10 rounded-2xl bg-base-100"></div>
            <div class="w-4 h-4 bg-base-100 rounded"></div>
          </div>
          <div class="space-y-2 pt-4">
            <div class="w-20 h-3 bg-base-100 rounded"></div>
            <div class="w-32 h-6 bg-base-100 rounded"></div>
          </div>
        </div>
      </template>

      <template v-else>
        <!-- Card Akun dengan Aksen Warna Menyatu & Hover Mulus -->
        <div
          v-for="acc in accounts"
          :key="acc.id"
          class="bg-paper-0 border border-line-200 rounded-3xl pt-7 pb-6 px-6 shadow-soft hover:shadow-card hover:-translate-y-1.5 transition-all duration-300 relative overflow-hidden flex flex-col justify-between h-44 group cursor-pointer"
        >
          <!-- Aksen Warna Menyatu dengan Lengkungan Kartu Atas -->
          <div
            class="absolute top-0 left-0 right-0 h-2 transition-colors duration-300"
            :style="{ backgroundColor: acc.color || '#6C4CF1' }"
          ></div>

          <!-- Header Kartu -->
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-3">
              <div
                class="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-soft group-hover:scale-105 transition-transform"
                :style="{
                  backgroundColor: `${acc.color || '#6C4CF1'}18`,
                  color: acc.color || '#6C4CF1',
                }"
              >
                <component
                  :is="getAccountIcon(acc.type)"
                  class="w-5 h-5 stroke-[2.2]"
                />
              </div>
              <div>
                <h3
                  class="font-display font-bold text-base text-ink-900 group-hover:text-violet-600 transition-colors"
                >
                  {{ acc.name }}
                </h3>
                <span class="text-xs text-ink-600 capitalize font-medium">
                  {{ acc.type }}
                </span>
              </div>
            </div>

            <!-- Action Menu Dropdown (Rombak Total v2.0) -->
            <div class="relative">
              <!-- Trigger Button -->
              <button
                type="button"
                @click="toggleDropdown(acc.id, $event)"
                class="w-8 h-8 flex items-center justify-center text-ink-400 hover:text-ink-900 rounded-full hover:bg-base-100/80 active:scale-95 transition-all duration-150 cursor-pointer"
                :class="{
                  'bg-base-100 text-ink-900 ring-2 ring-violet-500/20':
                    activeDropdownId === acc.id,
                }"
              >
                <MoreVertical class="w-4 h-4" />
              </button>

              <!-- Floating Menu Container -->
              <div
                v-if="activeDropdownId === acc.id"
                class="absolute right-0 top-10 w-40 bg-paper-0/95 backdrop-blur-md border border-line-200/80 rounded-2xl shadow-card p-1.5 z-40 space-y-0.5 animate-in fade-in zoom-in-95 duration-150 origin-top-right"
              >
                <!-- Option: Edit -->
                <button
                  type="button"
                  @click.stop="openEditModal(acc)"
                  class="w-full px-3 py-2 text-left text-xs font-semibold text-ink-800 hover:text-violet-600 hover:bg-violet-50/80 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer group"
                >
                  <div
                    class="w-6 h-6 rounded-lg bg-base-100 group-hover:bg-violet-100 text-ink-600 group-hover:text-violet-600 flex items-center justify-center transition-colors"
                  >
                    <Pencil class="w-3.5 h-3.5" />
                  </div>
                  <span>Edit Akun</span>
                </button>

                <!-- Option: Delete -->
                <button
                  type="button"
                  @click.stop="confirmDelete(acc)"
                  class="w-full px-3 py-2 text-left text-xs font-semibold text-expense-600 hover:text-expense-700 hover:bg-expense-50 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer group"
                >
                  <div
                    class="w-6 h-6 rounded-lg bg-expense-100/60 group-hover:bg-expense-100 text-expense-600 flex items-center justify-center transition-colors"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </div>
                  <span>Hapus Akun</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Saldo Kartu -->
          <div class="space-y-1">
            <span
              class="text-[10px] font-bold text-ink-300 uppercase tracking-wider block"
            >
              {{ getBalanceLabel(acc.type) }}
            </span>
            <div
              class="font-mono-money font-extrabold text-xl md:text-2xl text-ink-900 group-hover:text-violet-600 transition-colors"
            >
              {{ formatRupiah(acc.balance) }}
            </div>
          </div>
        </div>

        <!-- Dashed Card Tambah Akun -->
        <button
          type="button"
          @click="isCreateModalOpen = true"
          class="h-44 border-2 border-dashed border-line-300 hover:border-violet-600 bg-base-50/50 hover:bg-violet-50/30 rounded-3xl p-6 flex flex-col items-center justify-center gap-3 transition-all duration-300 hover:-translate-y-1 cursor-pointer group btn-bounce"
        >
          <div
            class="w-12 h-12 rounded-full bg-paper-0 border border-line-200 group-hover:border-violet-200 group-hover:bg-violet-600 group-hover:text-paper-0 flex items-center justify-center text-ink-600 shadow-soft transition-all duration-300"
          >
            <Plus class="w-5 h-5 stroke-[2.5]" />
          </div>
          <span
            class="font-display font-bold text-sm text-ink-900 group-hover:text-violet-600 transition-colors"
          >
            Tambah Akun Baru
          </span>
        </button>
      </template>
    </div>

    <!-- Modal Form Tambah Akun Baru -->
    <div
      v-if="isCreateModalOpen"
      class="fixed inset-0 z-50 bg-ink-900/40 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div class="w-full max-w-lg">
        <AccountCreateModal
          @close="isCreateModalOpen = false"
          @created="
            isCreateModalOpen = false;
            accountStore.fetchAccounts();
          "
        />
      </div>
    </div>

    <!-- Modal Form Edit Akun -->
    <div
      v-if="isEditModalOpen"
      class="fixed inset-0 z-50 bg-ink-900/40 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        class="w-full max-w-lg bg-paper-0 border border-line-200 rounded-3xl shadow-card overflow-hidden"
      >
        <div
          class="px-6 py-5 border-b border-line-200 flex items-center justify-between"
        >
          <h2 class="font-display font-bold text-lg text-ink-900">Edit Akun</h2>
          <button
            @click="isEditModalOpen = false"
            class="p-1 text-ink-600 hover:text-ink-900 rounded-full hover:bg-base-50 cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <form @submit.prevent="handleUpdate" class="p-6 space-y-5">
          <div class="space-y-2">
            <label
              class="block text-[11px] font-bold text-ink-300 uppercase tracking-wider"
              >NAMA AKUN</label
            >
            <input
              v-model="editForm.name"
              type="text"
              required
              class="w-full px-4 h-12 border border-line-200 rounded-xl bg-paper-0 focus:border-violet-600 focus:outline-none text-sm font-medium text-ink-900"
            />
          </div>

          <div class="space-y-2">
            <label
              class="block text-[11px] font-bold text-ink-300 uppercase tracking-wider"
              >SALDO</label
            >
            <input
              v-model="editForm.balance"
              type="number"
              required
              class="w-full px-4 h-12 border border-line-200 rounded-xl bg-paper-0 focus:border-violet-600 focus:outline-none text-sm font-medium text-ink-900"
            />
          </div>

          <div class="space-y-3">
            <label
              class="block text-[11px] font-bold text-ink-300 uppercase tracking-wider"
              >WARNA KARTU</label
            >
            <div class="flex items-center gap-3">
              <button
                v-for="color in colorSwatches"
                :key="color"
                type="button"
                @click="editForm.color = color"
                class="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
                :style="{ backgroundColor: color }"
              >
                <Check
                  v-if="editForm.color === color"
                  class="w-4 h-4 text-paper-0"
                />
              </button>
            </div>
          </div>

          <div class="pt-2 flex gap-3">
            <button
              type="button"
              @click="isEditModalOpen = false"
              class="flex-1 h-12 bg-base-50 text-ink-600 font-bold text-sm rounded-2xl cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="isUpdating"
              class="flex-1 h-12 bg-violet-600 text-paper-0 font-bold text-sm rounded-2xl shadow-violet flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Loader2 v-if="isUpdating" class="w-4 h-4 animate-spin" />
              <span>Simpan Perubahan</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Konfirmasi Hapus -->
    <div
      v-if="isDeleteModalOpen"
      class="fixed inset-0 z-50 bg-ink-900/40 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        class="w-full max-w-md bg-paper-0 border border-line-200 rounded-3xl p-6 shadow-card space-y-4 text-center"
      >
        <div
          class="w-12 h-12 rounded-full bg-expense-100 text-expense-600 flex items-center justify-center mx-auto"
        >
          <AlertTriangle class="w-6 h-6" />
        </div>
        <div>
          <h3 class="font-display font-bold text-lg text-ink-900">
            Hapus Sumber Dana?
          </h3>
          <p class="text-xs text-ink-600 mt-1">
            Akun
            <span class="font-bold text-ink-900">{{
              selectedAccount?.name
            }}</span>
            akan dihapus permanen.
          </p>
        </div>
        <div class="grid grid-cols-2 gap-3 pt-2">
          <button
            @click="isDeleteModalOpen = false"
            class="py-2.5 bg-base-50 text-ink-600 font-semibold text-xs rounded-xl hover:bg-base-100 transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            @click="handleDelete"
            :disabled="isDeleting"
            class="py-2.5 bg-expense-600 text-paper-0 font-semibold text-xs rounded-xl shadow-soft hover:bg-expense-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Loader2 v-if="isDeleting" class="w-4 h-4 animate-spin" />
            <span>{{ isDeleting ? "Merapikan..." : "Ya, Hapus" }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
