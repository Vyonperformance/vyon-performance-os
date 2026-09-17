# Etapa 4 — homologação do Supabase real

Verificação retomada em 17/09/2026. Projeto confirmado: **Vyon Performance OS**, referência `oqwuhqdwkugksrmrccoe`, região `sa-east-1`, PostgreSQL 17.6. A aplicação continua na branch `feat/supabase-foundation`; não houve merge em main nem avanço à Etapa 5.

## Aplicado

Os três arquivos originais foram revisados e enviados integralmente pelo conector, na ordem correta. Não houve reconstrução manual do schema. A quarta migration restringe EXECUTE da função de event trigger preexistente da plataforma, sem alterar sua lógica.

| Arquivo no repositório | Versão registrada pelo conector no remoto |
| --- | --- |
| 202609150001_core.sql | 202609150001 (reconciliado) |
| 202609150002_commands.sql | 202609150002 (reconciliado) |
| 202609150003_permissions.sql | 202609150003 (reconciliado) |
| 20260915185218_restrict_rls_auto_enable_execute.sql | 20260915185322 |

**Reconciliação das três migrations concluída após autorização explícita:** foram comparados os hashes MD5 do SQL integral local e do SQL registrado no remoto, além dos objetos já existentes. Os três conteúdos coincidiram. Em transação, foram alterados somente os campos `version` dos três registros autorizados, preservando nomes e SQL. Nenhuma migration foi reaplicada; nenhum objeto/schema foi recriado ou removido. Hashes antes/depois: core `0c7fd99d63f5535ea129e2dcca05dc3f`, commands `811ac55a0bbbea2dafa87ba129d999ed`, permissions `53018e2b39d10d3bb16e87ef042df9d1`.

**Ainda pendente:** a quarta migration tem arquivo local `20260915185218_restrict_rls_auto_enable_execute.sql` e registro remoto `20260915185322`. Seu conteúdo também coincide (`8a25eb5515626149b65b22606d7aa1bd`), mas a autorização do usuário foi limitada às três originais. A quarta não foi alterada, renomeada ou reaplicada. Não executar `db push` antes de resolver essa divergência com autorização específica. O bloqueio automático anterior foi superado para as três originais pela nova autorização; não foi contornado.

Somente as onze tabelas autorizadas existem em public: organizations, profiles, organization_memberships, departments, roles, permissions, role_permissions, clients, client_contacts, services, client_services. As tabelas internas de Auth/Storage/plataforma não são entidades de negócio criadas por esta etapa.

Catálogo técnico: 20 permissões. Bootstrap executado por `private.bootstrap_vyon` com o UUID real informado pelo proprietário, após confirmar existência e e-mail confirmado em Auth. Criada organização **Vyon** (`aab7aca5-fae4-4295-a6d2-532ba89de463`), cargo **Administrador**, vínculo ativo/aceito com version 1 e todas as 20 permissões. Nenhuma senha ou conta fictícia foi criada.

Após todos os testes e o rollback: um usuário Auth, uma organização; zero clientes, contatos, serviços e contratações. Vínculo administrativo permaneceu ativo, version 1, com 20 concessões.

## Verificações executadas

- Catálogos PostgreSQL: 78 constraints, todas validadas; 19 FKs, oito compostas; 38 índices; onze policies SELECT; dez triggers de atualização e um trigger de profile em auth.users.
- Onze tabelas com RLS habilitada. `anon` sem SELECT; `authenticated` com SELECT e sem INSERT/UPDATE/DELETE/TRUNCATE diretos.
- Funções de domínio com `search_path` fixo, EXECUTE anônimo revogado e comandos autenticados restritos. Bootstrap privado sem EXECUTE para anon/authenticated.
- Teste transacional real com `SET LOCAL ROLE anon`: tentativa de SELECT nas onze tabelas foi negada. Transação revertida.
- Teste transacional real com `SET LOCAL ROLE authenticated`, sem identidade: zero linhas visíveis nas onze tabelas; comandos de criar cliente, salvar serviço e bootstrap negados. Transação revertida. Isso testa negação sem identidade; NÃO equivale a login com usuário real nem a teste positivo de carteira.
- Advisor de segurança antes/depois da correção. O alerta anônimo de `rls_auto_enable()` desapareceu; EXECUTE anônimo confirmado false.
- Reexecução local das quatro migrations em PGlite: 24 testes, 47 asserções, zero falhas. Nenhuma fixture desses testes foi enviada ao remoto.

### Testes positivos/negativos adicionais no PostgreSQL real

