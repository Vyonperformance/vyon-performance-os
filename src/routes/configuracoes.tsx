import { createFileRoute } from "@tanstack/react-router";
import { SettingsPage } from "@/modules/services/page";
export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Vyon Performance OS" },
      { name: "description", content: "Configurações visuais do Vyon Performance OS." },
      { property: "og:title", content: "Configurações — Vyon Performance OS" },
      { property: "og:description", content: "Configurações visuais do Vyon Performance OS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});
