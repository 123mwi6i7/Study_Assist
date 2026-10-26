import { Suspense } from "react";
import Link from "next/link";
import {
  DashboardPlaceholder,
  DashboardShell,
} from "@/app/components/dashboard/dashboard-shell";
import { requireRole } from "@/lib/auth/guards";

async function StudentDashboardContent() {
  const profile = await requireRole("student");

  return (
    <DashboardShell profile={profile} eyebrow="STUDENT SPACE" title="Your learning dashboard">
      <section className="assignment-dashboard-banner" aria-label="Assignment support">
        <div>
          <p className="dashboard-eyebrow">LEARNING SUPPORT</p>
          <h2>Need guidance with an assignment?</h2>
          <p>Share the instructions and request tutoring, explanations, research guidance, or feedback.</p>
        </div>
        <div className="assignment-dashboard-actions">
          <Link className="button" href="/student/assignments/new">Upload Assignment</Link>
          <Link className="button button-outline" href="/student/assignments">View assignments</Link>
        </div>
      </section>
      <section className="dashboard-grid" aria-label="Student dashboard areas">
        <article className="dashboard-placeholder">
          <span aria-hidden="true">▤</span>
          <h2>Assignments</h2>
          <p>View the requests you have submitted and open their supporting documents.</p>
          <Link className="assignment-card-link" href="/student/assignments">View assignment history <span aria-hidden="true">→</span></Link>
        </article>
        <article className="dashboard-placeholder">
          <span aria-hidden="true">◎</span>
          <h2>Find a tutor</h2>
          <p>Search approved tutor profiles by subject, country, language, availability, expertise, and price.</p>
          <Link className="assignment-card-link" href="/tutors">Browse tutors <span aria-hidden="true">→</span></Link>
        </article>
        <article className="dashboard-placeholder">
          <span aria-hidden="true">↗</span>
          <h2>Compare quotations</h2>
          <p>Open a submitted assignment to compare tutor proposals and agree terms.</p>
          <Link className="assignment-card-link" href="/student/assignments">View assignment quotations <span aria-hidden="true">→</span></Link>
        </article>
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
