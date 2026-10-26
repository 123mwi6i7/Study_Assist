import Link from "next/link";
import { Suspense } from "react";
import { DashboardShell } from "@/app/components/dashboard/dashboard-shell";
import { TutorProfileForm } from "@/app/components/marketplace/tutor-profile-form";
import { requireRole } from "@/lib/auth/guards";
import { formatCurrencyAmount } from "@/lib/marketplace/currency";

async function TutorProfileContent() {
  const profile = await requireRole("tutor");

  return (
    <DashboardShell profile={profile} eyebrow="TUTOR SPACE" title="Your professional profile">
      <div className="assignment-page-actions">
        <p>
          Approval status: <span className="assignment-status">{profile.tutor_application_status?.replace("_", " ")}</span>
        </p>
        <Link className="button button-small button-outline" href="/tutor/dashboard">Back to dashboard</Link>
      </div>
      {profile.tutor_review_reason && (
        <p className="assignment-alert assignment-alert-error" role="status">
          Administrator note: {profile.tutor_review_reason}
        </p>
      )}
      {profile.tutor_application_status === "approved" && profile.tutor_is_active && (
        <p className="field-hint">
          Your profile is public. Saving edits to public profile details will pause its listing until an administrator reviews the changes.
        </p>
      )}
      <section className="assignment-detail-card marketplace-panel">
        <h2>Edit profile details</h2>
        <p className="marketplace-intro">
          This profile is used for tutor discovery and assignment matching. Enter a professional summary only; do not add private contact details or identity documents.
        </p>
        <TutorProfileForm profile={profile} />
      </section>
      {profile.tutor_min_price_minor !== null && profile.tutor_price_currency && (
        <p className="field-hint">
          Current pricing preference: {formatCurrencyAmount(profile.tutor_min_price_minor, profile.tutor_price_currency)}
          {" – "}
          {formatCurrencyAmount(profile.tutor_max_price_minor ?? profile.tutor_min_price_minor, profile.tutor_price_currency)}
        </p>
      )}
    </DashboardShell>
  );
}

export default function TutorProfilePage() {
  return (
    <Suspense fallback={<div className="dashboard-loading">Loading your tutor profile…</div>}>
      <TutorProfileContent />
    </Suspense>
  );
}
