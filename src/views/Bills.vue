<script setup>
import { useBills } from "@/composables/useBills";
import {
  Plus,
  ReceiptText,
  CalendarDays,
  Check,
  Trash2,
  X,
  Repeat2,
  Bell,
} from "lucide-vue-next";
import { formatRupiah } from "@/utils/formatters";
const {
  bills,
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
} = useBills();
</script>
<template>
  <div class="page-shell">
    <div class="page-heading">
      <div>
        <span class="eyebrow">Perencanaan</span>
        <h1>Tagihan & langganan</h1>
        <p>
          Simpan biaya rutin, tanggal jatuh tempo, dan status pembayaran agar
          pengeluaran wajib tidak terlewat.
        </p>
      </div>
      <button @click="add" class="primary-button">
        <Plus class="w-4 h-4" />Tambah tagihan
      </button>
    </div>
    <div class="grid sm:grid-cols-3 gap-3">
      <div class="surface-card p-5">
        <span class="field-label">Tagihan aktif</span
        ><strong class="text-2xl tracking-[-.04em]">{{
          summary.active_count
        }}</strong>
      </div>
      <div class="surface-card p-5 sm:col-span-2">
        <span class="field-label">Estimasi biaya rutin / bulan</span
        ><strong class="text-2xl tracking-[-.04em] font-mono-money">{{
          formatRupiah(summary.monthly_total)
        }}</strong>
      </div>
    </div>
    <p
      v-if="summary.overdue_count"
      role="status"
      class="surface-card p-4 text-amber-700"
    >
      {{ summary.overdue_count }} tagihan sudah jatuh tempo: Periksa tanggal
      jatuh tempo pada daftar tagihan.
    </p>
    <p class="text-xs text-ink-500">
      Tandai lunas mencatat status tagihan; catat pembayaran di Transaksi untuk
      memperbarui saldo.
    </p>
    <p v-if="loadError" role="alert" class="text-expense-600">
      Daftar belum berhasil diperbarui.
      <button @click="load(page)" class="underline">Coba lagi</button>
    </p>
    <div class="surface-card overflow-hidden" :aria-busy="loading">
      <div
        class="p-5 border-b border-line-200 flex items-center justify-between"
      >
        <div>
          <h2 class="font-bold">Daftar tagihan</h2>
          <p class="text-xs text-ink-500 mt-1">
            Klik item untuk mengubah data tanpa perlu menghapus.
          </p>
        </div>
        <ReceiptText class="w-5 h-5 text-primary-600" />
      </div>
      <div v-if="!bills.length && !loading" class="empty-state">
        <ReceiptText class="w-8 h-8" /><b>Belum ada tagihan</b
        ><span
          >Tambahkan internet, listrik, subscription, cicilan, atau tagihan
          lainnya.</span
        >
      </div>
      <div class="divide-y divide-line-200">
        <div
          v-for="b in bills"
          :key="b.id"
          class="p-4 md:p-5 flex items-center gap-4 hover:bg-base-50 transition cursor-pointer"
          @click="edit(b)"
        >
          <div
            class="w-11 h-11 rounded-2xl bg-primary-100 text-primary-600 grid place-items-center shrink-0"
          >
            <Repeat2
              v-if="b.frequency !== 'once'"
              class="w-5 h-5"
            /><ReceiptText v-else class="w-5 h-5" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <b class="text-sm truncate">{{ b.name }}</b
              ><span
                v-if="b.status === 'paid'"
                class="text-[10px] px-2 py-0.5 rounded-full bg-income-100 text-income-600 font-bold"
                >Lunas</span
              >
            </div>
            <div
              class="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-500 mt-1"
            >
              <span class="flex gap-1 items-center"
                ><CalendarDays class="w-3 h-3" />{{
                  dueLabel(b.due_date)
                }}</span
              ><span>{{ b.frequency }}</span
              ><span v-if="b.reminder_enabled" class="flex gap-1 items-center"
                ><Bell class="w-3 h-3" />Reminder</span
              >
            </div>
          </div>
          <b class="font-mono-money text-sm">{{ formatRupiah(b.amount) }}</b>
          <div class="flex gap-1" @click.stop>
            <button
              v-if="b.status !== 'paid'"
              @click="paid(b)"
              class="icon-button text-income-600"
              title="Tandai lunas"
            >
              <Check class="w-4 h-4" /></button
            ><button
              @click="del(b)"
              class="icon-button text-expense-600"
              title="Hapus"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
    <div
      class="flex items-center justify-between gap-3 mt-4"
      v-if="lastPage > 1"
    >
      <span class="text-sm text-ink-500"
        >Halaman {{ page }} dari {{ lastPage }} · Ringkasan mencakup semua
        halaman</span
      >
      <div class="flex flex-wrap gap-2">
        <button
          class="secondary-button"
          :disabled="loading || page <= 1"
          @click="load(page - 1)"
        >
          Sebelumnya
        </button>
        <button
          class="secondary-button"
          :disabled="loading || page >= lastPage"
          @click="load(page + 1)"
        >
          Berikutnya
        </button>
      </div>
    </div>
    <div
      v-if="open"
      v-dialog="
        () => {
          open = false;
        }
      "
      class="dialog-backdrop fixed inset-0 z-50 bg-black/35 backdrop-blur-sm grid place-items-end sm:place-items-center p-0 sm:p-4"
      @click="close"
    >
      <form
        @submit.prevent="save"
        class="bg-paper-0 w-full sm:max-w-lg rounded-t-[28px] sm:rounded-[24px] p-5 md:p-6 shadow-soft max-h-[90vh] overflow-auto"
        @click.stop
      >
        <div class="flex justify-between items-start mb-5">
          <div>
            <span class="eyebrow">{{ editing ? "Edit" : "Baru" }}</span>
            <h2 class="text-xl font-extrabold">
              {{ editing ? "Ubah tagihan" : "Tambah tagihan" }}
            </h2>
          </div>
          <button
            type="button"
            @click="close"
            class="icon-button"
            aria-label="Tutup dialog"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
        <div class="grid gap-4">
          <label
            ><span class="field-label">Nama</span
            ><input
              v-model="form.name"
              required
              class="w-full px-3"
              placeholder="Internet rumah" /></label
          ><label
            ><span class="field-label">Nominal</span
            ><input
              v-model="form.amount"
              required
              type="number"
              min="0"
              step="0.01"
              class="w-full px-3"
              placeholder="350000"
          /></label>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label
              ><span class="field-label">Jatuh tempo</span
              ><input
                v-model="form.due_date"
                required
                type="date"
                class="w-full px-3" /></label
            ><label
              ><span class="field-label">Frekuensi</span
              ><select v-model="form.frequency" class="w-full px-3">
                <option value="once">Sekali</option>
                <option value="weekly">Mingguan</option>
                <option value="monthly">Bulanan</option>
                <option value="yearly">Tahunan</option>
              </select></label
            >
          </div>
          <label
            ><span class="field-label">Status</span
            ><select v-model="form.status" class="w-full px-3">
              <option value="active">Aktif</option>
              <option value="paused">Dijeda</option>
              <option value="paid">Lunas</option>
            </select></label
          ><label
            ><span class="field-label">Kategori</span
            ><input
              v-model="form.category"
              class="w-full px-3"
              placeholder="Listrik, internet, hiburan…" /></label
          ><label
            ><span class="field-label">Catatan</span
            ><textarea v-model="form.note" class="w-full p-3 min-h-24" /></label
          ><label class="flex gap-3 items-center text-sm"
            ><input v-model="form.reminder_enabled" type="checkbox" />Tampilkan
            pengingat jatuh tempo di aplikasi</label
          ><button :disabled="saving" class="primary-button w-full">
            {{ editing ? "Simpan perubahan" : "Tambah tagihan" }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
