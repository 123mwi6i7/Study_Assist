import { Suspense } from "react";
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
    approved: "Your application is approved. Tutor opportunities will be added in a later development stage.",
    rejected: "Your application was not approved. Contact StudyAssist if you need help understanding the next step.",
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

      <section className="dashboard-grid" aria-label="Tutor dashboard areas">
        <DashboardPlaceholder mark="◎" title="Tutor opportunities" />
        <DashboardPlaceholder mark="◇" title="Orders" />
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
