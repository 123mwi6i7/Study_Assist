import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getDashboardPathForProfile } from "@/lib/auth/paths";
import { getProfileById } from "@/lib/auth/profiles";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Profile, UserRole } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export async function requireRole(allowedRole: UserRole): Promise<Profile> {
  await connection();

  if (!isSupabaseConfigured()) {
    redirect("/auth/setup");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const subject = data?.claims?.sub;

  if (error || typeof subject !== "string") {
    redirect("/login");
  }

  const { profile, error: profileError } = await getProfileById(supabase, subject);

  if (profileError || !profile) {
    redirect("/auth/profile-unavailable");
  }

  if (profile.role !== allowedRole) {
    redirect(getDashboardPathForProfile(profile));
  }

  return profile;
}

export async function requireSignedInProfile(): Promise<Profile> {
  await connection();

  if (!isSupabaseConfigured()) {
    redirect("/auth/setup");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const subject = data?.claims?.sub;

  if (error || typeof subject !== "string") {
    redirect("/auth/expired");
  }

  const { profile, error: profileError } = await getProfileById(supabase, subject);

  if (profileError || !profile) {
    redirect("/auth/profile-unavailable");
  }

  return profile;
}
