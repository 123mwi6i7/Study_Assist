"use client";

import { useState } from "react";

export function PasswordField({
  id,
  label,
  name,
  autoComplete,
  minLength = 12,
  showHint = true,
}: {
  id: string;
  label: string;
  name: string;
  autoComplete: string;
  minLength?: number;
  showHint?: boolean;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <div className="password-input-wrap">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required
          minLength={minLength}
          maxLength={128}
        />
        <button
          className="password-toggle"
          type="button"
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
      {showHint ? (
        <span className="field-hint">At least 12 characters, with uppercase, lowercase, and a number.</span>
      ) : null}
    </div>
  );
}
