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
  Bug,
} from "lucide-vue-next";

import api from "@/lib/axios";

const router = useRouter();
const route = useRoute();

const file = ref(null);
const preview = ref("");
const loading = ref(false);
const result = ref(null);
const error = ref("");
const fromShare = ref(false);
const status = ref("");

/*
|--------------------------------------------------------------------------
| Share Target Debug
|--------------------------------------------------------------------------
|
| Sementara ditampilkan untuk mengetahui payload asli yang dikirim
| aplikasi seperti myBCA ke Web Share Target.
|
*/
const shareDebug = ref(null);
const shareStatus = ref("");

let controller = null;
let pendingShare = false;

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function revokePreview() {
  if (preview.value) {
    URL.revokeObjectURL(preview.value);
    preview.value = "";
  }
}

function setFile(f) {
  if (loading.value) return false;

  if (!f) {
    revokePreview();

    file.value = null;
    result.value = null;
    error.value = "";

    return true;
  }

  if (f.size > 10 * 1024 * 1024) {
    error.value = "Ukuran bukti maksimal 10 MB.";
    return false;
  }

  if (!f.size) {
    error.value = "File yang dipilih kosong.";
    return false;
  }

  revokePreview();

  file.value = f;

  /*
   * Jangan terlalu ketat terhadap MIME.
   * Android/m-banking dapat mengirim image sebagai
   * application/octet-stream atau MIME kosong.
   */
  try {
    preview.value = URL.createObjectURL(f);
  } catch (e) {
    console.warn("Gagal membuat preview:", e);
    preview.value = "";
  }

  result.value = null;
  error.value = "";

  return true;
}

function pick(e) {
  const selected = e.target.files?.[0];

  if (selected && setFile(selected)) {
    fromShare.value = false;
    shareDebug.value = null;
    shareStatus.value = "";
  }

  e.target.value = "";
}

/*
|--------------------------------------------------------------------------
| Share Target
|--------------------------------------------------------------------------
*/

async function readShareMeta(cache, id) {
  if (!id) return null;

  const metaKey = `/__ledger_shared_meta__/${encodeURIComponent(id)}`;

  const metaResponse = await cache.match(metaKey);

  if (!metaResponse) {
    return null;
  }

  try {
    return await metaResponse.json();
  } catch (e) {
    console.warn("Metadata Share Target tidak valid:", e);
    return null;
  }
}

