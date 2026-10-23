"use client";

import { useActionState } from "react";
import { updatePassword, type AuthActionState } from "@/app/auth/actions";
import { FormFeedback } from "@/app/components/auth/form-feedback";
import { PasswordField } from "@/app/components/auth/password-field";

const initialState: AuthActionState = { status: "idle", message: "" };

export function UpdatePasswordForm() {
  const [state, formAction, pending] = useActionState(updatePassword, initialState);

  return (
    <section className="auth-card" aria-labelledby="update-password-title">
      <div className="auth-card-heading">
        <p className="auth-card-eyebrow">CHOOSE A NEW PASSWORD</p>
        <h2 id="update-password-title">Set a new password</h2>
        <p>Use a strong password you have not used on another site.</p>
      </div>

      <form action={formAction} className="auth-form">
        <PasswordField id="password" label="New password" name="password" autoComplete="new-password" />
        <PasswordField id="confirmPassword" label="Confirm new password" name="confirmPassword" autoComplete="new-password" showHint={false} />

        <FormFeedback status={state.status} message={state.message} />

        <button className="auth-submit" type="submit" disabled={pending}>
          {pending ? <><span className="auth-spinner" aria-hidden="true" /> Saving…</> : "Save new password"}
        </button>
      </form>
    </section>
  );
}
