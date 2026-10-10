<script setup>
import BrandMark from "@/components/BrandMark.vue";
import { ArrowUpRight, Check } from "lucide-vue-next";
</script>
<template>
  <main class="auth-layout">
    <section class="auth-story" aria-label="Tentang Ledger">
      <router-link to="/login" class="brand-lockup"
        ><BrandMark /><span
          >Ledger<span class="brand-caption"
            >Keuangan, lebih terarah.</span
          ></span
        ></router-link
      >
      <div class="auth-story-content">
        <span class="auth-eyebrow">Ruang untuk keuangan Anda</span>
        <h2>Lebih tenang.<br />Lebih <em>terarah.</em></h2>
        <p>
          Dari pengeluaran kecil sampai rencana besar. Lihat semuanya dengan
          jelas, dalam satu tempat.
        </p>
        <div class="auth-preview" aria-hidden="true">
          <div class="flex justify-between items-center">
            <span>Langkah kecil. Kendali lebih besar.</span
            ><ArrowUpRight class="w-5 h-5" />
          </div>
          <div class="auth-bars"><i /><i /><i /><i /><i /><i /><i /></div>
          <div class="flex flex-wrap gap-3">
            <span><Check class="w-4 h-4" />Catat</span
            ><span><Check class="w-4 h-4" />Pahami</span
            ><span><Check class="w-4 h-4" />Rencanakan</span>
          </div>
        </div>
      </div>
      <p class="auth-story-footer">Satu kebiasaan baik, setiap hari.</p>
    </section>
    <section class="auth-form-side">
      <div class="auth-form-card"><slot /></div>
      <p class="auth-footer">Ledger · Pencatatan keuangan pribadi</p>
    </section>
  </main>
</template>
