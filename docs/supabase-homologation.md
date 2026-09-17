# Etapa 4 — homologação do Supabase real

Verificação retomada em 17/09/2026. Projeto confirmado: **Vyon Performance OS**, referência `oqwuhqdwkugksrmrccoe`, região `sa-east-1`, PostgreSQL 17.6. A aplicação continua na branch `feat/supabase-foundation`; não houve merge em main nem avanço à Etapa 5.

## Aplicado

Os três arquivos originais foram revisados e enviados integralmente pelo conector, na ordem correta. Não houve reconstrução manual do schema. A quarta migration restringe EXECUTE da função de event trigger preexistente da plataforma, sem alterar sua lógica.

| Arquivo no repositório | Versão registrada pelo conector no remoto |
| --- | --- |
| 202609150001_core.sql | 202609150001 (reconciliado) |
| 202609150002_commands.sql | 202609150002 (reconciliado) |
| 202609150003_permissions.sql | 202609150003 (reconciliado) |
| 20260915185218_restrict_rls_auto_enable_execute.sql | 20260915185218 (reconciliado) |

**Reconciliação das três migrations concluída após autorização explícita:** foram comparados os hashes MD5 do SQL integral local e do SQL registrado no remoto, além dos objetos já existentes. Os três conteúdos coincidiram. Em transação, foram alterados somente os campos `version` dos três registros autorizados, preservando nomes e SQL. Nenhuma migration foi reaplicada; nenhum objeto/schema foi recriado ou removido. Hashes antes/depois: core `0c7fd99d63f5535ea129e2dcca05dc3f`, commands `811ac55a0bbbea2dafa87ba129d999ed`, permissions `53018e2b39d10d3bb16e87ef042df9d1`.

**Quarta migration reconciliada após autorização específica:** antes da alteração, confirmado novamente MD5 local/remoto `8a25eb5515626149b65b22606d7aa1bd`, existência de `rls_auto_enable`, EXECUTE revogado para PUBLIC/anon/authenticated e event trigger `ensure_rls` habilitado. Alterado somente `version` de `20260915185322` para `20260915185218`, em transação com checagens de conteúdo. As quatro versões agora coincidem com os arquivos locais, com SQL preservado. Não houve reaplicação de SQL, mudança de schema, remoção ou reset.

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

## Homologação Auth pela aplicação — parada no login real

A reconciliação do histórico está encerrada. A autorização para testar login não inclui uma senha nem uma sessão do usuário no aplicativo. O usuário determinou expressamente parar caso fosse indispensável uma credencial indisponível, e essa condição foi respeitada: nenhuma senha foi solicitada, inventada, testada ou alterada. Nenhum link alternativo de acesso foi gerado para contornar o login por senha.

Nesta rodada foram inspecionados os fluxos existentes: signInWithPassword via server function; sessão validada por getUser; resolução de TeamMember/organização; cookies SSR; logout; pedido de recuperação com redirect para `origin + '/?recovery=1'`; callbacks PKCE e token_hash para invite/recovery. Inspeção de código NÃO é validação de execução desses fluxos.

No checkout disponível não existem .env, .env.local ou .env.production, e as duas variáveis VITE não estão no ambiente do shell. Não foi confirmada uma URL de deployment desta branch. O link Lovable presente no README é do editor do projeto e não comprova deployment do código deste PR. Não se presume que configurar o plugin configure automaticamente o ambiente de execução da aplicação.

### Ação do proprietário, sem compartilhar senha

Usar um ambiente que execute a branch `feat/supabase-foundation` com servidor TanStack Start/Nitro. Se usar sua máquina, com Bun instalado:

```sh
git fetch origin
git switch feat/supabase-foundation
bun install --frozen-lockfile
```

Configurar `.env.local` (ignorado pelo Git):

- `VITE_SUPABASE_URL=https://oqwuhqdwkugksrmrccoe.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY`: copiar a chave **publishable** ativa desse projeto, no painel Supabase em API Keys. Não usar secret/service_role. Não precisa enviar a chave ao chat.

Executar `bun run dev -- --host 127.0.0.1 --port 3000` e abrir `http://localhost:3000/clientes` no próprio computador. Em deployment, configurar as mesmas variáveis no ambiente de build e reconstruir; fornecer somente a URL da aplicação para confirmar sua origem e versão.

Entrar pessoalmente na tela do Vyon com o e-mail e a senha do usuário Auth real já cadastrado. Não enviar senha, cookie, JWT ou URL contendo token. Informar somente o resultado e eventual mensagem de erro sem dados sensíveis. Se não houver aplicação acessível, informar isso antes de tentar login no painel Supabase: o painel não é a aplicação Vyon.

### URLs e recuperação

A Site URL remota deve ser a origem REAL escolhida para homologação da aplicação. Para o procedimento local acima, `http://localhost:3000`; redirects permitidos `http://localhost:3000/` e `http://localhost:3000/?recovery=1`. Em deployment, substituir pela origem HTTPS efetiva, que ainda não foi informada/confirmada. Não inventar domínio nem considerar esses valores locais já aplicados no remoto.

Templates previstos: convite `{{ .SiteURL }}/?token_hash={{ .TokenHash }}&type=invite`; recuperação `{{ .SiteURL }}/?token_hash={{ .TokenHash }}&type=recovery`. SMTP deve usar o remetente/domínio e credenciais do provedor de e-mail do proprietário; nenhum desses valores foi fornecido ou verificado. Não foi confirmado defeito de SMTP: a configuração permanece não inspecionada.

Depois de autenticar: conferir Vyon/Administrador, abrir Clientes/Equipe/Configurações, recarregar e reabrir a aplicação; testar renovação observável da sessão, sair e tentar retornar às rotas protegidas. Recuperação deve ser testada apenas até envio/recebimento/callback/tela de nova senha, sem salvar uma nova senha. Esses passos continuam pendentes; não foram declarados aprovados. Não é necessário criar dados permanentes para verificar as listas vazias.

## Estado para merge

**Ainda não liberado tecnicamente para merge.** O único bloqueio de histórico foi resolvido; resta homologar ponta a ponta Auth/sessão no aplicativo conectado, incluindo ambiente/URLs e recuperação. A indisponibilidade de senha é um limite de execução, não evidência de falha de segurança. Nenhuma nova falha de RLS foi encontrada. Logs completos do provedor seguem dependentes do painel/ferramenta apropriada.

PR mantido em rascunho. Sem merge em main e sem Etapa 5.
