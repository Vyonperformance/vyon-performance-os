# Etapa 5 — plataforma genérica de integrações

Implementação em `feat/integration-platform`, baseada na Etapa 4 aprovada (`e65c3c6450b830ea4a10347316a9fb532dcab7c6`). Sem alterações diretas em main, sem merge automático e sem Etapa 6. Nenhuma dependência nova foi adicionada.

## Escopo e camadas

- `src/modules/integrations/contracts.ts`: contratos Zod da administração e da API v1; scopes explícitos, sem nomes de fornecedores.
- `functions.ts`: server functions humanas, com sessão Supabase e `integrations.manage` verificadas também no banco.
- `keys.server.ts`: geração e comparação de credenciais, exclusivamente no servidor.
- `gateway.server.ts`: único cliente privilegiado da fronteira externa; usa somente duas RPCs autorizadas, não consultas arbitrárias nem impersonação de usuários.
- `http.server.ts`: autenticação central, limite de corpo, parsing/validação, idempotência e resposta de erro sanitizada. Rotas em `src/routes/api.v1.*` apenas delegam.
- `page.tsx`: área Configurações → Integrações, usando RHF/Zod e TanStack Query com chave `['org', organizationId, 'integrations']`.
- PostgreSQL: autoridade final de organização/scopes/estado da chave, transação e integridade. A organização nunca é um parâmetro aceito da API externa.

Fluxo humano: Supabase Auth → membership ativo → cargo/permissões → RPC administrativa. Fluxo externo: API Key → integração ativa → organização ativa → scopes → comando backend. Uma API Key não é um usuário Auth. `integrations.manage` é uma autoridade administrativa para delegar os scopes oferecidos, mesmo que o administrador não tenha cada permissão humana homônima.

## Migration e modelo físico

Nova migration: `20260918034244_integration_platform.sql`, criada com Supabase CLI. As quatro migrations da Etapa 4 permanecem byte a byte intactas.

Cinco tabelas novas, totalizando dezesseis no núcleo público:

| Tabela | Responsabilidade |
| --- | --- |
| integrations | Nome, categoria genérica system/orchestrator/other e status active/disabled, por organização. |
| api_keys | Hash, prefixo, nome, integração, scopes, status, expiração, revogação e último uso. |
| webhook_events | Inbox durável também para comandos POST; ID externo, payload normalizado permitido, hash da requisição, status e resultado idempotente. |
| domain_events | Fatos imutáveis, com versão do envelope, aggregate_id e occurred_at; preparação para consumo posterior. |
| integration_logs | Direção, operação, resultado, código HTTP, referência UUID gerada pelo servidor e referência ao evento; sem payloads ou headers. |

As FKs entre objetos organizacionais são compostas. Há índices de organização/integração, recebimento, ocorrência e referência de evento. Constraints e grants acompanham a criação das tabelas.

A nova migration estende o check de `clients.origin` com `integration`, preservando `manual` e `crm`. Um trigger em INSERT de clientes registra `client.created` na mesma transação, inclusive no cadastro humano existente; não retroalimenta clientes antigos. O evento carrega somente clientId/version. Nenhum motor de ativação foi implementado: clientes externos nascem `activation_pending`.

Não há configuração JSON arbitrária na UI: as operações desta versão não exigem parâmetros adicionais ou credenciais de fornecedores. Desativação preserva histórico. Não há exclusão física ou edição de scopes de uma chave emitida; a rotação consiste em emitir outra e revogar a anterior.

## Credenciais e autorização

Formato: `vyon_<identificador aleatório de 12 bytes>.<segredo aleatório de 32 bytes>`. Prefixo de 96 bits e segredo de 256 bits usam `node:crypto.randomBytes`; o banco recebe somente SHA-256 do segredo. SHA-256 é adequado aqui pela entropia criptográfica, não é um armazenamento de senha humana. A comparação no servidor usa `timingSafeEqual` sobre digests de tamanho fixo; credenciais desconhecidas recebem o mesmo 401 genérico.

A resposta da emissão é `no-store`. O segredo fica somente no estado temporário do painel, com opção de copiar e ocultar. Não entra no cache de queries/mutations, localStorage, logs ou banco. Fechar o painel elimina a exibição; se a resposta se perder, revogar a chave pela identificação e emitir outra. A RPC administrativa armazena hash, nunca retorna segredo e só aceita administradores autorizados. A geração segura da chave oferecida pela aplicação ocorre na server function.

