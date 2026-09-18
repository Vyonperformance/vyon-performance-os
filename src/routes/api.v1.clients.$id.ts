import { createFileRoute } from "@tanstack/react-router";
import { handleIntegrationRequest } from "@/modules/integrations/http.server";
export const Route = createFileRoute("/api/v1/clients/$id")({
  server: {
    handlers: {
      GET: ({ request, params }) => handleIntegrationRequest(request, "clients.read", params.id),
    },
  },
});
