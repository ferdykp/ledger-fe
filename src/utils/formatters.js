import { getActivePinia } from "pinia";
import { useAuthStore } from "@/stores/auth";

export function formatRupiah(amount) {
  const currency = getActivePinia()
    ? useAuthStore().user?.currency || "IDR"
    : "IDR";
  const number = Number(amount || 0);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: ["IDR", "USD"].includes(currency) ? currency : "IDR",
    maximumFractionDigits: currency === "IDR" ? 0 : 2,
  }).format(Number.isFinite(number) ? number : 0);
}
