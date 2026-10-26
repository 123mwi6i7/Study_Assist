import { Suspense } from "react";
import Link from "next/link";
import {
  DashboardPlaceholder,
  DashboardShell,
} from "@/app/components/dashboard/dashboard-shell";
import { requireRole } from "@/lib/auth/guards";

async function TutorDashboardContent() {
  const profile = await requireRole("tutor");
  const status = profile.tutor_application_status ?? "pending_review";
  const statusCopy = {
    pending_review: "Your application is waiting for review. Paid assignment opportunities stay unavailable until approval.",
    approved: "Your application is approved. Browse requests that match your subjects and submit learning-support quotations.",
    rejected: "Your application was not approved. Contact StudyAssist if you need help understanding the next step.",
    suspended: "Your tutor profile is suspended and cannot browse opportunities or submit quotations.",
  }[status];

  return (
    <DashboardShell profile={profile} eyebrow="TUTOR SPACE" title="Your tutor dashboard">
      <section className={`tutor-status-card tutor-status-${status}`} aria-labelledby="tutor-status-title">
        <div className="tutor-status-icon" aria-hidden="true">{status === "approved" ? "✓" : "◷"}</div>
        <div>
          <p className="dashboard-eyebrow">APPLICATION STATUS</p>
          <h2 id="tutor-status-title">{status.replace("_", " ")}</h2>
          <p>{statusCopy}</p>
        </div>
      </section>
      {profile.tutor_review_reason && (
        <p className="assignment-alert assignment-alert-error" role="status">
          Administrator note: {profile.tutor_review_reason}
        </p>
      )}
      <section className="dashboard-grid" aria-label="Tutor dashboard areas">
        <article className="dashboard-placeholder">
          <span aria-hidden="true">◎</span>
          <h2>Assignment opportunities</h2>
          <p>Browse submitted requests that match your approved subjects and send a quotation.</p>
          {profile.tutor_application_status === "approved" && profile.tutor_is_active ? (
            <Link className="assignment-card-link" href="/tutor/opportunities">Browse opportunities <span aria-hidden="true">→</span></Link>
          ) : <small>Available after approval</small>}
        </article>
        <article className="dashboard-placeholder">
          <span aria-hidden="true">◉</span>
          <h2>Professional profile</h2>
          <p>Update your biography, subjects, qualifications, languages, availability, and pricing preferences.</p>
          <Link className="assignment-card-link" href="/tutor/profile">Edit profile <span aria-hidden="true">→</span></Link>
        </article>
        <article className="dashboard-placeholder">
          <span aria-hidden="true">◇</span>
          <h2>My quotations and orders</h2>
          <p>Track quotation status and review engagements selected by students.</p>
          <Link className="assignment-card-link" href="/tutor/quotations">View my quotations <span aria-hidden="true">→</span></Link>
        </article>
        <DashboardPlaceholder mark="✉" title="Messages" />
        <DashboardPlaceholder mark="＋" title="Earnings" />
      </section>
    </DashboardShell>
  );
}

export default function TutorDashboardPage() {
  return (
    <Suspense fallback={<div className="dashboard-loading">Loading your tutor space…</div>}>
      <TutorDashboardContent />
    </Suspense>
  );
}
