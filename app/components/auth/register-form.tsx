"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { registerUser, type AuthActionState } from "@/app/auth/actions";
import { FormFeedback } from "@/app/components/auth/form-feedback";
import { PasswordField } from "@/app/components/auth/password-field";
import { REGISTRATION_SUBJECTS } from "@/lib/auth/registration-options";

const initialState: AuthActionState = { status: "idle", message: "" };

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerUser, initialState);
  const [role, setRole] = useState("student");

  return (
    <section className="auth-card" aria-labelledby="register-title">
      <div className="auth-card-heading">
        <p className="auth-card-eyebrow">CREATE YOUR ACCOUNT</p>
        <h2 id="register-title">Join StudyAssist</h2>
        <p>Tell us a little about yourself to get started.</p>
      </div>

      <p className="policy-disclosure">
        The linked policy summaries are placeholders. Final Terms and Privacy text must be reviewed before public launch.
      </p>

      <form action={formAction} className="auth-form">
        <div className="form-field">
          <label htmlFor="fullName">Full name</label>
          <input id="fullName" name="fullName" type="text" autoComplete="name" minLength={2} maxLength={120} required />
        </div>

        <div className="form-row">
          <div className="form-field">
            <label htmlFor="email">Email address</label>
            <input id="email" name="email" type="email" autoComplete="email" maxLength={254} required />
          </div>
          <div className="form-field">
            <label htmlFor="phone">International phone number</label>
            <input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="+254 712 345 678" maxLength={25} required />
            <span className="field-hint">Include your country calling code.</span>
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label htmlFor="country">Country of residence</label>
            <input id="country" name="country" type="text" autoComplete="country-name" minLength={2} maxLength={100} required />
          </div>
          <div className="form-field">
            <label htmlFor="role">Account type</label>
            <select id="role" name="role" value={role} onChange={(event) => setRole(event.target.value)} required>
              <option value="student">Student</option>
              <option value="tutor">Tutor</option>
            </select>
          </div>
        </div>

        {role === "tutor" ? (
          <div className="tutor-registration-fields">
            <fieldset className="subject-fieldset">
              <legend>Subjects you can support</legend>
              <p className="field-hint">Choose at least one. Your application will be reviewed.</p>
              <div className="subject-checkbox-grid">
                {REGISTRATION_SUBJECTS.map((subject) => (
                  <label className="checkbox-option" key={subject}>
                    <input type="checkbox" name="tutorSubjects" value={subject} />
                    <span>{subject}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="form-field">
              <label htmlFor="tutorLanguages">Languages spoken</label>
              <input id="tutorLanguages" name="tutorLanguages" type="text" maxLength={240} placeholder="English, Swahili" />
              <span className="field-hint">Separate each language with a comma.</span>
            </div>

            <div className="form-field">
              <label htmlFor="tutorBio">Short professional biography</label>
              <textarea id="tutorBio" name="tutorBio" minLength={20} maxLength={1000} rows={4} placeholder="Share your subject experience and how you like to help students learn." />
              <span className="field-hint">20 to 1,000 characters.</span>
            </div>
          </div>
        ) : null}

        <PasswordField id="password" label="Password" name="password" autoComplete="new-password" />
        <PasswordField id="confirmPassword" label="Confirm password" name="confirmPassword" autoComplete="new-password" showHint={false} />

        <label className="consent-option">
          <input name="consent" type="checkbox" required />
          <span>
            I agree to the <Link href="/#terms-and-conditions" target="_blank" rel="noreferrer">Terms and Conditions</Link> and <Link href="/#privacy-policy" target="_blank" rel="noreferrer">Privacy Policy</Link>.
          </span>
        </label>

        <FormFeedback status={state.status} message={state.message} />

        <button className="auth-submit" type="submit" disabled={pending}>
          {pending ? <><span className="auth-spinner" aria-hidden="true" /> Creating account…</> : "Create account"}
        </button>

        <p className="auth-switch-link">Already have an account? <Link href="/login">Log in</Link></p>
      </form>
    </section>
  );
}
