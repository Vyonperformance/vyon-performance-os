import { createFileRoute } from "@tanstack/react-router";
import { handleIntegrationRequest } from "@/modules/integrations/http.server";
export const Route = createFileRoute("/api/v1/services")({
  server: {
    handlers: { GET: ({ request }) => handleIntegrationRequest(request, "services.read") },
  },
});