async function loadShared() {
  /*
   * Jika OCR sedang berjalan dan ada share baru,
   * tunggu sampai OCR selesai.
   */
  if (loading.value) {
    pendingShare = true;
    return;
  }

  if (route.query.source !== "share") {
    return;
  }

  fromShare.value = true;

  shareStatus.value =
    typeof route.query.shareStatus === "string" ? route.query.shareStatus : "";

  shareDebug.value = null;

  if (!("caches" in window)) {
    error.value =
      "Browser ini tidak mendukung penyimpanan Share Target yang dibutuhkan Ledger.";
    return;
  }

  try {
    /*
     * Harus sama dengan CACHE NAME di src/sw.js
     */
    const cache = await caches.open("ledger-share-target-v2");

    const id =
      typeof route.query.shareId === "string" ? route.query.shareId : "";

    /*
     * Share versi baru memakai shareId.
     * Fallback key dipertahankan untuk kompatibilitas.
     */
    const fileKey = id
      ? `/__ledger_shared_file__/${encodeURIComponent(id)}`
      : "/__ledger_shared_file__";

    const response = await cache.match(fileKey);

    /*
     * Selalu baca metadata diagnostic.
     */
    const diagnostic = await readShareMeta(cache, id);

    shareDebug.value = diagnostic;

    console.log("Ledger Share Target:", {
      id,
      shareStatus: shareStatus.value,
      diagnostic,
      fileFound: Boolean(response),
    });

    /*
     * ================================================================
     * FILE TIDAK DITEMUKAN
     * ================================================================
     */
    if (!response) {
      if (shareStatus.value === "too-large") {
        error.value = "Bukti yang dibagikan lebih besar dari 10 MB.";
        return;
      }

      if (shareStatus.value === "error") {
        error.value =
          "Ledger menerima permintaan Share, tetapi terjadi kesalahan ketika membaca data dari aplikasi sumber.";
        return;
      }

      if (shareStatus.value === "no-file") {
        error.value =
          "Ledger berhasil dibuka dari menu Share, tetapi aplikasi sumber tidak mengirim gambar sebagai file.";
        return;
      }

      error.value =
        "Ledger berhasil dibuka dari menu Share, tetapi file bukti tidak ditemukan.";

      return;
    }

    /*
     * ================================================================
     * FILE DITEMUKAN
     * ================================================================
     */

    const blob = await response.blob();

    if (!blob.size) {
      error.value =
        "File yang dibagikan kosong. Coba bagikan ulang bukti transaksi.";
      return;
    }

    let name = "shared-proof.jpg";

    try {
      const headerName = response.headers.get("X-Ledger-Name");

      if (headerName) {
        name = decodeURIComponent(headerName);
      }
    } catch (e) {
      console.warn("Tidak dapat membaca nama file share:", e);
    }

    /*
     * MIME dari aplikasi Android kadang:
     *
     * image/jpeg
     * image/png
     * application/octet-stream
     * atau kosong.
     *
     * Jangan menolak file hanya karena MIME.
     */
    let mime = blob.type || response.headers.get("Content-Type") || "";

    if (!mime || mime === "application/octet-stream") {
      if (/\.png$/i.test(name)) {
        mime = "image/png";
      } else if (/\.webp$/i.test(name)) {
        mime = "image/webp";
      } else {
        mime = "image/jpeg";
      }
    }

    /*
     * Jika Android memberikan nama tanpa extension,
     * tambahkan extension agar backend Laravel dapat
     * memproses file dengan lebih konsisten.
     */
    if (!/\.(jpe?g|png|webp)$/i.test(name)) {
      if (mime === "image/png") {
        name += ".png";
      } else if (mime === "image/webp") {
        name += ".webp";
      } else {
        name += ".jpg";
      }
    }

    const sharedFile = new File([blob], name, {
      type: mime,
      lastModified: Date.now(),
    });

    console.log("Shared file reconstructed:", {
      name: sharedFile.name,
      type: sharedFile.type,
      size: sharedFile.size,
    });

    const accepted = setFile(sharedFile);

    if (!accepted) {
      return;
    }

    /*
     * File berhasil dipindahkan dari Cache Storage
     * ke state Vue.
     */
    await cache.delete(fileKey);

    if (id) {
      await cache.delete(`/__ledger_shared_meta__/${encodeURIComponent(id)}`);
    }

    /*
     * Otomatis jalankan OCR.
     */
    await scan();
  } catch (e) {
    console.error("Gagal membaca file dari Share Target:", e);

    error.value =
      "Bukti dari menu Share belum dapat dibaca. Coba bagikan ulang atau pilih gambar secara manual.";
  }
}

/*
|--------------------------------------------------------------------------
| OCR
|--------------------------------------------------------------------------
*/

async function scan() {
  if (!file.value || loading.value) return;

  loading.value = true;
  error.value = "";
  result.value = null;

  controller = new AbortController();

  status.value = "Mengunggah gambar…";

  const fd = new FormData();

  fd.append("document", file.value, file.value.name || "shared-proof.jpg");

  try {
    const r = await api.post("/api/imports/scan", fd, {
      timeout: 45000,
      signal: controller.signal,

      /*
       * Jangan set Content-Type multipart/form-data manual.
       * Browser akan menambahkan boundary.
       */
      onUploadProgress: (event) => {
        if (event.total && event.loaded >= event.total) {
          status.value = "Membaca teks dan menyiapkan draft…";
        }
      },
    });

    if (!r.data?.data) {
      throw new Error("INVALID_OCR_RESPONSE");
    }

    result.value = r.data.data;
    status.value = "";
  } catch (e) {
    if (e.code === "ERR_CANCELED" || e.name === "CanceledError") {
      return;
    }

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
      error.value =
        "Layanan OCR sedang lambat atau tidak tersedia. Coba lagi sebentar lagi.";
      return;
    }

    if (e.response?.status === 413) {
      error.value = "Ukuran gambar terlalu besar.";
      return;
    }

    if (e.response?.status === 422) {
      error.value =
        e.response?.data?.errors?.document?.[0] ||
        e.response?.data?.message ||
        "Bukti belum berhasil dibaca.";

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
    controller = null;

    if (pendingShare) {
      pendingShare = false;
      void loadShared();
    }
  }
}

