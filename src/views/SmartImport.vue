<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { Camera, Upload, ScanLine, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-vue-next';
import api from '@/lib/axios';
const router = useRouter();
const file = ref(null); const preview = ref(''); const loading = ref(false); const result = ref(null); const error = ref('');
function pick(e){ const f=e.target.files?.[0]; if(!f)return; file.value=f; preview.value=URL.createObjectURL(f); result.value=null; error.value=''; }
async function scan(){ if(!file.value)return; loading.value=true; error.value=''; const fd=new FormData(); fd.append('document',file.value); try{const r=await api.post('/api/imports/scan',fd,{headers:{'Content-Type':'multipart/form-data'}}); result.value=r.data.data;}catch(e){error.value=e.response?.data?.message||'Dokumen belum dapat diproses. Kamu tetap bisa memasukkan data secara manual.'}finally{loading.value=false}}
function useDraft(){ const q=result.value?.draft||{}; router.push({path:'/transactions/create',query:{amount:q.amount||'',note:q.note||q.merchant||'',date:q.date||''}}); }
</script>
<template><div class="max-w-3xl mx-auto space-y-6">
  <header><p class="text-xs font-bold text-violet-600 uppercase tracking-[.18em]">Smart Capture</p><h1 class="font-display text-3xl font-extrabold text-ink-900 mt-1">Scan bukti transaksi</h1><p class="text-sm text-ink-600 mt-2 max-w-2xl">Upload screenshot m-banking, bukti transfer, atau foto struk. Hasil OCR selalu menjadi draft agar kamu dapat memeriksa nominal, tanggal, dan keterangan sebelum menyimpan.</p></header>
  <section class="grid md:grid-cols-[1.15fr_.85fr] gap-5">
    <div class="bg-paper-0 border border-line-200 rounded-3xl p-5 shadow-soft">
      <label class="min-h-72 border-2 border-dashed border-violet-200 rounded-2xl flex flex-col items-center justify-center text-center p-6 cursor-pointer hover:bg-violet-50/40 transition">
        <img v-if="preview" :src="preview" class="max-h-52 rounded-xl object-contain mb-4"/>
        <div v-else class="w-14 h-14 rounded-2xl bg-violet-100 text-violet-600 flex items-center justify-center mb-4"><Camera class="w-6 h-6"/></div>
        <b class="text-sm text-ink-900">Ambil foto atau pilih bukti</b><span class="text-xs text-ink-500 mt-1">JPG, PNG, WEBP • maks. 10 MB</span>
        <input class="hidden" type="file" accept="image/*" capture="environment" @change="pick"/>
      </label>
      <button @click="scan" :disabled="!file||loading" class="mt-4 w-full h-12 rounded-2xl bg-violet-600 text-white font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2"><Loader2 v-if="loading" class="w-4 h-4 animate-spin"/><ScanLine v-else class="w-4 h-4"/>{{loading?'Membaca bukti...':'Baca dengan OCR'}}</button>
    </div>
    <div class="bg-paper-0 border border-line-200 rounded-3xl p-5 shadow-soft h-fit">
      <h2 class="font-display font-bold text-ink-900">Hasil pemeriksaan</h2>
      <div v-if="!result&&!error" class="py-10 text-center text-xs text-ink-400"><Upload class="w-8 h-8 mx-auto mb-3"/>Hasil OCR akan tampil di sini.</div>
      <div v-if="error" class="mt-4 p-4 rounded-2xl bg-amber-50 text-amber-800 text-xs flex gap-2"><AlertTriangle class="w-4 h-4 shrink-0"/>{{error}}</div>
      <div v-if="result" class="mt-4 space-y-3">
        <div class="p-4 rounded-2xl bg-emerald-50 text-emerald-800 text-xs flex gap-2"><CheckCircle2 class="w-4 h-4"/>OCR selesai. Periksa kembali sebelum menyimpan.</div>
        <div class="grid gap-2 text-sm"><div class="flex justify-between"><span class="text-ink-500">Nominal</span><b>Rp {{ Number(result.draft?.amount||0).toLocaleString('id-ID') }}</b></div><div class="flex justify-between"><span class="text-ink-500">Tanggal</span><b>{{result.draft?.date||'-'}}</b></div><div><span class="text-xs text-ink-500">Teks terdeteksi</span><p class="mt-1 text-xs bg-base-50 rounded-xl p-3 max-h-36 overflow-auto whitespace-pre-wrap">{{result.raw_text||'Tidak ada teks.'}}</p></div></div>
        <button @click="useDraft" class="w-full h-11 rounded-xl bg-ink-900 text-white text-sm font-bold">Review sebagai transaksi</button>
      </div>
    </div>
  </section>
  <div class="rounded-2xl border border-line-200 bg-base-50 p-4 text-xs text-ink-600"><b class="text-ink-900">Privasi:</b> bukti transaksi hanya dipakai untuk proses import. Jangan menjadikan OCR sebagai sumber kebenaran; selalu review draft sebelum menyimpan.</div>
</div></template>
