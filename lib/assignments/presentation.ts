import type { Assignment } from "@/lib/supabase/database.types";
import { ASSIGNMENT_SUBJECTS, ASSISTANCE_TYPES } from "@/lib/assignments/options";

export const ASSIGNMENT_COLUMNS =
  "id, student_id, title, subject, course_name, description, academic_level, institution_name, assistance_type, preferred_language, deadline_at, deadline_timezone, budget_amount_minor, budget_currency, additional_notes, status, submitted_at, created_at, updated_at";

export function assignmentSubjectLabel(value: string) {
  return ASSIGNMENT_SUBJECTS.find((item) => item.value === value)?.label ?? value;
}

export function assignmentAssistanceLabel(value: string) {
  return ASSISTANCE_TYPES.find((item) => item.value === value)?.label ?? value;
}

export function formatAssignmentDate(value: string, timeZone: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone,
      timeZoneName: "short",
    }).format(new Date(value));
  } catch {
    return new Intl.DateTimeFormat("en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
      timeZoneName: "short",
    }).format(new Date(value));
  }
}

export function formatBudget(amountMinor: Assignment["budget_amount_minor"], currency: string | null) {
  if (amountMinor === null || !currency) return "Not provided";

  try {
    const fractionDigits = new Intl.NumberFormat("en", {
      style: "currency",
      currency,
    }).resolvedOptions().maximumFractionDigits ?? 2;
    const amountDigits = String(amountMinor);
    if (!/^\d+$/.test(amountDigits)) throw new Error("Invalid stored amount.");

    const paddedAmount = amountDigits.padStart(fractionDigits + 1, "0");
    const wholeDigits = fractionDigits > 0
      ? paddedAmount.slice(0, -fractionDigits)
      : paddedAmount;
    const fraction = fractionDigits > 0 ? paddedAmount.slice(-fractionDigits) : "";
    const wholeNumber = Number(wholeDigits);
    if (!Number.isSafeInteger(wholeNumber)) throw new Error("Stored amount is too large.");
    const whole = new Intl.NumberFormat("en", {
      maximumFractionDigits: 0,
      useGrouping: true,
    }).format(wholeNumber);
    const template = new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).formatToParts(fractionDigits > 0 ? 1.1 : 1);

    let insertedAmount = false;
    return template.map((part) => {
      if (part.type === "integer") {
        if (insertedAmount) return "";
        insertedAmount = true;
        return whole;
      }
      if (part.type === "decimal") return fractionDigits > 0 ? part.value : "";
      if (part.type === "fraction") return fractionDigits > 0 ? fraction : "";
      return part.value;
    }).join("");
  } catch {
    return `${currency} ${String(amountMinor)} minor units`;
  }
}
