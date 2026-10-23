import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Profile } from "@/lib/supabase/database.types";

export async function getProfileById(
  supabase: SupabaseClient<Database>,
  userId: string,
) {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, country, phone_e164, role, tutor_application_status, tutor_subjects, tutor_languages, tutor_bio, terms_accepted_at, privacy_accepted_at, created_at, updated_at",
    )
    .eq("id", userId)
    .maybeSingle();

  return { profile: data as Profile | null, error };
}
