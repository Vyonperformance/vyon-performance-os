import { createServerClient } from "@supabase/ssr";
import { getCookies, setCookie, setResponseHeader } from "@tanstack/react-start/server";
import { supabaseConfig } from "./config";

export function serverSupabase() {
  const config = supabaseConfig();
  if (!config) throw new Error("Supabase ainda não configurado. Consulte docs/foundation.md.");
  setResponseHeader("Cache-Control", "private, no-store");
  return createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => Object.entries(getCookies()).map(([name, value]) => ({ name, value })),
      setAll: (cookies) => {
        for (const { name, value, options } of cookies) setCookie(name, value, options);
      },
    },
  });
}
