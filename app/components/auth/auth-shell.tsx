import type { ReactNode } from "react";
import Link from "next/link";
import { SiteHeader } from "@/app/components/site-header";

export function AuthShell({
  children,
  showSetupNotice = false,
}: {
  children: ReactNode;
  showSetupNotice?: boolean;
}) {
  return (
    <div className="auth-page">
      <SiteHeader />

      <main className="auth-main">
        {showSetupNotice ? (
          <p className="auth-setup-banner" role="status">
            Sign in and registration need a Supabase project. <Link href="/auth/setup">See the setup steps</Link>.
          </p>
        ) : null}
        <div className="auth-card-wrap">{children}</div>
      </main>

      <footer className="auth-footer">
        <div className="auth-footer-inner">
          <span>© 2026 StudyAssist · Built around learning, wherever you are.</span>
          <Link href="/#faq">Visit the FAQ</Link>
        </div>
      </footer>
    </div>
  );
}


