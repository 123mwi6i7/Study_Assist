import Link from "next/link";
import { BrandMark } from "@/app/components/brand-mark";

export function SiteHeader({ isHome = false }: { isHome?: boolean }) {
  function sectionLink(section: string) {
    return isHome ? `#${section}` : `/#${section}`;
  }

  return (
    <header className="site-header" id={isHome ? "home" : undefined}>
      <div className="nav-shell">
        <Link className="brand" href={isHome ? "#home" : "/"} aria-label="StudyAssist home">
          <BrandMark />
          <span>StudyAssist</span>
        </Link>

        <nav className="desktop-nav" aria-label="Main navigation">
          <Link href={sectionLink("home")} className="nav-link">Home</Link>
          <Link href={sectionLink("how-it-works")} className="nav-link">How it works</Link>
          <Link href={sectionLink("services")} className="nav-link">Find a tutor</Link>
          <Link href={sectionLink("become-a-tutor")} className="nav-link">Become a tutor</Link>
        </nav>

        <div className="nav-actions">
          <Link className="login-link" href="/login">Log in</Link>
          <Link className="button button-small" href="/register">Sign up</Link>
        </div>

        <details className="mobile-menu">
          <summary aria-label="Open navigation menu">Menu</summary>
          <nav aria-label="Mobile navigation">
            <Link href={sectionLink("home")}>Home</Link>
            <Link href={sectionLink("how-it-works")}>How it works</Link>
            <Link href={sectionLink("services")}>Find a tutor</Link>
            <Link href={sectionLink("become-a-tutor")}>Become a tutor</Link>
            <Link href="/login">Log in</Link>
            <Link href="/register">Sign up</Link>
          </nav>
        </details>
      </div>
    </header>
  );
}
