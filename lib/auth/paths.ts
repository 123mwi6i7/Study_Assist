import type { Profile, UserRole } from "@/lib/supabase/database.types";

export function getDashboardPath(role: UserRole) {
  switch (role) {
    case "student":
      return "/student/dashboard";
    case "tutor":
      return "/tutor/dashboard";
    case "admin":
      return "/admin/dashboard";
  }
}

export function getDashboardPathForProfile(profile: Profile) {
  return getDashboardPath(profile.role);
}
