import { useState } from "react";
import { AlertTriangle, ArrowUpRight, Check, ChevronRight, Circle, Download, FileText, KeyRound, Mail, MoreHorizontal, Pencil, Phone, Plus, Send, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getClientDetail, type ClientDetail } from "@/data/client-details";
import type { Tone } from "@/data/mock";
import { cn } from "@/lib/utils";
import { PageHeader, StatusBadge, TableShell } from "./system";

const tabs = ["Visão Geral", "Dados", "Contratos", "Financeiro", "Onboarding", "Acessos", "Campanhas", "Demandas e Tarefas", "Relatórios", "Arquivos", "Histórico"] as const;
type Tab = (typeof tabs)[number];

export function ClientProfile({ id }: { id: string }) {
  const [tab, setTab] = useState<Tab>("Visão Geral");
  const c = getClientDetail(id);
  if (!c) return <p>Cliente não encontrado.</p>;
  const active = c.gates.contract && c.gates.payment && c.gates.access;

  return (
    <>
      <PageHeader
        title={c.name}
        description={`Cliente desde ${c.entry} · ${c.services.join(" + ")}`}
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm"><MoreHorizontal />Ações do cliente</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem><Plus className="size-4" />Nova demanda</DropdownMenuItem>
              <DropdownMenuItem><FileText className="size-4" />Novo contrato</DropdownMenuItem>
              <DropdownMenuItem><Send className="size-4" />Gerar relatório</DropdownMenuItem>
              <DropdownMenuItem><KeyRound className="size-4" />Solicitar acessos</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem><Pencil className="size-4" />Editar cadastro</DropdownMenuItem>
              <DropdownMenuItem><Upload className="size-4" />Enviar arquivo</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <div className="mb-5 grid overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <HeaderCell label="Status operacional"><StatusBadge tone={c.operationalTone}>{c.operational}</StatusBadge></HeaderCell>
        <HeaderCell label="Status financeiro"><StatusBadge tone={c.financialTone}>{c.financial}</StatusBadge></HeaderCell>
        <HeaderCell label="Gestor responsável"><b className="text-[13px] font-medium">{c.manager}</b></HeaderCell>
        <HeaderCell label="Data de entrada"><b className="text-[13px] font-medium">{c.entry}</b></HeaderCell>
        <HeaderCell label="Serviços contratados"><b className="text-[13px] font-medium">{c.services.join(" + ")}</b></HeaderCell>
        <HeaderCell label="Ativação"><StatusBadge tone={active ? "success" : "warning"}>{active ? "Cliente ativo" : "Aguardando ativação"}</StatusBadge></HeaderCell>
      </div>

      <div className="mb-6 overflow-x-auto border-b border-border">
        <div className="flex min-w-max gap-5">
          {tabs.map((x) => (
            <button key={x} onClick={() => setTab(x)} className={cn("border-b-2 pb-3 text-xs font-medium transition-colors", tab === x ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>{x}</button>
          ))}
        </div>
      </div>

      {tab === "Visão Geral" && <Overview c={c} onTab={setTab} />}
      {tab === "Dados" && <Data c={c} />}
      {tab === "Contratos" && <Contracts c={c} />}
      {tab === "Financeiro" && <Finance c={c} />}
      {tab === "Onboarding" && <Onboarding c={c} />}
      {tab === "Acessos" && <Access c={c} />}
      {tab === "Campanhas" && <Campaigns c={c} />}
      {tab === "Demandas e Tarefas" && <Demands c={c} />}
      {tab === "Relatórios" && <Reports c={c} />}
      {tab === "Arquivos" && <Files c={c} />}
      {tab === "Histórico" && <History c={c} />}
    </>
  );
}

function HeaderCell({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="bg-card px-4 py-3"><p className="text-[11px] text-muted-foreground">{label}</p><div className="mt-1.5">{children}</div></div>;
}

function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">{title}</h2>{action && <button onClick={onAction} className="text-xs font-medium text-primary">{action}</button>}</div>;
}

/* ---------- Visão Geral ---------- */
function Overview({ c, onTab }: { c: ClientDetail; onTab: (t: Tab) => void }) {
  const active = c.gates.contract && c.gates.payment && c.gates.access;
  const summary: [string, string, Tone?][] = [
    ["Contrato", c.contracts[0]?.status ?? "—", "success"],
    ["Financeiro", c.financial, c.financialTone],
    ["Ativação", active ? "Concluída" : "Pendente", active ? "success" : "warning"],
    ["Onboarding", `${c.onboarding.progress}%`],
    ["Acessos", c.gates.accessLabel, c.gates.access ? "success" : "warning"],
    ["Gestor responsável", c.manager],
    ["Serviços", c.services.join(" + ")],
    ["Próximo relatório", c.nextReport],
  ];
  return (
    <div className="space-y-6">
      <div className="grid overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {summary.map(([label, value, tone]) => (
          <div className="bg-card px-4 py-3" key={label}>
            <p className="text-[11px] text-muted-foreground">{label}</p>
            <p className={cn("mt-1 text-sm font-semibold", tone === "success" && "text-success", tone === "warning" && "text-warning", tone === "danger" && "text-destructive")}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
        <section><SectionTitle title="Status de ativação" /><ActivationCard c={c} /></section>
        <section>
          <SectionTitle title="Requer atenção" />
          <div className="space-y-2">
            {c.alerts.map((a) => (
              <div key={a.title} className={cn("rounded-lg border p-3 text-xs", a.tone === "danger" ? "border-destructive/30 bg-destructive/8" : a.tone === "warning" ? "border-warning/30 bg-warning/8" : "border-info/30 bg-info/8")}>
                <b className="flex items-center gap-2"><AlertTriangle className={cn("size-3.5", a.tone === "danger" ? "text-destructive" : a.tone === "warning" ? "text-warning" : "text-info")} />{a.title}</b>
                <p className="mt-1 text-muted-foreground">{a.detail}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <SectionTitle title="Tarefas abertas" action="Ver todas" onAction={() => onTab("Demandas e Tarefas")} />
          <TableShell>
            <div className="divide-y divide-border">
              {c.demands.flatMap((d) => d.tasks.filter((t) => t.status !== "Concluída").map((t) => ({ ...t, demand: d.title }))).slice(0, 5).map((t) => (
                <div className="flex items-center gap-3 px-4 py-3" key={t.title}>
                  <Checkbox aria-label={t.title} />
                  <span className="min-w-0 flex-1"><b className="block truncate text-xs font-medium">{t.title}</b><small className="text-[11px] text-muted-foreground">{t.demand} · {t.owner} · {t.due}</small></span>
                  <StatusBadge tone={priorityTone(t.priority)}>{t.priority}</StatusBadge>
                </div>
              ))}
            </div>
          </TableShell>
        </section>
        <section>
          <SectionTitle title="Atividade recente" action="Ver histórico" onAction={() => onTab("Histórico")} />
          <div className="rounded-lg border border-border bg-card p-4">
            <Timeline items={c.history.slice(0, 5)} />
          </div>
        </section>
      </div>
    </div>
  );
}

function ActivationCard({ c }: { c: ClientDetail }) {
  const active = c.gates.contract && c.gates.payment && c.gates.access;
  const gates: [string, boolean, string][] = [
    ["Contrato assinado", c.gates.contract, c.gates.contract ? c.contracts[0]?.code ?? "" : "Aguardando assinatura"],
    ["Primeiro pagamento confirmado", c.gates.payment, c.gates.payment ? "Confirmado" : "Pendente"],
    ["Acessos obrigatórios validados", c.gates.access, c.gates.accessLabel],
  ];
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="divide-y divide-border">
        {gates.map(([label, ok, note]) => (
          <div className="flex items-center gap-3 px-4 py-3" key={label}>
            {ok ? <Check className="size-4 shrink-0 text-success" /> : <Circle className="size-4 shrink-0 text-warning" />}
            <span className="flex-1 text-[13px] font-medium">{label}</span>
            <span className={cn("text-xs", ok ? "text-muted-foreground" : "text-warning")}>{note}</span>
          </div>
        ))}
      </div>
      <div className={cn("border-t border-border px-4 py-3 text-xs", active ? "bg-success/8" : "bg-warning/8")}>
        <b className={active ? "text-success" : "text-warning"}>{active ? "Cliente ativo" : "Aguardando ativação"}</b>
        <p className="mt-1 text-muted-foreground">{active ? "Os três requisitos obrigatórios foram concluídos." : `Faltam ${c.gates.missing} acessos obrigatórios para este cliente poder ser ativado.`}</p>
      </div>
    </div>
  );
}

function Timeline({ items }: { items: ClientDetail["history"] }) {
  return (
    <div className="border-l border-border pl-4">
      {items.map((h, i) => (
        <div className={cn("relative", i < items.length - 1 && "pb-5")} key={h.event + h.when}>
          <span className={cn("absolute -left-[21px] top-1.5 size-2 rounded-full", h.tone === "success" ? "bg-success" : h.tone === "warning" ? "bg-warning" : h.tone === "info" ? "bg-info" : "bg-faint")} />
          <p className="text-[13px] font-medium">{h.event}</p>
          <p className="text-[11px] text-muted-foreground">{h.when} · {h.who}</p>
        </div>
      ))}
    </div>
  );
}

/* ---------- Dados ---------- */
function Data({ c }: { c: ClientDetail }) {
  const fields: [string, string][] = [
    ["Razão social", c.legal], ["Nome fantasia", c.trade], ["CPF/CNPJ", c.doc], ["E-mail", c.email], ["Telefone", c.phone], ["Endereço", c.address],
    ["Gestor responsável", c.manager], ["Data de entrada", c.entry], ["Origem do cadastro", c.origin], ["ID externo", c.externalId ?? "—"],
  ];
  return (
    <div className="space-y-6">
      <section>
        <SectionTitle title="Dados cadastrais" action="Editar" />
        <div className="grid overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {fields.map(([k, v]) => <div className="bg-card px-4 py-3" key={k}><p className="text-[11px] text-muted-foreground">{k}</p><p className="mt-1 text-[13px] font-medium">{v}</p></div>)}
        </div>
        <div className="mt-3 rounded-lg border border-border bg-card px-4 py-3"><p className="text-[11px] text-muted-foreground">Observações internas</p><p className="mt-1 text-[13px]">{c.notes}</p></div>
      </section>
      <section>
        <SectionTitle title="Contatos" action="Adicionar contato" />
        <TableShell>
          <table className="data-table">
            <thead><tr><th>Contato</th><th>Tipo</th><th>E-mail</th><th>Telefone</th><th>Situação</th><th></th></tr></thead>
            <tbody>
              {c.contacts.map((p) => (
                <tr key={p.email} className={cn(!p.active && "opacity-55")}>
                  <td className="font-medium">{p.name}</td>
                  <td><StatusBadge tone={p.type === "Principal" ? "info" : "neutral"}>{p.type}</StatusBadge></td>
                  <td className="text-muted-foreground"><span className="flex items-center gap-1.5"><Mail className="size-3.5" />{p.email}</span></td>
                  <td className="text-muted-foreground"><span className="flex items-center gap-1.5"><Phone className="size-3.5" />{p.phone}</span></td>
                  <td>{p.active ? <StatusBadge tone="success">Ativo</StatusBadge> : <StatusBadge>Desativado</StatusBadge>}</td>
                  <td className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Ações de ${p.name}`}><MoreHorizontal /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end"><DropdownMenuItem>Editar contato</DropdownMenuItem><DropdownMenuItem>{p.active ? "Desativar" : "Reativar"}</DropdownMenuItem></DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      </section>
    </div>
  );
}

/* ---------- Contratos ---------- */
function Contracts({ c }: { c: ClientDetail }) {
  const [open, setOpen] = useState<ClientDetail["contracts"][number] | null>(null);
  return (
    <>
      <SectionTitle title="Contratos do cliente" action="Novo contrato" />
      <TableShell>
        <table className="data-table">
          <thead><tr><th>Código</th><th>Serviços</th><th>Valor</th><th>Início</th><th>Término</th><th>Status</th><th>Assinatura</th></tr></thead>
          <tbody>
            {c.contracts.map((k) => (
              <tr key={k.code} className="cursor-pointer" onClick={() => setOpen(k)}>
                <td className="font-semibold text-primary">{k.code}</td>
                <td>{k.services}</td><td className="tabular-nums">{k.value}</td><td className="text-muted-foreground">{k.start}</td><td className="text-muted-foreground">{k.end}</td>
                <td><StatusBadge tone={k.tone}>{k.status}</StatusBadge></td>
                <td className="text-muted-foreground">{k.signed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>
      <p className="mt-3 text-[11px] text-muted-foreground">Estados simulados: Rascunho · Enviado · Aguardando assinatura · Assinado · Recusado · Cancelado · Expirado.</p>
      <Sheet open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader><SheetTitle>{open?.code}</SheetTitle><SheetDescription>{open?.services}</SheetDescription></SheetHeader>
          {open && (
            <div className="space-y-4 px-4 pb-6">
              <StatusBadge tone={open.tone}>{open.status}</StatusBadge>
              <dl className="divide-y divide-border rounded-lg border border-border">
                {[["Valor", open.value], ["Início", open.start], ["Término", open.end], ["Assinatura", open.signed], ["Cliente", c.name], ["Responsável", c.manager]].map(([k, v]) => (
                  <div className="flex justify-between px-3 py-2.5 text-xs" key={k}><dt className="text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></div>
                ))}
              </dl>
              <div className="flex gap-2"><Button size="sm" variant="outline"><FileText />Visualizar</Button><Button size="sm" variant="outline"><Download />Baixar</Button></div>
              <p className="text-[11px] text-muted-foreground">Assinatura eletrônica será conectada em etapa futura.</p>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

/* ---------- Financeiro ---------- */
function Finance({ c }: { c: ClientDetail }) {
  return (
    <div className="space-y-6">
      <div className="grid overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {[["Valor contratado", c.finance.contracted], ["Total pago", c.finance.paid], ["Próxima cobrança", c.finance.next], ["Situação financeira", c.finance.situation]].map(([k, v], i) => (
          <div className="bg-card px-4 py-3" key={k}><p className="text-[11px] text-muted-foreground">{k}</p><p className={cn("mt-1 text-lg font-semibold tabular-nums", i === 3 && (c.finance.situationTone === "success" ? "text-success" : "text-warning"))}>{v}</p></div>
        ))}
      </div>
      <section>
        <SectionTitle title="Histórico de cobranças" />
        <TableShell>
          <table className="data-table">
            <thead><tr><th>Cobrança</th><th>Valor</th><th>Vencimento</th><th>Status</th><th>Forma de pagamento</th><th>Pagamento</th><th></th></tr></thead>
            <tbody>
              {c.finance.charges.map((x) => (
                <tr key={x.code}>
                  <td className="font-medium">{x.code}</td><td className="tabular-nums">{x.value}</td><td className="text-muted-foreground">{x.due}</td>
                  <td><StatusBadge tone={x.tone}>{x.status}</StatusBadge></td><td className="text-muted-foreground">{x.method}</td><td className="text-muted-foreground">{x.paid}</td>
                  <td className="text-right"><Button variant="ghost" size="sm">Detalhes</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      </section>
    </div>
  );
}

/* ---------- Onboarding ---------- */
function Onboarding({ c }: { c: ClientDetail }) {
  const o = c.onboarding;
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section>
        <SectionTitle title="Checklist do onboarding" />
        <div className="divide-y divide-border rounded-lg border border-border bg-card">
          {o.items.map((it) => (
            <div className="px-4 py-3" key={it.label}>
              <div className="flex items-center gap-3">
                {it.done ? <Check className="size-4 text-success" /> : <Circle className="size-4 text-muted-foreground" />}
                <span className="flex-1 text-[13px]">{it.label}</span>
                <span className={cn("text-[11px]", it.done ? "text-muted-foreground" : "text-warning")}>{it.done ? "Concluído" : "Pendente"}</span>
              </div>
              {it.task && (
                <div className="mt-2 ml-7 flex items-center gap-2 border-l border-border pl-3 text-[11px] text-muted-foreground">
                  <ChevronRight className="size-3" />Tarefa relacionada: <b className="font-medium text-foreground">{it.task}</b>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
      <aside>
        <SectionTitle title="Progresso" />
        <div className="rounded-lg border border-border bg-card p-5">
          <b className="text-3xl tabular-nums">{o.progress}%</b>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary" style={{ width: `${o.progress}%` }} /></div>
          <dl className="mt-5 space-y-3 text-xs">
            <div className="flex justify-between"><dt className="text-muted-foreground">Responsável</dt><dd>{o.owner}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Início</dt><dd>{o.start}</dd></div>
            <div className="flex items-center justify-between"><dt className="text-muted-foreground">Status</dt><dd><StatusBadge tone={o.progress === 100 ? "success" : "warning"}>{o.status}</StatusBadge></dd></div>
          </dl>
        </div>
      </aside>
    </div>
  );
}

/* ---------- Acessos ---------- */
function Access({ c }: { c: ClientDetail }) {
  const blocking = c.access.filter((a) => a.required && a.status !== "Validado");
  return (
    <div className="space-y-4">
      {blocking.length > 0 ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/8 p-3 text-xs">
          <b>{blocking.length} acessos obrigatórios estão bloqueando a ativação:</b> <span className="text-muted-foreground">{blocking.map((b) => b.platform).join(", ")}. Nenhuma senha é armazenada no sistema.</span>
        </div>
      ) : (
        <div className="rounded-lg border border-success/30 bg-success/8 p-3 text-xs"><b>Todos os acessos obrigatórios estão validados.</b> <span className="text-muted-foreground">Nenhuma senha é armazenada no sistema.</span></div>
      )}
      <TableShell>
        <table className="data-table">
          <thead><tr><th>Plataforma</th><th>Tipo de acesso</th><th>Serviço</th><th>Obrigatório</th><th>Status</th><th>Solicitado em</th><th>Recebido em</th><th>Validado por</th></tr></thead>
          <tbody>
            {c.access.map((a) => {
              const blocks = a.required && a.status !== "Validado";
              return (
                <tr key={a.platform}>
                  <td className="font-medium">
                    <span className="flex items-center gap-2"><KeyRound className="size-4 text-muted-foreground" />{a.platform}</span>
                    {blocks && <span className="mt-1 block text-[11px] text-destructive">Este acesso está bloqueando a ativação do cliente.</span>}
                  </td>
                  <td className="text-muted-foreground">{a.kind}</td>
                  <td className="text-muted-foreground">{a.service}</td>
                  <td>{a.required ? "Sim" : "Não"}</td>
                  <td><StatusBadge tone={accessTone(a.status)}>{a.status}</StatusBadge></td>
                  <td className="text-muted-foreground">{a.requested}</td>
                  <td className="text-muted-foreground">{a.received}</td>
                  <td className="text-muted-foreground">{a.validatedBy}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableShell>
    </div>
  );
}

/* ---------- Campanhas ---------- */
function Campaigns({ c }: { c: ClientDetail }) {
  const platforms = [...new Set(c.campaigns.map((x) => x.platform))];
  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground">As campanhas são apenas acompanhadas. A edição é feita nas plataformas de origem.</p>
      {platforms.map((p) => (
        <section key={p}>
          <SectionTitle title={p} />
          <TableShell>
            <table className="data-table">
              <thead><tr><th>Conta</th><th>Campanhas ativas</th><th>Investimento</th><th>Leads</th><th>CPA</th><th>ROAS</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {c.campaigns.filter((x) => x.platform === p).map((x) => (
                  <tr key={x.account}>
                    <td className="font-medium">{x.account}</td><td className="tabular-nums">{x.active}</td><td className="tabular-nums">{x.invest}</td>
                    <td className="tabular-nums">{x.leads}</td><td className="tabular-nums">{x.cpa}</td><td className="tabular-nums">{x.roas}</td>
                    <td><StatusBadge tone={x.tone}>{x.status}</StatusBadge></td>
                    <td className="text-right"><Button variant="ghost" size="sm">Ver detalhes<ArrowUpRight /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>
        </section>
      ))}
    </div>
  );
}

/* ---------- Demandas e Tarefas ---------- */
function Demands({ c }: { c: ClientDetail }) {
  return (
    <div className="space-y-4">
      <SectionTitle title="Demandas do cliente" action="Nova demanda" />
      {c.demands.map((d) => (
        <div className="rounded-lg border border-border bg-card" key={d.title}>
          <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
            <b className="text-[13px]">{d.title}</b>
            <StatusBadge tone={priorityTone(d.priority)}>{d.priority}</StatusBadge>
            <StatusBadge tone={statusTone(d.status)}>{d.status}</StatusBadge>
            <span className="text-[11px] text-muted-foreground">{d.owner} · prazo {d.due}</span>
            <div className="ml-auto flex items-center gap-2">
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary" style={{ width: `${d.progress}%` }} /></div>
              <span className="text-[11px] tabular-nums text-muted-foreground">{d.progress}%</span>
              <Button variant="ghost" size="sm"><Plus />Tarefa</Button>
            </div>
          </div>
          <div className="divide-y divide-border">
            {d.tasks.map((t) => (
              <div className="flex flex-wrap items-center gap-3 py-2.5 pl-8 pr-4" key={t.title}>
                <ChevronRight className="size-3.5 text-faint" />
                <span className="min-w-0 flex-1 text-xs font-medium">{t.title}</span>
                <span className="text-[11px] text-muted-foreground">{t.owner}</span>
                <StatusBadge tone={priorityTone(t.priority)}>{t.priority}</StatusBadge>
                <StatusBadge tone={statusTone(t.status)}>{t.status}</StatusBadge>
                <span className="w-20 text-right text-[11px] text-muted-foreground">{t.due}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Relatórios ---------- */
function Reports({ c }: { c: ClientDetail }) {
  return (
    <>
      <SectionTitle title="Relatórios do cliente" action="Gerar relatório" />
      <TableShell>
        <table className="data-table">
          <thead><tr><th>Período</th><th>Tipo</th><th>Responsável</th><th>Status</th><th>Gerado em</th><th>Enviado em</th><th></th></tr></thead>
          <tbody>
            {c.reports.map((r) => (
              <tr key={r.period + r.type}>
                <td className="font-medium">{r.period}</td><td>{r.type}</td><td className="text-muted-foreground">{r.owner}</td>
                <td><StatusBadge tone={r.tone}>{r.status}</StatusBadge></td>
                <td className="text-muted-foreground">{r.generated}</td><td className="text-muted-foreground">{r.sent}</td>
                <td className="text-right"><div className="flex justify-end gap-1"><Button variant="ghost" size="sm">Visualizar</Button><Button variant="ghost" size="sm">Revisar</Button><Button variant="ghost" size="sm"><Send />Enviar</Button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>
    </>
  );
}

/* ---------- Arquivos ---------- */
function Files({ c }: { c: ClientDetail }) {
  const cats = ["Contratos", "Documentos", "Relatórios", "Criativos", "Outros"];
  const [cat, setCat] = useState("Todos");
  const list = cat === "Todos" ? c.files : c.files.filter((f) => f.category === cat);
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {["Todos", ...cats].map((x) => (
          <button key={x} onClick={() => setCat(x)} className={cn("rounded-full border px-3 py-1 text-[11px] font-medium transition-colors", cat === x ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground")}>
            {x} <span className="text-faint">{x === "Todos" ? c.files.length : c.files.filter((f) => f.category === x).length}</span>
          </button>
        ))}
        <Button size="sm" variant="outline" className="ml-auto"><Upload />Enviar arquivo</Button>
      </div>
      <TableShell>
        <table className="data-table">
          <thead><tr><th>Nome</th><th>Categoria</th><th>Data</th><th>Enviado por</th><th></th></tr></thead>
          <tbody>
            {list.map((f) => (
              <tr key={f.name}>
                <td className="font-medium"><span className="flex items-center gap-2"><FileText className="size-4 text-muted-foreground" />{f.name}</span></td>
                <td><StatusBadge>{f.category}</StatusBadge></td>
                <td className="text-muted-foreground">{f.date}</td><td className="text-muted-foreground">{f.by}</td>
                <td className="text-right"><Button variant="ghost" size="sm"><Download />Baixar</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>
      <p className="mt-3 text-[11px] text-muted-foreground">Área visual de organização. Nenhum arquivo é armazenado nesta versão.</p>
    </>
  );
}

/* ---------- Histórico ---------- */
function History({ c }: { c: ClientDetail }) {
  return (
    <>
      <SectionTitle title="Histórico do cliente" />
      <div className="rounded-lg border border-border bg-card p-5">
        <Timeline items={c.history} />
      </div>
    </>
  );
}

function priorityTone(p: string): Tone { return p === "Urgente" ? "danger" : p === "Alta" ? "warning" : p === "Baixa" ? "neutral" : "info"; }
function statusTone(s: string): Tone { return s === "Concluída" ? "success" : s === "Em andamento" ? "info" : s === "Aguardando" ? "warning" : "neutral"; }
function accessTone(s: string): Tone { return s === "Validado" ? "success" : s === "Recebido" ? "info" : s === "Inválido" ? "danger" : s === "Solicitado" ? "info" : "warning"; }
