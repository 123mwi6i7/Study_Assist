"use client";

import { useActionState, type FormEvent } from "react";
import { acceptTutorQuotation, type MarketplaceActionState } from "@/app/marketplace/actions";
import { MarketplaceFeedback } from "@/app/components/marketplace/marketplace-feedback";
import { formatCurrencyAmount } from "@/lib/marketplace/currency";

const initialState: MarketplaceActionState = { status: "idle", message: "" };

export function AcceptQuotationForm({
  quotation,
  tutorName,
  deadline,
}: {
  quotation: {
    id: string;
    price_amount_minor: number | string;
    currency: string;
    service_description: string;
    estimated_delivery_hours: number;
    revision_terms: string;
  };
  tutorName: string;
  deadline: string;
}) {
  const [state, formAction, pending] = useActionState(acceptTutorQuotation, initialState);

  function confirmSelection(event: FormEvent<HTMLFormElement>) {
    if (state.status === "success") {
      event.preventDefault();
      return;
    }

    const confirmed = window.confirm(
      `Confirm ${tutorName} for ${formatCurrencyAmount(quotation.price_amount_minor, quotation.currency)}? ` +
      `Agreed service: ${quotation.service_description} ` +
      `Delivery: ${quotation.estimated_delivery_hours} hours. ` +
      `Assignment deadline: ${deadline}. ` +
      `Revision terms: ${quotation.revision_terms}. No payment will be taken now.`,
    );
    if (!confirmed) event.preventDefault();
  }

  return (
    <form action={formAction} onSubmit={confirmSelection} className="quotation-accept-form">
      <input type="hidden" name="quotation_id" value={quotation.id} />
      <p><strong>Selected tutor:</strong> {tutorName}</p>
      <p><strong>Agreed service:</strong> {quotation.service_description}</p>
      <p><strong>Price:</strong> {formatCurrencyAmount(quotation.price_amount_minor, quotation.currency)} ({quotation.currency})</p>
      <p><strong>Delivery:</strong> {quotation.estimated_delivery_hours} hours</p>
      <p><strong>Assignment deadline:</strong> {deadline}</p>
      <p><strong>Revision terms:</strong> {quotation.revision_terms}</p>
      <p className="field-hint">Confirmation records an unpaid engagement awaiting payment. No payment is taken.</p>
      <MarketplaceFeedback state={state} />
      <button className="button button-small" type="submit" disabled={pending || state.status === "success"}>
        {pending ? "Confirming…" : state.status === "success" ? "Tutor selected" : "Select this tutor"}
      </button>
    </form>
  );
}
