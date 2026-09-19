import { afterEach, beforeEach, expect, test } from "bun:test";
import { randomBytes } from "node:crypto";
import { GatewayError, integrationGateway } from "../src/modules/integrations/gateway.server";

const names = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "VYON_SUPABASE_URL",
  "VYON_SUPABASE_SECRET_KEY",
  "SUPABASE_URL",
  "SUPABASE_SECRET_KEY",
] as const;
const original = Object.fromEntries(names.map((name) => [name, process.env[name]]));
const originalFetch = globalThis.fetch;
const url = "https://official.example.test";
let secret: string;

beforeEach(() => {
  secret = "sb_secret_" + randomBytes(32).toString("hex");
  process.env.VITE_SUPABASE_URL = url;
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
  process.env.VYON_SUPABASE_URL = url;
  process.env.VYON_SUPABASE_SECRET_KEY = secret;
  process.env.SUPABASE_URL = "https://unrelated.example.test";
  process.env.SUPABASE_SECRET_KEY = "sb_secret_legacy_test";
  globalThis.fetch = (() => {
    throw new Error("Unexpected network request");
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const name of names) {
    if (original[name] === undefined) delete process.env[name];
    else process.env[name] = original[name];
  }
});

test("gateway uses Vyon URL and secret despite unrelated platform variables", async () => {
  let calls = 0;
  globalThis.fetch = (async (input, init) => {
    calls++;
    const request = new Request(input, init);
    expect(request.url).toBe(url + "/rest/v1/rpc/integration_key_lookup");
    // Compare without printing either credential in a failing assertion.
    expect(request.headers.get("apikey") === secret).toBe(true);
    return new Response("null", { headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
  expect(await integrationGateway().lookup("test-prefix")).toBeNull();
  expect(calls).toBe(1);
});

test.each(["url", "secret", "both", "mismatch", "invalid-secret"])(
  "gateway fails closed for %s without using legacy variables",
  (scenario) => {
    // Legacy configuration is valid, but must never serve as a fallback.
    process.env.SUPABASE_URL = url;
    process.env.SUPABASE_SECRET_KEY = secret;
    if (scenario === "url" || scenario === "both") delete process.env.VYON_SUPABASE_URL;
    if (scenario === "secret" || scenario === "both") delete process.env.VYON_SUPABASE_SECRET_KEY;
    if (scenario === "mismatch") process.env.VYON_SUPABASE_URL = "https://different.example.test";
    if (scenario === "invalid-secret") process.env.VYON_SUPABASE_SECRET_KEY = "sb_publishable_test";
    let caught: unknown;
    try {
      integrationGateway();
    } catch (error) {
      caught = error;
    }
    expect(caught instanceof GatewayError).toBe(true);
    expect((caught as GatewayError).status).toBe(503);
    expect((caught as GatewayError).code).toBe("integration_unavailable");
  },
);
