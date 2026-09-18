import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { supabaseConfig } from "@/lib/supabase/config";
import { apiResult, type ApiResult, type Operation } from "./contracts";
// Isolated privileged bridge, never reused by human/session server functions.
// A Supabase secret key maps to service_role. Its value is runtime-only, not VITE_*.
export interface IntegrationGateway {
  lookup(prefix: string): Promise<{ id: string; hash: string } | null>;
  execute(
    keyId: string,
    hash: string,
    operation: Operation,
    input: unknown,
    eventId: string | null,
    requestId: string,
  ): Promise<ApiResult>;
}
export class GatewayError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
  }
}
export function integrationGateway(): IntegrationGateway {
  const url = process.env["SUPABASE_URL"];
  const secret = process.env["SUPABASE_SECRET_KEY"];
  if (!url || url !== supabaseConfig()?.url || !secret?.startsWith("sb_secret_"))
    throw new GatewayError(503, "integration_unavailable");
  const db = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return {
    async lookup(prefix) {
      const { data, error } = await db.rpc("integration_key_lookup", { p_prefix: prefix });
      if (error) throw new GatewayError(503, "integration_unavailable");
      return data
        ? z.object({ id: z.string().uuid(), hash: z.string().regex(/^[a-f0-9]{64}$/) }).parse(data)
        : null;
    },
    async execute(keyId, hash, operation, input, eventId, requestId) {
      const { data, error } = await db.rpc("integration_request", {
        p_key: keyId,
        p_hash: hash,
        p_operation: operation,
        p_input: input,
        p_event_id: eventId,
        p_request_id: requestId,
      });
      if (error)
        throw new GatewayError(
          error.code === "28000" ? 401 : 503,
          error.code === "28000" ? "invalid_api_key" : "integration_unavailable",
        );
      return apiResult.parse(data);
    },
  };
}
