import { createBrowserClient } from "@supabase/ssr";
import { MISSING_SUPABASE_CONFIG_MESSAGE, getSupabaseConfig } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";

export function createBrowserSupabaseClient() {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error(MISSING_SUPABASE_CONFIG_MESSAGE);
  }

  return createBrowserClient<Database>(config.url, config.publishableKey);
}
