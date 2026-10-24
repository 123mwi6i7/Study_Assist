import { Suspense } from "react";
import { AssignmentSubmissionForm } from "@/app/components/assignments/assignment-submission-form";
import { DashboardShell } from "@/app/components/dashboard/dashboard-shell";
import { requireRole } from "@/lib/auth/guards";

async function NewAssignmentContent() {
  const profile = await requireRole("student");

  return (
    <DashboardShell profile={profile} eyebrow="STUDENT SPACE" title="Upload an assignment">
      <div className="assignment-page-actions">
        <p>Tell us what you are learning and attach the instructions so your request has the right context.</p>
      </div>
      <AssignmentSubmissionForm />
    </DashboardShell>
  );
}

export default function NewAssignmentPage() {
  return (
    <Suspense fallback={<div className="dashboard-loading">Preparing your assignment form…</div>}>
      <NewAssignmentContent />
    </Suspense>
  );
}
