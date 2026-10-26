"use client";

import { useActionState } from "react";
import { submitTutorQuotation, type MarketplaceActionState } from "@/app/marketplace/actions";
import { MarketplaceFeedback } from "@/app/components/marketplace/marketplace-feedback";
import { ASSIGNMENT_CURRENCIES } from "@/lib/assignments/options";

const initialState: MarketplaceActionState = { status: "idle", message: "" };

export function QuotationForm({
  assignmentId,
  defaultCurrency,
}: {
  assignmentId: string;
  defaultCurrency: string | null;
}) {
  const [state, formAction, pending] = useActionState(submitTutorQuotation, initialState);

  return (
    <form action={formAction} className="marketplace-form quotation-form">
      <input type="hidden" name="assignment_id" value={assignmentId} />
      <h3>Send a quotation</h3>
      <div className="assignment-form-grid">
        <div className="form-field">
          <label htmlFor={`price-${assignmentId}`}>Price</label>
          <input id={`price-${assignmentId}`} name="price" inputMode="decimal" required maxLength={32} placeholder="For example, 2500.00" />
        </div>
        <div className="form-field">
          <label htmlFor={`currency-${assignmentId}`}>Currency</label>
          <select id={`currency-${assignmentId}`} name="currency" defaultValue={defaultCurrency ?? "KES"}>
            {ASSIGNMENT_CURRENCIES.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor={`delivery-${assignmentId}`}>Estimated delivery (hours)</label>
          <input id={`delivery-${assignmentId}`} name="delivery_hours" type="number" min={1} max={8760} step={1} required />
        </div>
        <div className="form-field">
          <label htmlFor={`revisions-${assignmentId}`}>Revision terms</label>
          <input id={`revisions-${assignmentId}`} name="revision_terms" maxLength={1000} required placeholder="For example, one clarification session" />
        </div>
        <div className="form-field assignment-field-full">
          <label htmlFor={`service-${assignmentId}`}>Proposed learning support</label>
          <textarea id={`service-${assignmentId}`} name="service_description" required minLength={20} maxLength={2000} placeholder="Explain the tutoring, explanation, or feedback you will provide." />
        </div>
        <div className="form-field assignment-field-full">
          <label htmlFor={`notes-${assignmentId}`}>Questions or additional notes (optional)</label>
          <textarea id={`notes-${assignmentId}`} name="additional_notes" maxLength={2000} />
        </div>
      </div>
      <p className="field-hint">No payment is collected by this quotation form.</p>
      <MarketplaceFeedback state={state} />
      <button className="button button-small" type="submit" disabled={pending}>{pending ? "Sending quotation…" : "Submit quotation"}</button>
    </form>
  );
}