| Scope de máquina | Poder concedido |
| --- | --- |
| clients.read | Consulta básica de cliente por UUID dentro da organização da integração. É leitura organizacional, não carteira de usuário humano. |
| clients.create | Criação mínima de cliente sem gestor, contatos ou contratação. Não altera status operacional. |
| services.read | Consulta paginada do catálogo da organização. |
| webhooks.receive | Recebimento de envelopes; `client.create` exige também clients.create. |

Nenhum scope é concedido automaticamente. Não há clients.update nesta prova mínima. Permissões humanas preexistentes não são copiadas para chaves.

A consulta privilegiada de credencial entrega o hash apenas ao backend. O comando revalida hash, expiração, revogação, integração e organização sob locks antes do efeito, para não depender só da consulta inicial. Requests de uma mesma chave são serializados por row lock; é uma escolha simples para o volume inicial, não um mecanismo de rate limiting.

## API externa v1

Exige HTTPS no deployment e `Authorization: Bearer <chave emitida>`. Não passar chaves na URL. Não oferece CORS de credenciais para browser: é integração servidor a servidor. As respostas têm `Cache-Control: private, no-store` e `X-Request-ID` gerado pelo servidor.

| Método / caminho | Scope | Contrato |
| --- | --- | --- |
| GET /api/v1/clients/{uuid} | clients.read | id, name, personType, version, operationalStatus; 404 indistinguível para ID inexistente ou de outra organização. |
| POST /api/v1/clients | clients.create | Exige Idempotency-Key. Cria cliente com campos mínimos. |
| GET /api/v1/services?after={uuid} | services.read | Até 50 itens ordenados por UUID. Continuar com o último ID até página vazia/menor que 50. Preços em centavos como string ou null. |
| POST /api/v1/webhooks | webhooks.receive e scope do evento | Envelope versão 1; somente client.create tem efeito de domínio nesta versão. |

Payload de criação (campos não listados são rejeitados):

```json
{"personType":"company","name":"Nome do cliente","taxDocument":"","email":"","phone":""}
```

`personType` aceita company/individual; name é obrigatório; os outros campos são opcionais. CPF/CNPJ passam pela validação existente e são normalizados; não se infere uma origem CRM específica.

Envelope webhook:

```json
{"version":1,"externalEventId":"identificador-estavel-do-emissor","type":"client.create","data":{"personType":"company","name":"Nome do cliente"}}
```

Sem externalEventId, o emissor deve enviar um Idempotency-Key estável, preservado em retries. Sem ambos, HTTP 400 antes de qualquer efeito. Se ambos existirem, devem coincidir. IDs admitem até 160 caracteres alfanuméricos e `._:-`. Não usar dados sensíveis como IDs.

Respostas de operações processadas: `{data,error,eventId,duplicate,requestId}`. Erros de transporte/autenticação/validação anterior ao inbox: `{error:{code},requestId}`. Códigos estáveis: 400 invalid_payload/invalid_request, 401 invalid_api_key, 403 insufficient_scope, 404 not_found, 409 idempotency_conflict/domain_conflict, 413 payload_too_large, 422 unsupported_event/invalid_payload, 500 processing_failed, 503 integration_unavailable. Nenhum detalhe SQL é devolvido.

O corpo é limitado a 64 KiB por leitura incremental, inclusive sem Content-Length; somente JSON, sem Content-Encoding. Conteúdo aceito é limitado por schemas estritos. Credenciais reconhecíveis embutidas são recusadas. Isso não é um detector universal de dados sensíveis: emissores devem enviar apenas os campos de domínio documentados.

## Webhooks, idempotência e falhas

Chave única: `(organization_id, integration_id, external_event_id)`. A mesma integração compartilha o namespace de IDs entre POST clientes e webhooks; reutilizar o mesmo ID para operação/payload diferente retorna 409. Rotação de API Key não altera a integração nem perde deduplicação. Outra integração ou organização pode usar o mesmo ID sem conflito.

Eventos suportados são comparados pelo fingerprint SHA-256 de operação + payload JSONB normalizado. Retry igual retorna status/resultado original e `duplicate=true`, inclusive para falha já registrada. O response HTTP de criação bem-sucedida é 201 em ambos os caminhos. Sem ID confiável, o emissor precisa gerar/persistir uma referência antes do primeiro envio; não se usa hash de conteúdo como substituto silencioso da identidade do evento.

Tipos desconhecidos retornam 422 e geram evento failed + log. Seu conteúdo bruto é descartado: armazenamos `{}` no payload e fingerprint do envelope, sem dados de fornecedor desconhecidos. JSON inválido, campos proibidos ou corpo excessivo produzem somente log sanitizado após autenticação, sem persistir payload inválido. Requisições sem credencial confiável não recebem tenant fictício nem geram registro organizacional.

