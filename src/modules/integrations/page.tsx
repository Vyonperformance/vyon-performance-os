import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableShell, EmptyState } from "@/components/vyon/system";
import { useTeamMember } from "../auth/session";
import { AccessDenied, Loading, Failure } from "../shared/states";
import { getIntegrations, saveIntegration, issueKey, revokeKey } from "./functions";
import { integrationInput, keyInput, scopes } from "./contracts";
export function IntegrationsPanel() {
  const member = useTeamMember();
  return member.permissions.includes("integrations.manage") ? (
    <IntegrationAdmin
      key={`${member.userId}:${member.organizationId}`}
      org={member.organizationId}
    />
  ) : (
    <AccessDenied />
  );
}
function IntegrationAdmin({ org }: { org: string }) {
  const q = useQueryClient();
  const queryKey = ["org", org, "integrations"];
  const refresh = () => q.invalidateQueries({ queryKey });
  const result = useQuery({
    queryKey,
    queryFn: () => getIntegrations(),
    retry: 1,
    staleTime: 15000,
  });
  const [oneTimeKey, setOneTimeKey] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState("");
  const integrationForm = useForm<z.infer<typeof integrationInput>>({
    resolver: zodResolver(integrationInput),
    defaultValues: { name: "", category: "system", status: "active" },
  });
  const keyForm = useForm<z.input<typeof keyInput>, unknown, z.output<typeof keyInput>>({
    resolver: zodResolver(keyInput),
    defaultValues: { integrationId: "", name: "", scopes: [], expiresAt: "" },
  });
  const save = useMutation({
    mutationFn: saveIntegration,
    onSuccess: async () => {
      integrationForm.reset({ name: "", category: "system", status: "active" });
      await refresh();
    },
  });
  const revoke = useMutation({ mutationFn: revokeKey, onSuccess: refresh });
  const issue = useMutation({
    mutationFn: async (input: z.output<typeof keyInput>) => {
      const created = await issueKey({ data: input });
      setOneTimeKey(created.key);
      setCopyMessage("");
      return { id: created.id }; // Secret never enters TanStack Query's mutation cache.
    },
    onSuccess: async () => {
      keyForm.reset();
      await refresh();
    },
    gcTime: 0,
  });
  if (result.isPending) return <Loading />;
  if (result.isError)
    return <Failure message={result.error.message} retry={() => result.refetch()} />;
  const { integrations, keys, logs } = result.data;
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold">Integrações</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Controle o acesso dos sistemas externos à Vyon.
        </p>
      </div>
      {integrations.length ? (
        <TableShell>
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Categoria</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {integrations.map((i) => (
                <tr key={i.id}>
                  <td>{i.name}</td>
                  <td>
                    {i.category === "orchestrator"
                      ? "Orquestrador"
                      : i.category === "system"
                        ? "Sistema"
                        : "Outro"}
                  </td>
                  <td>{i.status === "active" ? "Ativa" : "Desativada"}</td>
                  <td>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        integrationForm.reset({
                          id: i.id,
                          name: i.name,
                          category: i.category,
                          status: i.status,
                        })
                      }
                    >
                      Editar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      ) : (
        <EmptyState
          title="Nenhuma integração"
          description="Cadastre um sistema para emitir sua chave de acesso."
        />
      )}
      <form
        className="space-y-3 rounded-lg border border-border bg-card p-5"
        onSubmit={integrationForm.handleSubmit((data) => save.mutate({ data }))}
      >
        <h3 className="text-sm font-semibold">
          {integrationForm.watch("id") ? "Editar integração" : "Nova integração"}
        </h3>
        <label className="field">
          Nome
          <Input {...integrationForm.register("name")} />
          {integrationForm.formState.errors.name?.message}
        </label>
        <label className="field">
          Categoria
          <select className="control" {...integrationForm.register("category")}>
            <option value="system">Sistema</option>
            <option value="orchestrator">Orquestrador</option>
            <option value="other">Outro</option>
          </select>
        </label>
        <label className="field">
          Status
          <select className="control" {...integrationForm.register("status")}>
            <option value="active">Ativa</option>
            <option value="disabled">Desativada</option>
          </select>
        </label>
        <div className="flex gap-2">
          <Button disabled={save.isPending}>Salvar</Button>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              integrationForm.reset({ name: "", category: "system", status: "active" })
            }
          >
            Limpar
          </Button>
        </div>
        {save.error && <p role="alert">{save.error.message}</p>}
      </form>
      {oneTimeKey && (
        <section
          className="space-y-3 rounded-lg border border-primary bg-card p-5"
          aria-label="Nova chave de acesso"
        >
          <h3 className="font-semibold">Copie sua chave agora</h3>
          <p className="text-sm">
            Ela não poderá ser consultada novamente. Guarde-a no cofre de segredos do sistema que
            fará a integração.
          </p>
          <Input readOnly value={oneTimeKey} aria-label="Chave completa" autoComplete="off" />
          <div className="flex gap-2">
            <Button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(oneTimeKey);
                  setCopyMessage("Chave copiada.");
                } catch {
                  setCopyMessage("Selecione e copie a chave manualmente.");
                }
              }}
            >
              Copiar
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setOneTimeKey(null);
                setCopyMessage("");
              }}
            >
              Já guardei, ocultar
            </Button>
          </div>
          <p role="status">{copyMessage}</p>
        </section>
      )}
      <form
        className="space-y-3 rounded-lg border border-border bg-card p-5"
        onSubmit={keyForm.handleSubmit((data) => issue.mutate(data))}
      >
        <h3 className="text-sm font-semibold">Criar API Key</h3>
        <label className="field">
          Integração
          <select className="control" {...keyForm.register("integrationId")}>
            <option value="">Selecione</option>
            {integrations
              .filter((i) => i.status === "active")
              .map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
          </select>
          {keyForm.formState.errors.integrationId && <span>Selecione uma integração ativa.</span>}
        </label>
        <label className="field">
          Nome da chave
          <Input {...keyForm.register("name")} />
          {keyForm.formState.errors.name?.message}
        </label>
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm">Acessos permitidos</legend>
          {scopes.map((s) => (
            <label key={s} className="flex gap-2 text-sm">
              <input type="checkbox" value={s} {...keyForm.register("scopes")} />
              {
                {
                  "clients.read": "Consultar clientes",
                  "clients.create": "Criar clientes",
                  "services.read": "Consultar serviços",
                  "webhooks.receive": "Receber eventos",
                }[s]
              }
            </label>
          ))}
          {keyForm.formState.errors.scopes && <p role="alert">Selecione ao menos um acesso.</p>}
        </fieldset>
        <p className="text-xs text-muted-foreground">
          Eventos de criação de cliente exigem os acessos “Receber eventos” e “Criar clientes”.
        </p>
        <label className="field">
          Expiração opcional (UTC)
          <Controller
            control={keyForm.control}
            name="expiresAt"
            render={({ field }) => (
              <Input
                type="datetime-local"
                value={field.value?.slice(0, 16) ?? ""}
                onBlur={field.onBlur}
                ref={field.ref}
                onChange={(e) =>
                  field.onChange(e.target.value ? new Date(e.target.value + "Z").toISOString() : "")
                }
              />
            )}
          />
        </label>
        <Button
          disabled={
            issue.isPending || !!oneTimeKey || !integrations.some((i) => i.status === "active")
          }
        >
          Criar chave
        </Button>
        {issue.error && <p role="alert">{issue.error.message}</p>}
      </form>
      <section>
        <h3 className="mb-3 text-sm font-semibold">Chaves emitidas</h3>
        {keys.length ? (
          <TableShell>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome / integração</th>
                  <th>Identificação</th>
                  <th>Status / último uso</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id}>
                    <td>
                      {k.name}
                      <p className="text-xs text-muted-foreground">
                        {integrations.find((i) => i.id === k.integration_id)?.name}
                      </p>
                    </td>
                    <td>
                      <code>{k.prefix}</code>
                      <p className="text-xs text-muted-foreground">{k.scopes.join(", ")}</p>
                    </td>
                    <td>
                      {k.status === "revoked"
                        ? "Revogada"
                        : k.expires_at && new Date(k.expires_at) <= new Date()
                          ? "Expirada"
                          : "Ativa"}
                      <p className="text-xs text-muted-foreground">
                        {k.last_used_at
                          ? new Date(k.last_used_at).toLocaleString("pt-BR")
                          : "Nunca utilizada"}
                      </p>
                    </td>
                    <td>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={revoke.isPending || k.status === "revoked"}
                        onClick={() => {
                          if (
                            window.confirm(
                              "Revogar esta chave? O sistema externo perderá o acesso.",
                            )
                          )
                            revoke.mutate({ data: { id: k.id } });
                        }}
                      >
                        Revogar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma chave emitida.</p>
        )}
        {revoke.error && <p role="alert">{revoke.error.message}</p>}
      </section>
      <section>
        <h3 className="mb-3 text-sm font-semibold">Atividade recente</h3>
        {logs.length ? (
          <TableShell>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Operação</th>
                  <th>Resultado</th>
                  <th>Horário</th>
                  <th>Referência</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.operation}</td>
                    <td>
                      {log.response_status}
                      {log.error_code ? ` · ${log.error_code}` : ""}
                    </td>
                    <td>{new Date(log.created_at).toLocaleString("pt-BR")}</td>
                    <td className="text-xs">{log.request_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma requisição registrada.</p>
        )}
      </section>
    </div>
  );
}
