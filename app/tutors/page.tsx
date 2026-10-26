import Link from "next/link";
import { Suspense } from "react";
import { SiteHeader } from "@/app/components/site-header";
import { ASSIGNMENT_CURRENCIES, ASSIGNMENT_SUBJECTS } from "@/lib/assignments/options";
import { formatCurrencyAmount } from "@/lib/marketplace/currency";
import { getSupabaseConfig } from "@/lib/supabase/config";
import type { PublicTutor } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function value(params: Record<string, string | string[] | undefined>, key: string) {
  const found = params[key];
  return (Array.isArray(found) ? found[0] : found)?.trim().slice(0, 120) ?? "";
}

function parseMaximumPrice(amount: string, currency: string) {
  if (!amount) return null;
  const fractionDigits = new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
  const pattern = fractionDigits === 0
    ? /^(0|[1-9]\d{0,12})$/
    : new RegExp(`^(0|[1-9]\\d{0,12})(?:\\.(\\d{1,${fractionDigits}}))?$`);
  const match = pattern.exec(amount);
  if (!match) return null;
  const whole = Number(match[1]);
  const fraction = Number((match[2] ?? "").padEnd(fractionDigits, "0") || "0");
  const minor = whole * 10 ** fractionDigits + fraction;
  return Number.isSafeInteger(minor) ? minor : null;
}

async function TutorsContent({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const subject = value(params, "subject");
  const country = value(params, "country");
  const language = value(params, "language");
  const availability = value(params, "availability");
  const expertise = value(params, "expertise");
  const currencyCandidate = value(params, "currency");
  const currency = ASSIGNMENT_CURRENCIES.some((item) => item.value === currencyCandidate) ? currencyCandidate : "KES";
  const priceText = value(params, "max_price");
  const maxPrice = getSupabaseConfig() && priceText ? parseMaximumPrice(priceText, currency) : null;

  let tutors: PublicTutor[] = [];
  let loadError = "";
  if (!getSupabaseConfig()) {
    loadError = "Tutor discovery will be available after the Supabase project is configured.";
  } else {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("search_approved_tutors", {
      p_subject: ASSIGNMENT_SUBJECTS.some((item) => item.value === subject) ? subject : null,
      p_country: country || null,
      p_language: language || null,
      p_availability: availability || null,
      p_expertise: expertise || null,
      p_max_price_minor: maxPrice,
      p_price_currency: priceText && maxPrice !== null ? currency : null,
    });
    if (error) loadError = "Tutor profiles could not be loaded. Refresh the page or check the Supabase migration.";
    else tutors = data ?? [];
  }

  return (
    <>
      <SiteHeader />
      <main className="marketplace-public-page">
        <div className="content-shell">
          <header className="marketplace-page-heading">
            <p className="eyebrow">APPROVED TUTORS</p>
            <h1>Find guidance that fits</h1>
            <p>Browse approved tutor profiles by subject, location, language, availability, expertise, and listed price preferences.</p>
          </header>

          <form action="/tutors" method="get" className="marketplace-filter-form">
            <div className="form-field">
              <label htmlFor="filter-subject">Subject</label>
              <select id="filter-subject" name="subject" defaultValue={subject}>
                <option value="">Any subject</option>
                {ASSIGNMENT_SUBJECTS.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="filter-country">Country</label>
              <input id="filter-country" name="country" maxLength={100} defaultValue={country} placeholder="For example, Kenya" />
            </div>
            <div className="form-field">
              <label htmlFor="filter-language">Language</label>
              <input id="filter-language" name="language" maxLength={40} defaultValue={language} placeholder="Exact spoken language" />
            </div>
            <div className="form-field">
              <label htmlFor="filter-availability">Availability</label>
              <input id="filter-availability" name="availability" maxLength={100} defaultValue={availability} placeholder="Search availability description" />
            </div>
            <div className="form-field">
              <label htmlFor="filter-expertise">Expertise</label>
              <input id="filter-expertise" name="expertise" maxLength={120} defaultValue={expertise} placeholder="Topic or experience" />
            </div>
            <div className="form-field">
              <label htmlFor="filter-price">Maximum listed price</label>
              <input id="filter-price" name="max_price" inputMode="decimal" maxLength={32} defaultValue={priceText} placeholder="Optional" />
            </div>
            <div className="form-field">
              <label htmlFor="filter-currency">Price currency</label>
              <select id="filter-currency" name="currency" defaultValue={currency}>
                {ASSIGNMENT_CURRENCIES.map((item) => <option value={item.value} key={item.value}>{item.value}</option>)}
              </select>
            </div>
            <div className="marketplace-filter-actions">
              <button className="button button-small" type="submit">Search tutors</button>
              <Link className="button button-small button-outline" href="/tutors">Clear filters</Link>
            </div>
          </form>

          {priceText && maxPrice === null && (
            <p className="assignment-alert assignment-alert-error" role="alert">
              Enter a valid maximum price for the selected currency to apply the price filter.
            </p>
          )}
          {loadError ? (
            <p className="assignment-alert assignment-alert-error" role="alert">{loadError}</p>
          ) : tutors.length > 0 ? (
            <div className="marketplace-tutor-grid">
              {tutors.map((tutor) => (
                <article className="assignment-detail-card marketplace-tutor-card" key={tutor.id}>
                  <p className="dashboard-eyebrow">{tutor.country}</p>
                  <h2>{tutor.professional_name}</h2>
                  <p>{tutor.bio}</p>
                  <dl className="marketplace-profile-facts">
                    <div><dt>Subjects</dt><dd>{tutor.subjects.map((subjectId) => ASSIGNMENT_SUBJECTS.find((item) => item.value === subjectId)?.label ?? subjectId).join(", ")}</dd></div>
                    <div><dt>Languages</dt><dd>{tutor.languages.join(", ")}</dd></div>
                    <div><dt>Qualifications</dt><dd>{tutor.qualifications || "Not provided"}</dd></div>
                    <div><dt>Experience</dt><dd>{tutor.experience || "Not provided"}</dd></div>
                    <div><dt>Availability</dt><dd>{tutor.availability || "Contact for availability details"}</dd></div>
                    <div><dt>Time zone</dt><dd>{tutor.timezone}</dd></div>
                    <div>
                      <dt>Price preference</dt>
                      <dd>
                        {tutor.min_price_minor !== null && tutor.price_currency
                          ? `${formatCurrencyAmount(tutor.min_price_minor, tutor.price_currency)} – ${formatCurrencyAmount(tutor.max_price_minor ?? tutor.min_price_minor, tutor.price_currency)}`
                          : "Discussed in a quotation"}
                      </dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          ) : (
            <section className="assignment-empty-state marketplace-empty-state">
              <span className="assignment-empty-mark" aria-hidden="true">◎</span>
              <h2>No approved tutors match yet</h2>
              <p>Try another filter, or check back as more tutor applications are reviewed. Only real, approved profiles appear here.</p>
            </section>
          )}
          <p className="marketplace-privacy-note">
            Tutor phone numbers, email addresses, and private documents are not displayed in public search.
            {" "}<Link href="/login">Log in</Link> or <Link href="/register">create an account</Link> to continue.
          </p>
        </div>
      </main>
    </>
  );
}

export default function TutorsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<main className="marketplace-public-page"><div className="content-shell dashboard-loading">Loading approved tutor profiles…</div></main>}>
      <TutorsContent searchParams={searchParams} />
    </Suspense>
  );
}
