const MAX_MINOR_AMOUNT = 999_999_999_999_999;

export function parseCurrencyAmount(value: string, currency: string) {
  const fractionDigits = new Intl.NumberFormat("en", {
    style: "currency",
    currency,
  }).resolvedOptions().maximumFractionDigits ?? 2;
  const pattern = fractionDigits === 0
    ? /^(0|[1-9]\d{0,12})$/
    : new RegExp(`^(0|[1-9]\\d{0,12})(?:\\.(\\d{1,${fractionDigits}}))?$`);
  const match = pattern.exec(value.trim());

  if (!match) {
    throw new Error(`Enter a valid ${currency} amount with up to ${fractionDigits} decimal places.`);
  }

  const whole = Number(match[1]);
  const fraction = Number((match[2] ?? "").padEnd(fractionDigits, "0") || "0");
  const minorAmount = whole * 10 ** fractionDigits + fraction;

  if (!Number.isSafeInteger(minorAmount) || minorAmount > MAX_MINOR_AMOUNT) {
    throw new Error("The amount is too large.");
  }

  return minorAmount;
}
