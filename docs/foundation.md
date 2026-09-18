# Etapa 4 — fundação Supabase

> A Etapa 4 foi mergeada em `e65c3c6450b830ea4a10347316a9fb532dcab7c6`. Este documento preserva seu recorte histórico; a evolução em revisão está em [Etapa 5 — Integrações](integration-platform.md).

> Atualização: as quatro migrations estão aplicadas e reconciliadas no projeto real. A revisão final considera o PR #1 tecnicamente apto para merge; por decisão do proprietário, o E2E de Auth é uma pendência obrigatória do primeiro deploy. Consulte [homologação e revisão final](supabase-homologation.md) antes de qualquer aplicação adicional. As instruções e resultados abaixo descrevem a implementação inicial. Nenhum merge foi realizado.

Implementação restrita a Auth, organização/equipe, clientes, contatos, catálogo e serviços contratados. Não implementa ativação, contratos, cobranças, acessos, onboarding, tarefas, tráfego, relatórios, eventos, jobs ou Storage. Não aplicar em produção sem revisar as migrations e executar a homologação remota abaixo.

## Arquitetura

- `src/routes`: preserva rotas e metadados; liga a prova vertical aos módulos.
- `src/modules/auth`: sessão validada com `auth.getUser()`, TeamMember, permissões e tela mínima de login/recuperação.
- `src/lib/supabase`: configuração pública, cliente SSR por requisição com cookies e cliente browser apenas para Auth.
- `src/modules/clients`, `services`, `team`: UI, contratos de leitura validados com Zod, funções de servidor e repositório de clientes.
- `src/modules/shared`: schemas de entrada separados dos contratos físicos, erros seguros, query keys, mutations e estados de tela.
- `supabase/migrations`: integridade, autorização e comandos transacionais. Nenhuma tabela operacional além das onze aprovadas.
- `tests`: PostgreSQL embarcado (PGlite), migrations reais e identidades controladas de teste.

Fluxo: formulário RHF → Zod → server function → sessão/permission → RPC transacional → PostgreSQL. Leituras passam por server functions com JWT do usuário e RLS. Nenhuma chave administrativa é utilizada. As funções de escrita também são acessíveis por RPC autenticado: por isso a autorização e integridade são verificadas dentro delas, independentemente da UI/TypeScript.

Valores monetários são centavos inteiros, limitados ao intervalo seguro do JavaScript; quantidade é decimal, datas são `date`, relações usam UUID. A UI recebe preços em reais e converte para centavos. Contratos de entrada não usam `Partial<Row>`. Os modelos de leitura em `clients/models.ts` validam a resposta em runtime; não são apresentados como tipos gerados pelo Supabase CLI.

## Migrations e segurança

1. `202609150001_core.sql`: onze tabelas, índices, FKs compostas, documentos normalizados/check digits, unicidade organizacional, contato principal único, preços/quantidades/períodos, triggers e SELECT policies.
2. `202609150002_commands.sql`: criação atômica cliente + contatos + serviços; atualização de cliente; catálogo; contratação; alteração de cargo/status de outro membro; bootstrap privado; criação de profile; aceite de convite confirmado.
3. `202609150003_permissions.sql`: vinte permissões técnicas aprovadas, sem usuários/senhas/clientes fictícios.

Tabelas: `organizations`, `profiles`, `organization_memberships`, `departments`, `roles`, `permissions`, `role_permissions`, `clients`, `client_contacts`, `services`, `client_services`.

Todos os dados públicos têm RLS. `anon` não recebe acesso. `authenticated` recebe apenas SELECT; INSERT/UPDATE/DELETE diretos são revogados. Políticas exigem organização ativa, vínculo ativo e cargo não arquivado. Clientes, contatos e contratações respeitam `clients.read` e carteira, salvo `clients.read_all`. Catálogo exige `services.read`; equipe exige `team.read`, com acesso ao próprio vínculo/perfil para resolver sessão. Catálogo de permissões só é legível com vínculo ativo. Cargos/departamentos/permissões de cargos são visíveis dentro da organização ativa.

Escritas têm verificações internas: `clients.manage`, `services.manage`, `team.manage`, conforme comando. `set_team_member` impede alteração do próprio cargo/status. Não há RPC genérica para editar cargos/permissões. Provisionamento administrativo inicial permanece no SQL Editor confiável. Helpers `SECURITY DEFINER` têm `search_path` vazio, referências qualificadas e EXECUTE restrito; evitam recursão das políticas de vínculo. Bootstrap não pode ser executado por browser ou JWT de usuário.

