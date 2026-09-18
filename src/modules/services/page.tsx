import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, TableShell, EmptyState } from "@/components/vyon/system";
import { useTeamMember } from "../auth/session";
import { serviceOptions, useSaveService } from "../shared/queries";
import { serviceInput } from "../shared/schemas";
import { AccessDenied, Loading, Failure, NotConnected, money } from "../shared/states";
export function SettingsPage() {
  const member = useTeamMember();
  const [tab, setTab] = useState("Serviços");
  const result = useQuery({
    ...serviceOptions(member.organizationId),
    enabled: member.permissions.includes("services.read"),
  });
  const save = useSaveService(member.organizationId);
  const form = useForm<z.input<typeof serviceInput>, unknown, z.output<typeof serviceInput>>({
    resolver: zodResolver(serviceInput),
    defaultValues: {
      name: "",
      description: "",
      basePriceCents: "",
      currency: "BRL",
      billingKind: "monthly",
    },
  });
  return (
    <>
      <PageHeader title="Configurações" description="Organização e catálogo de serviços" />
      <div className="grid gap-6 lg:grid-cols-[210px_1fr]">
        <nav className="space-y-1">
          {["Organização", "Serviços", "Integrações", "API", "Departamentos", "Cargos"].map((t) => (
            <button
              key={t}
              className={`w-full rounded-md px-3 py-2 text-left text-xs ${tab === t ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </nav>
        <section>
          {tab === "Organização" ? (
            <p className="text-sm">{member.organizationName}</p>
          ) : tab !== "Serviços" ? (
            <NotConnected />
          ) : !member.permissions.includes("services.read") ? (
            <AccessDenied />
          ) : (
            <>
              {result.isPending ? (
                <Loading />
              ) : result.isError ? (
                <Failure message={result.error.message} retry={() => result.refetch()} />
              ) : result.data.length ? (
                <TableShell>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Serviço</th>
                        <th>Valor base</th>
                        <th>Cobrança</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.data.map((s) => (
                        <tr key={s.id}>
                          <td>{s.name}</td>
                          <td>{money(s.base_price_cents, s.currency)}</td>
                          <td>{s.billing_kind === "monthly" ? "Mensal" : "Única"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableShell>
              ) : (
                <EmptyState title="Catálogo vazio" description="Cadastre o primeiro serviço." />
              )}
              {member.permissions.includes("services.manage") && (
                <form
                  onSubmit={form.handleSubmit(async (input) => {
                    save.mutate({ data: { input } }, { onSuccess: () => form.reset() });
                  })}
                  className="mt-6 space-y-4 rounded-lg border border-border bg-card p-5"
                >
                  <h2 className="text-sm font-semibold">Criar serviço</h2>
                  <label className="field">
                    Nome
                    <Input {...form.register("name")} />
                    {form.formState.errors.name?.message}
                  </label>
                  <label className="field">
                    Descrição
                    <Input {...form.register("description")} />
                  </label>
                  <label className="field">
                    Valor base (R$)
                    <Controller
                      control={form.control}
                      name="basePriceCents"
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
                    {form.formState.errors.basePriceCents?.message}
                  </label>
                  <label className="field">
                    Cobrança
                    <select className="control" {...form.register("billingKind")}>
                      <option value="monthly">Mensal</option>
                      <option value="one_time">Única</option>
                    </select>
                  </label>
                  <Button disabled={save.isPending}>Salvar serviço</Button>
                  {save.error && (
                    <p role="alert" className="text-sm text-destructive">
                      {save.error.message}
                    </p>
                  )}
                </form>
              )}
            </>
          )}
        </section>
      </div>
    </>
  );
}
