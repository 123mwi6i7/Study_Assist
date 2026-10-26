import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DashboardShell } from "@/app/components/dashboard/dashboard-shell";
import { AcceptQuotationForm } from "@/app/components/marketplace/accept-quotation-form";
import { requireRole } from "@/lib/auth/guards";
import { ASSIGNMENT_CURRENCIES, ASSIGNMENT_SUBJECTS } from "@/lib/assignments/options";
import {
  ASSIGNMENT_COLUMNS,
  assignmentAssistanceLabel,
  assignmentSubjectLabel,
  formatAssignmentDate,
  formatBudget,
} from "@/lib/assignments/presentation";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function AssignmentDetailsContent({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireRole("student");
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) notFound();

  const supabase = await createClient();
  const { data: assignment, error } = await supabase
    .from("assignments")
    .select(ASSIGNMENT_COLUMNS)
    .eq("id", id)
    .eq("student_id", profile.id)
    .in("status", ["submitted", "awaiting_payment"])
    .maybeSingle();

  if (error || !assignment) notFound();

  const [
    { data: files, error: filesError },
    { data: quotations, error: quotationsError },
  ] = await Promise.all([
    supabase
      .from("assignment_files")
      .select("id, assignment_id, uploaded_by, storage_path, original_filename, file_size_bytes, content_type, created_at")
      .eq("assignment_id", assignment.id)
      .eq("uploaded_by", profile.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("quotations")
      .select("id, assignment_id, tutor_id, price_amount_minor, currency, service_description, estimated_delivery_hours, revision_terms, additional_notes, status, created_at")
      .eq("assignment_id", assignment.id)
      .order("created_at", { ascending: true }),
  ]);

  const { data: tutors, error: tutorProfilesError } = quotations?.length
    ? await supabase.rpc("get_quotation_tutors", { p_quotation_ids: quotations.map((quote) => quote.id) })
    : { data: [], error: null };
  const tutorById = new Map((tutors ?? []).map((tutor) => [tutor.id, tutor]));

  const filesWithLinks = await Promise.all((files ?? []).map(async (file) => {
    const { data, error: signedUrlError } = await supabase.storage
      .from("assignment-files")
      .createSignedUrl(file.storage_path, 60, { download: file.original_filename });

    return {
      id: file.id,
      filename: file.original_filename,
      size: file.file_size_bytes,
      signedUrl: signedUrlError ? null : data.signedUrl,
    };
  }));

  return (
    <DashboardShell profile={profile} eyebrow="SUBMITTED ASSIGNMENT" title={assignment.title}>
      <div className="assignment-page-actions">
        <p>Current status: <span className="assignment-status">{assignment.status.replace("_", " ")}</span></p>
        <Link className="button button-small button-outline" href="/student/assignments">Back to assignments</Link>
      </div>

      <section className="assignment-detail-card" aria-labelledby="assignment-overview-heading">
        <div className="assignment-detail-heading">
          <div>
            <p className="dashboard-eyebrow">ASSIGNMENT OVERVIEW</p>
            <h2 id="assignment-overview-heading">Request details</h2>
          </div>
          <span className="assignment-status">{assignment.status.replace("_", " ")}</span>
        </div>

        <dl className="assignment-detail-grid">
          <div><dt>Subject</dt><dd>{assignmentSubjectLabel(assignment.subject)}</dd></div>
          <div><dt>Course</dt><dd>{assignment.course_name || "Not provided"}</dd></div>
          <div><dt>Requested support</dt><dd>{assignmentAssistanceLabel(assignment.assistance_type)}</dd></div>
          <div><dt>Academic level</dt><dd>{assignment.academic_level || "Not provided"}</dd></div>
          <div><dt>Institution</dt><dd>{assignment.institution_name || "Not provided"}</dd></div>
          <div><dt>Preferred language</dt><dd>{assignment.preferred_language || "Not provided"}</dd></div>
          <div>
            <dt>Deadline</dt>
            <dd>{formatAssignmentDate(assignment.deadline_at, assignment.deadline_timezone)}</dd>
            <small>{assignment.deadline_timezone}</small>
          </div>
          <div><dt>Budget</dt><dd>{formatBudget(assignment.budget_amount_minor, assignment.budget_currency)}</dd></div>
          <div><dt>Submitted</dt><dd>{formatAssignmentDate(assignment.submitted_at ?? assignment.created_at, assignment.deadline_timezone)}</dd></div>
        </dl>

        <div className="assignment-detail-copy">
          <h3>Assignment description</h3>
          <p>{assignment.description}</p>
        </div>
        {assignment.additional_notes && (
          <div className="assignment-detail-copy">
            <h3>Additional instructions</h3>
            <p>{assignment.additional_notes}</p>
          </div>
        )}
      </section>

      {assignment.status === "awaiting_payment" && (
        <p className="assignment-alert assignment-alert-success" role="status">
          A tutor has been selected. This engagement is awaiting payment; no payment has been taken through StudyAssist.
        </p>
      )}

      <section className="assignment-detail-card marketplace-card" aria-labelledby="assignment-quotations-heading">
        <div className="assignment-detail-heading">
          <div>
            <p className="dashboard-eyebrow">TUTOR PROPOSALS</p>
            <h2 id="assignment-quotations-heading">Quotations</h2>
          </div>
          <span>{quotations?.length ?? 0} {(quotations?.length ?? 0) === 1 ? "quotation" : "quotations"}</span>
        </div>
        {quotationsError ? (
          <p className="assignment-alert assignment-alert-error" role="alert">
            We could not load quotations for this assignment. Refresh the page and try again.
          </p>
        ) : tutorProfilesError ? (
          <p className="assignment-alert assignment-alert-error" role="alert">
            Quotation terms loaded, but tutor profiles could not be retrieved. Refresh the page or check the Supabase migration.
          </p>
        ) : quotations && quotations.length > 0 ? (
          <div className="marketplace-list">
            {quotations.map((quotation) => {
              const tutor = tutorById.get(quotation.tutor_id);
              const tutorName = tutor?.professional_name ?? "Tutor profile unavailable";
              const currencySupported = ASSIGNMENT_CURRENCIES.some((item) => item.value === quotation.currency);
              return (
                <article className="quotation-card" key={quotation.id}>
                  <div className="assignment-detail-heading">
                    <div>
                      <p className="dashboard-eyebrow">TUTOR</p>
                      <h3>{tutorName}</h3>
                      {tutor && <p>{tutor.country} · {tutor.timezone}</p>}
                    </div>
                    <span className={`assignment-status marketplace-status-${quotation.status}`}>
                      {quotation.status.replace("_", " ")}
                    </span>
                  </div>
                  {tutor && (
                    <dl className="marketplace-profile-facts">
                      <div>
                        <dt>Subjects and expertise</dt>
                        <dd>
                          {tutor.subjects.map((subjectId) => ASSIGNMENT_SUBJECTS.find((item) => item.value === subjectId)?.label ?? subjectId).join(", ")}
                          {tutor.experience ? ` · ${tutor.experience}` : ""}
                        </dd>
                      </div>
                      <div><dt>Qualifications</dt><dd>{tutor.qualifications || "Not provided"}</dd></div>
                      <div><dt>Languages</dt><dd>{tutor.languages.join(", ")}</dd></div>
                      <div><dt>Availability</dt><dd>{tutor.availability || "Not provided"}</dd></div>
                    </dl>
                  )}
                  <dl className="assignment-detail-grid">
                    <div>
                      <dt>Proposed price</dt>
                      <dd>{currencySupported ? formatBudget(quotation.price_amount_minor, quotation.currency) : "Currency unavailable"}</dd>
                    </div>
                    <div><dt>Estimated delivery</dt><dd>{quotation.estimated_delivery_hours} hours</dd></div>
                    <div><dt>Received</dt><dd>{formatAssignmentDate(quotation.created_at, assignment.deadline_timezone)}</dd></div>
                  </dl>
                  <div className="assignment-detail-copy">
                    <h3>Proposed service</h3>
                    <p>{quotation.service_description}</p>
                  </div>
                  <div className="assignment-detail-copy">
                    <h3>Revision terms</h3>
                    <p>{quotation.revision_terms}</p>
                  </div>
                  {quotation.additional_notes && (
                    <div className="assignment-detail-copy">
                      <h3>Questions or additional notes</h3>
                      <p>{quotation.additional_notes}</p>
                    </div>
                  )}
                  {quotation.status === "pending" && assignment.status === "submitted" && tutor && currencySupported && (
                    <AcceptQuotationForm
                      quotation={quotation}
                      tutorName={tutorName}
                      deadline={formatAssignmentDate(assignment.deadline_at, assignment.deadline_timezone)}
                    />
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <p className="marketplace-intro">No quotations have arrived yet. Tutors whose approved subjects match your request may submit proposals.</p>
        )}
      </section>

      <section className="assignment-detail-card assignment-detail-files" aria-labelledby="assignment-files-heading">
        <div className="assignment-detail-heading">
          <div>
            <p className="dashboard-eyebrow">PRIVATE DOCUMENTS</p>
            <h2 id="assignment-files-heading">Supporting files</h2>
          </div>
          <span>{files?.length ?? 0} {(files?.length ?? 0) === 1 ? "file" : "files"}</span>
        </div>

        {filesError ? (
          <p className="assignment-alert assignment-alert-error" role="alert">We could not load the file list. Refresh the page and try again.</p>
        ) : filesWithLinks.length > 0 ? (
          <ul className="assignment-file-list assignment-detail-file-list">
            {filesWithLinks.map((file) => (
              <li key={file.id}>
                <span>{file.filename}<small>{(file.size / (1024 * 1024)).toFixed(2)} MB</small></span>
                {file.signedUrl ? (
                  <a href={file.signedUrl} rel="noreferrer">Download</a>
                ) : (
                  <span className="field-hint">Download temporarily unavailable</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p>No supporting files were found for this assignment.</p>
        )}
        <p className="field-hint">Download links expire after one minute. Reload this page to get a fresh link.</p>
      </section>
    </DashboardShell>
  );
}

export default function AssignmentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="dashboard-loading">Loading your assignment…</div>}>
      <AssignmentDetailsContent params={params} />
    </Suspense>
  );
}
