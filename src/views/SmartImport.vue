<script setup>
import { ref, watch, onUnmounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import {
  Camera,
  Upload,
  ScanLine,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Share2,
  ShieldCheck,
  FileImage,
  X,
} from "lucide-vue-next";
import api from "@/lib/axios";
const router = useRouter(),
  route = useRoute();
const file = ref(null),
  preview = ref(""),
  loading = ref(false),
  result = ref(null),
  error = ref(""),
  fromShare = ref(false);
const status = ref("");
let controller;
let pendingShare = false;
function setFile(f) {
  if (loading.value) return false;
  if (f && (f.size > 10 * 1024 * 1024 || !/\.(jpe?g|png|webp)$/i.test(f.name) && !["image/jpeg", "image/png", "image/webp"].includes(f.type))) {
    error.value = "Pilih gambar JPG, PNG, atau WEBP dengan ukuran maksimal 10 MB.";
    return false;
  }
  if (preview.value) URL.revokeObjectURL(preview.value);
  file.value = f;
  preview.value = f ? URL.createObjectURL(f) : "";
  result.value = null;
  error.value = "";
  return true;
}
function pick(e) {
  if (e.target.files?.[0] && setFile(e.target.files[0])) fromShare.value = false;
  e.target.value = "";
}
async function loadShared() {
  if (loading.value) {
    pendingShare = true;
    return;
  }
  if (route.query.source !== "share" || !("caches" in window)) return;
  fromShare.value = true;
  try {
    const cache = await caches.open("ledger-share-target-v1");
    const id = typeof route.query.shareId === "string" ? route.query.shareId : "";
    const key = id ? `/__ledger_shared_file__/${encodeURIComponent(id)}` : "/__ledger_shared_file__";
    const res = await cache.match(key);
    if (res) {
      const blob = await res.blob();
      const name = decodeURIComponent(
        res.headers.get("X-Ledger-Name") || "shared-proof.jpg",
      );
      const accepted = setFile(new File([blob], name, { type: blob.type }));
      await cache.delete(key);
      await cache.delete("/__ledger_shared_meta__");
      if (accepted) await scan();
    } else {
      error.value = "Tidak ada gambar dari menu Share. Bagikan file gambar atau pilih dari galeri.";
    }
  } catch (e) {
    error.value =
      "Bukti dari menu Share belum dapat dibaca. Pilih file secara manual.";
  }
}
async function scan() {
  if (!file.value || loading.value) return;

  loading.value = true;
  error.value = "";
  result.value = null;

  controller = new AbortController();
  status.value = "Mengunggah gambar…";
  const fd = new FormData();
  fd.append("document", file.value);

  try {
    const r = await api.post("/api/imports/scan", fd, {
      timeout: 45000,
      signal: controller.signal,
      onUploadProgress: (event) => {
        if (event.total && event.loaded >= event.total) status.value = "Membaca teks dan menyiapkan draft…";
      },
    });

    if (!r.data?.data) {
      throw new Error("INVALID_OCR_RESPONSE");
    }

    result.value = r.data.data;
  } catch (e) {
    if (e.code === "ERR_CANCELED") return;
    if (e.message === "INVALID_OCR_RESPONSE") {
      error.value = "Respons OCR tidak valid. Coba lagi.";
      return;
    }

    if (e.code === "ECONNABORTED" || e.code === "ETIMEDOUT") {
      error.value =
        "Server belum merespons dalam 45 detik. Periksa koneksi lalu coba lagi; gambar tetap tersedia.";
      return;
    }

    if (e.response?.status === 401) {
      error.value = "Sesi login sudah berakhir. Silakan login kembali.";
      return;
    }

    if ([502, 503, 504].includes(e.response?.status)) {
      error.value = "Layanan OCR sedang lambat atau tidak tersedia. Coba lagi sebentar lagi.";
      return;
    }
    if (e.response?.status === 413) {
      error.value = "Ukuran gambar terlalu besar.";
      return;
    }

    if (e.response?.status === 422) {
      error.value = e.response?.data?.errors?.document?.[0] || e.response?.data?.message || "Bukti belum berhasil dibaca.";
      return;
    }

    if (!e.response) {
      error.value =
        "Tidak dapat terhubung ke server OCR. Periksa koneksi internet.";
      return;
    }

    error.value =
      e.response?.data?.message || "Terjadi kesalahan saat membaca bukti.";
  } finally {
    loading.value = false;
    if (pendingShare) {
      pendingShare = false;
      void loadShared();
    }
  }
}
function useDraft() {
  const q = result.value?.draft || {};
  router.push({
    path: "/transactions/create",
    query: {
      amount: q.amount || "",
      note: q.note || q.merchant || "",
      date: q.date || "",
      source: "ocr",
    },
  });
}
function reset() {
  if (setFile(null)) fromShare.value = false;
}
watch(() => [route.query.source, route.query.shareId], loadShared, { immediate: true });
onUnmounted(() => {
  pendingShare = false;
  controller?.abort();
  if (preview.value) URL.revokeObjectURL(preview.value);
});
</script>
<template>
  <div class="page-shell max-w-6xl">
    <div class="page-heading">
      <div>
        <span class="eyebrow">Smart Capture</span>
        <h1>Masukkan transaksi tanpa mengetik ulang.</h1>
        <p>
          Bagikan bukti dari m-banking ke Ledger, ambil foto struk, atau upload
          file. Ledger membaca data lalu meminta konfirmasi sebelum saldo
          berubah.
        </p>
      </div>
      <div class="trust-pill">
        <ShieldCheck class="w-4 h-4" /> Selalu review sebelum simpan
      </div>
    </div>
    <div v-if="fromShare" class="notice notice-primary">
      <Share2 class="w-5 h-5" />
      <div>
        <b>Diterima dari menu Share</b>
        <p>
          Bukti dari aplikasi lain akan dibaca untuk menyiapkan draft transaksi.
        </p>
      </div>
    </div>
    <section class="grid xl:grid-cols-[1.05fr_.95fr] gap-5">
      <div class="surface-card p-5 md:p-7">
        <div class="section-heading">
          <div>
            <span class="step-dot">1</span>
            <div>
              <h2>Pilih bukti</h2>
              <p>Screenshot transfer, QRIS, struk, atau invoice.</p>
            </div>
          </div>
          <button v-if="file" @click="reset" :disabled="loading" aria-label="Hapus gambar" class="icon-button">
            <X class="w-4 h-4" />
          </button>
        </div>
        <label class="upload-zone" :class="{ 'has-file': file }">
          <img
            v-if="preview"
            :src="preview"
            alt="Preview bukti transaksi"
            class="max-h-[420px] w-full rounded-2xl object-contain"
          />
          <div v-else class="upload-icon"><Camera class="w-7 h-7" /></div>
          <div v-if="!file">
            <b>Pilih gambar dari galeri atau file</b
            ><span>JPG, PNG, WEBP • maks. 10 MB</span>
          </div>
          <div v-else class="mt-4 flex items-center gap-2 text-sm">
            <FileImage class="w-4 h-4 text-primary-600" /><b
              class="truncate max-w-[260px]"
              >{{ file.name }}</b
            >
          </div>
          <input
            class="hidden"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            :disabled="loading"
            @change="pick"
          />
        </label>
        <div class="grid grid-cols-2 gap-3 mt-4">
          <label class="secondary-button" :class="{ 'opacity-50': loading }">
            <Upload class="w-4 h-4" /> Upload gambar
            <input class="sr-only" type="file" accept="image/jpeg,image/png,image/webp" :disabled="loading" @change="pick" />
          </label>
          <label class="secondary-button" :class="{ 'opacity-50': loading }">
            <Camera class="w-4 h-4" /> Ambil foto
            <input class="sr-only" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" :disabled="loading" @change="pick" />
          </label>
        </div>
        <button
          @click="scan"
          :disabled="!file || loading"
          class="primary-button w-full mt-4"
        >
          <Loader2 v-if="loading" class="w-4 h-4 animate-spin" /><ScanLine
            v-else
            class="w-4 h-4"
          />{{ loading ? "Membaca bukti…" : "Baca bukti dengan OCR" }}
        </button>
      </div>
      <div class="surface-card p-5 md:p-7 h-fit">
        <div class="section-heading">
          <div>
            <span class="step-dot">2</span>
            <div>
              <h2>Review hasil</h2>
              <p>Pastikan nominal dan tanggal benar.</p>
            </div>
          </div>
        </div>
        <div v-if="!result && !error && !loading" class="empty-state">
          <Upload class="w-8 h-8" /><b>Belum ada hasil</b
          ><span>Hasil pembacaan akan tampil di sini.</span>
        </div>
        <div v-if="loading" class="empty-state">
          <Loader2 class="w-8 h-8 animate-spin text-primary-600" /><b
            >{{ status }}</b
          ><span>Tetap di halaman ini hingga draft atau pesan hasil muncul.</span>
        </div>
        <div v-if="error" role="alert" class="notice notice-warning">
          <AlertTriangle class="w-5 h-5" /><span>{{ error }}</span>
        </div>
        <div v-if="result" class="space-y-4 mt-5">
          <div class="notice notice-success">
            <CheckCircle2 class="w-5 h-5" /><span
              >OCR selesai. Data berikut masih berupa draft.</span
            >
          </div>
          <div class="review-grid">
            <div>
              <span>Nominal</span
              ><strong
                >Rp
                {{
                  result.draft?.amount == null ? "—" : Number(result.draft.amount).toLocaleString("id-ID")
                }}</strong
              >
            </div>
            <div>
              <span>Tanggal</span
              ><strong>{{ result.draft?.date || "Perlu dipilih" }}</strong>
            </div>
          </div>
          <div>
            <span class="field-label">Teks terdeteksi</span>
            <pre class="ocr-text">{{
              result.raw_text || "Tidak ada teks yang terdeteksi."
            }}</pre>
          </div>
          <button @click="useDraft" class="primary-button w-full">
            Review & lengkapi transaksi
          </button>
        </div>
      </div>
    </section>
    <div class="surface-card p-5 flex gap-3 text-sm text-ink-600">
      <ShieldCheck class="w-5 h-5 text-primary-600 shrink-0" />
      <p>
        <b class="text-ink-900">Privasi & kontrol.</b> OCR tidak pernah langsung
        mengubah saldo. Hasil selalu menjadi draft yang dapat kamu edit sebelum
        disimpan.
      </p>
    </div>
  </div>
</template>
