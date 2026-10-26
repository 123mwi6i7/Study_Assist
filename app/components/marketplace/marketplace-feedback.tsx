"use client";

import type { MarketplaceActionState } from "@/app/marketplace/actions";

export function MarketplaceFeedback({ state }: { state: MarketplaceActionState }) {
  if (state.status === "idle" || !state.message) return null;

  return (
    <p
      className={`assignment-alert ${state.status === "error" ? "assignment-alert-error" : "assignment-alert-success"}`}
      role={state.status === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      {state.message}
    </p>
  );
}
