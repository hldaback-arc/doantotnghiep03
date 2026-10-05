/* Normalizes user/database money strings to exactly two decimal places. */
export function normalizeMoney(value: string): string {
  if (!value) {
    return "0.00";
  }

  const sanitized = value.replace(/,/g, "").trim();
  if (!/^[-]?\d+(\.\d+)?$/.test(sanitized)) {
    throw new Error("Invalid money format");
  }

  const [whole, fractional = ""] = sanitized.split(".");
  const safeFraction = (fractional + "00").slice(0, 2);
  return `${whole}.${safeFraction}`;
}

/* Converts decimal strings to integer cents so arithmetic never uses floats. */
export function toCents(value: string): bigint {
  const normalized = normalizeMoney(value);
  const [whole, fraction = "00"] = normalized.split(".");
  const signed = whole.startsWith("-");
  const cleanWhole = whole.replace(/^-/, "");
  const cents =
    BigInt(cleanWhole) * BigInt("100") +
    BigInt((fraction + "00").slice(0, 2));
  return signed ? -cents : cents;
}

/* Formats integer cents back to the canonical decimal string representation. */
export function fromCents(value: bigint): string {
  const sign = value < BigInt("0") ? "-" : "";
  const absolute = value < BigInt("0") ? -value : value;
  const whole = absolute / BigInt("100");
  const fraction = absolute % BigInt("100");
  return `${sign}${whole.toString()}.${fraction.toString().padStart(2, "0")}`;
}

/* Adds money values using BigInt cents and returns a decimal string. */
export function sumMoney(values: string[]): string {
  return fromCents(
    values.reduce((total, value) => total + toCents(value), BigInt("0")),
  );
}

/* Formats a normalized amount for Vietnamese currency display. */
export function formatCurrency(value: string): string {
  const normalized = normalizeMoney(value);
  const [whole, fraction] = normalized.split(".");
  const formattedWhole = Number(whole).toLocaleString("vi-VN");
  return `${formattedWhole},${fraction}`;
}
