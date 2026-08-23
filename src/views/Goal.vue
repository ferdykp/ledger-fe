<!-- ledger-web/src/views/Goal.vue -->
<script setup>
import { ref, onMounted, computed } from "vue";
import { storeToRefs } from "pinia";
import { useGoalStore } from "@/stores/goal";
import { useNotificationStore } from "@/stores/notification";
import { formatRupiah } from "@/utils/formatters";
import {
  Plus,
  Target,
  Plane,
  Car,
  Home,
  Laptop,
  Smartphone,
  Gift,
  Coins,
  MoreVertical,
  Pencil,
  Trash2,
  X,
  Loader2,
  Calendar,
  AlertTriangle,
  TrendingUp,
} from "lucide-vue-next";

const goalStore = useGoalStore();
const notifyStore = useNotificationStore();

const { goals, isLoading } = storeToRefs(goalStore);

// Modal States
const isCreateModalOpen = ref(false);
const isDepositModalOpen = ref(false);
const isDeleteModalOpen = ref(false);

const isSubmitting = ref(false);
const selectedGoal = ref(null);
const activeDropdownId = ref(null);

// Form States
const goalForm = ref({
  name: "",
  target_amount: 0,
  current_amount: 0,
  target_date: "",
  icon: "plane",
});

const depositForm = ref({
  amount: 0,
  date: new Date().toISOString().split("T")[0],
});

// Formatter Input Nominal Rupiah
const formattedTargetAmount = computed({
  get: () =>
    goalForm.value.target_amount
      ? Number(goalForm.value.target_amount).toLocaleString("id-ID")
      : "",
  set: (val) => {
    goalForm.value.target_amount = val ? Number(val.replace(/\D/g, "")) : 0;
  },
});

const formattedDepositAmount = computed({
  get: () =>
    depositForm.value.amount
      ? Number(depositForm.value.amount).toLocaleString("id-ID")
      : "",
  set: (val) => {
    depositForm.value.amount = val ? Number(val.replace(/\D/g, "")) : 0;
  },
});

const priorityGoal = computed(() => goals.value[0] || null);
const secondaryGoals = computed(() => goals.value.slice(1));

const availableIcons = [
  { id: "plane", label: "Travel", icon: Plane },
  { id: "laptop", label: "Gadget", icon: Laptop },
  { id: "car", label: "Kendaraan", icon: Car },
  { id: "home", label: "Rumah", icon: Home },
  { id: "smartphone", label: "HP", icon: Smartphone },
  { id: "gift", label: "Hadiah", icon: Gift },
  { id: "coins", label: "Investasi", icon: Coins },
];

const iconMap = {
  plane: Plane,
  laptop: Laptop,
  car: Car,
  home: Home,
  smartphone: Smartphone,
  gift: Gift,
  coins: Coins,
};

function getGoalIcon(iconName) {
  return iconMap[iconName] || Target;
}

onMounted(async () => {
  await goalStore.fetchGoals();
});

function toggleDropdown(id, event) {
  event.stopPropagation();
  activeDropdownId.value = activeDropdownId.value === id ? null : id;
}

function openCreateModal(goalToEdit = null) {
  activeDropdownId.value = null;
  if (goalToEdit) {
    selectedGoal.value = goalToEdit;
    goalForm.value = { ...goalToEdit };
  } else {
    selectedGoal.value = null;
    goalForm.value = {
      name: "",
      target_amount: 0,
      current_amount: 0,
      target_date: "",
      icon: "plane",
    };
  }
  isCreateModalOpen.value = true;
}

function openDepositModal(goal, event) {
  if (event) event.stopPropagation();
  selectedGoal.value = goal;
  depositForm.value = {
    amount: 0,
    date: new Date().toISOString().split("T")[0],
  };
  isDepositModalOpen.value = true;
}

function confirmDelete(goal, event) {
  if (event) event.stopPropagation();
  activeDropdownId.value = null;
  selectedGoal.value = goal;
  isDeleteModalOpen.value = true;
}

async function handleSaveGoal() {
  if (!goalForm.value.name.trim() || !goalForm.value.target_amount) return;

  isSubmitting.value = true;
  try {
    if (selectedGoal.value) {
      await goalStore.updateGoal(selectedGoal.value.id, goalForm.value);
      notifyStore.notify({
        message: "Target berhasil diperbarui!",
        type: "success",
      });
    } else {
      await goalStore.addGoal(goalForm.value);
      notifyStore.notify({
        message: "Impian baru berhasil dibuat!",
        type: "success",
      });
    }
    isCreateModalOpen.value = false;
  } catch (err) {
    notifyStore.notify({
      message: err.response?.data?.message || "Gagal menyimpan target.",
      type: "error",
    });
  } finally {
    isSubmitting.value = false;
  }
}