`updated_at` vem do PostgreSQL. Apenas vínculos, clientes, contatos, serviços e contratações têm `version`; trigger atribui 1 e incrementa em update. Comandos de atualização disponíveis comparam a versão esperada e retornam conflito; não aceitam a próxima versão do browser. Contatos e contratações têm criação/leitura nesta prova; não há edição genérica dessas entidades.

Todo cliente novo fica `activation_pending`, com `activated_at` nulo. Nenhum comando desta etapa aceita ativar clientes. A regra aprovada permanece para a próxima implementação: antes da primeira ativação, considerar requisitos aplicáveis aos serviços não cancelados daquele momento; depois de ativado, novos serviços/inadimplência não reabrem o gate. Não há `financial_status` persistido.

## Ambiente e execução local

Requer Bun, conforme `bun.lock` do repositório. Validado com Bun 1.4.2 e Node do ambiente de desenvolvimento.

```sh
bun install --frozen-lockfile
cp .env.example .env.local
bun run typecheck
bun test
bun run build
bun run lint
bun run dev
```

Preencher somente:

- `VITE_SUPABASE_URL`: URL do projeto correto.
- `VITE_SUPABASE_PUBLISHABLE_KEY`: chave pública publishable (ou anon legada). Nunca secret/service_role.

Variáveis `VITE_*` são públicas e incorporadas no build: configurar também no ambiente de build do deployment e reconstruir após mudanças. `.env*` locais estão ignorados; `.env.example` tem valores vazios. Não há segredos de backend exigidos nesta etapa. O cliente rejeita formatos conhecidos de chaves administrativas, mas isso não substitui conferir a chave no painel.

Sem configuração, a aplicação exibe “Conexão pendente” e não mostra indicadores/mock operacional. Manter HTTPS em produção. O código SSR encaminha cookies atualizados e usa `Cache-Control: private, no-store`; não configurar cache compartilhado para endpoints de sessão/dados ou HTML autenticado. O deployment deve executar o servidor TanStack Start/Nitro existente, não apenas hospedar os arquivos estáticos.

## Aplicar no Supabase real

Não foi conectado/aplicado nenhum projeto remoto nesta execução. Utilizar um projeto de desenvolvimento vazio; não executar reset em ambiente com dados.

1. Instalar/autenticar Supabase CLI no computador autorizado. Para teste local, `supabase start` e `supabase db reset` exigem Docker e descartam apenas a base LOCAL.
2. Para remoto, revisar `supabase link --project-ref <REFERENCIA_REAL>` e `supabase db push --dry-run`, confirmar o destino e depois `supabase db push`. Todas as migrations devem ser aplicadas em ordem. `seed.sql` não contém fixtures; permissões estão na terceira migration.
3. Configurar Site URL e URLs de redirecionamento de Auth para a origem real da aplicação. Local: `http://localhost:3000/` e `http://localhost:3000/?recovery=1`. Desabilitar signup público. Configurar SMTP para convites/recuperação; não depender do envio de desenvolvimento em produção.
4. Configurar templates de e-mail compatíveis com SSR. Link do convite: `{{ .SiteURL }}/?token_hash={{ .TokenHash }}&type=invite`; recuperação: `{{ .SiteURL }}/?token_hash={{ .TokenHash }}&type=recovery`. A aplicação verifica o token no servidor, limpa a URL e abre definição de senha. Também aceita retorno PKCE `?code=...` iniciado no mesmo browser. Não registrar URLs contendo tokens em logs/analytics.
5. Criar/convidar o primeiro usuário real em Authentication → Users. Nunca usar senha padrão. Copiar o UUID real e executar, como operador no SQL Editor, depois das três migrations:

```sql
select private.bootstrap_vyon('<UUID_REAL_DE_AUTH_USERS>'::uuid, 'Vyon');
```

O helper exige usuário Auth existente e instalação sem organização; cria organização, cargo Administrador, todas as permissões técnicas e vínculo ativo. Repetição é recusada. Não conceder EXECUTE desse helper a authenticated/anon. Um UUID de teste não serve para produção.

6. Preencher as variáveis públicas, reconstruir e executar a homologação abaixo.

