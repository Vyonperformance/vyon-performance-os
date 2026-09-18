import { createFileRoute } from "@tanstack/react-router";
import { ClientsPage } from "@/modules/clients/pages";
export const Route = createFileRoute("/clientes/")({
  head: () => ({
    meta: [
      { title: "Clientes — Vyon Performance OS" },
      { name: "description", content: "Gestão visual dos clientes da Vyon Performance." },
      { property: "og:title", content: "Clientes — Vyon Performance OS" },
      { property: "og:description", content: "Gestão visual dos clientes da Vyon Performance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ClientsPage,
});
