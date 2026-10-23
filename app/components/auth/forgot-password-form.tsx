"use client";

import Link from "next/link";
import { useActionState } from "react";
import { sendPasswordReset, type AuthActionState } from "@/app/auth/actions";
import { FormFeedback } from "@/app/components/auth/form-feedback";

const initialState: AuthActionState = { status: "idle", message: "" };

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(sendPasswordReset, initialState);

  return (
    <section className="auth-card" aria-labelledby="forgot-title">
      <div className="auth-card-heading">
        <p className="auth-card-eyebrow">ACCOUNT RECOVERY</p>
        <h2 id="forgot-title">Reset your password</h2>
        <p>Enter your email and we’ll send instructions if an account can receive a reset link there.</p>
      </div>

      <form action={formAction} className="auth-form">
        <div className="form-field">
          <label htmlFor="email">Email address</label>
          <input id="email" name="email" type="email" autoComplete="email" maxLength={254} required />
        </div>

        <FormFeedback status={state.status} message={state.message} />

        <button className="auth-submit" type="submit" disabled={pending}>
          {pending ? <><span className="auth-spinner" aria-hidden="true" /> Sending…</> : "Send reset link"}
        </button>

        <p className="auth-switch-link"><Link href="/login">Return to log in</Link></p>
      </form>
    </section>
  );
}
