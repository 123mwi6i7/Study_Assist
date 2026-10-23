import { NextResponse, type NextRequest } from "next/server";
import { getDashboardPathForProfile } from "@/lib/auth/paths";
import { getProfileById } from "@/lib/auth/profiles";
import { getSiteUrl, getSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

function redirectWithoutCache(path: string) {
  const response = NextResponse.redirect(new URL(path, getSiteUrl()));
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function GET(request: NextRequest) {
  if (!getSupabaseConfig()) {
    return redirectWithoutCache("/auth/setup");
  }

  const callbackUrl = request.nextUrl;
  const code = callbackUrl.searchParams.get("code");
  const tokenHash = callbackUrl.searchParams.get("token_hash");
  const otpType = callbackUrl.searchParams.get("type");

  if (!code && !tokenHash) {
    return redirectWithoutCache("/auth/expired");
  }

  const supabase = await createClient();
  let exchangeError;

  if (code) {
    ({ error: exchangeError } = await supabase.auth.exchangeCodeForSession(code));
  } else {
    // Only accept email confirmation and recovery types from links we issue.
    const allowedOtpTypes = [
      "signup",
      "invite",
      "magiclink",
      "recovery",
      "email_change",
      "email",
    ] as const;
    const isAllowedOtpType = allowedOtpTypes.some((allowedType) => allowedType === otpType);

    if (!isAllowedOtpType || !tokenHash) {
      return redirectWithoutCache("/auth/expired");
    }

    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType as (typeof allowedOtpTypes)[number],
    });
    exchangeError = error;
  }

  if (exchangeError) {
    return redirectWithoutCache("/auth/expired");
  }

  // This one allowlisted path is used only by password-recovery emails.
  if (
    otpType === "recovery" ||
    callbackUrl.searchParams.get("next") === "/update-password"
  ) {
    return redirectWithoutCache("/update-password");
  }

  const { data: claims, error: claimsError } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;

  if (claimsError || typeof userId !== "string") {
    return redirectWithoutCache("/auth/expired");
  }

  const { profile, error: profileError } = await getProfileById(supabase, userId);

  if (profileError || !profile) {
    return redirectWithoutCache("/auth/profile-unavailable");
  }

  return redirectWithoutCache(getDashboardPathForProfile(profile));
}
