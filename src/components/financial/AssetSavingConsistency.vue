<script setup>
import MoneyInput from "@/components/MoneyInput.vue";
import { formatRupiah } from "@/utils/formatters";

const props = defineProps({
  summary: { type: Object, required: true },
  modelValue: { type: Object, required: true },
  busy: { type: Boolean, default: false },
});
const emit = defineEmits(["update:modelValue", "save", "delete"]);

function update(key, value) {
  emit("update:modelValue", { ...props.modelValue, [key]: value });
}
</script>

<template>
  <section class="surface-card my-4 p-4 sm:p-5">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p class="text-sm font-semibold text-ink-700">Konsistensi investasi</p>
        <p class="mt-1 text-xs text-ink-500">Bulan dihitung saat ada pembelian yang sudah dikonfirmasi. Saldo awal dan perubahan harga tidak dihitung sebagai setoran.</p>
      </div>
      <div class="flex gap-5 text-sm">
        <span><b class="block text-lg">{{ summary.current_streak }}</b>bulan beruntun</span>
        <span><b class="block text-lg">{{ summary.longest_streak }}</b>rekor terpanjang</span>
      </div>
    </div>
    <div class="mt-4 grid gap-3 sm:grid-cols-2">
      <div v-for="target in summary.monthly_targets" :key="target.type" class="rounded-xl border border-line-200 p-3">
        <div class="flex justify-between gap-3 text-sm"><b>{{ target.type === 'gold' ? 'Emas' : 'RDPU' }}</b><span>Realisasi {{ formatRupiah(target.actual) }}</span></div>
        <p v-if="target.target" class="mt-1 text-xs text-ink-500">Target {{ formatRupiah(target.target) }} · tersisa {{ formatRupiah(target.remaining) }}</p>
        <p v-else class="mt-1 text-xs text-ink-500">Target bulanan belum diatur.</p>
        <button v-if="target.target" type="button" class="mt-2 text-xs font-semibold text-expense-600" :disabled="busy" @click="emit('delete', target.type)">Hapus target</button>
      </div>
    </div>
    <form class="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]" @submit.prevent="emit('save')">
      <label class="financial-field">Jenis investasi<select :value="modelValue.type" @change="update('type', $event.target.value)"><option value="rdpu">RDPU</option><option value="gold">Emas</option></select></label>
      <label class="financial-field">Target per bulan<MoneyInput :model-value="modelValue.amount" min="1" step="1" placeholder="Contoh: 1.000.000" required @update:model-value="update('amount', $event)" /></label>
      <button class="primary-button self-end" :disabled="busy">Simpan target</button>
    </form>
  </section>
</template>
