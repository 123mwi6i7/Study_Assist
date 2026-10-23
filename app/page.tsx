import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMark } from "@/app/components/brand-mark";
import { SiteHeader } from "@/app/components/site-header";

const steps = [
  {
    number: "01",
    title: "Share the assignment brief",
    description:
      "Start with the instructions, subject, and the part you would like help understanding.",
  },
  {
    number: "02",
    title: "Find a suitable tutor",
    description:
      "Explore support that fits your subject, learning goals, and preferred way to work.",
  },
  {
    number: "03",
    title: "Learn with personal guidance",
    description:
      "Work through questions, build your understanding, and make progress with a tutor.",
  },
];

const subjects = [
  { mark: "∑", name: "Mathematics" },
  { mark: "↗", name: "Business" },
  { mark: "▤", name: "Accounting" },
  { mark: "</>", name: "Computer science" },
  { mark: "⌕", name: "Research guidance" },
  { mark: "Aa", name: "Academic writing" },
  { mark: "✓", name: "Proofreading" },
  { mark: "§", name: "Referencing help" },
];

const benefits = [
  {
    mark: "↗",
    title: "Support that fits your day",
    description:
      "Connect online, so you can seek academic guidance wherever you are.",
  },
  {
    mark: "◌",
    title: "More than one perspective",
    description:
      "Explore tutors across a range of subjects and find an approach that suits your goals.",
  },
  {
    mark: "◎",
    title: "Know the cost up front",
    description:
      "Clear pricing is part of the plan, so students can review terms before choosing support.",
  },
  {
    mark: "◇",
    title: "Thoughtful communication",
    description:
      "The platform is being designed to support private, secure student–tutor communication; messaging is not available yet.",
  },
];

const questions = [
  {
    question: "Can I upload my assignment now?",
    answer:
      "File uploads are not available yet. For now, you can review the steps above. When uploads launch, share only the instructions and information needed to discuss your learning goals.",
  },
  {
    question: "How do I find a tutor?",
    answer:
      "Tutor profiles and matching are not live yet. The planned service will help students explore tutors by subject and learning needs.",
  },
  {
    question: "How do payments work?",
    answer:
      "Payments and checkout have not been implemented. No payment is taken through this website at this stage.",
  },
  {
    question: "Can students outside Kenya use StudyAssist?",
    answer:
      "StudyAssist is being designed for students in Kenya and other supported countries. The country list and availability will be shared before the service opens.",
  },
  {
    question: "How does StudyAssist support academic integrity?",
    answer:
      "Tutoring is intended to help students understand ideas and develop their own work. Tutors should guide and explain, not complete graded work or write submissions on a student's behalf. A full academic integrity policy will be published before launch.",
  },
];

