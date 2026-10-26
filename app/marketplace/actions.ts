"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { ASSIGNMENT_CURRENCIES, ASSIGNMENT_SUBJECTS } from "@/lib/assignments/options";
import { parseCurrencyAmount } from "@/lib/marketplace/currency";
import { createClient } from "@/lib/supabase/server";

export type MarketplaceActionState = {
  status: "idle" | "error" | "success";
  message: string;
};

function errorState(message: string): MarketplaceActionState {
  return { status: "error", message };
}

function successState(message: string): MarketplaceActionState {
  return { status: "success", message };
}

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function splitList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export async function updateTutorProfile(
  _previous: MarketplaceActionState,
  formData: FormData,
): Promise<MarketplaceActionState> {
  await requireRole("tutor");

  const professionalName = text(formData, "professional_name");
  const bio = text(formData, "bio");
  const country = text(formData, "country");
  const subjects = formData.getAll("subjects").filter((value): value is string => typeof value === "string");
  const qualifications = text(formData, "qualifications");
  const experience = text(formData, "experience");
  const languages = splitList(text(formData, "languages"));
  const timezone = text(formData, "timezone");
  const availability = text(formData, "availability");
  const minimumText = text(formData, "minimum_price");
  const maximumText = text(formData, "maximum_price");
  const currency = text(formData, "price_currency");

  if (professionalName.length < 2 || professionalName.length > 120) {
    return errorState("Professional name must be between 2 and 120 characters.");
  }
  if (bio.length < 20 || bio.length > 1000) {
    return errorState("Biography must be between 20 and 1,000 characters.");
  }
  if (country.length < 2 || country.length > 100) {
    return errorState("Enter a valid country of residence.");
  }
  if (
    subjects.length < 1 ||
    subjects.length > 8 ||
    subjects.some((subject) => !ASSIGNMENT_SUBJECTS.some((option) => option.value === subject))
  ) {
    return errorState("Choose between one and eight supported subjects.");
  }
  if (qualifications.length < 2 || qualifications.length > 2000) {
    return errorState("Qualifications summary must be between 2 and 2,000 characters.");
  }
  if (experience.length < 2 || experience.length > 2000) {
    return errorState("Experience summary must be between 2 and 2,000 characters.");
  }
  if (
    languages.length < 1 ||
    languages.length > 8 ||
    languages.some((language) => language.length < 2 || language.length > 40)
  ) {
    return errorState("List one to eight spoken languages, separated by commas.");
  }
  if (availability.length < 2 || availability.length > 1000) {
    return errorState("Describe your availability in 2 to 1,000 characters.");
  }

  let minimumPrice: number | null = null;
  let maximumPrice: number | null = null;
  if (minimumText || maximumText) {
    if (!minimumText || !maximumText) {
      return errorState("Enter both a minimum and maximum price, or leave both blank.");
    }
    if (!ASSIGNMENT_CURRENCIES.some((option) => option.value === currency)) {
      return errorState("Choose a supported pricing currency.");
    }
    try {
      minimumPrice = parseCurrencyAmount(minimumText, currency);
      maximumPrice = parseCurrencyAmount(maximumText, currency);
    } catch (error) {
      return errorState(error instanceof Error ? error.message : "Enter valid pricing preferences.");
    }
    if (maximumPrice < minimumPrice) {
      return errorState("The maximum price must be at least the minimum price.");
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("update_tutor_marketplace_profile", {
    p_professional_name: professionalName,
    p_bio: bio,
    p_country: country,
    p_subjects: subjects,
    p_qualifications: qualifications,
    p_experience: experience,
    p_languages: languages,
    p_timezone: timezone,
    p_availability: availability,
    p_min_price_minor: minimumPrice,
    p_max_price_minor: maximumPrice,
    p_price_currency: minimumPrice === null ? null : currency,
  });

  if (error) return errorState(error.message);
  revalidatePath("/tutor/profile");
  revalidatePath("/tutors");
  revalidatePath("/tutor/dashboard");
  return successState(data);
}

export async function reviewTutorApplication(
  _previous: MarketplaceActionState,
  formData: FormData,
): Promise<MarketplaceActionState> {
  await requireRole("admin");
  const tutorId = text(formData, "tutor_id");
  const status = text(formData, "status");
  const reason = text(formData, "reason");

  if (!/^[0-9a-f-]{36}$/i.test(tutorId)) return errorState("Choose a valid tutor application.");
  if (!["approved", "rejected", "suspended"].includes(status)) {
    return errorState("Choose approve, reject, or suspend.");
  }
  if ((status === "rejected" || status === "suspended") && (reason.length < 5 || reason.length > 1000)) {
    return errorState("Provide a reason between 5 and 1,000 characters.");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("review_tutor_application", {
    p_tutor_id: tutorId,
    p_status: status,
    p_reason: reason || null,
  });
  if (error) return errorState(error.message);

  revalidatePath("/admin/dashboard");
  revalidatePath("/tutors");
  revalidatePath("/tutor/dashboard");
  return successState(`Tutor application ${status}.`);
}

export async function submitTutorQuotation(
  _previous: MarketplaceActionState,
  formData: FormData,
): Promise<MarketplaceActionState> {
  await requireRole("tutor");
  const assignmentId = text(formData, "assignment_id");
  const amountText = text(formData, "price");
  const currency = text(formData, "currency");
  const serviceDescription = text(formData, "service_description");
  const deliveryHours = Number(text(formData, "delivery_hours"));
  const revisionTerms = text(formData, "revision_terms");
  const additionalNotes = text(formData, "additional_notes");

  if (!/^[0-9a-f-]{36}$/i.test(assignmentId)) return errorState("Choose a valid assignment.");
  if (!ASSIGNMENT_CURRENCIES.some((option) => option.value === currency)) {
    return errorState("Choose a supported quotation currency.");
  }
  if (!Number.isInteger(deliveryHours) || deliveryHours < 1 || deliveryHours > 8760) {
    return errorState("Estimated delivery must be between 1 hour and 365 days.");
  }
  if (serviceDescription.length < 20 || serviceDescription.length > 2000) {
    return errorState("Describe your proposed service in 20 to 2,000 characters.");
  }
  if (revisionTerms.length < 2 || revisionTerms.length > 1000) {
    return errorState("Revision terms must be between 2 and 1,000 characters.");
  }
  if (additionalNotes.length > 2000 || (additionalNotes.length > 0 && additionalNotes.length < 2)) {
    return errorState("Additional notes must be between 2 and 2,000 characters, or left blank.");
  }

  let priceAmountMinor: number;
  try {
    priceAmountMinor = parseCurrencyAmount(amountText, currency);
  } catch (error) {
    return errorState(error instanceof Error ? error.message : "Enter a valid quotation price.");
  }
  if (priceAmountMinor < 1) return errorState("The quotation price must be greater than zero.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_tutor_quotation", {
    p_assignment_id: assignmentId,
    p_price_amount_minor: priceAmountMinor,
    p_currency: currency,
    p_service_description: serviceDescription,
    p_estimated_delivery_hours: deliveryHours,
    p_revision_terms: revisionTerms,
    p_additional_notes: additionalNotes || null,
  });

  if (error) {
    return errorState(
      error.code === "23505"
        ? "You already have an active quotation for this assignment."
        : error.message,
    );
  }

  revalidatePath("/tutor/opportunities");
  revalidatePath("/tutor/quotations");
  redirect("/tutor/quotations?submitted=1");
}

export async function acceptTutorQuotation(
  _previous: MarketplaceActionState,
  formData: FormData,
): Promise<MarketplaceActionState> {
  await requireRole("student");
  const quotationId = text(formData, "quotation_id");

  if (!/^[0-9a-f-]{36}$/i.test(quotationId)) return errorState("Choose a valid quotation.");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_tutor_quotation", {
    p_quotation_id: quotationId,
  });
  if (error) return errorState(error.message);

  revalidatePath(`/student/assignments/${data}`);
  revalidatePath("/student/assignments");
  revalidatePath("/tutor/opportunities");
  return successState("Tutor selected. This engagement is awaiting payment; no payment has been taken.");
}
