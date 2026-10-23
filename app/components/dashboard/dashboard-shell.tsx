import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/app/auth/actions";
import { BrandMark } from "@/app/components/brand-mark";
import type { Profile } from "@/lib/supabase/database.types";

export function DashboardShell({
  profile,
  eyebrow,
  title,
  children,
}: {
  profile: Profile;
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div className="dashboard-nav">
          <Link className="brand" href="/">
            <BrandMark />
            <span>StudyAssist</span>
          </Link>
          <div className="dashboard-nav-actions">
            <span className="dashboard-user-name">{profile.full_name}</span>
            <form action={signOut}>
              <button className="dashboard-logout" type="submit">Log out</button>
            </form>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-heading">
          <p className="dashboard-eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p>Welcome, {profile.full_name}. Your StudyAssist workspace is ready to grow with you.</p>
        </div>
        {children}
      </main>

      <footer className="dashboard-footer">
        <span>StudyAssist</span>
        <Link href="/">Back to the homepage</Link>
      </footer>
    </div>
  );
}

export function DashboardPlaceholder({
  mark,
  title,
}: {
  mark: string;
  title: string;
}) {
  return (
    <article className="dashboard-placeholder">
      <span aria-hidden="true">{mark}</span>
      <h2>{title}</h2>
      <p>This area will be added in a later development stage.</p>
      <small>Coming later</small>
    </article>
  );
}
