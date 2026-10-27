export type PaymentMode = "sandbox" | "live";

export function getPaymentMode(): PaymentMode {
  const mode = (process.env.PAYMENT_PROVIDER_MODE ?? "sandbox").trim().toLowerCase();
  return mode === "live" ? "live" : "sandbox";
}

export function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function getPaymentConfig() {
  return {
    mode: getPaymentMode(),
    siteUrl: getSiteUrl(),
    mPesa: {
      sandboxBaseUrl: process.env.MPESA_SANDBOX_BASE_URL?.trim() || "https://sandbox.safaricom.co.ke",
      consumerKey: process.env.MPESA_CONSUMER_KEY?.trim() || "",
      consumerSecret: process.env.MPESA_CONSUMER_SECRET?.trim() || "",
      shortCode: process.env.MPESA_SHORTCODE?.trim() || "",
      passKey: process.env.MPESA_PASSKEY?.trim() || "",
      timeoutUrl: process.env.MPESA_TIMEOUT_URL?.trim() || "",
      resultUrl: process.env.MPESA_RESULT_URL?.trim() || "",
    },
    flutterwave: {
      baseUrl: process.env.FLUTTERWAVE_BASE_URL?.trim() || "https://api.flutterwave.com",
      secretKey: process.env.FLUTTERWAVE_SECRET_KEY?.trim() || "",
      publicKey: process.env.FLUTTERWAVE_PUBLIC_KEY?.trim() || "",
      secretHash: process.env.FLUTTERWAVE_SECRET_HASH?.trim() || "",
    },
  };
}

export function hasProviderCredentials(provider: "m_pesa" | "flutterwave") {
  const { mPesa, flutterwave } = getPaymentConfig();
  if (provider === "m_pesa") {
    return Boolean(mPesa.consumerKey && mPesa.consumerSecret && mPesa.passKey && mPesa.shortCode);
  }
  return Boolean(flutterwave.secretKey && flutterwave.publicKey);
}
