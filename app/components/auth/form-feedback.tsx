"use client";

export function FormFeedback({
  status,
  message,
}: {
  status: "idle" | "error" | "success";
  message: string;
}) {
  if (status === "idle" || !message) return null;

  return (
    <p
      className={`form-feedback ${status === "error" ? "form-feedback-error" : "form-feedback-success"}`}
      role={status === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      {message}
    </p>
  );
}
