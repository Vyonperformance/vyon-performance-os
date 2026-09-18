import { randomUUID, createHash } from "node:crypto";
import { z } from "zod";
import { externalClient, webhookEnvelope, eventId, type Operation } from "./contracts";
import { equalHash, parseCredential } from "./keys.server";
import { integrationGateway, GatewayError, type IntegrationGateway } from "./gateway.server";
const maxBytes = 65536;
class InputError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
  }
}
async function readJson(request: Request): Promise<unknown> {
  if (!/^application\/json(?:;|$)/i.test(request.headers.get("content-type") ?? ""))
    throw new InputError(400, "invalid_request");
  if (request.headers.has("content-encoding")) throw new InputError(400, "invalid_request");
  if (Number(request.headers.get("content-length")) > maxBytes)
    throw new InputError(413, "payload_too_large");
  const reader = request.body?.getReader();
  if (!reader) throw new InputError(400, "invalid_payload");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > maxBytes) {
        await reader.cancel();
        throw new InputError(413, "payload_too_large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    // Reject obvious embedded credentials before persistence, including unknown webhook bodies.
    if (
      /vyon_[a-f0-9]{24}\.[a-f0-9]{64}|sb_secret_|Bearer\s|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\./i.test(
        text,
      )
    )
      throw new Error("secret");
    return JSON.parse(text);
  } catch {
    throw new InputError(400, "invalid_payload");
  }
}
function reply(status: number, body: unknown, requestId: string) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Request-ID": requestId,
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}
// Dependency injection exercises the real HTTP boundary against PostgreSQL in tests.
export async function handleIntegrationRequest(
  request: Request,
  operation: Operation,
  id?: string,
  gatewayFactory: () => IntegrationGateway = integrationGateway,
): Promise<Response> {
  const requestId = randomUUID();
  let gateway: IntegrationGateway | undefined;
  let identity: { id: string; hash: string } | undefined;
  try {
    const credential = parseCredential(request.headers.get("authorization"));
    if (!credential)
      return reply(401, { error: { code: "invalid_api_key" }, requestId }, requestId);
    gateway = gatewayFactory();
    const record = await gateway.lookup(credential.prefix);
    const matches = equalHash(credential.hash, record?.hash ?? "0".repeat(64));
    if (!record || !matches)
      return reply(401, { error: { code: "invalid_api_key" }, requestId }, requestId);
    identity = { id: record.id, hash: credential.hash };
    let input: unknown;
    let externalId: string | null = null;
    if (operation === "clients.read") input = { id: z.string().uuid().parse(id) };
    else if (operation === "services.read") {
      const url = new URL(request.url);
      input = {
        after: z
          .string()
          .uuid()
          .optional()
          .parse(url.searchParams.get("after") ?? undefined),
      };
    } else {
      const raw = await readJson(request);
      const header = request.headers.get("idempotency-key");
      if (operation === "clients.create") {
        input = externalClient.parse(raw);
        externalId = eventId.parse(header);
      } else {
        const envelope = webhookEnvelope.parse(raw);
        externalId = eventId.parse(envelope.externalEventId ?? header);
        if (header && envelope.externalEventId && header !== envelope.externalEventId)
          throw new InputError(400, "invalid_request");
        input =
          envelope.type === "client.create"
            ? { type: envelope.type, data: externalClient.parse(envelope.data) }
            : // Unsupported raw content is never persisted; retain only a fingerprint for conflict detection.
              {
                type: "unsupported",
                fingerprint: createHash("sha256").update(JSON.stringify(raw)).digest("hex"),
              };
      }
    }
    const result = await gateway.execute(
      identity.id,
      identity.hash,
      operation,
      input,
      externalId,
      requestId,
    );
    return reply(
      result.status,
      {
        data: result.data,
        error: result.error ? { code: result.error } : null,
        eventId: result.eventId,
        duplicate: result.duplicate,
        requestId,
      },
      requestId,
    );
  } catch (error) {
    if (error instanceof InputError || error instanceof z.ZodError) {
      const status = error instanceof InputError ? error.status : 400;
      const code = error instanceof InputError ? error.code : "invalid_payload";
      if (gateway && identity) {
        try {
          await gateway.execute(
            identity.id,
            identity.hash,
            operation,
            { rejection: code },
            null,
            requestId,
          );
        } catch {
          return reply(503, { error: { code: "integration_unavailable" }, requestId }, requestId);
        }
      }
      return reply(status, { error: { code }, requestId }, requestId);
    }
    // Never echo/log exceptions, headers, credentials, payloads or database error details.
    return reply(
      error instanceof GatewayError ? error.status : 503,
      {
        error: { code: error instanceof GatewayError ? error.code : "integration_unavailable" },
        requestId,
      },
      requestId,
    );
  }
}
