const rupiahNumber = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

// API amounts are unformatted numbers or decimal strings, never display text.
export function formatRupiah(amount) {
  const number = Number(amount || 0);
  const value = Number.isFinite(number) ? number : 0;
  return `${value < 0 ? "-" : ""}Rp ${rupiahNumber.format(Math.abs(value))}`;
}

// Keep a trailing comma while editing; the model remains an API decimal string.
export function normalizeMoneyInput(value, allowNegative = false) {
  const text = String(value ?? "")
    .replace(/Rp\s*/gi, "")
    .trim();
  const sign = allowNegative && text.startsWith("-") ? "-" : "";
  const cleaned = text.replace(/[^\d,]/g, "");
  const [whole, ...fractionParts] = cleaned.split(",");
  const integer =
    whole.replace(/^0+(?=\d)/, "") || (fractionParts.length ? "0" : "");
  const fraction = fractionParts.join("").slice(0, 2);
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return {
    display: sign + grouped + (fractionParts.length ? `,${fraction}` : ""),
    value: integer ? sign + integer + (fraction ? `.${fraction}` : "") : "",
  };
}
