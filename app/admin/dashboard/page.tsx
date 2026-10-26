import { Suspense } from "react";
import { DashboardShell } from "@/app/components/dashboard/dashboard-shell";
import { AdminReviewForm } from "@/app/components/marketplace/admin-review-form";
import { requireRole } from "@/lib/auth/guards";
import { ASSIGNMENT_CURRENCIES } from "@/lib/assignments/options";
import { formatCurrencyAmount } from "@/lib/marketplace/currency";
import { createClient } from "@/lib/supabase/server";

async function AdminDashboardContent() {
  const admin = await requireRole("admin");
  const supabase = await createClient();
  const { data: applications, error } = await supabase.rpc("get_tutor_applications");

  return (
    <DashboardShell profile={admin} eyebrow="ADMINISTRATION" title="Tutor application review">
      <p className="marketplace-intro">
        Review submitted professional profiles, record decisions, and suspend approved tutors when justified. Only administrator accounts can perform these actions.
      </p>
      {error ? (
        <div className="assignment-alert assignment-alert-error" role="alert">
          Tutor applications could not be loaded. Refresh the page or check the Supabase migration.
        </div>
      ) : applications && applications.length > 0 ? (
        <div className="marketplace-list">
          {applications.map((application) => (
            <article className="assignment-detail-card marketplace-card" key={application.id}>
              <div className="assignment-detail-heading">
                <div>
                  <p className="dashboard-eyebrow">APPLICATION</p>
                  <h2>{application.professional_name}</h2>
                </div>
                <span className={`assignment-status marketplace-status-${application.application_status}`}>
                  {application.application_status.replace("_", " ")}
                </span>
              </div>
              <dl className="assignment-detail-grid">
                <div><dt>Country</dt><dd>{application.country}</dd></div>
                <div><dt>Subjects</dt><dd>{application.subjects.join(", ")}</dd></div>
                <div><dt>Languages</dt><dd>{application.languages.join(", ")}</dd></div>
                <div><dt>Preferred time zone</dt><dd>{application.timezone}</dd></div>
                <div><dt>Availability</dt><dd>{application.availability || "Not provided"}</dd></div>
                <div>
                  <dt>Pricing preference</dt>
                  <dd>
                    {application.min_price_minor !== null && application.price_currency &&
                    ASSIGNMENT_CURRENCIES.some((item) => item.value === application.price_currency)
                      ? `${formatCurrencyAmount(application.min_price_minor, application.price_currency)} – ${formatCurrencyAmount(application.max_price_minor ?? application.min_price_minor, application.price_currency)}`
                      : "Not provided"}
                  </dd>
                </div>
                <div><dt>Applied</dt><dd>{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(application.created_at))} UTC</dd></div>
                <div><dt>Reviewed</dt><dd>{application.reviewed_at ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(application.reviewed_at)) : "Not reviewed"}</dd></div>
              </dl>
              <div className="assignment-detail-copy">
                <h3>Professional biography</h3>
                <p>{application.bio}</p>
              </div>
              <div className="assignment-detail-copy">
                <h3>Qualifications summary</h3>
                <p>{application.qualifications || "Not provided"}</p>
              </div>
              <div className="assignment-detail-copy">
                <h3>Relevant experience</h3>
                <p>{application.experience || "Not provided"}</p>
              </div>
              {application.review_reason && (
                <p className="assignment-alert assignment-alert-error" role="status">
                  Previous decision reason: {application.review_reason}
                </p>
              )}
              <AdminReviewForm tutorId={application.id} currentStatus={application.application_status} />
            </article>
          ))}
        </div>
      ) : (
        <section className="assignment-empty-state">
          <span className="assignment-empty-mark" aria-hidden="true">◇</span>
          <h2>No tutor applications</h2>
          <p>New applications will appear here after tutors register and complete their profile.</p>
        </section>
      )}
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
