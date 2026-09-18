import { useQuery } from "@tanstack/react-query";
import { PageHeader, TableShell, EmptyState } from "@/components/vyon/system";
import { useTeamMember } from "../auth/session";
import { teamOptions } from "../shared/queries";
import { AccessDenied, Loading, Failure } from "../shared/states";
export function TeamPage() {
  const member = useTeamMember();
  const allowed = member.permissions.includes("team.read");
  const result = useQuery({ ...teamOptions(member.organizationId), enabled: allowed });
  if (!allowed) return <AccessDenied />;
  return (
    <>
      <PageHeader title="Equipe" description="Usuários ativos da organização" />
      {result.isPending ? (
        <Loading />
      ) : result.isError ? (
        <Failure message={result.error.message} retry={() => result.refetch()} />
      ) : !result.data.length ? (
        <EmptyState
          title="Nenhum usuário ativo"
          description="Os usuários convidados aparecerão após a liberação de acesso."
        />
      ) : (
        <TableShell>
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Cargo</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((t) => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td>{t.role}</td>
                  <td>Ativo</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      )}
    </>
  );
}
