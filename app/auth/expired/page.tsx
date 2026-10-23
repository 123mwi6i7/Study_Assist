import Link from "next/link";
import { AuthShell } from "@/app/components/auth/auth-shell";

export default function ExpiredLinkPage() {
  return (
    <AuthShell>
      <section className="auth-card auth-message-card" aria-labelledby="expired-title">
        <span className="auth-info-icon" aria-hidden="true">↻</span>
        <p className="auth-card-eyebrow">LINK NEEDS ATTENTION</p>
        <h2 id="expired-title">This link may have expired.</h2>
        <p>Request a new password reset email, or return to registration to send a fresh verification email.</p>
        <div className="auth-message-actions">
          <Link className="auth-submit auth-submit-link" href="/forgot-password">Request a reset link</Link>
          <Link className="auth-secondary-link" href="/register">Return to registration</Link>
        </div>
      </section>
    </AuthShell>
  );
}
