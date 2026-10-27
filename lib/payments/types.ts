export type PaymentProvider = "local_sandbox" | "m_pesa" | "flutterwave";

export type PaymentAttemptStatus =
  | "pending"
  | "initiated"
  | "processing"
  | "paid"
  | "failed"
  | "cancelled"
  | "expired"
  | "refunded";

export type PaymentAttemptInput = {
  assignmentId: string;
  studentId: string;
  provider: PaymentProvider;
  amountMinor: number;
  currency: string;
  phoneNumber?: string;
  returnUrl?: string;
};

export type PaymentSessionResult = {
  provider: PaymentProvider;
  providerReference: string;
  redirectUrl: string;
  status: PaymentAttemptStatus;
  message: string;
};
