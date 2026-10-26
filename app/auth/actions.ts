"use server";

import { redirect } from "next/navigation";
import { getDashboardPathForProfile } from "@/lib/auth/paths";
import { getProfileById } from "@/lib/auth/profiles";
import { REGISTRATION_SUBJECTS } from "@/lib/auth/registration-options";
import { ASSIGNMENT_SUBJECTS } from "@/lib/assignments/options";
import {
  MISSING_SUPABASE_CONFIG_MESSAGE,
  getSiteUrl,
  getSupabaseConfig,
} from "@/lib/supabase/config";
import type { UserRole } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export type AuthActionState = {
  status: "idle" | "error" | "success";
  message: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const phonePattern = /^\+[1-9]\d{7,14}$/;
function textValue(formData: FormData, field: string) {
  const value = formData.get(field);
  return typeof value === "string" ? value.trim() : "";
}

function rawValue(formData: FormData, field: string) {
  const value = formData.get(field);
  return typeof value === "string" ? value : "";
}

function isEmail(value: string) {
  return value.length <= 254 && emailPattern.test(value);
}

function isStrongPassword(value: string) {
  return (
    value.length >= 12 &&
    value.length <= 128 &&
    /[a-z]/.test(value) &&
    /[A-Z]/.test(value) &&
    /\d/.test(value)
  );
}

function errorState(message: string): AuthActionState {
  return { status: "error", message };
}

function successState(message: string): AuthActionState {
  return { status: "success", message };
}

export async function registerUser(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const fullName = textValue(formData, "fullName");
  const email = textValue(formData, "email").toLowerCase();
  const phone = textValue(formData, "phone").replace(/[\s().-]/g, "");
  const country = textValue(formData, "country");
  const password = rawValue(formData, "password");
  const confirmPassword = rawValue(formData, "confirmPassword");
  const roleValue = textValue(formData, "role");
  const hasConsent = formData.get("consent") === "on";

  if (fullName.length < 2 || fullName.length > 120) {
    return errorState("Enter your full name (2 to 120 characters).");
  }
  if (!isEmail(email)) {
    return errorState("Enter a valid email address.");
  }
  if (!phonePattern.test(phone)) {
    return errorState("Enter an international phone number, such as +254712345678.");
  }
  if (country.length < 2 || country.length > 100) {
    return errorState("Enter your country of residence.");
  }
  if (!isStrongPassword(password)) {
    return errorState(
      "Use 12 to 128 characters with at least one uppercase letter, one lowercase letter, and one number.",
    );
  }
  if (password !== confirmPassword) {
    return errorState("The passwords do not match.");
  }
  if (roleValue !== "student" && roleValue !== "tutor") {
    return errorState("Choose a student or tutor account.");
  }
  if (!hasConsent) {
    return errorState("Please agree to the Terms and Conditions and Privacy Policy.");
  }

  const role: UserRole = roleValue;
  let tutorSubjects: string[] = [];
  let tutorLanguages: string[] = [];
  let tutorBio = "";

  if (role === "tutor") {
    const selectedSubjects = formData
      .getAll("tutorSubjects")
      .filter((value): value is string => typeof value === "string");
    const registrationSubjectValues: Record<(typeof REGISTRATION_SUBJECTS)[number], string> = {
      Mathematics: "mathematics_statistics",
      Business: "business_management",
      Accounting: "accounting_finance",
      "Computer Science": "computer_science_programming",
      "Research Guidance": "research_methodology",
      "Academic Writing": "academic_writing_guidance",
      Proofreading: "proofreading_draft_feedback",
      Referencing: "referencing_citation_support",
    };
    tutorSubjects = selectedSubjects.map(
      (subject) => registrationSubjectValues[subject as (typeof REGISTRATION_SUBJECTS)[number]],
    );
    tutorLanguages = textValue(formData, "tutorLanguages")
      .split(",")
      .map((language) => language.trim())
      .filter(Boolean);
    tutorBio = textValue(formData, "tutorBio");

    if (
      tutorSubjects.length < 1 ||
      tutorSubjects.length > 8 ||
      selectedSubjects.some((subject) => !REGISTRATION_SUBJECTS.includes(subject as (typeof REGISTRATION_SUBJECTS)[number])) ||
      tutorSubjects.some((subject) => !ASSIGNMENT_SUBJECTS.some((option) => option.value === subject))
    ) {
      return errorState("Choose between 1 and 8 subjects you can support.");
    }
    if (
      tutorLanguages.length < 1 ||
      tutorLanguages.length > 8 ||
      tutorLanguages.some((language) => language.length < 2 || language.length > 40)
    ) {
      return errorState("List 1 to 8 languages, separated by commas.");
    }
    if (tutorBio.length < 20 || tutorBio.length > 1000) {
      return errorState("Write a short biography (20 to 1,000 characters).");
    }
  }

  if (!getSupabaseConfig()) {
    return errorState(MISSING_SUPABASE_CONFIG_MESSAGE);
  }

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return errorState(MISSING_SUPABASE_CONFIG_MESSAGE);
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/callback`,
      data: {
        full_name: fullName,
        phone_e164: phone,
        country,
        role,
        tutor_subjects: tutorSubjects,
        tutor_languages: tutorLanguages,
        tutor_bio: role === "tutor" ? tutorBio : null,
        terms_accepted: true,
        privacy_accepted: true,
      },
    },
  });

  if (error) {
    return errorState(
      "We couldn't complete registration right now. Check your details and try again.",
    );
  }

  if (data.session && data.user) {
    const { profile, error: profileError } = await getProfileById(supabase, data.user.id);

    if (profileError || !profile) {
      return errorState(
        "Your account was created, but its profile is still being prepared. Please try logging in shortly.",
      );
    }

    redirect(getDashboardPathForProfile(profile));
  }

  // Keep the response vague so the form does not reveal whether an email exists.
  return successState(
    "If registration can continue, a verification email will arrive shortly. Follow its link to finish setting up your account.",
  );
}

export async function signInUser(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = textValue(formData, "email").toLowerCase();
  const password = rawValue(formData, "password");

  if (!isEmail(email) || password.length === 0 || password.length > 128) {
    return errorState("Enter your email address and password.");
  }
  if (!getSupabaseConfig()) {
    return errorState(MISSING_SUPABASE_CONFIG_MESSAGE);
  }

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return errorState(MISSING_SUPABASE_CONFIG_MESSAGE);
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return errorState("That email and password combination could not be signed in.");
  }

  const { data: verifiedUser, error: userError } = await supabase.auth.getUser();

  if (userError || !verifiedUser.user) {
    return errorState("We couldn't verify your session. Please try logging in again.");
  }

  const { profile, error: profileError } = await getProfileById(
    supabase,
    verifiedUser.user.id,
  );

  if (profileError || !profile) {
    return errorState(
      "Your account profile could not be found. Please contact StudyAssist support.",
    );
  }

  redirect(getDashboardPathForProfile(profile));
}

export async function sendPasswordReset(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = textValue(formData, "email").toLowerCase();

  if (!isEmail(email)) {
    return errorState("Enter a valid email address.");
  }
  if (!getSupabaseConfig()) {
    return errorState(MISSING_SUPABASE_CONFIG_MESSAGE);
  }

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return errorState(MISSING_SUPABASE_CONFIG_MESSAGE);
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getSiteUrl()}/auth/callback?next=%2Fupdate-password`,
  });

  if (error) {
    return errorState("We couldn't send the request just now. Please wait a moment and try again.");
  }

  return successState(
    "If an account can receive a reset link at that address, an email will arrive shortly. Check your inbox and spam folder.",
  );
}

export async function updatePassword(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const password = rawValue(formData, "password");
  const confirmPassword = rawValue(formData, "confirmPassword");

  if (!isStrongPassword(password)) {
    return errorState(
      "Use 12 to 128 characters with at least one uppercase letter, one lowercase letter, and one number.",
    );
  }
  if (password !== confirmPassword) {
    return errorState("The passwords do not match.");
  }
  if (!getSupabaseConfig()) {
    return errorState(MISSING_SUPABASE_CONFIG_MESSAGE);
  }

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return errorState(MISSING_SUPABASE_CONFIG_MESSAGE);
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return errorState("This reset link has expired. Request a new password reset email.");
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return errorState("We couldn't update your password. Request a new reset link and try again.");
  }

  redirect("/password-updated");
}

export async function signOut() {
  if (getSupabaseConfig()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }

  redirect("/login");
}