Inserção do inbox, escrita do cliente, trigger de domain_event, resultado e log ocorrem em uma transação. Uma falha no bloco de domínio desfaz seus efeitos e grava estado failed, com erro enumerado; SQLERRM nunca é persistido. Uma falha no próprio armazenamento causa rollback e 503, nunca sucesso silencioso. Uma falha persistida é terminal para aquele ID; não existe retry automático de processamento nesta etapa. Correções exigem investigação e nova referência intencional do emissor. Em caso de resposta perdida, repetir o ID original antes de decidir reenviar.

Não há promessa de entrega outbound ou exactly-once entre sistemas: a garantia é uma execução de efeito transacional por ID na integração. `domain_events` é append-only, com trigger que bloqueia UPDATE/DELETE e sem grants diretos de escrita. Uma evolução posterior deverá manter offsets/tentativas em estrutura separada, sem reescrever o fato. Nenhum destino HTTP, fetch outbound, assinatura de webhook ou worker foi implementado; não há superfície SSRF nesta etapa.

## RLS e fronteira privilegiada

RLS nas cinco tabelas. Humanos com integrations.manage podem ler integrações, metadados de chaves e logs da própria organização. API keys usam GRANT SELECT por coluna: SELECT * e key_hash são negados até ao administrador humano. Inbox e domain_events não têm policies humanas nem grants de consulta; deny-by-default é intencional. Sem INSERT/UPDATE/DELETE diretos para anon/authenticated/service_role nas novas tabelas.

RPCs humanas: save_integration, issue_integration_key e revoke_integration_key, com private.require_permission e search_path vazio. RPCs de máquina: integration_key_lookup e integration_request, executáveis somente por service_role. Helpers/trigger privados não são executáveis pelos papéis da aplicação. Todas as funções privilegiadas usam nomes qualificados e search_path fixo.

O backend precisa de uma Supabase secret key real, que mapeia para service_role e tem privilégios elevados na plataforma. Ela nunca pode usar prefixo VITE_ ou entrar no frontend. O bridge aceita somente `sb_secret_`, mantém sessão persistente/refresh desativados e verifica que SUPABASE_URL coincide com o projeto público configurado. Embora as tabelas desta etapa não concedam escrita direta a service_role, a secret key é credencial administrativa da plataforma e deve ser tratada como tal.

## UI conectada

Configurações → Integrações: listar/criar/editar nome/categoria/status, ativar/desativar, selecionar scopes, emitir chave com expiração opcional, exibir/copiar uma única vez, listar prefixo/status/último uso e revogar. Mostra as últimas vinte operações sanitizadas. Invalidação organizacional após mutations; estados loading/error/empty e acesso negado. Sem novo state manager, editor de webhook ou redesenho de navegação.

## Evidências de validação em 18/09/2026

- Bun install --frozen-lockfile: aprovado, sem novas dependências ou mudança de lockfile.
- Typecheck e build: aprovados, incluindo os quatro server routes e o alvo Nitro/Cloudflare com nodejs_compat já existente.
- Testes automatizados: 48 passaram, 139 asserções; incluem os 24 testes da fundação. O teste de contagem foi atualizado de 11 para 16 e os demais cenários de domínio/Auth/RLS foram preservados.
- Os testes HTTP chamam o handler real usando gateway injetado que executa as RPCs reais em PGlite, sob service_role. Cobrem chaves válidas/inválidas/revogadas/expiradas, revalidação após revogação, scopes, tenant injection, organização cruzada, integrações desativadas, webhook suportado/desconhecido/inválido, retries, conflitos e rollback de falha parcial.
- Roteiro `supabase/tests/live_integrations.sql` aprovado localmente e no PostgreSQL real, com papel authenticated/usuário real para administração e papel service_role para comandos externos. Inclui separação de organizações, hash inacessível ao humano, permissão retirada temporariamente, scopes, expiração/revogação, idempotência, imutabilidade e logs. Todas as fixtures foram revertidas. Não usa Auth de máquina fictício.
- Data API remota com chave publishable e sem sessão: as cinco tabelas e a RPC integration_key_lookup retornaram 401/42501, sem linhas ou hashes. Auth settings confirmou disable_signup=true.
- Smoke HTTP via Vite local: as quatro rotas responderam 401/invalid_api_key sem credencial e com no-store. Não equivale a teste HTTP positivo com Supabase remoto.
- Lint relevante: zero erros/avisos. Lint global permanece em 293 erros/oito avisos preexistentes, sem ampliação da dívida.
- Diff inspecionado, quatro migrations originais intactas, ausência de credenciais detectadas na varredura dos arquivos. Bundle público sem SUPABASE_SECRET_KEY, lookup privilegiado ou gerador/comparador de secrets.

