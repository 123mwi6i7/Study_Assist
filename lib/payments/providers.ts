import { randomUUID } from "node:crypto";
import { getPaymentConfig, getSiteUrl, hasProviderCredentials } from "@/lib/payments/config";
import type { PaymentAttemptInput, PaymentProvider, PaymentSessionResult } from "@/lib/payments/types";

function normalizePhoneNumber(phoneNumber: string | undefined, provider: PaymentProvider) {
  if (!phoneNumber) {
    if (provider === "m_pesa") {
      throw new Error("Enter a Kenyan phone number to start an M-Pesa payment.");
    }
    return undefined;
  }

  const cleaned = phoneNumber.replace(/\s+/g, "").trim();
  if (provider === "m_pesa" && !/^\+?254[0-9]{9}$/.test(cleaned) && !/^254[0-9]{9}$/.test(cleaned) && !/^0[0-9]{9}$/.test(cleaned)) {
    throw new Error("Enter a valid Kenyan phone number for M-Pesa sandbox payments.");
  }

  return cleaned.replace(/^0/, "254").replace(/^\+254/, "254");
}

async function getMpesaToken() {
  const { mPesa } = getPaymentConfig();
  const response = await fetch(`${mPesa.sandboxBaseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    method: "GET",
    headers: {
      Authorization: `Basic ${Buffer.from(`${mPesa.consumerKey}:${mPesa.consumerSecret}`).toString("base64")}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`M-Pesa token request failed: ${text}`);
  }

  const result = (await response.json()) as { access_token?: string };
  if (!result.access_token) {
    throw new Error("M-Pesa sandbox access token was not returned by the provider.");
  }

  return result.access_token;
}

async function createMpesaStkPush(input: PaymentAttemptInput): Promise<PaymentSessionResult> {
  if (!hasProviderCredentials("m_pesa")) {
    throw new Error("M-Pesa sandbox credentials are not configured. Add MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE, and MPESA_PASSKEY before enabling the provider.");
  }

  const { mPesa } = getPaymentConfig();
  const phoneNumber = normalizePhoneNumber(input.phoneNumber, "m_pesa");
  const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const password = Buffer.from(`${mPesa.shortCode}${mPesa.passKey}${timestamp}`).toString("base64");
  const reference = `mpesa_${Date.now()}_${randomUUID().slice(0, 8)}`;
  const callbackUrl = mPesa.resultUrl || `${getSiteUrl()}/api/payments/webhook`;

  const token = await getMpesaToken();
  const response = await fetch(`${mPesa.sandboxBaseUrl}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      BusinessShortCode: mPesa.shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: String(Math.round(input.amountMinor / 100)),
      PartyA: phoneNumber,
      PartyB: mPesa.shortCode,
      PhoneNumber: phoneNumber,
      CallBackURL: callbackUrl,
      AccountReference: `StudyAssist-${reference}`,
      TransactionDesc: `StudyAssist assignment payment ${reference}`,
    }),
  });

  const payload = (await response.json()) as { CheckoutRequestID?: string; ResponseCode?: string; ResponseDescription?: string };
  if (!response.ok || !payload.CheckoutRequestID) {
    throw new Error(`M-Pesa STK request failed: ${payload.ResponseDescription || "Unknown provider error."}`);
  }

  return {
    provider: "m_pesa",
    providerReference: payload.CheckoutRequestID,
    redirectUrl: `${getSiteUrl()}/student/payments/complete?provider=m_pesa&reference=${encodeURIComponent(reference)}`,
    status: "processing",
    message: "M-Pesa STK push request was sent. Complete the prompt on your phone and wait for the callback verification.",
  };
}

async function createFlutterwaveCheckout(input: PaymentAttemptInput): Promise<PaymentSessionResult> {
  if (!hasProviderCredentials("flutterwave")) {
    throw new Error("Flutterwave credentials are not configured. Add FLUTTERWAVE_SECRET_KEY and FLUTTERWAVE_PUBLIC_KEY before enabling the provider.");
  }

  const { flutterwave } = getPaymentConfig();
  const reference = `flutterwave_${Date.now()}_${randomUUID().slice(0, 8)}`;
  const response = await fetch(`${flutterwave.baseUrl}/v3/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${flutterwave.secretKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      tx_ref: reference,
      amount: (input.amountMinor / 100).toFixed(2),
      currency: input.currency,
      redirect_url: `${getSiteUrl()}/student/payments/complete?provider=flutterwave&reference=${encodeURIComponent(reference)}`,
      payment_options: "card",
      meta: { assignment_id: input.assignmentId, student_id: input.studentId },
      customer: {
        email: "student@example.com",
        phone_number: input.phoneNumber || "+254700000000",
        name: "StudyAssist student",
      },
      customizations: {
        title: "StudyAssist payment",
        description: "Accepted tutor assignment payment",
      },
    }),
  });

  const payload = (await response.json()) as { status?: string; message?: string; data?: { link?: string; tx_ref?: string } };
  if (!response.ok || !payload.data?.link) {
    throw new Error(`Flutterwave checkout request failed: ${payload.message || "Unknown provider error."}`);
  }

  return {
    provider: "flutterwave",
    providerReference: payload.data.tx_ref || reference,
    redirectUrl: payload.data.link,
    status: "initiated",
    message: "Flutterwave hosted checkout session was created on the server.",
  };
}

export async function createPaymentSession(input: PaymentAttemptInput): Promise<PaymentSessionResult> {
  const { provider } = input;

  if (provider === "local_sandbox") {
    const reference = `sandbox_${Date.now()}_${randomUUID().slice(0, 8)}`;
    return {
      provider: "local_sandbox",
      providerReference: reference,
      redirectUrl: `${getSiteUrl()}/student/payments/complete?provider=local_sandbox&reference=${encodeURIComponent(reference)}`,
      status: "initiated",
      message: "Sandbox payment session created successfully.",
    };
  }

  if (provider === "m_pesa") {
    return createMpesaStkPush(input);
  }

  if (provider === "flutterwave") {
    return createFlutterwaveCheckout(input);
  }

  throw new Error("Unsupported payment provider selected.");
}

export function getSupportedPaymentProviders(): PaymentProvider[] {
  return ["local_sandbox", "m_pesa", "flutterwave"];
}
