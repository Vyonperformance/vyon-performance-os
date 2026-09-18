import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, TableShell, StatusBadge, EmptyState } from "@/components/vyon/system";
import { useTeamMember } from "../auth/session";
import {
  clientListOptions,
  clientOptions,
  serviceOptions,
  teamOptions,
  useCreateClient,
} from "../shared/queries";
import { createClientInput } from "../shared/schemas";
import { AccessDenied, Failure, Loading, NotConnected, money } from "../shared/states";

export function ClientsPage() {
  const member = useTeamMember();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const allowed = member.permissions.includes("clients.read");
  const result = useQuery({
    ...clientListOptions(member.organizationId, search, page),
    enabled: allowed,
  });
  const team = useQuery({
    ...teamOptions(member.organizationId),
    enabled: member.permissions.includes("team.read"),
  });
  if (!allowed) return <AccessDenied />;
  return (
    <>
      <PageHeader
        title="Clientes"
        description={
          result.data
            ? `${result.data.total} clientes nesta visualização`
            : "Clientes da sua carteira"
        }
        actions={
          member.permissions.includes("clients.manage") ? (
            <Button asChild size="sm">
              <Link to="/clientes/novo">
                <Plus />
                Novo cliente
              </Link>
            </Button>
          ) : null
        }
      />
      <Input
        aria-label="Pesquisar cliente"
        placeholder="Pesquisar cliente…"
        className="mb-4 max-w-sm"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
      />
      {result.isPending ? (
        <Loading />
      ) : result.isError ? (
        <Failure message={result.error.message} retry={() => result.refetch()} />
      ) : result.data.items.length === 0 ? (
        <EmptyState
          title="Nenhum cliente encontrado"
          description="Cadastre um cliente ou ajuste a pesquisa."
        />
      ) : (
        <TableShell>
          <table className="data-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Gestor responsável</th>
                <th>Status operacional</th>
                <th>Data de entrada</th>
              </tr>
            </thead>
            <tbody>
              {result.data.items.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link
                      to="/clientes/$id"
                      params={{ id: c.id }}
                      className="font-semibold hover:text-primary"
                    >
                      {c.trade_name || c.legal_name}
                    </Link>
                  </td>
                  <td>
                    {team.data?.find((t) => t.id === c.manager_membership_id)?.name ??
                      (c.manager_membership_id === member.id ? member.name : "—")}
                  </td>
                  <td>
                    <StatusBadge tone={c.operational_status === "active" ? "success" : "warning"}>
                      {c.operational_status === "active"
                        ? "Ativo"
                        : c.operational_status === "closed"
                          ? "Encerrado"
                          : "Ativação pendente"}
                    </StatusBadge>
                  </td>
                  <td>{c.entry_date.split("-").reverse().join("/")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      )}
      <div className="mt-4 flex items-center justify-between text-xs">
        <Button
          variant="outline"
          size="sm"
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Anterior
        </Button>
        <span>Página {page}</span>
        <Button
          variant="outline"
          size="sm"
          disabled={!result.data || page * 20 >= result.data.total}
          onClick={() => setPage((p) => p + 1)}
        >
          Próxima
        </Button>
      </div>
    </>
  );
}

export function NewClientPage() {
  const member = useTeamMember();
  const navigate = useNavigate();
  const save = useCreateClient(member.organizationId);
  const catalog = useQuery({
    ...serviceOptions(member.organizationId),
    enabled: member.permissions.includes("services.read"),
  });
  const team = useQuery({
    ...teamOptions(member.organizationId),
    enabled: member.permissions.includes("team.read"),
  });
  const form = useForm<
    z.input<typeof createClientInput>,
    unknown,
    z.output<typeof createClientInput>
  >({
    resolver: zodResolver(createClientInput),
    defaultValues: {
      personType: "company",
      legalName: "",
      tradeName: "",
      taxDocument: "",
      email: "",
      phone: "",
      entryDate: new Date().toISOString().slice(0, 10),
      managerId: member.id,
      country: "BR",
      contacts: [],
      services: [],
    },
  });
  const contacts = useFieldArray({ control: form.control, name: "contacts" });
  const selected = useFieldArray({ control: form.control, name: "services" });
  if (!member.permissions.includes("clients.manage")) return <AccessDenied />;
  return (
    <>
      <PageHeader title="Cadastrar cliente" description="Cadastro manual" />
      <form
        className="mx-auto max-w-5xl space-y-6"
        onSubmit={form.handleSubmit(async (data) => {
          save.mutate(
            { data },
            {
              onSuccess: (c) => {
                void navigate({ to: "/clientes/$id", params: { id: c.id } });
              },
            },
          );
        })}
      >
        <section>
          <h2 className="mb-3 text-sm font-semibold">Identificação</h2>
          <div className="grid gap-4 rounded-lg border border-border bg-card p-5 sm:grid-cols-2">
            <label className="field">
              Tipo
              <select className="control" {...form.register("personType")}>
                <option value="company">Pessoa Jurídica</option>
                <option value="individual">Pessoa Física</option>
              </select>
            </label>
            <label className="field">
              Razão Social / Nome
              <Input {...form.register("legalName")} />
              <span className="text-destructive">{form.formState.errors.legalName?.message}</span>
            </label>
            <label className="field">
              Nome fantasia
              <Input {...form.register("tradeName")} />
            </label>
            <label className="field">
              CPF / CNPJ
              <Input {...form.register("taxDocument")} />
              <span className="text-destructive">{form.formState.errors.taxDocument?.message}</span>
            </label>
            <label className="field">
              Data de entrada
              <Input type="date" {...form.register("entryDate")} />
            </label>
          </div>
        </section>
        <section>
          <h2 className="mb-3 text-sm font-semibold">Contato e endereço</h2>
          <div className="grid gap-4 rounded-lg border border-border bg-card p-5 sm:grid-cols-2">
            <label className="field">
              E-mail
              <Input type="email" {...form.register("email")} />
            </label>
            <label className="field">
              Telefone
              <Input {...form.register("phone")} />
            </label>
            <label className="field">
              CEP
              <Input {...form.register("postalCode")} />
            </label>
            <label className="field">
              Logradouro
              <Input {...form.register("street")} />
            </label>
            <label className="field">
              Número
              <Input {...form.register("addressNumber")} />
            </label>
            <label className="field">
              Complemento
              <Input {...form.register("addressComplement")} />
            </label>
            <label className="field">
              Bairro
              <Input {...form.register("district")} />
            </label>
            <label className="field">
              Cidade
              <Input {...form.register("city")} />
            </label>
            <label className="field">
              Estado
              <Input {...form.register("state")} />
            </label>
          </div>
        </section>
        <section>
          <h2 className="mb-3 text-sm font-semibold">Responsáveis</h2>
          <div className="space-y-3 rounded-lg border border-border bg-card p-5">
            {contacts.fields.map((field, i) => (
              <div key={field.id} className="grid gap-3 sm:grid-cols-2">
                <label className="field">
                  Nome
                  <Input {...form.register(`contacts.${i}.name`)} />
                </label>
                <label className="field">
                  E-mail
                  <Input type="email" {...form.register(`contacts.${i}.email`)} />
                </label>
                <label className="field">
                  Telefone
                  <Input {...form.register(`contacts.${i}.phone`)} />
                </label>
                <label className="field">
                  Tipo
                  <select className="control" {...form.register(`contacts.${i}.type`)}>
                    <option value="principal">Principal</option>
                    <option value="financial">Financeiro</option>
                    <option value="marketing">Marketing</option>
                    <option value="administrative">Administrativo</option>
                  </select>
                </label>
                <label className="text-xs">
                  <input type="checkbox" {...form.register(`contacts.${i}.isPrimary`)} /> Contato
                  principal
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  aria-label="Remover contato"
                  onClick={() => contacts.remove(i)}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                contacts.append({
                  name: "",
                  type: "principal",
                  email: "",
                  phone: "",
                  isPrimary: false,
                })
              }
            >
              <Plus />
              Adicionar contato
            </Button>
          </div>
        </section>
        <section>
          <h2 className="mb-3 text-sm font-semibold">Informações internas</h2>
          <div className="grid gap-4 rounded-lg border border-border bg-card p-5 sm:grid-cols-2">
            <label className="field">
              Gestor responsável
              <select className="control" {...form.register("managerId")}>
                <option value={member.id}>{member.name}</option>
                {member.permissions.includes("clients.read_all") &&
                  team.data
                    ?.filter((t) => t.id !== member.id)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
              </select>
            </label>
            <label className="field">
              Observações
              <Input {...form.register("notes")} />
            </label>
          </div>
          {team.isError && (
            <p className="text-xs text-destructive">
              Não foi possível carregar outros responsáveis.
            </p>
          )}
        </section>
        <section>
          <h2 className="mb-3 text-sm font-semibold">Serviços</h2>
          {catalog.isPending && member.permissions.includes("services.read") ? (
            <Loading />
          ) : catalog.isError ? (
            <Failure message={catalog.error.message} retry={() => catalog.refetch()} />
          ) : (
            <div className="space-y-3 rounded-lg border border-border bg-card p-5">
              {selected.fields.map((field, i) => (
                <div key={field.id} className="grid gap-3 sm:grid-cols-4">
                  <label className="field">
                    Serviço
                    <select className="control" {...form.register(`services.${i}.serviceId`)}>
                      <option value="">Selecione</option>
                      {catalog.data?.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} · base {money(s.base_price_cents, s.currency)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    Valor negociado (R$)
                    <Controller
                      control={form.control}
                      name={`services.${i}.priceCents`}
                      render={({ field }) => (
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={field.value === "" ? "" : Number(field.value) / 100}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === ""
                                ? ""
                                : String(Math.round(Number(e.target.value) * 100)),
                            )
                          }
                          onBlur={field.onBlur}
                          ref={field.ref}
                        />
                      )}
                    />
                  </label>
                  <label className="field">
                    Quantidade
                    <Input {...form.register(`services.${i}.quantity`)} />
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    aria-label="Remover serviço"
                    onClick={() => selected.remove(i)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
              {catalog.data?.length ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    selected.append({
                      serviceId: catalog.data[0]!.id,
                      priceCents: String(catalog.data[0]!.base_price_cents ?? 0),
                      quantity: "1",
                      startsOn: "",
                      endsOn: "",
                    })
                  }
                >
                  <Plus />
                  Adicionar serviço
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Nenhum serviço disponível no catálogo.
                </p>
              )}
            </div>
          )}
        </section>
        {Object.keys(form.formState.errors).length > 0 && (
          <p role="alert" className="text-sm text-destructive">
            Revise os campos, contatos e serviços. Valores devem ser válidos e apenas um contato
            pode ser principal.
          </p>
        )}
        {save.error && (
          <p role="alert" className="text-sm text-destructive">
            {save.error.message}
          </p>
        )}
        <div className="flex justify-end gap-2 border-t border-border pt-5">
          <Button asChild variant="outline">
            <Link to="/clientes">Cancelar</Link>
          </Button>
          <Button disabled={save.isPending}>
            {save.isPending ? "Salvando…" : "Salvar cliente"}
          </Button>
        </div>
      </form>
    </>
  );
}
const tabs = [
  "Visão Geral",
  "Dados",
  "Serviços",
  "Contratos",
  "Financeiro",
  "Onboarding",
  "Acessos",
  "Campanhas",
  "Demandas e Tarefas",
  "Relatórios",
  "Arquivos",
  "Histórico",
];
export function ClientDetailPage({ id }: { id: string }) {
  const member = useTeamMember();
  const [tab, setTab] = useState("Visão Geral");
  const result = useQuery({
    ...clientOptions(member.organizationId, id),
    enabled: member.permissions.includes("clients.read"),
  });
  const catalog = useQuery({
    ...serviceOptions(member.organizationId),
    enabled: member.permissions.includes("services.read"),
  });
  if (!member.permissions.includes("clients.read")) return <AccessDenied />;
  if (result.isPending) return <Loading />;
  if (result.isError)
    return <Failure message={result.error.message} retry={() => result.refetch()} />;
  if (!result.data)
    return (
      <EmptyState
        title="Cliente não encontrado"
        description="O cliente não existe ou não está disponível na sua carteira."
      />
    );
  const { client: c, contacts, services } = result.data;
  return (
    <>
      <PageHeader
        title={c.trade_name || c.legal_name}
        description={`Cliente desde ${c.entry_date.split("-").reverse().join("/")}`}
      />
      <StatusBadge tone="warning">
        {c.operational_status === "activation_pending"
          ? "Ativação pendente"
          : c.operational_status === "active"
            ? "Ativo"
            : "Encerrado"}
      </StatusBadge>
      <div className="my-6 overflow-x-auto border-b border-border">
        <div className="flex min-w-max gap-5">
          {tabs.map((t) => (
            <button
              key={t}
              className={`border-b-2 pb-3 text-xs ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      {tab === "Visão Geral" ? (
        <EmptyState
          title="Cadastro conectado"
          description="Dados, contatos e serviços já utilizam persistência real. Os módulos de ativação e os indicadores operacionais serão conectados nas próximas etapas."
        />
      ) : tab === "Dados" ? (
        <div className="space-y-6">
          <section className="grid gap-4 rounded-lg border border-border bg-card p-5 sm:grid-cols-2">
            {[
              ["Razão social", c.legal_name],
              ["CPF/CNPJ", c.tax_document],
              ["E-mail", c.email],
              ["Telefone", c.phone],
              ["Observações", c.notes],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 text-sm">{value || "—"}</p>
              </div>
            ))}
          </section>
          <h2 className="text-sm font-semibold">Contatos</h2>
          {contacts.length ? (
            <TableShell>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>E-mail</th>
                    <th>Telefone</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((c) => (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td>{c.email || "—"}</td>
                      <td>{c.phone || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableShell>
          ) : (
            <EmptyState
              title="Nenhum contato"
              description="Este cliente ainda não possui contatos."
            />
          )}
        </div>
      ) : tab === "Serviços" ? (
        services.length ? (
          <TableShell>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Serviço</th>
                  <th>Valor negociado</th>
                  <th>Quantidade</th>
                  <th>Cobrança</th>
                </tr>
              </thead>
              <tbody>
                {services.map((s) => (
                  <tr key={s.id}>
                    <td>
                      {catalog.data?.find((x) => x.id === s.service_id)?.name ??
                        "Serviço contratado"}
                    </td>
                    <td>{money(s.negotiated_unit_price_cents, s.currency)}</td>
                    <td>{s.quantity}</td>
                    <td>{s.billing_kind === "monthly" ? "Mensal" : "Única"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>
        ) : (
          <EmptyState
            title="Nenhum serviço contratado"
            description="Os serviços escolhidos no cadastro serão exibidos aqui."
          />
        )
      ) : (
        <NotConnected />
      )}
    </>
  );
}