## Supabase real e reconciliação

Projeto confirmado: Vyon Performance OS (`oqwuhqdwkugksrmrccoe`), PostgreSQL 17.6. A migration foi aplicada somente após testes locais, typecheck/build/lint relevante e revisão estrutural. Não houve reset nem reaplicação de migrations antigas.

O conector registrou `integration_platform` como `20260918035652`. Após comparar SQL integral local/remoto, hash MD5 `e09a1188906b4a5f8c4da704ac18d731`, reconciliado somente o campo version para `20260918034244`, com guarda transacional. Os cinco arquivos/registros estão alinhados; as quatro versões/conteúdos anteriores não mudaram. MD5 aqui verifica igualdade do texto da migration, não protege credenciais.

Validação remota: 16 tabelas com RLS; nenhuma constraint não validada; grants/EXECUTE/search_path conforme projeto; key_hash não consultável por authenticated. Depois do rollback, zero integrações/chaves/webhook_events/domain_events/integration_logs/clientes de teste. Administrador original ativo com vinte permissões.

Não houve diferença funcional encontrada entre PGlite e PostgreSQL nos cenários executados. PGlite simula auth.users/auth.uid e papéis; não testa emissão JWT, PostgREST positivo ou browser conectado. O conector continua sem leitura de logs completos do provedor; retornos das queries e advisors foram inspecionados, sem afirmar ausência de erros em logs não acessíveis.

Advisors remotos:

- Nove avisos de [SECURITY DEFINER autenticado](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable): os seis existentes e três novos comandos administrativos intencionais, com checagem de permissão interna.
- Dois informativos de [RLS sem policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy): inbox e eventos de domínio deliberadamente fechados ao usuário comum, sem grants. Não abrir policies para silenciar o advisor.
- Permanece o aviso de [proteção contra senhas vazadas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), adiado pela Etapa 4.
- Performance: FK preexistente sem índice dedicado, duas oportunidades preexistentes de initplan e índices sem uso em banco vazio; nenhum novo alerta de FK sem cobertura. Referências: [FKs](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys), [initplan](https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan).

## Configuração manual e pendências

No primeiro deploy, configurar no servidor `SUPABASE_URL=https://oqwuhqdwkugksrmrccoe.supabase.co` e `SUPABASE_SECRET_KEY` com uma secret key ativa desse mesmo projeto, obtida pelo proprietário no painel e inserida no cofre de secrets do deployment. Manter as duas variáveis públicas VITE já previstas. Não enviar segredo ao chat nem versioná-lo. Sem configuração, a API externa falha fechada com 503; não há fallback para mocks. A emissão/gestão humana utiliza a sessão e não precisa da secret key.

Não foi disponibilizada uma secret key ao runtime deste ambiente. Portanto, HTTP positivo ponta a ponta com o Supabase real e UI autenticada permanecem para o deployment. O código do handler e as RPCs foram testados como descrito, sem apresentar isso como E2E completo.

Configurar HTTPS e rate limiting no ingress/WAF do deployment antes de expor a API para uso amplo, com limites de corpo/tempo também no proxy. Não há limitador distribuído nesta etapa. Desabilitar captura de Authorization/cookies/corpos/resposta da emissão nos logs/APM do provedor. Definir retenção/limpeza operacional dos payloads e logs antes de volume relevante; não apagar recibos de idempotência sem política que preserve a janela de replay acordada. Não foi criado job genérico para isso.

Preservar obrigatoriamente a homologação E2E de Auth no primeiro deploy: login real, Profile/TeamMember, persistência/renovação da sessão, logout, recuperação, redirects, SMTP e logs. Testar também emissão/cópia/revogação na UI e chamadas HTTP externas positivas contra o Supabase real. Sem compartilhar ou alterar senha do proprietário nesta rodada.

Outbound, atualização de clientes por API, fornecedores, contratos/cobranças/ativação, campanhas/métricas, relatórios, jobs/filas, OAuth, audit_logs e notifications foram deliberadamente adiados. Nenhum componente da Etapa 6 foi implementado.

## Referências técnicas consultadas

[Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys), [grants e Data API](https://supabase.com/docs/guides/api/securing-your-api), [TanStack Start server routes](https://tanstack.com/start/latest/docs/framework/react/guide/server-routes) e changelog do Supabase. A secret key é backend-only; o browser continua usando publishable key e sessão do usuário.
