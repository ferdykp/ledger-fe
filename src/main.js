import "./style.css";
import "./design.css";
import dialog from "./directives/dialog";

import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import { useAuthStore } from "./stores/auth";
import { useNotificationStore } from "./stores/notification";
import { registerSW } from "virtual:pwa-register";

// Registrasi Service Worker PWA secara otomatis
registerSW({ immediate: true, updateViaCache: "none" });

const app = createApp(App);
app.directive("dialog", dialog);

const pinia = createPinia();
pinia.use(({ store }) => {
  if (store.$id === "auth" || store.$id === "notification") return;
  const initial = structuredClone(JSON.parse(JSON.stringify(store.$state)));
  const reset = () => store.$patch(structuredClone(initial));
  window.addEventListener("ledger:session-cleared", reset);
  const dispose = store.$dispose.bind(store);
  store.$dispose = () => {
    window.removeEventListener("ledger:session-cleared", reset);
    dispose();
  };
});
app.use(pinia);
app.use(router);

window.addEventListener("ledger:unauthorized", () => {
  const auth = useAuthStore(pinia);
  auth.logoutLocal();
  const current = router.currentRoute.value;
  if (current.meta.requiresAuth)
    router.replace({ path: "/login", query: { redirect: current.fullPath } });
});
window.addEventListener("ledger:request-error", (event) => {
  useNotificationStore(pinia).notify({ message: event.detail, type: "error" });
});
app.mount("#app");
