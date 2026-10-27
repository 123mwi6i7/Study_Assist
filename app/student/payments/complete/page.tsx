import Link from "next/link";
import { Suspense } from "react";
import { DashboardShell } from "@/app/components/dashboard/dashboard-shell";
import { requireRole } from "@/lib/auth/guards";

export default function StudentPaymentCompletePage() {
  return (
    <Suspense fallback={<div className="dashboard-loading">Loading payment confirmation…</div>}>
      <StudentPaymentCompleteContent />
    </Suspense>
  );
}

async function StudentPaymentCompleteContent() {
  const profile = await requireRole("student");

  return (
    <DashboardShell profile={profile} eyebrow="PAYMENTS" title="Payment status">
      <section className="assignment-detail-card">
        <p className="dashboard-eyebrow">SANDBOX MODE</p>
        <h2>Payment session started</h2>
        <p>
          The payment flow is intentionally sandbox-safe in this project. No real money is collected, and the accepted
          quotation remains in the <strong>awaiting payment</strong> state until a real provider integration is configured.
        </p>
        <div className="assignment-page-actions">
          <Link className="button button-small" href="/student/assignments">View assignments</Link>
          <Link className="button button-small button-outline" href="/student/dashboard">Back to dashboard</Link>
        </div>
      </section>
    </DashboardShell>
  );
}
