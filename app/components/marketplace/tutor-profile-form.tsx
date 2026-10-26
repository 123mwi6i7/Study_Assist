"use client";

import { useActionState } from "react";
import { updateTutorProfile, type MarketplaceActionState } from "@/app/marketplace/actions";
import { MarketplaceFeedback } from "@/app/components/marketplace/marketplace-feedback";
import { ASSIGNMENT_CURRENCIES, ASSIGNMENT_SUBJECTS, COMMON_TIME_ZONES } from "@/lib/assignments/options";
import type { Profile } from "@/lib/supabase/database.types";

const initialState: MarketplaceActionState = { status: "idle", message: "" };

function formatPriceInput(value: number | string | null, currency: string) {
  if (value === null) return "";
  const digits = new Intl.NumberFormat("en", {
    style: "currency",
    currency,
  }).resolvedOptions().maximumFractionDigits ?? 2;
  return (Number(value) / 10 ** digits).toFixed(digits);
}

export function TutorProfileForm({ profile }: { profile: Profile }) {
  const [state, formAction, pending] = useActionState(updateTutorProfile, initialState);
  const currency = profile.tutor_price_currency ?? "KES";

  return (
    <form action={formAction} className="marketplace-form">
      <div className="assignment-form-grid">
        <div className="form-field">
          <label htmlFor="professional-name">Professional name</label>
          <input id="professional-name" name="professional_name" required minLength={2} maxLength={120} defaultValue={profile.tutor_professional_name ?? profile.full_name} />
        </div>
        <div className="form-field">
          <label htmlFor="tutor-country">Country of residence</label>
          <input id="tutor-country" name="country" required minLength={2} maxLength={100} defaultValue={profile.country} />
        </div>
        <div className="form-field assignment-field-full">
          <label htmlFor="tutor-bio">Professional biography</label>
          <textarea id="tutor-bio" name="bio" required minLength={20} maxLength={1000} defaultValue={profile.tutor_bio ?? ""} />
        </div>
        <fieldset className="marketplace-subjects assignment-field-full">
          <legend>Subjects taught</legend>
          <div className="subject-checkbox-grid">
            {ASSIGNMENT_SUBJECTS.map((subject) => (
              <label className="checkbox-option" key={subject.value}>
                <input
                  type="checkbox"
                  name="subjects"
                  value={subject.value}
                  defaultChecked={profile.tutor_subjects.includes(subject.value)}
                />
                <span>{subject.label}</span>
              </label>
            ))}
          </div>
          <span className="field-hint">Select one to eight. Opportunity matching uses these subjects.</span>
        </fieldset>
        <div className="form-field assignment-field-full">
          <label htmlFor="tutor-qualifications">Qualifications summary</label>
          <textarea id="tutor-qualifications" name="qualifications" required minLength={2} maxLength={2000} defaultValue={profile.tutor_qualifications ?? ""} placeholder="List relevant qualifications. Do not upload identity documents or private certificates here." />
        </div>
        <div className="form-field assignment-field-full">
          <label htmlFor="tutor-experience">Relevant experience</label>
          <textarea id="tutor-experience" name="experience" required minLength={2} maxLength={2000} defaultValue={profile.tutor_experience ?? ""} />
        </div>
        <div className="form-field">
          <label htmlFor="tutor-languages">Languages spoken</label>
          <input id="tutor-languages" name="languages" required maxLength={320} defaultValue={profile.tutor_languages.join(", ")} />
          <span className="field-hint">Separate one to eight languages with commas.</span>
        </div>
        <div className="form-field">
          <label htmlFor="tutor-timezone">Preferred time zone</label>
          <input id="tutor-timezone" name="timezone" list="tutor-time-zones" required maxLength={100} defaultValue={profile.tutor_timezone} />
          <datalist id="tutor-time-zones">
            {COMMON_TIME_ZONES.map((timezone) => <option value={timezone} key={timezone} />)}
          </datalist>
        </div>
        <div className="form-field assignment-field-full">
          <label htmlFor="tutor-availability">Availability</label>
          <textarea id="tutor-availability" name="availability" required minLength={2} maxLength={1000} defaultValue={profile.tutor_availability ?? ""} placeholder="For example, weekday evenings and Saturday mornings (Africa/Nairobi)." />
        </div>
        <div className="form-field">
          <label htmlFor="tutor-minimum-price">Minimum service price (optional)</label>
          <input id="tutor-minimum-price" name="minimum_price" inputMode="decimal" maxLength={32} defaultValue={formatPriceInput(profile.tutor_min_price_minor, currency)} />
        </div>
        <div className="form-field">
          <label htmlFor="tutor-maximum-price">Maximum service price</label>
          <input id="tutor-maximum-price" name="maximum_price" inputMode="decimal" maxLength={32} defaultValue={formatPriceInput(profile.tutor_max_price_minor, currency)} />
        </div>
        <div className="form-field">
          <label htmlFor="tutor-price-currency">Pricing currency</label>
          <select id="tutor-price-currency" name="price_currency" defaultValue={currency}>
            {ASSIGNMENT_CURRENCIES.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
          </select>
        </div>
      </div>
      <p className="field-hint">Pricing preferences are estimates only. Quotation submissions set their own price and currency. Editing an approved public profile returns it to review.</p>
      <MarketplaceFeedback state={state} />
      <button className="button" type="submit" disabled={pending}>{pending ? "Saving profile…" : "Save tutor profile"}</button>
    </form>
  );
}
