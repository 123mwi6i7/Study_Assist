import Link from "next/link";
import { Suspense } from "react";
import { DashboardShell } from "@/app/components/dashboard/dashboard-shell";
import { QuotationForm } from "@/app/components/marketplace/quotation-form";
import { requireRole } from "@/lib/auth/guards";
import {
  assignmentAssistanceLabel,
  assignmentSubjectLabel,
  formatAssignmentDate,
  formatBudget,
} from "@/lib/assignments/presentation";
import { createClient } from "@/lib/supabase/server";

async function TutorOpportunitiesContent() {
  const profile = await requireRole("tutor");
  const supabase = await createClient();
  const { data: opportunities, error } = await supabase.rpc("get_tutor_opportunities");

  if (error) {
    return (
      <DashboardShell profile={profile} eyebrow="TUTOR SPACE" title="Assignment opportunities">
        <div className="assignment-alert assignment-alert-error" role="alert">
          {profile.tutor_application_status === "approved"
            ? "Assignment opportunities could not be loaded. Refresh or check your Supabase migration."
            : "Only approved active tutors can browse assignment opportunities."}
        </div>
        <Link className="button button-small button-outline" href="/tutor/profile">Review tutor profile</Link>
      </DashboardShell>
    );
  }

  const ids = (opportunities ?? []).map((item) => item.id);
  const { data: files, error: filesError } = ids.length
    ? await supabase
      .from("assignment_files")
      .select("id, assignment_id, storage_path, original_filename, file_size_bytes")
      .in("assignment_id", ids)
      .order("created_at", { ascending: true })
    : { data: [], error: null };

  const fileLinks = await Promise.all((files ?? []).map(async (file) => {
    const { data, error: signedUrlError } = await supabase.storage
      .from("assignment-files")
      .createSignedUrl(file.storage_path, 60, { download: file.original_filename });
    return {
      ...file,
      signedUrl: signedUrlError ? null : data.signedUrl,
    };
  }));
  const filesByAssignment = new Map<string, typeof fileLinks>();
  for (const file of fileLinks) {
    const grouped = filesByAssignment.get(file.assignment_id) ?? [];
    grouped.push(file);
    filesByAssignment.set(file.assignment_id, grouped);
  }

  return (
    <DashboardShell profile={profile} eyebrow="TUTOR SPACE" title="Assignment opportunities">
      <div className="assignment-page-actions">
        <p>Only submitted requests matching your approved subjects are shown. Student names, institutions, and contact details are not exposed here.</p>
        <Link className="button button-small button-outline" href="/tutor/profile">Edit profile</Link>
      </div>
      {filesError && (
        <p className="assignment-alert assignment-alert-error" role="alert">
          Opportunities loaded, but private supporting files could not be listed.
        </p>
      )}
      {opportunities && opportunities.length > 0 ? (
        <div className="marketplace-list">
          {opportunities.map((assignment) => {
            const assignmentFiles = filesByAssignment.get(assignment.id) ?? [];
            return (
              <article className="assignment-detail-card marketplace-card" key={assignment.id}>
                <div className="assignment-detail-heading">
                  <div>
                    <p className="dashboard-eyebrow">MATCHED REQUEST</p>
                    <h2>{assignment.title}</h2>
                  </div>
                  <span className="assignment-status">{assignment.status}</span>
                </div>
                <dl className="assignment-detail-grid">
                  <div><dt>Subject</dt><dd>{assignmentSubjectLabel(assignment.subject)}</dd></div>
                  <div><dt>Required support</dt><dd>{assignmentAssistanceLabel(assignment.assistance_type)}</dd></div>
                  <div><dt>Academic level</dt><dd>{assignment.academic_level || "Not provided"}</dd></div>
                  <div><dt>Preferred language</dt><dd>{assignment.preferred_language || "Not provided"}</dd></div>
                  <div>
                    <dt>Deadline</dt>
                    <dd>{formatAssignmentDate(assignment.deadline_at, assignment.deadline_timezone)}</dd>
                    <small>{assignment.deadline_timezone}</small>
                  </div>
                  <div><dt>Student budget</dt><dd>{formatBudget(assignment.budget_amount_minor, assignment.budget_currency)}</dd></div>
                  <div><dt>Submitted</dt><dd>{formatAssignmentDate(assignment.submitted_at, assignment.deadline_timezone)}</dd></div>
                </dl>
                <div className="assignment-detail-copy">
                  <h3>Assignment description</h3>
                  <p>{assignment.description}</p>
                </div>
                <div className="assignment-detail-copy">
                  <h3>Private supporting files</h3>
                  {filesError ? (
                    <p role="alert">File access could not be verified. Refresh the page or contact support.</p>
                  ) : assignmentFiles.length > 0 ? (
                    <ul className="assignment-file-list assignment-detail-file-list">
                      {assignmentFiles.map((file) => (
                        <li key={file.id}>
                          <span>{file.original_filename}<small>{(file.file_size_bytes / (1024 * 1024)).toFixed(2)} MB</small></span>
                          {file.signedUrl ? (
                            <a href={file.signedUrl} rel="noreferrer">Download</a>
                          ) : (
                            <span className="field-hint">Download temporarily unavailable</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No supporting file details were returned for this request.</p>
                  )}
                  <p className="field-hint">Private links are permission-checked and expire after one minute. Use these documents only to prepare a relevant learning-support quotation.</p>
                </div>
                <QuotationForm
                  assignmentId={assignment.id}
                  defaultCurrency={assignment.budget_currency}
                />
              </article>
            );
          })}
        </div>
      ) : (
        <section className="assignment-empty-state">
          <span className="assignment-empty-mark" aria-hidden="true">◎</span>
          <h2>No matching opportunities right now</h2>
          <p>New submitted requests matching your approved subjects will appear here. You can update your subjects and profile from the tutor profile page.</p>
          <Link className="button" href="/tutor/profile">Review tutor profile</Link>
        </section>
      )}
    </DashboardShell>
  );
}

export default function TutorOpportunitiesPage() {
  return (
    <Suspense fallback={<div className="dashboard-loading">Loading assignment opportunities…</div>}>
      <TutorOpportunitiesContent />
    </Suspense>
  );
}
