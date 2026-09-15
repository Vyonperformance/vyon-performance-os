import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/vyon/system";
export function Loading() {
  return (
    <p role="status" className="py-12 text-sm text-muted-foreground">
      Carregando…
    </p>
  );
}
export function Failure({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div role="alert" className="py-8">
      <p className="mb-3 text-sm">{message}</p>
      <Button variant="outline" onClick={retry}>
        Tentar novamente
      </Button>
    </div>
  );
}
export function NotConnected() {
  return (
    <EmptyState
      title="Módulo ainda não conectado"
      description="Esta área será disponibilizada em uma próxima etapa. Não há dados operacionais para exibir aqui."
    />
  );
}
export function AccessDenied() {
  return (
    <EmptyState
      title="Acesso não permitido"
      description="Seu cargo não possui permissão para esta área."
    />
  );
}
export function money(value: string | number | null, currency = "BRL") {
  return value === null
    ? "—"
    : new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(Number(value) / 100);
}
