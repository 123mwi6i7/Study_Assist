import Link from "next/link";
import { Suspense } from "react";
import { DashboardShell } from "@/app/components/dashboard/dashboard-shell";
import { requireRole } from "@/lib/auth/guards";
import {
  ASSIGNMENT_COLUMNS,
  assignmentAssistanceLabel,
  assignmentSubjectLabel,
  formatAssignmentDate,
} from "@/lib/assignments/presentation";
import { createClient } from "@/lib/supabase/server";

async function AssignmentHistoryContent() {
  const profile = await requireRole("student");
  const supabase = await createClient();
  const { data: assignments, error } = await supabase
    .from("assignments")
    .select(ASSIGNMENT_COLUMNS)
    .eq("student_id", profile.id)
    .in("status", ["submitted", "awaiting_payment"])
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <DashboardShell profile={profile} eyebrow="STUDENT SPACE" title="Your assignments">
        <div className="assignment-alert assignment-alert-error" role="alert">
          We could not load your assignment history. Refresh the page and try again.
        </div>
      </DashboardShell>
    );
  }

  const assignmentIds = (assignments ?? []).map((assignment) => assignment.id);
  const { data: fileRows, error: filesError } = assignmentIds.length > 0
    ? await supabase.from("assignment_files").select("assignment_id").in("assignment_id", assignmentIds)
    : { data: [], error: null };
  const fileCounts = new Map<string, number>();
  for (const file of fileRows ?? []) {
    fileCounts.set(file.assignment_id, (fileCounts.get(file.assignment_id) ?? 0) + 1);
  }

  return (
    <DashboardShell profile={profile} eyebrow="STUDENT SPACE" title="Your assignments">
      <div className="assignment-page-actions">
        <p>Only assignments submitted from your student account are shown here.</p>
        <Link className="button button-small" href="/student/assignments/new">Upload Assignment</Link>
      </div>

      {filesError && (
        <p className="assignment-alert assignment-alert-error" role="status">
          Assignment details loaded, but file counts are temporarily unavailable.
        </p>
      )}

      {assignments && assignments.length > 0 ? (
        <div className="assignment-history-list">
          {assignments.map((assignment) => (
            <article className="assignment-history-card" key={assignment.id}>
              <div className="assignment-history-topline">
                <span className="assignment-status">{assignment.status.replace("_", " ")}</span>
                <span>{formatAssignmentDate(assignment.created_at, assignment.deadline_timezone)}</span>
              </div>
              <h2>{assignment.title}</h2>
              <p className="assignment-history-subtitle">
                {assignmentSubjectLabel(assignment.subject)}
                {assignment.course_name ? ` · ${assignment.course_name}` : ""}
              </p>
              <dl className="assignment-history-facts">
                <div><dt>Requested support</dt><dd>{assignmentAssistanceLabel(assignment.assistance_type)}</dd></div>
                <div><dt>Deadline</dt><dd>{formatAssignmentDate(assignment.deadline_at, assignment.deadline_timezone)}</dd></div>
                <div><dt>Files</dt><dd>{fileCounts.get(assignment.id) ?? 0}</dd></div>
              </dl>
              <Link className="assignment-card-link" href={`/student/assignments/${assignment.id}`}>
                Open assignment <span aria-hidden="true">→</span>
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <section className="assignment-empty-state">
          <span className="assignment-empty-mark" aria-hidden="true">▤</span>
          <h2>No assignments yet</h2>
          <p>Your submitted requests will appear here with their status and attached file count.</p>
          <Link className="button" href="/student/assignments/new">Upload your first assignment</Link>
        </section>
      )}
    </DashboardShell>
  );
}

export default function AssignmentHistoryPage() {
  return (
    <Suspense fallback={<div className="dashboard-loading">Loading your assignment history…</div>}>
      <AssignmentHistoryContent />
    </Suspense>
  );
}
