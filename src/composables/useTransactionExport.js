import { ref } from "vue";
import api from "@/lib/axios";
import { transactionPrintDocument } from "@/utils/export";

export function useTransactionExport(user, notifyStore) {
  const exporting = ref(false);
  async function handleExport(type) {
    if (exporting.value) return;

    const printWindow = type === "pdf" ? window.open("", "_blank") : null;

    if (type === "pdf" && !printWindow) {
      notifyStore.notify({
        message: "Izinkan jendela baru untuk mencetak atau menyimpan PDF.",
        type: "error",
      });

      return;
    }

    if (printWindow) {
      printWindow.opener = null;
      printWindow.document.body.textContent = "Menyiapkan transaksi…";
    }

    exporting.value = true;

    try {
      if (type === "csv") {
        const response = await api.get("/api/transactions/export", {
          responseType: "blob",
          timeout: 60000,
        });

        const url = URL.createObjectURL(response.data);

        const link = document.createElement("a");

        link.href = url;
        link.download = "ledger-transactions.csv";

        document.body.append(link);

        link.click();
        link.remove();

        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 1000);
      } else {
        const transactions = [];

        let page = 1;
        let lastPage = 1;

        do {
          const response = await api.get("/api/transactions", {
            params: {
              page,
              per_page: 100,
            },
          });

          transactions.push(...response.data.data);

          lastPage = response.data.meta.last_page;

          page++;
        } while (page <= lastPage);

        if (printWindow.closed) return;

        printWindow.document.open();

        printWindow.document.write(
          transactionPrintDocument(transactions, user.value?.currency || "IDR"),
        );

        printWindow.document.close();

        printWindow.focus();
        printWindow.print();
      }
    } catch {
      printWindow?.close();

      notifyStore.notify({
        message: "Ekspor gagal. Silakan coba lagi.",
        type: "error",
      });
    } finally {
      exporting.value = false;
    }
  }

  return { exporting, handleExport };
}
