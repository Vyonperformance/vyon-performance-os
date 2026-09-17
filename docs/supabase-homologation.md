# Etapa 4 — homologação do Supabase real

Verificação retomada em 17/09/2026. Projeto confirmado: **Vyon Performance OS**, referência `oqwuhqdwkugksrmrccoe`, região `sa-east-1`, PostgreSQL 17.6. A aplicação continua na branch `feat/supabase-foundation`; não houve merge em main nem avanço à Etapa 5.

## Aplicado

Os três arquivos originais foram revisados e enviados integralmente pelo conector, na ordem correta. Não houve reconstrução manual do schema. A quarta migration restringe EXECUTE da função de event trigger preexistente da plataforma, sem alterar sua lógica.

| Arquivo no repositório | Versão registrada pelo conector no remoto |
| --- | --- |
| 202609150001_core.sql | 20260915184914 |
| 202609150002_commands.sql | 20260915184938 |
| 202609150003_permissions.sql | 20260915185007 |
| 20260915185218_restrict_rls_auto_enable_execute.sql | 20260915185322 |

**Reconciliação de histórico pendente:** o conector gera versões com o horário da aplicação. A tentativa de alinhar os metadados aos identificadores locais foi rejeitada pela revisão automática por considerar a alteração persistente não aprovada e com risco de desincronização. A rejeição foi respeitada; não houve contorno nem alteração do histórico. Não executar `db push`/reaplicar estes arquivos antes de reconciliar explicitamente os registros. A futura correção deverá verificar os conteúdos aplicados e ajustar apenas metadados, com aprovação do usuário; não recriar tabelas.

Somente as onze tabelas autorizadas existem em public: organizations, profiles, organization_memberships, departments, roles, permissions, role_permissions, clients, client_contacts, services, client_services. As tabelas internas de Auth/Storage/plataforma não são entidades de negócio criadas por esta etapa.

Catálogo técnico: 20 permissões. Estado confirmado na retomada: zero usuários Auth e zero organizações. Bootstrap não executado; nenhum usuário/e-mail/UUID/senha fictício foi criado no remoto.

## Verificações executadas

- Catálogos PostgreSQL: 78 constraints, todas validadas; 19 FKs, oito compostas; 38 índices; onze policies SELECT; dez triggers de atualização e um trigger de profile em auth.users.
- Onze tabelas com RLS habilitada. `anon` sem SELECT; `authenticated` com SELECT e sem INSERT/UPDATE/DELETE/TRUNCATE diretos.
- Funções de domínio com `search_path` fixo, EXECUTE anônimo revogado e comandos autenticados restritos. Bootstrap privado sem EXECUTE para anon/authenticated.
- Teste transacional real com `SET LOCAL ROLE anon`: tentativa de SELECT nas onze tabelas foi negada. Transação revertida.
- Teste transacional real com `SET LOCAL ROLE authenticated`, sem identidade: zero linhas visíveis nas onze tabelas; comandos de criar cliente, salvar serviço e bootstrap negados. Transação revertida. Isso testa negação sem identidade; NÃO equivale a login com usuário real nem a teste positivo de carteira.
- Advisor de segurança antes/depois da correção. O alerta anônimo de `rls_auto_enable()` desapareceu; EXECUTE anônimo confirmado false.
- Reexecução local das quatro migrations em PGlite: 24 testes, 47 asserções, zero falhas. Nenhuma fixture desses testes foi enviada ao remoto.

A validação estrutural das constraints não substitui os testes de escrita com usuários reais. Isolamento entre usuários/organizações, carteira atribuída, revogação de vínculo e concorrência por API permanecem pendentes de identidades reais autorizadas.

## Segurança e diferenças em relação ao PGlite

O projeto hospedado já possuía `public.rls_auto_enable()`, ausente no harness PGlite. Seu EXECUTE estava concedido a anon/authenticated. Trata-se de função `RETURNS event_trigger`, e o alerta de grants não comprova por si só que pudesse ser explorada como RPC. A migration adicional revoga EXECUTE dos papéis públicos, preservando o event trigger. Não foi removida a proteção automática de RLS.

Restam seis avisos do advisor para as RPCs autenticadas SECURITY DEFINER: accept_invitation, create_client, update_client, save_service, add_client_service e set_team_member. São endpoints intencionais, com autenticação/autorização dentro da função; não devem ser liberados a anon. A homologação positiva dessas regras com identidades reais ainda precisa ser concluída.

Referência do advisor: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable

Advisor de performance: uma FK sem índice dedicado (`invited_by_membership_id`), duas oportunidades de initplan em policies e índices ainda sem uso em banco vazio. Não removemos índices nem ampliamos esta rodada para otimização de carga.

Referências: https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys e https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan

O PGlite usa auth.users/auth.uid controlados; o remoto tem GoTrue, PostgREST, grants e automações próprios. Não se presume equivalência do fluxo HTTP ou de sessão a partir dos testes locais.

## Limitações de API/Auth e logs

Grants e RLS foram verificados diretamente no PostgreSQL real. Não foi detectado SELECT anônimo ou escrita direta autenticada indevida nas onze tabelas. Teste HTTP efetivamente concluído com chave publishable, sem sessão: as onze tabelas retornaram HTTP 401 / código PostgreSQL 42501 (permission denied), sem expor linhas. `/auth/v1/user` retornou 401. Isso comprova a negação anônima via API, mas não substitui a homologação positiva autenticada.

O conjunto de ferramentas Supabase disponível não expõe leitura de logs de Postgres/Auth/API. Foram revisados os retornos SQL/migrations e os advisors, mas não foi possível inspecionar os logs completos do provedor. Não se afirma ausência de erros nesses logs. Essa inspeção permanece no painel do projeto.

Login, renovação, logout, confirmação de convite e recuperação por e-mail não foram testados com usuário real. Nenhum e-mail foi enviado e nenhuma credencial foi inventada. `/auth/v1/settings` retornou 200: email habilitado, usuários anônimos desabilitados, confirmação de e-mail exigida e **disable_signup=false**. Portanto, o cadastro público está habilitado no remoto, divergindo do config.toml local. É necessário desabilitá-lo no painel para o modelo por convite. Um cadastro público não concede vínculo organizacional, mas essa configuração deve ser corrigida antes de liberar o ambiente. A ferramenta disponível não oferece alteração de configuração Auth; Site URL, redirects e SMTP ainda precisam ser conferidos no painel.

## Ação necessária do proprietário

1. No projeto correto, abrir **Authentication → Users** e criar/convidar seu usuário real com seu próprio e-mail. Escolher a senha diretamente no Supabase/fluxo de convite, sem enviá-la ao chat.
2. Informar somente o UUID do usuário Auth que será o primeiro administrador (ou informar que foi criado para que possamos localizar e confirmar). A conta usada para entrar no painel Supabase não é automaticamente um usuário Auth da aplicação.
3. Aprovar explicitamente a reconciliação dos registros de migration, após a divergência documentada acima. Até lá, não reaplicar migrations.
4. Desabilitar novos cadastros públicos em Authentication, mantendo o fluxo administrativo de convite. Conferir URLs/templates/SMTP e configurar as duas variáveis públicas no ambiente de deployment; nenhuma secret/service_role é necessária no browser.

O helper `private.bootstrap_vyon` já está disponível. Será executado somente com o UUID real confirmado, para criar Vyon, cargo administrativo, concessões e vínculo. A implementação permite revisão de código, mas a homologação está **parcial** e o PR deve permanecer em rascunho, sem aprovação técnica final de merge, até concluir histórico, configuração Auth, bootstrap e testes reais.
