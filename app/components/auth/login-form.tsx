"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInUser, type AuthActionState } from "@/app/auth/actions";
import { FormFeedback } from "@/app/components/auth/form-feedback";
import { PasswordField } from "@/app/components/auth/password-field";

const initialState: AuthActionState = { status: "idle", message: "" };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signInUser, initialState);

  return (
    <section className="auth-card" aria-labelledby="login-title">
      <div className="auth-card-heading">
        <p className="auth-card-eyebrow">WELCOME BACK</p>
        <h2 id="login-title">Log in to StudyAssist</h2>
        <p>Continue your learning journey.</p>
      </div>

      <form action={formAction} className="auth-form">
        <div className="form-field">
          <label htmlFor="email">Email address</label>
          <input id="email" name="email" type="email" autoComplete="email" maxLength={254} required />
        </div>

        <PasswordField id="password" label="Password" name="password" autoComplete="current-password" showHint={false} />
        <div className="form-utility-row">
          <Link href="/forgot-password">Forgot password?</Link>
        </div>

        <FormFeedback status={state.status} message={state.message} />

        <button className="auth-submit" type="submit" disabled={pending}>
          {pending ? <><span className="auth-spinner" aria-hidden="true" /> Logging in…</> : "Log in"}
        </button>

        <p className="auth-switch-link">New to StudyAssist? <Link href="/register">Create an account</Link></p>
      </form>
    </section>
  );
}