Executado `supabase/tests/live_authorization.sql`, dentro de uma transação revertida, usando o usuário real fornecido. O executor assumiu `SET LOCAL ROLE authenticated`, com `auth.uid()` correspondente; foi verificado `current_user`, sem usar bypass de RLS para as chamadas sob teste. Setup e alterações temporárias de permissões/vínculo foram feitos como operador e revertidos integralmente.

Passaram: leitura da organização e concessões; criação/leitura de catálogo, cliente, contato e contratação; status inicial activation_pending; atualização do cliente; incremento de versão; recusa de versão antiga; leitura global administrativa; carteira atribuída após retirada temporária de read_all; negação de leitura/alteração fora da carteira; isolamento de outra organização; recusa de FK e comando cruzados entre organizações; negação de escrita direta/version arbitrária; negação de alteração do próprio cargo/status; bootstrap negado ao papel autenticado; catálogo negado sem services.manage; leitura e criação negadas após desativação temporária do vínculo.

Foi usada uma identidade real em estados de autorização diferentes; nenhuma segunda conta foi inventada. Os cenários passam pelo papel PostgreSQL e por auth.uid() reais, mas não exercitam emissão/verificação de JWT pelo GoTrue nem o login pelo browser. Não houve teste de exclusão ou UI administrativa além do escopo.

## Segurança e diferenças em relação ao PGlite

O projeto hospedado já possuía `public.rls_auto_enable()`, ausente no harness PGlite. Seu EXECUTE estava concedido a anon/authenticated. Trata-se de função `RETURNS event_trigger`, e o alerta de grants não comprova por si só que pudesse ser explorada como RPC. A migration adicional revoga EXECUTE dos papéis públicos, preservando o event trigger. Não foi removida a proteção automática de RLS.

Restam seis avisos do advisor para as RPCs autenticadas SECURITY DEFINER: accept_invitation, create_client, update_client, save_service, add_client_service e set_team_member. São endpoints intencionais, com autenticação/autorização dentro da função; não devem ser liberados a anon. Os comandos de cliente/catálogo e as principais negativas foram exercitados no PostgreSQL com a identidade real. Aceite de convite por e-mail e sessão de browser continuam fora da validação SQL.

Referência do advisor: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable

Advisor de performance: uma FK sem índice dedicado (`invited_by_membership_id`), duas oportunidades de initplan em policies e índices ainda sem uso em banco vazio. Não removemos índices nem ampliamos esta rodada para otimização de carga.

Referências: https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys e https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan

O PGlite usa auth.users/auth.uid controlados; o remoto tem GoTrue, PostgREST, grants e automações próprios. Não se presume equivalência do fluxo HTTP ou de sessão a partir dos testes locais.

## Limitações de API/Auth e logs

Grants e RLS foram verificados diretamente no PostgreSQL real. Não foi detectado SELECT anônimo ou escrita direta autenticada indevida nas onze tabelas. Teste HTTP efetivamente concluído com chave publishable, sem sessão: as onze tabelas retornaram HTTP 401 / código PostgreSQL 42501 (permission denied), sem expor linhas. `/auth/v1/user` retornou 401. Isso comprova a negação anônima via API, mas não substitui a homologação positiva autenticada.

O conjunto de ferramentas Supabase disponível não expõe leitura de logs de Postgres/Auth/API. Foram revisados os retornos SQL/migrations e os advisors, mas não foi possível inspecionar os logs completos do provedor. Não se afirma ausência de erros nesses logs. Essa inspeção permanece no painel do projeto.

Login, renovação, logout, confirmação de convite e recuperação por e-mail não foram testados pelo browser/GoTrue. Nenhum e-mail foi enviado e nenhuma credencial foi inventada. Nova consulta HTTP a `/auth/v1/settings` confirmou **disable_signup=true** e `mailer_autoconfirm=false`: cadastro público agora desabilitado e confirmação de e-mail exigida. Site URL, redirects e SMTP ainda precisam de homologação no ambiente da aplicação.

## Bloqueios restantes para liberar merge

1. Reconciliar a **quarta** migration, com autorização específica limitada a metadados. As três originais estão resolvidas; não reaplicar SQL.
2. Concluir login, persistência/renovação de sessão, logout e recuperação no ambiente da aplicação conectado ao projeto real. UUID não é credencial de login; não solicitar senha pelo chat. Conferir URLs/templates/SMTP e variáveis públicas do deployment.
3. Logs completos do provedor ainda dependem de inspeção pelo painel/ferramenta apropriada, conforme limitação acima.

Não surgiu falha de autorização nos testes SQL desta rodada. A segurança de grants/RLS validada não equivale à aprovação ponta a ponta da autenticação. PR continua em rascunho, revisável, mas **ainda não liberado tecnicamente para merge** pelos itens 1 e 2. Sem merge em main e sem Etapa 5.
