// API amounts are unformatted numbers or decimal strings, never display text.
export function formatRupiah(amount, maximumFractionDigits = 2) {
  let text = String(amount ?? "0").trim();
  if (typeof amount === "number" && !Number.isFinite(amount)) text = "0";
  const scientific = text.match(/^([+-]?\d+(?:\.\d+)?)[eE]([+-]?\d+)$/);
  if (scientific) {
    const sign = scientific[1].startsWith("-") ? "-" : "";
    const digits = scientific[1].replace(/^[+-]/, "").replace(".", "");
    const point =
      (scientific[1].replace(/^[+-]/, "").split(".")[0]?.length || 0) +
      Number(scientific[2]);
    text =
      sign +
      (point <= 0
        ? `0.${"0".repeat(-point)}${digits}`
        : point >= digits.length
          ? `${digits}${"0".repeat(point - digits.length)}`
          : `${digits.slice(0, point)}.${digits.slice(point)}`);
  }
  if (!/^[+-]?\d+(?:\.\d+)?$/.test(text)) text = "0";
  const negative = text.startsWith("-");
  const unsigned = text.replace(/^[+-]/, "");
  const [whole = "0", fraction = ""] = unsigned.split(".");
  const precision = Math.max(0, Math.min(8, Math.trunc(maximumFractionDigits)));
  const scale = 10n ** BigInt(precision);
  const keptFraction = (fraction + "0".repeat(precision)).slice(0, precision);
  const roundedMinor =
    BigInt(whole || "0") * scale +
    BigInt(keptFraction || "0") +
    (fraction[precision] >= "5" ? 1n : 0n);
  const integer = (roundedMinor / scale)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const decimal = precision
    ? String(roundedMinor % scale)
        .padStart(precision, "0")
        .replace(/0+$/, "")
    : "";
  const sign = negative && roundedMinor > 0n ? "-" : "";
  return `${sign}Rp ${integer}${decimal ? `,${decimal}` : ""}`;
}

export function formatQuantity(value, maximumFractionDigits = 8) {
  const text = String(value ?? "0").trim();
  if (!/^-?\d+(?:\.\d+)?$/.test(text)) return "0";
  const negative = text.startsWith("-");
  const unsigned = negative ? text.slice(1) : text;
  const [whole = "0", rawFraction = ""] = unsigned.split(".");
  const fraction = rawFraction
    .slice(0, maximumFractionDigits)
    .replace(/0+$/, "");
  const grouped = (whole || "0").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${negative && (whole !== "0" || fraction) ? "-" : ""}${grouped}${fraction ? `,${fraction}` : ""}`;
}

// Keep a trailing comma while editing; the model remains an API decimal string.
export function normalizeMoneyInput(
  value,
  allowNegative = false,
  precision = 2,
) {
  const text = String(value ?? "")
    .replace(/Rp\s*/gi, "")
    .trim();
  const sign = allowNegative && text.startsWith("-") ? "-" : "";
  const cleaned = text.replace(/[^\d,]/g, "");
  const [whole, ...fractionParts] = cleaned.split(",");
  const integer =
    whole.replace(/^0+(?=\d)/, "") || (fractionParts.length ? "0" : "");
  const fraction = fractionParts.join("").slice(0, Math.max(0, precision));
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return {
    display: sign + grouped + (fractionParts.length ? `,${fraction}` : ""),
    value: integer ? sign + integer + (fraction ? `.${fraction}` : "") : "",
  };
}
