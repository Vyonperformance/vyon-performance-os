import { createBrowserClient } from "@supabase/ssr";
import { supabaseConfig } from "./config";
export function browserSupabase() {
  const config = supabaseConfig();
  if (!config) return null;
  return createBrowserClient(config.url, config.key);
}
