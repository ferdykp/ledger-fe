import "./style.css";

import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import { registerSW } from "virtual:pwa-register";

// Registrasi Service Worker PWA secara otomatis
registerSW({ immediate: true, updateViaCache: "none" });

const app = createApp(App);

app.use(createPinia());
app.use(router);

app.mount("#app");
