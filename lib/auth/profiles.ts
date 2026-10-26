import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Profile } from "@/lib/supabase/database.types";

export async function getProfileById(
  supabase: SupabaseClient<Database>,
  userId: string,
) {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, country, phone_e164, role, tutor_application_status, tutor_subjects, tutor_languages, tutor_bio, tutor_professional_name, tutor_qualifications, tutor_experience, tutor_timezone, tutor_availability, tutor_min_price_minor, tutor_max_price_minor, tutor_price_currency, tutor_is_active, tutor_review_reason, tutor_reviewed_at, tutor_reviewed_by, terms_accepted_at, privacy_accepted_at, created_at, updated_at",
    )
    .eq("id", userId)
    .maybeSingle();

  return { profile: data as Profile | null, error };
}
