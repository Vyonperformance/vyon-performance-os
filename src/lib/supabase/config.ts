export function supabaseConfig() {
  const url = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
  const key = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined;
  if (!url || !key) return null;
  if (key.startsWith("sb_secret_")) throw new Error("Use somente a chave pública do Supabase.");
  // Legacy service_role JWTs must not be accepted as public configuration either.
  if (key.split(".").length === 3) {
    try {
      const payload = JSON.parse(atob(key.split(".")[1]!.replace(/-/g, "+").replace(/_/g, "/")));
      if (payload.role === "service_role") throw new Error("Chave privilegiada não permitida.");
    } catch (error) {
      if (error instanceof Error && error.message.includes("privilegiada")) throw error;
    }
  }
  return { url, key };
}
