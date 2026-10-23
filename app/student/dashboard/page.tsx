import { Suspense } from "react";
import {
  DashboardPlaceholder,
  DashboardShell,
} from "@/app/components/dashboard/dashboard-shell";
import { requireRole } from "@/lib/auth/guards";

async function StudentDashboardContent() {
  const profile = await requireRole("student");

  return (
    <DashboardShell profile={profile} eyebrow="STUDENT SPACE" title="Your learning dashboard">
      <section className="dashboard-grid" aria-label="Student dashboard areas">
        <DashboardPlaceholder mark="▤" title="Assignments" />
        <DashboardPlaceholder mark="◎" title="Find a tutor" />
        <DashboardPlaceholder mark="↗" title="Quotations" />
        <DashboardPlaceholder mark="◇" title="Orders" />
        <DashboardPlaceholder mark="＋" title="Payments" />
      </section>
    </DashboardShell>
  );
}

export default function StudentDashboardPage() {
  return (
    <Suspense fallback={<div className="dashboard-loading">Loading your dashboard…</div>}>
      <StudentDashboardContent />
    </Suspense>
  );
}
