import { createFileRoute } from "@tanstack/react-router";
import { TeamPage } from "@/modules/team/page";
export const Route = createFileRoute("/equipe")({
  head: () => ({
    meta: [
      { title: "Equipe — Vyon Performance OS" },
      { name: "description", content: "Gestão visual da equipe e permissões." },
      { property: "og:title", content: "Equipe — Vyon Performance OS" },
      { property: "og:description", content: "Gestão visual da equipe e permissões." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TeamPage,
});