function SectionHeading({
  eyebrow,
  title,
  children,
  centered = false,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
  centered?: boolean;
}) {
  return (
    <div className={`section-heading${centered ? " section-heading-centered" : ""}`}>
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {children ? <p className="section-intro">{children}</p> : null}
    </div>
  );
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="arrow-icon">
      <path d="M4 10h12M10 4l6 6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Home() {
  return (
    <>
      <SiteHeader isHome />

      <main>
        <section className="hero-section">
          <div className="hero-shell">
            <div className="hero-copy">
              <p className="eyebrow"><span className="eyebrow-dot" /> A little support goes a long way</p>
              <h1>Your Academic Journey, <span>Supported.</span></h1>
              <p className="hero-description">
                Connect with tutors for thoughtful academic guidance and assignment support. Build your understanding, one question at a time.
              </p>
              <div className="hero-actions">
                <Link className="button" href="#getting-started">Upload assignment <ArrowIcon /></Link>
                <Link className="button button-outline" href="#services">Find a tutor</Link>
              </div>
              <p className="hero-note">Uploads and tutor matching are coming soon. Explore how StudyAssist is planned to work.</p>
              <div className="hero-caption">
                <span className="caption-icon" aria-hidden="true">✳</span>
                <span>Designed for students in Kenya and around the world</span>
              </div>
            </div>

            <div className="hero-visual" aria-hidden="true">
              <div className="visual-orbit orbit-one" />
              <div className="visual-orbit orbit-two" />
              <div className="visual-spark spark-one">✳</div>
              <div className="visual-spark spark-two">✦</div>
              <div className="study-card">
                <div className="study-card-top">
                  <span className="mini-brand"><BrandMark /> StudyAssist</span>
                  <span className="card-label">A learning journey</span>
                </div>
                <div className="study-card-art">
                  <div className="book-shape">
                    <div className="book-page page-left"><i /><i /><i /></div>
                    <div className="book-page page-right"><i /><i /><i /></div>
                    <span className="book-spine" />
                  </div>
                  <span className="art-star star-a">✦</span>
                  <span className="art-star star-b">✳</span>
                  <span className="art-dot dot-a" />
                  <span className="art-dot dot-b" />
                </div>
                <div className="study-card-bottom">
                  <div>
                    <span className="card-label">YOUR NEXT STEP</span>
                    <strong>Start with the brief</strong>
                  </div>
                  <span className="card-arrow"><ArrowIcon /></span>
                </div>
              </div>
              <div className="floating-note floating-note-top"><span>01</span> Clarify the question</div>
              <div className="floating-note floating-note-bottom"><span className="note-check">✓</span> Learn at your pace</div>
              <div className="visual-footnote">Illustration · not a live dashboard</div>
            </div>
          </div>
        </section>

        <section className="section section-steps" id="how-it-works">
          <div className="content-shell">
            <SectionHeading eyebrow="A clearer path forward" title="How it works" centered>
              A simple way to get the right kind of help with your studies.
            </SectionHeading>
            <div className="steps-grid">
              {steps.map((step) => (
                <article className="step-card" key={step.number}>
                  <span className="step-number">{step.number}</span>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </article>
              ))}
            </div>
            <p className="availability-note"><span aria-hidden="true">✳</span> These steps describe the planned experience. Uploads and tutor matching are not live yet.</p>
          </div>
        </section>

        <section className="section section-subjects" id="services">
          <div className="content-shell">
            <div className="subjects-heading-row">
              <SectionHeading eyebrow="Support for your studies" title="Explore the subjects and skills that matter" />
              <p className="subjects-aside">From working through a tough problem to polishing the final draft, get help to learn with confidence.</p>
            </div>
            <div className="subjects-grid">
              {subjects.map((subject, index) => (
                <article className="subject-card" key={subject.name}>
                  <span className={`subject-mark subject-mark-${index + 1}`} aria-hidden="true">{subject.mark}</span>
                  <h3>{subject.name}</h3>
                  <span className="subject-arrow" aria-hidden="true"><ArrowIcon /></span>
                </article>
              ))}
            </div>
            <p className="section-footnote">Tutor listings are not available yet. Subject availability will be confirmed before launch.</p>
          </div>
        </section>

        <section className="section section-benefits" id="benefits">
          <div className="content-shell benefits-layout">
            <div className="benefits-intro">
              <SectionHeading eyebrow="Made for real student life" title="Support that meets you where you are">
                Learning looks different for everyone. StudyAssist is being shaped around practical, student-first support.
              </SectionHeading>
              <Link href="#getting-started" className="text-link">See how to get started <ArrowIcon /></Link>
            </div>
            <div className="benefit-list">
              {benefits.map((benefit) => (
                <article className="benefit-row" key={benefit.title}>
                  <span className="benefit-mark" aria-hidden="true">{benefit.mark}</span>
                  <div>
                    <h3>{benefit.title}</h3>
                    <p>{benefit.description}</p>
                  </div>
                </article>
              ))}
              <p className="section-footnote">These are planned service benefits. Messaging, pricing, and other platform features are not active yet.</p>
            </div>
          </div>
        </section>

        <section className="section section-global" id="about">
          <div className="content-shell global-panel">
            <div className="global-copy">
              <p className="eyebrow"><span className="eyebrow-dot" /> Local understanding, wider reach</p>
              <h2>Rooted in Kenya.<br /><span>Open to the world.</span></h2>
              <p>StudyAssist is a tutoring and assignment-help marketplace designed for students in Kenya and other supported countries. Wherever you study, the aim is to make it easier to find guidance that fits.</p>
              <div className="country-pills">
                <span><span className="kenya-colors" aria-hidden="true"><i /><i /><i /></span> Kenya</span>
                <span><span className="world-icon" aria-hidden="true">◎</span> Other supported countries</span>
              </div>
              <p className="global-note">International availability will depend on the supported country list shared at launch.</p>
            </div>
            <div className="tutor-invite" id="become-a-tutor">
              <span className="invite-icon" aria-hidden="true">✳</span>
              <p className="eyebrow">For tutors</p>
              <h3>Share what you know.</h3>
              <p>We welcome tutors who care about helping students learn. Tutor applications start in pending review, and paid opportunities stay unavailable until approval.</p>
              <Link href="/register" className="text-link">Start a tutor application <ArrowIcon /></Link>
            </div>
          </div>
        </section>

        <section className="launch-section" id="getting-started">
          <div className="content-shell launch-panel">
            <div>
              <p className="eyebrow">A quick note before you begin</p>
              <h2>We’re getting ready to help.</h2>
              <p>Registration and login are ready once a Supabase project is connected. Assignment uploads, tutor matching, and payments will be built in later stages.</p>
            </div>
            <div className="account-placeholders">
              <Link className="account-placeholder" href="/login">
                <span className="placeholder-icon" aria-hidden="true">↗</span>
                <div><strong>Log in</strong><span>Open your account</span></div>
              </Link>
              <Link className="account-placeholder" href="/register">
                <span className="placeholder-icon" aria-hidden="true">＋</span>
                <div><strong>Sign up</strong><span>Create an account</span></div>
              </Link>
            </div>
          </div>
        </section>

        <section className="section section-faq" id="faq">
          <div className="content-shell faq-layout">
            <div className="faq-intro">
              <SectionHeading eyebrow="Good to know" title="Frequently asked questions">
                A few answers about how StudyAssist is taking shape.
              </SectionHeading>
              <p className="faq-contact">Still have a question? Contact details will be shared before launch.</p>
            </div>
            <div className="faq-list">
              {questions.map((item) => (
                <details className="faq-item" key={item.question}>
                  <summary>{item.question}<span className="faq-toggle" aria-hidden="true" /></summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer" id="contact">
        <div className="content-shell">
          <div className="footer-main">
            <div className="footer-brand-block">
              <Link className="brand footer-brand" href="#home"><BrandMark /><span>StudyAssist</span></Link>
              <p>Thoughtful academic guidance, for wherever your studies take you.</p>
            </div>
            <div className="footer-links-column">
              <h2>Explore</h2>
              <Link href="#about">About us</Link>
              <Link href="#contact">Contact</Link>
              <Link href="#services">Find a tutor</Link>
            </div>
            <div className="footer-links-column">
              <h2>Policies</h2>
              <Link href="#privacy-policy">Privacy policy</Link>
              <Link href="#terms-and-conditions">Terms and conditions</Link>
              <Link href="#refund-policy">Refund policy</Link>
              <Link href="#academic-integrity-policy">Academic integrity</Link>
            </div>
            <div className="footer-contact">
              <h2>Get in touch</h2>
              <p>Contact details will be published before the service opens.</p>
            </div>
          </div>

          <div className="policy-notes" aria-label="Policy publication status">
            <details id="privacy-policy"><summary>Privacy policy</summary><p>This preview does not contain a finished privacy policy. Final policy text needs review before public launch.</p></details>
            <details id="terms-and-conditions"><summary>Terms and conditions</summary><p>This preview does not contain finished terms. Final terms need review before public launch.</p></details>
            <details id="refund-policy"><summary>Refund policy</summary><p>The refund policy will be published before payments are enabled.</p></details>
            <details id="academic-integrity-policy"><summary>Academic integrity policy</summary><p>The full academic integrity policy will be published before the service opens. Tutoring is intended to support learning and students’ own work.</p></details>
          </div>

          <div className="footer-bottom">
            <span>© 2026 StudyAssist</span>
            <span>Built around learning, wherever you are.</span>
          </div>
        </div>
      </footer>
    </>
  );
}
