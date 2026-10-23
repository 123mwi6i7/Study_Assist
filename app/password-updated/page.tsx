import Link from "next/link";
import { AuthShell } from "@/app/components/auth/auth-shell";

export default function PasswordUpdatedPage() {
  return (
    <AuthShell>
      <section className="auth-card auth-message-card" aria-labelledby="password-updated-title">
        <span className="auth-success-icon" aria-hidden="true">✓</span>
        <p className="auth-card-eyebrow">PASSWORD UPDATED</p>
        <h2 id="password-updated-title">You’re all set.</h2>
        <p>Your new password has been saved. You can now log in with it.</p>
        <Link className="auth-submit auth-submit-link" href="/login">Go to log in</Link>
      </section>
    </AuthShell>
  );
}
