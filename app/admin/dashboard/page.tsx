import { Suspense } from "react";
import { DashboardShell } from "@/app/components/dashboard/dashboard-shell";
import { requireRole } from "@/lib/auth/guards";

async function AdminDashboardContent() {
  const profile = await requireRole("admin");

  return (
    <DashboardShell profile={profile} eyebrow="ADMINISTRATION" title="StudyAssist admin space">
      <section className="admin-placeholder" aria-labelledby="admin-placeholder-title">
        <span className="admin-placeholder-mark" aria-hidden="true">◇</span>
        <h2 id="admin-placeholder-title">Administrative tools are not part of this stage.</h2>
        <p>Only a profile assigned the admin role through trusted database access can view this page. This dashboard has no user-management actions yet.</p>
      </section>
    </DashboardShell>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<div className="dashboard-loading">Checking administrator access…</div>}>
      <AdminDashboardContent />
    </Suspense>
  );
}
