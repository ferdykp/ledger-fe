import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.js",
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["favicon.svg", "pwa-192x192.png", "pwa-512x512.png"],
      manifest: {
        id: "/",
        name: "Ledger — Personal Finance",
        short_name: "Ledger",
        description: "Kelola transaksi, budget, goals, tagihan, dan bukti pembayaran dalam satu tempat.",
        theme_color: "#635BFF",
        background_color: "#F6F7FB",
        display: "standalone",
        orientation: "any",
        start_url: "/",
        scope: "/",
        categories: ["finance", "productivity"],
        share_target: {
          action: "/share-target",
          method: "POST",
          enctype: "multipart/form-data",
          params: {
            title: "title",
            text: "text",
            url: "url",
            files: [{ name: "files", accept: ["image/jpeg", "image/png", "image/webp"] }],
          },
        },
        shortcuts: [
          { name: "Tambah transaksi", short_name: "Tambah", url: "/transactions/create", icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }] },
          { name: "Scan bukti", short_name: "Scan", url: "/scan", icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }] },
        ],
        icons: [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
      injectManifest: { globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"] },
      devOptions: { enabled: false },
    }),
  ],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
