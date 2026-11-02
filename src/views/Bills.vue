<script setup>
import MoneyInput from "@/components/MoneyInput.vue";
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
} from "@lucide/vue";
import { formatRupiah } from "@/utils/formatters";
const {
  bills,
  accounts,
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
  <div class="app-page page-shell">
    <div class="page-heading">
      <div>
        <span class="eyebrow">Perencanaan</span>
        <h1>Tagihan & langganan</h1>
        <p>
          Simpan biaya rutin, tanggal jatuh tempo, dan status pembayaran agar
          pengeluaran wajib tidak terlewat. Pembayaran otomatis mengurangi
          saldo yang tercatat di Ledger.
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
    <p v-if="summary.auto_pay_attention_count" role="alert" class="surface-card p-4 text-amber-700">
      {{ summary.auto_pay_attention_count }} pembayaran otomatis perlu perhatian. Periksa saldo atau rekening pada tagihan terkait.
    </p>
    <p class="text-xs text-ink-500">
      Tandai lunas mencatat status tagihan; catat pembayaran di Transaksi untuk
      memperbarui saldo. Auto bayar hanya memotong saldo internal Ledger, bukan
      melakukan debit langsung dari bank.
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
              <span v-if="b.auto_pay_enabled" class="text-[10px] px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 font-bold">Auto bayar</span>
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
              <span v-if="b.auto_pay_enabled" class="w-full text-primary-700">{{ b.auto_pay_account?.name || 'Rekening tidak tersedia' }} · otomatis</span>
              <span v-if="b.latest_auto_payment && b.latest_auto_payment.status !== 'paid'" class="w-full text-expense-600">
                {{ b.latest_auto_payment.status === 'insufficient_balance' ? 'Saldo kurang; akan dicoba lagi' : 'Rekening pembayaran tidak tersedia' }}
              </span>
              <span v-else-if="b.latest_auto_payment?.status === 'paid'" class="w-full text-income-600">Pembayaran otomatis terakhir {{ dueLabel(b.latest_auto_payment.scheduled_for) }}</span>
            </div>
          </div>
          <b class="font-mono-money text-sm">{{ formatRupiah(b.amount) }}</b>
          <div class="flex gap-1" @click.stop>
            <button
              v-if="b.status !== 'paid' && !b.auto_pay_enabled"
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
          <label class="grid gap-1.5"><span class="field-label">Nama</span><input v-model="form.name" required class="w-full px-3" placeholder="Internet rumah" /></label>
          <label class="grid gap-1.5"><span class="field-label">Nominal</span><MoneyInput v-model="form.amount" required class="w-full px-3" placeholder="350.000" /></label>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label class="grid gap-1.5"><span class="field-label">Jatuh tempo</span><input v-model="form.due_date" required type="date" class="w-full px-3" /></label>
            <label class="grid gap-1.5"><span class="field-label">Frekuensi</span><select v-model="form.frequency" required aria-label="Frekuensi tagihan" class="w-full px-3">
                <option value="" disabled>-- Pilih frekuensi --</option>
                <option value="once">Sekali</option>
                <option value="weekly">Mingguan</option>
                <option value="monthly">Bulanan</option>
                <option value="yearly">Tahunan</option>
            </select></label>
          </div>
          <label class="grid gap-1.5"><span class="field-label">Status</span><select v-model="form.status" required aria-label="Status tagihan" class="w-full px-3">
              <option value="" disabled>-- Pilih status tagihan --</option>
              <option value="active">Aktif</option>
              <option value="paused">Dijeda</option>
              <option value="paid" :disabled="form.auto_pay_enabled">Lunas</option>
            </select></label>
          <label class="grid gap-1.5"><span class="field-label">Kategori</span><input v-model="form.category" class="w-full px-3" placeholder="Listrik, internet, hiburan…" /></label>
          <label class="grid gap-1.5"><span class="field-label">Catatan</span><textarea v-model="form.note" class="w-full p-3 min-h-24" placeholder="Catatan tambahan (opsional)" /></label>
          <label class="flex gap-3 items-center text-sm"><input v-model="form.reminder_enabled" type="checkbox" />Tampilkan pengingat jatuh tempo di aplikasi</label>
          <div class="rounded-2xl border border-line-200 bg-base-50 p-4">
            <label class="flex items-start gap-3 text-sm font-semibold">
              <input v-model="form.auto_pay_enabled" type="checkbox" class="mt-1" />
              <span>Potong saldo Ledger otomatis saat jatuh tempo</span>
            </label>
            <div v-if="form.auto_pay_enabled" class="mt-3 grid gap-2">
              <label class="financial-field">Rekening sumber<select v-model="form.auto_pay_account_id" required>
                <option value="" disabled>-- Pilih rekening --</option>
                <option v-for="account in accounts.filter(item => !item.is_archived && ['cash', 'bank', 'ewallet'].includes(item.type))" :key="account.id" :value="account.id">{{ account.name }} · {{ formatRupiah(account.balance) }}</option>
              </select></label>
              <p class="text-xs leading-relaxed text-ink-500">Pada tanggal {{ dueLabel(form.due_date) }}, Ledger mencatat pengeluaran {{ formatRupiah(form.amount) }} dan mengurangi saldo internal. Ini tidak menarik uang langsung dari bank. Jika saldo kurang, pembayaran ditunda dan dicoba kembali otomatis.</p>
            </div>
          </div>
          <button :disabled="saving" class="primary-button w-full">
            {{ editing ? "Simpan perubahan" : "Tambah tagihan" }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
