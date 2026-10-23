import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { MISSING_SUPABASE_CONFIG_MESSAGE, getSupabaseConfig } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";

export async function createClient() {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error(MISSING_SUPABASE_CONFIG_MESSAGE);
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components can read cookies but cannot write response cookies.
          // The root proxy refreshes sessions before protected pages render.
        }
      },
    },
  });
}