async function handleDeposit() {
  if (!depositForm.value.amount || !selectedGoal.value) return;

  isSubmitting.value = true;
  try {
    await goalStore.addContribution(selectedGoal.value.id, depositForm.value);
    notifyStore.notify({
      message: "Setoran tabungan berhasil dicatat!",
      type: "success",
    });
    isDepositModalOpen.value = false;
  } catch (err) {
    notifyStore.notify({
      message: err.response?.data?.message || "Gagal menambah setoran.",
      type: "error",
    });
  } finally {
    isSubmitting.value = false;
  }
}

async function handleDeleteGoal() {
  if (!selectedGoal.value) return;
  isSubmitting.value = true;
  try {
    await goalStore.deleteGoal(selectedGoal.value.id);
    notifyStore.notify({
      message: "Target tabungan berhasil dihapus.",
      type: "success",
    });
    isDeleteModalOpen.value = false;
  } catch (err) {
    notifyStore.notify({ message: "Gagal menghapus target.", type: "error" });
  } finally {
    isSubmitting.value = false;
    selectedGoal.value = null;
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
          Financial Goals
        </h1>
        <p class="text-ink-600 text-sm mt-1">
          Lacak dan wujudkan impian finansialmu.
        </p>
      </div>

      <button
        type="button"
        @click="openCreateModal()"
        class="inline-flex items-center justify-center gap-2 px-5 py-3 bg-violet-600 text-paper-0 rounded-2xl font-bold text-sm shadow-violet btn-bounce cursor-pointer self-start sm:self-auto"
      >
        <Plus class="w-4 h-4 stroke-[2.5]" />
        <span>Buat Goal Baru</span>
      </button>
    </div>

    <!-- Loading Skeleton -->
    <template v-if="isLoading">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div
          class="lg:col-span-2 h-64 bg-paper-0 border border-line-200 rounded-3xl animate-pulse"
        ></div>
        <div
          class="h-64 bg-paper-0 border border-line-200 rounded-3xl animate-pulse"
        ></div>
      </div>
    </template>

    <template v-else-if="goals.length === 0">
      <div
        class="py-16 text-center bg-paper-0 border border-line-200 rounded-3xl space-y-3 shadow-soft"
      >
        <Target class="w-10 h-10 text-ink-300 mx-auto" />
        <p class="text-sm font-semibold text-ink-600">
          Belum ada target tabungan. Yuk buat impian pertamamu!
        </p>
      </div>
    </template>

    <template v-else>
      <!-- MAIN GRID (PRIORITAS UTAMA + SECONDARY CARDS) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <!-- FEATURED PRIORITY CARD (8/12) -->
        <div
          v-if="priorityGoal"
          class="lg:col-span-8 bg-gradient-to-br from-violet-100/80 via-violet-50/50 to-paper-0 border border-violet-200/60 rounded-3xl p-6 sm:p-8 shadow-soft relative overflow-visible flex flex-col md:flex-row items-center gap-6 group cursor-pointer"
          @click="openDepositModal(priorityGoal)"
        >
          <!-- Progress Ring Donut Left -->
          <div
            class="relative w-36 h-36 shrink-0 flex items-center justify-center"
          >
            <svg class="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                class="text-violet-200/60"
                stroke-width="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                class="text-violet-600 transition-all duration-700 ease-out"
                :stroke-dasharray="`${priorityGoal.progress_percent}, 100`"
                stroke-width="3.5"
                stroke-linecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div
              class="absolute inset-0 flex flex-col items-center justify-center text-center"
            >
              <span class="font-display font-black text-2xl text-violet-600">
                {{ priorityGoal.progress_percent }}%
              </span>
              <span
                class="text-[9px] font-bold text-ink-400 uppercase tracking-wider mt-0.5"
              >
                Total TERCAPAI
              </span>
            </div>
          </div>

          <!-- Priority Content Right -->
          <div class="flex-1 space-y-4 w-full">
            <!-- Badge & Dropdown Header -->
            <div class="flex items-center justify-between">
              <span
                class="px-3 py-1 bg-violet-200/60 text-violet-700 text-[10px] font-extrabold uppercase tracking-wider rounded-full"
              >
                PRIORITAS UTAMA
              </span>

              <div class="relative">
                <button
                  type="button"
                  @click="toggleDropdown(priorityGoal.id, $event)"
                  class="p-1.5 text-ink-400 hover:text-ink-900 rounded-full hover:bg-paper-0 transition-colors cursor-pointer"
                >
                  <MoreVertical class="w-4 h-4" />
                </button>

                <!-- Action Dropdown -->
                <div
                  v-if="activeDropdownId === priorityGoal.id"
                  class="absolute right-0 top-8 w-36 bg-paper-0 border border-line-200 rounded-2xl shadow-card p-1.5 z-30 space-y-0.5"
                >
                  <button
                    @click="openCreateModal(priorityGoal)"
                    class="w-full px-3 py-2 text-left text-xs font-semibold text-ink-800 hover:text-violet-600 hover:bg-violet-50 rounded-xl flex items-center gap-2 cursor-pointer"
                  >
                    <Pencil class="w-3.5 h-3.5" />
                    <span>Edit Goal</span>
                  </button>
                  <button
                    @click="confirmDelete(priorityGoal, $event)"
                    class="w-full px-3 py-2 text-left text-xs font-semibold text-expense-600 hover:bg-expense-50 rounded-xl flex items-center gap-2 cursor-pointer"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Title & Amount -->
            <div>
              <h2
                class="font-display font-bold text-xl text-ink-900 group-hover:text-violet-600 transition-colors"
              >
                {{ priorityGoal.name }}
              </h2>
              <div class="flex items-baseline gap-2 mt-2 flex-wrap">
                <span
                  class="font-mono-money font-black text-xl md:text-2xl text-ink-900"
                >
                  {{ formatRupiah(priorityGoal.current_amount) }}
                </span>
                <span class="font-mono-money font-bold text-sm text-ink-400">
                  / {{ formatRupiah(priorityGoal.target_amount) }}
                </span>
              </div>
            </div>

            <!-- Full Linear Progress Bar -->
            <div
              class="w-full bg-violet-200/50 h-2.5 rounded-full overflow-hidden"
            >
              <div
                class="bg-violet-600 h-full rounded-full transition-all duration-500"
                :style="{ width: `${priorityGoal.progress_percent}%` }"
              ></div>
            </div>

            <!-- Footer Dates & On Track Badge -->
            <div
              class="flex items-center justify-between text-xs font-semibold text-ink-600 pt-1"
            >
              <div class="flex items-center gap-1.5 text-ink-400">
                <Calendar class="w-3.5 h-3.5" />
                <span
                  >Target: {{ priorityGoal.target_date || "Des 2026" }}</span
                >
              </div>

              <span
                class="px-2.5 py-0.5 bg-rose-100/80 text-rose-500 font-bold text-[10px] rounded-md"
              >
                On Track
              </span>
            </div>
          </div>
        </div>

        <!-- SECONDARY GOAL CARDS LOOP (4/12 & Grid) -->
        <div
          v-for="goal in secondaryGoals"
          :key="goal.id"
          class="lg:col-span-4 bg-paper-0 border border-line-200 rounded-3xl p-6 shadow-soft hover:shadow-card hover:-translate-y-1 transition-all space-y-4 relative group cursor-pointer"
          @click="openDepositModal(goal)"
        >
          <div class="flex items-start justify-between">
            <div
              class="w-11 h-11 rounded-2xl bg-amber-100/80 text-amber-800 flex items-center justify-center shrink-0 shadow-soft"
            >
              <component
                :is="getGoalIcon(goal.icon)"
                class="w-5 h-5 stroke-[2.2]"
              />
            </div>

            <button
              type="button"
              @click.stop="openCreateModal(goal)"
              class="p-1.5 text-ink-300 hover:text-violet-600 rounded-full hover:bg-violet-50 transition-colors cursor-pointer"
            >
              <Pencil class="w-4 h-4" />
            </button>
          </div>

          <div>
            <h3
              class="font-display font-bold text-base text-ink-900 group-hover:text-violet-600 transition-colors"
            >
              {{ goal.name }}
            </h3>
            <p class="text-xs text-ink-400 font-medium mt-0.5">Target Impian</p>
          </div>

          <div class="space-y-1.5">
            <div class="flex items-baseline justify-between text-xs font-bold">
              <span class="font-mono-money font-extrabold text-sm text-ink-900">
                {{ formatRupiah(goal.current_amount) }}
              </span>
              <span class="text-violet-600 font-mono-money font-bold">
                {{ goal.progress_percent }}%
              </span>
            </div>

            <div class="w-full bg-base-100 h-2 rounded-full overflow-hidden">
              <div
                class="bg-violet-600 h-full rounded-full transition-all duration-500"
                :style="{ width: `${goal.progress_percent}%` }"
              ></div>
            </div>

            <p class="text-[11px] font-semibold text-ink-400">
              Sisa: {{ formatRupiah(goal.remaining_amount) }}
            </p>
          </div>
        </div>

        <!-- DASHED CARD: TAMBAH TARGET (4/12) -->
        <button
          type="button"
          @click="openCreateModal()"
          class="lg:col-span-4 h-full min-h-[200px] border-2 border-dashed border-line-300 hover:border-violet-600 bg-violet-50/20 hover:bg-violet-50/50 rounded-3xl p-6 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer group btn-bounce"
        >
          <div
            class="w-12 h-12 rounded-full bg-paper-0 border border-line-200 group-hover:border-violet-200 group-hover:bg-violet-600 group-hover:text-paper-0 flex items-center justify-center text-ink-600 shadow-soft transition-all"
          >
            <Plus class="w-5 h-5 stroke-[2.5]" />
          </div>
          <div class="text-center">
            <span
              class="font-display font-bold text-sm text-ink-900 group-hover:text-violet-600 transition-colors block"
            >
              Tambah Target
            </span>
            <span class="text-xs text-ink-400 mt-0.5 block">
              Mulai rencanakan masa depanmu.
            </span>
          </div>
        </button>
      </div>
    </template>

    <!-- Modal Buat / Edit Target -->
    <div
      v-if="isCreateModalOpen"
      class="fixed inset-0 z-50 bg-ink-900/40 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        class="w-full max-w-md bg-paper-0 border border-line-200 rounded-3xl shadow-card overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        <div
          class="px-6 py-4 border-b border-line-200 flex items-center justify-between"
        >
          <h3 class="font-display font-bold text-base text-ink-900">
            {{ selectedGoal ? "Edit Target Impian" : "Buat Target Impian" }}
          </h3>
          <button
            @click="isCreateModalOpen = false"
            class="p-1 text-ink-600 hover:text-ink-900 rounded-full cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <form @submit.prevent="handleSaveGoal" class="p-6 space-y-4">
          <div class="space-y-1.5">
            <label
              class="block text-[11px] font-bold text-ink-300 uppercase tracking-wider"
              >Nama Impian</label
            >
            <input
              v-model="goalForm.name"
              type="text"
              required
              placeholder="Contoh: Dana Darurat, Liburan Jepang"
              class="w-full px-4 h-11 border border-line-200 rounded-xl bg-paper-0 focus:border-violet-600 focus:outline-none text-sm font-medium text-ink-900"
            />
          </div>

          <div class="space-y-1.5">
            <label
              class="block text-[11px] font-bold text-ink-300 uppercase tracking-wider"
              >Target Nominal</label
            >
            <div class="relative flex items-center">
              <span class="absolute left-4 text-sm font-bold text-violet-600"
                >Rp</span
              >
              <input
                v-model="formattedTargetAmount"
                type="text"
                required
                placeholder="0"
                class="w-full pl-11 pr-4 h-11 border border-line-200 rounded-xl bg-paper-0 focus:border-violet-600 focus:outline-none text-sm font-mono-money font-extrabold text-ink-900"
              />
            </div>
          </div>

          <div class="space-y-1.5">
            <label
              class="block text-[11px] font-bold text-ink-300 uppercase tracking-wider"
              >Target Tanggal (Opsional)</label
            >
            <input
              v-model="goalForm.target_date"
              type="date"
              class="w-full px-4 h-11 border border-line-200 rounded-xl bg-paper-0 focus:border-violet-600 focus:outline-none text-xs font-semibold text-ink-900"
            />
          </div>

          <div class="space-y-2">
            <label
              class="block text-[11px] font-bold text-ink-300 uppercase tracking-wider"
              >Pilih Ikon</label
            >
            <div
              class="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar"
            >
              <button
                v-for="item in availableIcons"
                :key="item.id"
                type="button"
                @click="goalForm.icon = item.id"
                class="p-2.5 rounded-xl border flex items-center justify-center shrink-0 cursor-pointer transition-all"
                :class="
                  goalForm.icon === item.id
                    ? 'bg-violet-600 text-paper-0 border-violet-600'
                    : 'bg-paper-0 border-line-200 text-ink-600'
                "
              >
                <component :is="item.icon" class="w-5 h-5 stroke-[2.2]" />
              </button>
            </div>
          </div>

          <div class="pt-2 flex gap-2">
            <button
              type="button"
              @click="isCreateModalOpen = false"
              class="flex-1 h-11 bg-base-50 text-ink-600 font-bold text-xs rounded-xl cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="flex-1 h-11 bg-violet-600 text-paper-0 font-bold text-xs rounded-xl shadow-violet flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Loader2 v-if="isSubmitting" class="w-4 h-4 animate-spin" />
              <span>Simpan Target</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Setor Tabungan (Nabung) -->
    <div
      v-if="isDepositModalOpen"
      class="fixed inset-0 z-50 bg-ink-900/40 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        class="w-full max-w-md bg-paper-0 border border-line-200 rounded-3xl shadow-card overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        <div
          class="px-6 py-4 border-b border-line-200 flex items-center justify-between"
        >
          <h3 class="font-display font-bold text-base text-ink-900">
            Setor Tabungan - {{ selectedGoal?.name }}
          </h3>
          <button
            @click="isDepositModalOpen = false"
            class="p-1 text-ink-600 hover:text-ink-900 rounded-full cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <form @submit.prevent="handleDeposit" class="p-6 space-y-4">
          <div class="space-y-1.5">
            <label
              class="block text-[11px] font-bold text-ink-300 uppercase tracking-wider"
              >Nominal Setoran</label
            >
            <div class="relative flex items-center">
              <span class="absolute left-4 text-sm font-bold text-violet-600"
                >Rp</span
              >
              <input
                v-model="formattedDepositAmount"
                type="text"
                required
                placeholder="0"
                class="w-full pl-11 pr-4 h-11 border border-line-200 rounded-xl bg-paper-0 focus:border-violet-600 focus:outline-none text-sm font-mono-money font-extrabold text-ink-900"
              />
            </div>
          </div>

          <div class="space-y-1.5">
            <label
              class="block text-[11px] font-bold text-ink-300 uppercase tracking-wider"
              >Tanggal Setor</label
            >
            <input
              v-model="depositForm.date"
              type="date"
              required
              class="w-full px-4 h-11 border border-line-200 rounded-xl bg-paper-0 focus:border-violet-600 focus:outline-none text-xs font-semibold text-ink-900"
            />
          </div>

          <div class="pt-2 flex gap-2">
            <button
              type="button"
              @click="isDepositModalOpen = false"
              class="flex-1 h-11 bg-base-50 text-ink-600 font-bold text-xs rounded-xl cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="flex-1 h-11 bg-violet-600 text-paper-0 font-bold text-xs rounded-xl shadow-violet flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Loader2 v-if="isSubmitting" class="w-4 h-4 animate-spin" />
              <span>Simpan Setoran</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Konfirmasi Hapus Target -->
    <div
      v-if="isDeleteModalOpen"
      class="fixed inset-0 z-50 bg-ink-900/40 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        class="w-full max-w-sm bg-paper-0 border border-line-200 rounded-3xl p-6 shadow-card space-y-4 text-center animate-in fade-in zoom-in-95 duration-150"
      >
        <div
          class="w-12 h-12 rounded-full bg-expense-100 text-expense-600 flex items-center justify-center mx-auto"
        >
          <AlertTriangle class="w-6 h-6" />
        </div>
        <div>
          <h3 class="font-display font-bold text-base text-ink-900">
            Hapus Target Impian?
          </h3>
          <p class="text-xs text-ink-600 mt-1">
            Target
            <span class="font-bold text-ink-900">{{ selectedGoal?.name }}</span>
            akan dihapus permanen.
          </p>
        </div>
        <div class="grid grid-cols-2 gap-2 pt-2">
          <button
            @click="isDeleteModalOpen = false"
            class="py-2.5 bg-base-50 text-ink-600 font-semibold text-xs rounded-xl hover:bg-base-100 transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            @click="handleDeleteGoal"
            :disabled="isSubmitting"
            class="py-2.5 bg-expense-600 text-paper-0 font-semibold text-xs rounded-xl shadow-soft hover:bg-expense-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Loader2 v-if="isSubmitting" class="w-3.5 h-3.5 animate-spin" />
            <span>{{ isSubmitting ? "Menghapus..." : "Ya, Hapus" }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
