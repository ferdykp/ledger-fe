export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

export function transactionPrintDocument(transactions, currency = "IDR") {
  const money = new Intl.NumberFormat("id-ID", { style: "currency", currency });
  const rows = transactions.map(tx => `<tr>${[tx.date, tx.type, tx.account?.name, tx.related_account?.name, tx.category?.name, money.format(Number(tx.amount)), tx.note].map(value => `<td>${escapeHtml(value)}</td>`).join("")}</tr>`).join("");
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Ledger — Transaksi</title><style>body{font:12px system-ui;margin:24px;color:#222}table{border-collapse:collapse;width:100%}th,td{padding:8px;border:1px solid #ddd;text-align:left;overflow-wrap:anywhere}thead{display:table-header-group}tr{break-inside:avoid}@page{size:A4 landscape;margin:12mm}@media print{button{display:none}}</style></head><body><h1>Ledger — Riwayat Transaksi</h1><p>${transactions.length} transaksi</p><button onclick="window.print()">Cetak / Simpan sebagai PDF</button><table><thead><tr>${["Tanggal", "Jenis", "Akun", "Tujuan", "Kategori", "Nominal", "Catatan"].map(label => `<th>${label}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></body></html>`;
}