/*
|--------------------------------------------------------------------------
| Draft transaction
|--------------------------------------------------------------------------
*/

function useDraft() {
  const q = result.value?.draft || {};

  router.push({
    path: "/transactions/create",

    query: {
      amount: q.amount ?? "",
      note: q.note || q.merchant || "",
      date: q.date || "",
      source: "ocr",
    },
  });
}

/*
|--------------------------------------------------------------------------
| Reset
|--------------------------------------------------------------------------
*/

function reset() {
  if (loading.value) return;

  revokePreview();

  file.value = null;
  result.value = null;
  error.value = "";
  status.value = "";
  fromShare.value = false;
  shareDebug.value = null;
  shareStatus.value = "";
}

/*
|--------------------------------------------------------------------------
| Watch Share Target URL
|--------------------------------------------------------------------------
*/

watch(
  () => [route.query.source, route.query.shareId, route.query.shareStatus],
  () => {
    void loadShared();
  },
  {
    immediate: true,
  },
);

/*
|--------------------------------------------------------------------------
| Cleanup
|--------------------------------------------------------------------------
*/

onUnmounted(() => {
  pendingShare = false;

  controller?.abort();

  revokePreview();
});
</script>

<template>
  <div class="page-shell max-w-6xl">
    <!-- ============================================================= -->
    <!-- HEADER -->
    <!-- ============================================================= -->

    <div class="page-heading">
      <div>
        <span class="eyebrow"> Smart Capture </span>

        <h1>Masukkan transaksi tanpa mengetik ulang.</h1>

        <p>
          Bagikan bukti dari m-banking ke Ledger, ambil foto struk, atau upload
          file. Ledger membaca data lalu meminta konfirmasi sebelum saldo
          berubah.
        </p>
      </div>

      <div class="trust-pill">
        <ShieldCheck class="w-4 h-4" />
        Selalu review sebelum simpan
      </div>
    </div>

    <!-- ============================================================= -->
    <!-- SHARE NOTICE -->
    <!-- ============================================================= -->

    <div v-if="fromShare" class="notice notice-primary">
      <Share2 class="w-5 h-5 shrink-0" />

      <div>
        <b>Dibuka dari menu Share</b>

        <p v-if="file">
          Bukti berhasil diterima dan sedang diproses oleh Ledger.
        </p>

        <p v-else>Ledger sedang memeriksa data yang dikirim aplikasi sumber.</p>
      </div>
    </div>

    <!-- ============================================================= -->
    <!-- CONTENT -->
    <!-- ============================================================= -->

    <section class="grid xl:grid-cols-[1.05fr_.95fr] gap-5">
      <!-- =========================================================== -->
      <!-- STEP 1 -->
      <!-- =========================================================== -->

      <div class="surface-card p-5 md:p-7">
        <div class="section-heading">
          <div>
            <span class="step-dot">1</span>

            <div>
              <h2>Pilih bukti</h2>

              <p>Screenshot transfer, QRIS, struk, atau invoice.</p>
            </div>
          </div>

          <button
            v-if="file"
            type="button"
            @click="reset"
            :disabled="loading"
            aria-label="Hapus gambar"
            class="icon-button"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Upload / Preview -->

        <label class="upload-zone" :class="{ 'has-file': file }">
          <img
            v-if="preview"
            :src="preview"
            alt="Preview bukti transaksi"
            class="max-h-[420px] w-full rounded-2xl object-contain"
          />

          <div v-else class="upload-icon">
            <Camera class="w-7 h-7" />
          </div>

          <div v-if="!file">
            <b> Pilih gambar dari galeri atau file </b>

            <span> JPG, PNG, WEBP • maks. 10 MB </span>
          </div>

          <div v-else class="mt-4 flex items-center gap-2 text-sm">
            <FileImage class="w-4 h-4 text-primary-600 shrink-0" />

            <b class="truncate max-w-[260px]">
              {{ file.name }}
            </b>
          </div>

          <input
            class="hidden"
            type="file"
            accept="image/*"
            :disabled="loading"
            @change="pick"
          />
        </label>

        <!-- Upload buttons -->

        <div class="grid grid-cols-2 gap-3 mt-4">
          <label class="secondary-button" :class="{ 'opacity-50': loading }">
            <Upload class="w-4 h-4" />

            Upload gambar

            <input
              class="sr-only"
              type="file"
              accept="image/*"
              :disabled="loading"
              @change="pick"
            />
          </label>

          <label class="secondary-button" :class="{ 'opacity-50': loading }">
            <Camera class="w-4 h-4" />

            Ambil foto

            <input
              class="sr-only"
              type="file"
              accept="image/*"
              capture="environment"
              :disabled="loading"
              @change="pick"
            />
          </label>
        </div>

        <!-- OCR button -->

        <button
          type="button"
          @click="scan"
          :disabled="!file || loading"
          class="primary-button w-full mt-4"
        >
          <Loader2 v-if="loading" class="w-4 h-4 animate-spin" />

          <ScanLine v-else class="w-4 h-4" />

          {{ loading ? "Membaca bukti…" : "Baca bukti dengan OCR" }}
        </button>
      </div>

      <!-- =========================================================== -->
      <!-- STEP 2 -->
      <!-- =========================================================== -->

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

        <!-- Empty -->

        <div v-if="!result && !error && !loading" class="empty-state">
          <Upload class="w-8 h-8" />

          <b>Belum ada hasil</b>

          <span> Hasil pembacaan akan tampil di sini. </span>
        </div>

        <!-- Loading -->

        <div v-if="loading" class="empty-state">
          <Loader2 class="w-8 h-8 animate-spin text-primary-600" />

          <b>
            {{ status }}
          </b>

          <span>
            Tetap di halaman ini hingga draft atau pesan hasil muncul.
          </span>
        </div>

        <!-- Error -->

        <div v-if="error" role="alert" class="notice notice-warning">
          <AlertTriangle class="w-5 h-5 shrink-0" />

          <span>
            {{ error }}
          </span>
        </div>

        <!-- ========================================================= -->
        <!-- TEMPORARY SHARE DEBUG -->
        <!-- ========================================================= -->

        <div
          v-if="fromShare && shareDebug && !file"
          class="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4"
        >
          <div class="flex items-center gap-2 mb-3 text-red-700">
            <Bug class="w-4 h-4" />

            <b class="text-xs"> SHARE DEBUG </b>
          </div>

          <p class="text-xs text-red-700 mb-3">
            Informasi sementara untuk mengetahui format data yang dikirim
            aplikasi sumber.
          </p>

          <pre
            class="max-h-72 overflow-auto whitespace-pre-wrap break-all rounded-xl bg-white/70 p-3 text-[10px] leading-relaxed text-red-700"
            >{{ JSON.stringify(shareDebug, null, 2) }}</pre
          >
        </div>

        <!-- ========================================================= -->
        <!-- RESULT -->
        <!-- ========================================================= -->

        <div v-if="result" class="space-y-4 mt-5">
          <div class="notice notice-success">
            <CheckCircle2 class="w-5 h-5 shrink-0" />

            <span> OCR selesai. Data berikut masih berupa draft. </span>
          </div>

          <div class="review-grid">
            <div>
              <span>Nominal</span>

              <strong>
                Rp
                {{
                  result.draft?.amount == null
                    ? "—"
                    : Number(result.draft.amount).toLocaleString("id-ID")
                }}
              </strong>
            </div>

            <div>
              <span>Tanggal</span>

              <strong>
                {{ result.draft?.date || "Perlu dipilih" }}
              </strong>
            </div>
          </div>

          <div>
            <span class="field-label"> Teks terdeteksi </span>

            <pre class="ocr-text">{{
              result.raw_text || "Tidak ada teks yang terdeteksi."
            }}</pre>
          </div>

          <button type="button" @click="useDraft" class="primary-button w-full">
            Review & lengkapi transaksi
          </button>
        </div>
      </div>
    </section>

    <!-- ============================================================= -->
    <!-- PRIVACY -->
    <!-- ============================================================= -->

    <div class="surface-card p-5 flex gap-3 text-sm text-ink-600">
      <ShieldCheck class="w-5 h-5 text-primary-600 shrink-0" />

      <p>
        <b class="text-ink-900"> Privasi & kontrol. </b>

        OCR tidak pernah langsung mengubah saldo. Hasil selalu menjadi draft
        yang dapat kamu edit sebelum disimpan.
      </p>
    </div>
  </div>
</template>