Para outros usuários nesta etapa, provisionar via SQL Editor um cargo/departamento da organização e suas `role_permissions` (apenas as necessárias), depois um `organization_memberships` com `organization_id`, `invited_email`, `role_id`, departamento opcional e `status='invited'`; `user_id` pode ficar nulo. Enviar convite ao mesmo e-mail pelo painel Auth. `accept_invitation()` só vincula o `auth.uid()` com e-mail confirmado exato e não aceita cargo do solicitante. Não há UI de convite nem comercialização multi-organização nesta etapa. Usuário com zero ou mais de um vínculo ativo recebe acesso não liberado; não escolhemos uma organização arbitrária.

## Prova vertical e mocks

Conectados: login/sessão/logout, `/clientes` com pesquisa/paginação/carteira, `/clientes/novo` com submit persistente e seleção real de responsável/catálogo, `/clientes/$id` com dados/contatos/serviços, catálogo em `/configuracoes` e equipe básica em `/equipe`. Interface usa os componentes visuais existentes. Campos/indicadores dependentes de módulos futuros foram substituídos por estados explícitos, sem dados inventados.

Query keys começam por `['org', organizationId, entidade, ...]`; sessão usa `['session']`. Mutations invalidam apenas listas/detalhes afetados. Logout/troca de identidade/permissões limpam o cache operacional. Sessão revalidada por requisição e na UI a cada 60 segundos/foco; RLS impede novas leituras imediatamente após desativação, embora dados já recebidos possam permanecer na tela até revalidação.

`src/data/mock.ts`, `src/data/client-details.ts` e componentes legados de dashboard/módulos/Client 360 permanecem como material de demonstração, sem alimentar as telas operacionais conectadas. `getClientDetail` retorna null para ID desconhecido, jamais Boreal. Rotas ainda pendentes são bloqueadas pelo estado `NotConnected` em `__root.tsx`; componentes foram preservados. Notificações e pesquisa global fictícias não são acionáveis. Não há seed desses mocks no banco.

## Validação e limites

- 24 testes / 47 asserções passaram usando PGlite com as migrations reais: isolamento, carteira, permissões, integridade, concorrência, persistência atômica/rollback, documentos, valores/períodos, convite confirmado e revogação.
- O harness substitui somente `auth.users` e `auth.uid()`; executa papéis `anon`/`authenticated` e policies reais. Fixtures `example.test` existem apenas no banco efêmero de testes.
- Isso NÃO comprova GoTrue, PostgREST, renovação de cookies no provedor, SMTP ou RLS via HTTP num Supabase remoto. Não há Docker/Supabase remoto disponível; tais cenários não foram declarados aprovados.
- Build e typecheck passaram. Lint global já falhava no commit base (305 erros/6 avisos); não foi feita reformatação geral. Os módulos novos são verificados separadamente; resultado final: 293 erros/8 avisos no repositório completo; zero erros nos módulos novos. Há dois avisos novos de Fast Refresh por exports compartilhados.
- Smoke HTTP local: `/clientes` respondeu 200 com shell da aplicação. Verificação visual Playwright não foi executada: binário Chromium ausente no ambiente. Login/refresh/logout reais permanecem na homologação remota.
- Nenhuma migration foi executada sobre dados de produção. Rollback operacional preferencial é reverter código e aplicar migration corretiva, nunca apagar tabelas com dados. Testes locais descartáveis podem usar reset.

### Homologação obrigatória ao conectar o projeto

1. Confirmar as onze tabelas, RLS/grants e nenhuma tabela fora do escopo.
2. Entrar com usuário real, recarregar, renovar sessão, sair e verificar bloqueio de URLs diretas. Validar convite/recuperação com o SMTP/template configurado.
3. Verificar via API anon, usuário sem vínculo, desativado, outra organização, carteira restrita e administrador. Repetir os cenários do teste usando JWTs reais, sem chave service_role.
4. Criar serviço, cliente com contato e contratação; recarregar e confirmar persistência, preços, UUIDs e `activation_pending`. Verificar erro de CPF/CNPJ duplicado, ID inexistente e rollback de contratação inválida.
5. Desativar vínculo e confirmar que a mesma sessão perde acesso; trocar usuário no browser sem reutilizar cache. Tentar atualização com versão desatualizada e autopromoção por RPC.
6. Confirmar que rotas não migradas não exibem números fictícios e que HTML/endpoints autenticados não são cacheados pelo CDN.

Próxima etapa recomendada: homologar esta fundação no Supabase real antes de iniciar o próximo núcleo de negócio e seu motor único de ativação. Etapa 5 não foi iniciada.
