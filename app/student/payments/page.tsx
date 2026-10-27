import Link from "next/link";
import { Suspense } from "react";
import { DashboardShell } from "@/app/components/dashboard/dashboard-shell";
import { requireRole } from "@/lib/auth/guards";

export default function StudentPaymentsPage() {
  return (
    <Suspense fallback={<div className="dashboard-loading">Loading payment options…</div>}>
      <StudentPaymentsContent />
    </Suspense>
  );
}

async function StudentPaymentsContent() {
  const profile = await requireRole("student");

  return (
    <DashboardShell profile={profile} eyebrow="PAYMENTS" title="Payment options">
      <section className="assignment-detail-card">
        <p className="dashboard-eyebrow">SANDBOX MODE</p>
        <h2>Payment processing is not enabled in this workspace yet</h2>
        <p>
          StudyAssist currently records accepted engagements as <strong>awaiting payment</strong> and does not take money.
          This page is reserved for the future integration of M-Pesa Daraja and Flutterwave.
        </p>
        <div className="assignment-page-actions">
          <Link className="button button-small button-outline" href="/student/assignments">Back to assignments</Link>
        </div>
      </section>
    </DashboardShell>
  );
}
