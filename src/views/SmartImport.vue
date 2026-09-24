<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { Camera, Upload, ScanLine, CheckCircle2, AlertTriangle, Loader2, Share2, ShieldCheck, FileImage, X } from 'lucide-vue-next';
import api from '@/lib/axios';
const router=useRouter(), route=useRoute();
const file=ref(null), preview=ref(''), loading=ref(false), result=ref(null), error=ref(''), fromShare=ref(false);
function setFile(f){ if(!f)return; if(preview.value)URL.revokeObjectURL(preview.value); file.value=f; preview.value=f.type?.startsWith('image/')?URL.createObjectURL(f):''; result.value=null; error.value=''; }
function pick(e){setFile(e.target.files?.[0])}
async function loadShared(){ if(route.query.source!=='share'||!('caches' in window))return; fromShare.value=true; try{const cache=await caches.open('ledger-share-target-v1'); const res=await cache.match('/__ledger_shared_file__'); if(res){const blob=await res.blob(); const name=decodeURIComponent(res.headers.get('X-Ledger-Name')||'shared-proof.jpg'); setFile(new File([blob],name,{type:blob.type})); await cache.delete('/__ledger_shared_file__'); await cache.delete('/__ledger_shared_meta__'); await scan();}}catch(e){error.value='Bukti dari menu Share belum dapat dibaca. Pilih file secara manual.'}}
async function scan(){if(!file.value)return;loading.value=true;error.value='';const fd=new FormData();fd.append('document',file.value);try{const r=await api.post('/api/imports/scan',fd,{headers:{'Content-Type':'multipart/form-data'}});result.value=r.data.data;}catch(e){error.value=e.response?.data?.message||'Dokumen belum dapat diproses. Kamu tetap bisa memasukkan data secara manual.'}finally{loading.value=false}}
function useDraft(){const q=result.value?.draft||{};router.push({path:'/transactions/create',query:{amount:q.amount||'',note:q.note||q.merchant||'',date:q.date||'',source:'ocr'}})}
function reset(){setFile(null);file.value=null;preview.value='';result.value=null;error.value=''}
onMounted(loadShared);onUnmounted(()=>preview.value&&URL.revokeObjectURL(preview.value));
</script>
<template>
<div class="page-shell max-w-6xl">
  <div class="page-heading"><div><span class="eyebrow">Smart Capture</span><h1>Masukkan transaksi tanpa mengetik ulang.</h1><p>Bagikan bukti dari m-banking ke Ledger, ambil foto struk, atau upload file. Ledger membaca data lalu meminta konfirmasi sebelum saldo berubah.</p></div><div class="trust-pill"><ShieldCheck class="w-4 h-4"/> Selalu review sebelum simpan</div></div>
  <div v-if="fromShare" class="notice notice-primary"><Share2 class="w-5 h-5"/><div><b>Diterima dari menu Share</b><p>Ledger sedang menyiapkan bukti yang kamu bagikan dari aplikasi lain.</p></div></div>
  <section class="grid xl:grid-cols-[1.05fr_.95fr] gap-5">
    <div class="surface-card p-5 md:p-7">
      <div class="section-heading"><div><span class="step-dot">1</span><div><h2>Pilih bukti</h2><p>Screenshot transfer, QRIS, struk, atau invoice.</p></div></div><button v-if="file" @click="reset" class="icon-button"><X class="w-4 h-4"/></button></div>
      <label class="upload-zone" :class="{'has-file':file}">
        <img v-if="preview" :src="preview" class="max-h-[420px] w-full rounded-2xl object-contain"/>
        <div v-else class="upload-icon"><Camera class="w-7 h-7"/></div>
        <div v-if="!file"><b>Ambil foto atau pilih bukti</b><span>JPG, PNG, WEBP, PDF • maks. 10 MB</span></div>
        <div v-else class="mt-4 flex items-center gap-2 text-sm"><FileImage class="w-4 h-4 text-primary-600"/><b class="truncate max-w-[260px]">{{file.name}}</b></div>
        <input class="hidden" type="file" accept="image/*" capture="environment" @change="pick"/>
      </label>
      <button @click="scan" :disabled="!file||loading" class="primary-button w-full mt-4"><Loader2 v-if="loading" class="w-4 h-4 animate-spin"/><ScanLine v-else class="w-4 h-4"/>{{loading?'Membaca bukti…':'Baca bukti dengan OCR'}}</button>
    </div>
    <div class="surface-card p-5 md:p-7 h-fit">
      <div class="section-heading"><div><span class="step-dot">2</span><div><h2>Review hasil</h2><p>Pastikan nominal dan tanggal benar.</p></div></div></div>
      <div v-if="!result&&!error&&!loading" class="empty-state"><Upload class="w-8 h-8"/><b>Belum ada hasil</b><span>Hasil pembacaan akan tampil di sini.</span></div>
      <div v-if="loading" class="empty-state"><Loader2 class="w-8 h-8 animate-spin text-primary-600"/><b>Sedang membaca bukti</b><span>Biasanya hanya membutuhkan beberapa detik.</span></div>
      <div v-if="error" class="notice notice-warning"><AlertTriangle class="w-5 h-5"/><span>{{error}}</span></div>
      <div v-if="result" class="space-y-4 mt-5">
        <div class="notice notice-success"><CheckCircle2 class="w-5 h-5"/><span>OCR selesai. Data berikut masih berupa draft.</span></div>
        <div class="review-grid"><div><span>Nominal</span><strong>Rp {{Number(result.draft?.amount||0).toLocaleString('id-ID')}}</strong></div><div><span>Tanggal</span><strong>{{result.draft?.date||'Perlu dipilih'}}</strong></div></div>
        <div><span class="field-label">Teks terdeteksi</span><pre class="ocr-text">{{result.raw_text||'Tidak ada teks yang terdeteksi.'}}</pre></div>
        <button @click="useDraft" class="primary-button w-full">Review & lengkapi transaksi</button>
      </div>
    </div>
  </section>
  <div class="surface-card p-5 flex gap-3 text-sm text-ink-600"><ShieldCheck class="w-5 h-5 text-primary-600 shrink-0"/><p><b class="text-ink-900">Privasi & kontrol.</b> OCR tidak pernah langsung mengubah saldo. Hasil selalu menjadi draft yang dapat kamu edit sebelum disimpan.</p></div>
</div>
</template>
