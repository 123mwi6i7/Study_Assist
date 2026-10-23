import Link from "next/link";
import { AuthShell } from "@/app/components/auth/auth-shell";

export default function SupabaseSetupPage() {
  return (
    <AuthShell>
      <section className="auth-card auth-message-card" aria-labelledby="setup-title">
        <span className="auth-info-icon" aria-hidden="true">◎</span>
        <p className="auth-card-eyebrow">ONE-TIME SETUP</p>
        <h2 id="setup-title">Connect StudyAssist to Supabase.</h2>
        <p>Add your project URL and publishable key to the root .env.local file, then restart the development server.</p>
        <p className="auth-setup-file">NEXT_PUBLIC_SUPABASE_URL<br />NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</p>
        <Link className="auth-submit auth-submit-link" href="/">Back to the homepage</Link>
      </section>
    </AuthShell>
  );
}
