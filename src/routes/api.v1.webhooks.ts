import { createFileRoute } from "@tanstack/react-router";
import { handleIntegrationRequest } from "@/modules/integrations/http.server";
export const Route = createFileRoute("/api/v1/webhooks")({
  server: {
    handlers: { POST: ({ request }) => handleIntegrationRequest(request, "webhooks.receive") },
  },
});
