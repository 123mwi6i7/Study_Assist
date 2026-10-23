import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/login",
    "/register",
    "/forgot-password",
    "/update-password",
    "/student/:path*",
    "/tutor/:path*",
    "/admin/:path*",
    "/auth/callback",
  ],
};
