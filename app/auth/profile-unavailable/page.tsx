import Link from "next/link";
import { AuthShell } from "@/app/components/auth/auth-shell";

export default function ProfileUnavailablePage() {
  return (
    <AuthShell>
      <section className="auth-card auth-message-card" aria-labelledby="profile-unavailable-title">
        <span className="auth-info-icon" aria-hidden="true">i</span>
        <p className="auth-card-eyebrow">PROFILE SETUP</p>
        <h2 id="profile-unavailable-title">Your profile is not ready yet.</h2>
        <p>We could not find the profile linked to your account. Confirm that the StudyAssist profile migration is installed, then try again.</p>
        <Link className="auth-submit auth-submit-link" href="/login">Return to log in</Link>
      </section>
    </AuthShell>
  );
}
