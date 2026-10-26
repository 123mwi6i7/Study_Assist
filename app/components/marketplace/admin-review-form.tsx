"use client";

import { useActionState } from "react";
import { reviewTutorApplication, type MarketplaceActionState } from "@/app/marketplace/actions";
import { MarketplaceFeedback } from "@/app/components/marketplace/marketplace-feedback";

const initialState: MarketplaceActionState = { status: "idle", message: "" };

export function AdminReviewForm({
  tutorId,
  currentStatus,
}: {
  tutorId: string;
  currentStatus: string;
}) {
  const [state, formAction, pending] = useActionState(reviewTutorApplication, initialState);

  return (
    <form action={formAction} className="admin-review-form">
      <input type="hidden" name="tutor_id" value={tutorId} />
      <label htmlFor={`reason-${tutorId}`}>{currentStatus === "pending_review" ? "Decision reason (required to reject or suspend)" : "Reason for rejection or suspension"}</label>
      <textarea id={`reason-${tutorId}`} name="reason" maxLength={1000} minLength={5} />
      <div className="marketplace-actions">
        <button className="button button-small" type="submit" name="status" value="approved" disabled={pending}>Approve</button>
        <button className="button button-small button-outline" type="submit" name="status" value="rejected" disabled={pending}>Reject</button>
        <button className="button button-small button-outline" type="submit" name="status" value="suspended" disabled={pending}>Suspend</button>
      </div>
      <MarketplaceFeedback state={state} />
    </form>
  );
}
