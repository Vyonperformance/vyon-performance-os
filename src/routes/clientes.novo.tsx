import { createFileRoute } from "@tanstack/react-router";
import { NewClientPage } from "@/modules/clients/pages";
export const Route = createFileRoute("/clientes/novo")({
  head: () => ({
    meta: [
      { title: "Novo cliente — Vyon Performance OS" },
      { name: "description", content: "Cadastro visual de cliente." },
      { property: "og:title", content: "Novo cliente — Vyon Performance OS" },
      { property: "og:description", content: "Cadastro visual de cliente." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NewClientPage,
});
