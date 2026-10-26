import Link from "next/link";
import { Suspense } from "react";
import { DashboardShell } from "@/app/components/dashboard/dashboard-shell";
import { requireRole } from "@/lib/auth/guards";
import { assignmentSubjectLabel, formatAssignmentDate } from "@/lib/assignments/presentation";
import { formatCurrencyAmount } from "@/lib/marketplace/currency";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

async function TutorQuotationsContent({ searchParams }: { searchParams: SearchParams }) {
  const profile = await requireRole("tutor");
  const supabase = await createClient();
  const { data: quotations, error } = await supabase.rpc("get_tutor_quotations");
  const params = await searchParams;
  const submitted = (Array.isArray(params.submitted) ? params.submitted[0] : params.submitted) === "1";

  if (error) {
    return (
      <DashboardShell profile={profile} eyebrow="TUTOR SPACE" title="My quotations and orders">
        <p className="assignment-alert assignment-alert-error" role="alert">
          Your quotations could not be loaded. Refresh or check the Supabase migration.
        </p>
      </DashboardShell>
    );
  }

  const ids = (quotations ?? [])
    .filter((quotation) => quotation.quotation_status === "accepted")
    .map((quotation) => quotation.assignment_id);
  const { data: files, error: filesError } = ids.length
    ? await supabase
      .from("assignment_files")
      .select("id, assignment_id, storage_path, original_filename, file_size_bytes")
      .in("assignment_id", ids)
      .order("created_at", { ascending: true })
    : { data: [], error: null };
  const linkedFiles = await Promise.all((files ?? []).map(async (file) => {
    const { data, error: signedUrlError } = await supabase.storage
      .from("assignment-files")
      .createSignedUrl(file.storage_path, 60, { download: file.original_filename });
    return { ...file, signedUrl: signedUrlError ? null : data.signedUrl };
  }));
  const filesByAssignment = new Map<string, typeof linkedFiles>();
  for (const file of linkedFiles) {
    const group = filesByAssignment.get(file.assignment_id) ?? [];
    group.push(file);
    filesByAssignment.set(file.assignment_id, group);
  }

  return (
    <DashboardShell profile={profile} eyebrow="TUTOR SPACE" title="My quotations and orders">
      <div className="assignment-page-actions">
        <p>Review quotation decisions and any selected engagement. Online payment is not available.</p>
        <Link className="button button-small button-outline" href="/tutor/opportunities">Browse opportunities</Link>
      </div>
      {submitted && (
        <p className="assignment-alert assignment-alert-success" role="status">
          Your quotation was submitted and is listed below. The student may now review its terms.
        </p>
      )}
      {filesError && (
        <p className="assignment-alert assignment-alert-error" role="alert">
          Quotation details loaded, but authorized engagement files could not be listed.
        </p>
      )}
      {quotations && quotations.length > 0 ? (
        <div className="marketplace-list">
          {quotations.map((quotation) => {
            const accepted = quotation.quotation_status === "accepted";
            const assignmentFiles = filesByAssignment.get(quotation.assignment_id) ?? [];
            return (
              <article className="assignment-detail-card marketplace-card" key={quotation.id}>
                <div className="assignment-detail-heading">
                  <div>
                    <p className="dashboard-eyebrow">{accepted ? "SELECTED TUTOR" : "QUOTATION"}</p>
                    <h2>{quotation.assignment_title}</h2>
                  </div>
                  <span className={`assignment-status marketplace-status-${quotation.quotation_status}`}>
                    {quotation.quotation_status.replace("_", " ")}
                  </span>
                </div>
                <dl className="assignment-detail-grid">
                  <div><dt>Subject</dt><dd>{assignmentSubjectLabel(quotation.subject)}</dd></div>
                  <div><dt>Price</dt><dd>{formatCurrencyAmount(quotation.price_amount_minor, quotation.currency)}</dd></div>
                  <div><dt>Quotation date</dt><dd>{formatAssignmentDate(quotation.created_at, quotation.deadline_timezone)}</dd></div>
                  <div><dt>Assignment deadline</dt><dd>{formatAssignmentDate(quotation.deadline_at, quotation.deadline_timezone)}</dd></div>
                  <div><dt>Delivery estimate</dt><dd>{quotation.estimated_delivery_hours} hours</dd></div>
                  <div><dt>Assignment status</dt><dd>{quotation.assignment_status.replace("_", " ")}</dd></div>
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
                    <h3>Additional notes</h3>
                    <p>{quotation.additional_notes}</p>
                  </div>
                )}
                {accepted && (
                  <>
                    <p className="assignment-alert assignment-alert-success" role="status">
                      This engagement is awaiting payment. StudyAssist has not processed a payment.
                    </p>
                    <div className="assignment-detail-copy">
                      <h3>Authorized supporting files</h3>
                      {filesError ? (
                        <p role="alert">Files could not be verified. Refresh the page before attempting access.</p>
                      ) : assignmentFiles.length > 0 ? (
                        <ul className="assignment-file-list assignment-detail-file-list">
                          {assignmentFiles.map((file) => (
                            <li key={file.id}>
                              <span>{file.original_filename}<small>{(file.file_size_bytes / (1024 * 1024)).toFixed(2)} MB</small></span>
                              {file.signedUrl ? (
                                <a href={file.signedUrl} rel="noreferrer">Download</a>
                              ) : <span className="field-hint">Download temporarily unavailable</span>}
                            </li>
                          ))}
                        </ul>
                      ) : <p>No files are currently available for this engagement.</p>}
                      <p className="field-hint">Links expire after one minute. These documents are private and must only be used for the agreed academic guidance.</p>
                    </div>
                  </>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <section className="assignment-empty-state">
          <span className="assignment-empty-mark" aria-hidden="true">↗</span>
          <h2>No quotations yet</h2>
          <p>Your submitted proposals and their decisions will appear here.</p>
          <Link className="button" href="/tutor/opportunities">Browse assignment opportunities</Link>
        </section>
      )}
    </DashboardShell>
  );
}

export default function TutorQuotationsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<div className="dashboard-loading">Loading your quotations…</div>}>
      <TutorQuotationsContent searchParams={searchParams} />
    </Suspense>
  );
}
