function scaled(value, scale) {
  const text = String(value ?? "0").trim();
  if (!/^-?\d+(\.\d+)?$/.test(text)) return 0n;
  const negative = text.startsWith("-");
  const unsigned = negative ? text.slice(1) : text;
  const [whole, fraction = ""] = unsigned.split(".");
  const result = BigInt(whole || "0") * 10n ** BigInt(scale) + BigInt((fraction + "0".repeat(scale)).slice(0, scale) || "0");
  return negative ? -result : result;
}

function decimal(value, scale) {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const base = 10n ** BigInt(scale);
  const whole = abs / base;
  const fraction = String(abs % base).padStart(scale, "0");
  return `${negative ? "-" : ""}${whole}${scale ? `.${fraction}` : ""}`;
}

export function compareDecimal(a, b, scale = 2) {
  const left = scaled(a, scale);
  const right = scaled(b, scale);
  return left < right ? -1 : left > right ? 1 : 0;
}

export function addDecimal(a, b, scale = 2) {
  return decimal(scaled(a, scale) + scaled(b, scale), scale);
}

export function multiplyDecimal(a, b, scaleA = 2, scaleB = 2, resultScale = 2) {
  let product = scaled(a, scaleA) * scaled(b, scaleB);
  const inputScale = scaleA + scaleB;
  if (inputScale > resultScale) {
    const divisor = 10n ** BigInt(inputScale - resultScale);
    const sign = product < 0n ? -1n : 1n;
    product = sign * ((product < 0n ? -product : product) + divisor / 2n) / divisor;
  } else if (inputScale < resultScale) {
    product *= 10n ** BigInt(resultScale - inputScale);
  }
  return decimal(product, resultScale);
}

export function divideDecimal(a, b, scaleA = 2, scaleB = 8, resultScale = 8) {
  const numerator = scaled(a, scaleA);
  const denominator = scaled(b, scaleB);
  if (denominator === 0n) return decimal(0n, resultScale);
  const shift = scaleB + resultScale - scaleA;
  const top = shift >= 0 ? numerator * 10n ** BigInt(shift) : numerator / 10n ** BigInt(-shift);
  const sign = (top < 0n) !== (denominator < 0n) ? -1n : 1n;
  const absTop = top < 0n ? -top : top;
  const absBottom = denominator < 0n ? -denominator : denominator;
  return decimal(sign * ((absTop + absBottom / 2n) / absBottom), resultScale);
}
