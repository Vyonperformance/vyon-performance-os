# PR #2 — revisão técnica e de segurança final

Revisão da Etapa 5 em 18/09/2026, sobre `feat/integration-platform`, partindo de `2cba5c7ced9447271323f0e53eb900698a22a4cd`. Main permaneceu em `e65c3c6450b830ea4a10347316a9fb532dcab7c6`. PR em draft, sem merge e sem Etapa 6.

**Resultado: tecnicamente apto para merge após as correções desta revisão.** Não resta bloqueador técnico/de segurança identificado no escopo inspecionado. A aprovação é de código/banco, não uma declaração de E2E de deployment concluído. Concorrência foi confirmada pela estrutura transacional e documentação do PostgreSQL, não por um ensaio com duas conexões neste ambiente.

## A. Achados e B. correções

Foram reproduzidas duas falhas na proteção contra persistência acidental de credenciais, ambas usando exclusivamente material efêmero de teste em PGlite:

1. O filtro de credenciais examinava o texto bruto JSON. Um escape Unicode podia esconder o início de uma chave Vyon e fazer com que o segredo completo decodificado fosse persistido como nome de cliente/payload.
2. O header Idempotency-Key não era inspecionado pelo mesmo filtro. Uma chave completa satisfazia a sintaxe permitida de IDs e podia ser armazenada como external_event_id.

Os dois testes novos retornavam 201 antes da correção, quando deveriam rejeitar a entrada. Isso não permitia descobrir uma chave alheia nem quebrar o tenant: exigia uma credencial válida e o envio do segredo pelo próprio emissor. Entretanto, violava a proteção pretendida contra espalhar segredos nos registros de domínio e técnicos e foi tratado como correção necessária antes do merge.

Corrigido em `http.server.ts`: varredura iterativa dos nomes/valores JSON **depois de decodificar**, sem recursão de aplicação, e inspeção do header de idempotência. Entradas são rejeitadas antes da execução/persistência do payload. Logs guardam somente código enumerado e referência UUID gerada pelo servidor. Testes verificam rejeição e ausência da chave nos registros resultantes. Nenhuma alteração de schema, migration ou privilégio foi necessária.

## 1. API Keys: implementação verificada

`keys.server.ts` usa `randomBytes(32)` de `node:crypto`, isto é, 32 bytes/256 bits fornecidos pelo gerador criptográfico do runtime. Não há Math.random, UUID como segredo ou timestamp como entropia. Em Node, é a implementação criptográfica respaldada pelo sistema operacional; o alvo Cloudflare já usa nodejs_compat. A compatibilidade de deployment continua sujeita ao teste real desse ambiente. Referência: [crypto.randomBytes](https://nodejs.org/api/crypto.html#cryptorandombytessize-callback).

Formato: `vyon_` + 24 caracteres hexadecimais de prefixo aleatório independente (12 bytes/96 bits) + ponto + 64 caracteres hexadecimais do segredo. Armazenamento: SHA-256 dos bytes UTF-8 da **representação hexadecimal do segredo**, como 64 caracteres hexadecimais minúsculos. Não se armazena a chave completa. Essa distinção de representação importa para compatibilidade futura. O hash não tem salt por chave: o segredo já tem 256 bits aleatórios, diferentemente de uma senha humana de baixa entropia.

Lookup: parsing estrito do Bearer → prefixo → RPC backend-only que retorna id/hash somente para chave ativa, não expirada, integração e organização ativas → comparação de digests com `timingSafeEqual` → comando com nova verificação no banco. O caso sem registro também faz uma comparação contra digest fictício de tamanho fixo; respostas inválidas não distinguem prefixo conhecido. Isso não promete tempo idêntico de toda a requisição/rede. Referência: [timingSafeEqual](https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b).

Chave malformada/incorreta/desconhecida/revogada/expirada: 401 genérico; integração/organização inativas também negam. Sem configuração do backend, uma requisição com formato válido falha fechada com 503. A RPC revalida o digest e estados com locks para proteger a janela entre lookup e uso. A API não oferece operação de alteração de scopes. Escopo desconhecido/vazio é negado por Zod e constraints; o único emissor autorizado é um humano com integrations.manage.

**Precisão sobre “uma única vez”:** existe uma única resposta de emissão que revela a chave; não há endpoint posterior de recuperação. O segredo também existe transitoriamente na memória do servidor, no DOM/estado temporário da UI, no clipboard se o usuário copiar, no cofre do emissor e nos headers Authorization de chamadas futuras. Logo, seria incorreto afirmar que literalmente só existe dentro daquela resposta. A mutation retorna apenas id para seu cache; a chave fica fora de Query/mutation cache e localStorage. A listagem seleciona metadados explicitamente, e o banco nega key_hash/SELECT * a authenticated, inclusive administrador.

Não há logging explícito de headers/payloads/chaves nestes módulos; erros externos são sanitizados. O filtro adicional não é um detector universal de segredos arbitrários em qualquer campo. Um operador de banco ou administrador que escolhe enviar valores secretos como dados fora do fluxo previsto não fica magicamente impedido de fazê-lo. Não foi inspecionada a configuração de captura de tráfego/APM do futuro deployment; redigir/desabilitar essa captura segue requisito operacional, sem alegar que logs não acessíveis foram auditados.

Rotação futura é compatível: várias chaves por integração, idempotência ligada à integração e revogação por chave. Não foi criado fluxo automático de rotação. Emitir outra chave e revogar a anterior já são operações independentes existentes.

## 2. SUPABASE_SECRET_KEY e alternativa de menor privilégio

O nome identifica uma **Supabase secret API key moderna, prefixo sb_secret_**, e não uma publishable key, senha PostgreSQL ou uma API Key Vyon. Ela é funcionalmente privilegiada: resolve para o papel service_role, com BYPASSRLS e poderes de plataforma. O formato moderno não é o JWT legado chamado service_role, mas não tem menor autoridade por isso. Referência: [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys).

Único leitor de seu valor no código de aplicação: `gateway.server.ts`, a partir de process.env. Único consumidor do gateway: `http.server.ts`, alcançado pelas quatro server routes `/api/v1/...`. Gestão humana/issueKey usa o cliente SSR com a sessão do usuário, não essa credencial. A URL do backend precisa coincidir com a configuração pública do projeto. No processo servidor, qualquer código confiável com acesso ao ambiente poderia ler a variável: o sufixo .server não é um cofre contra comprometimento do próprio servidor.

Necessidade no desenho atual: o PostgREST precisa autenticar o backend para chamar integration_key_lookup/integration_request; essas funções são negadas a anon/authenticated e concedidas somente a service_role. A identidade humana não serve como identidade da integração. Usar publishable key para elas exigiria abrir/refazer essa fronteira de grants. O backend manda a secret key ao Supabase por HTTPS como credencial; não a retorna aos clientes Vyon.

O bridge não usa SELECT/UPDATE genérico, apenas as duas RPCs. A revogação de grants das cinco tabelas reduz superfície direta, mas **não transforma a secret key em uma credencial de apenas duas operações da plataforma**. A auditoria remota inclusive encontrou TRUNCATE preexistente para service_role em tabelas do núcleo, como clients, embora sem SELECT/INSERT/UPDATE/DELETE diretos nesse objeto. Não há caminho da API Vyon que exponha TRUNCATE, SQL arbitrário ou a secret key. Comprometer o segredo administrativo continua tendo impacto maior do que comprometer uma API Key Vyon. Não foram alterados grants da fundação por conveniência nesta revisão.

Alternativa materialmente mais restrita, documentada antes de qualquer mudança: papel PostgreSQL LOGIN dedicado ao runtime externo, sem BYPASSRLS, sem grants em tabelas e com EXECUTE somente nas duas funções controladas, por conexão TLS/pool. Reduz o alcance da credencial de transporte, mas exige configurar credencial de banco, driver/conectividade/pooling e uma nova migration de grants. Não é uma simples troca por chave pública. Não foi implementada: o desenho atual não apresenta bypass acessível ao emissor, e essa mudança deve ser avaliada com o ambiente de deployment, sem introduzir infraestrutura transversal nesta revisão. Publicar lookup/hash para anon para eliminar a secret key seria pior e foi descartado.

Verificado no source e bundle compilado: nenhum leitor SUPABASE_SECRET_KEY em VITE_ ou browser; nenhum bridge/gerador/comparador criptográfico no bundle público. O código não imprime a variável nem a inclui em respostas. Nenhuma chave real foi lida/impressa nesta revisão. Não foi possível auditar telemetria externa ainda não configurada.

## 3. Caminho único de criação e deduplicação comercial

POST clients e webhook client.create chamam o mesmo `externalClient` Zod: mesmos campos estritos, limites, trim de nome, validação/normalização do documento. Ambos passam por handleIntegrationRequest → gateway.execute → **public.integration_request**, cujo ramo de criação possui um único INSERT em clients. O webhook exige um scope adicional de transporte (webhooks.receive), intencionalmente; não altera as invariantes do cliente.

A RPC deriva organização exclusivamente de api_keys, valida integração/organização ativas, seleciona o payload normalizado, usa as mesmas constraints/FKs/defaults e o mesmo trigger client_created_event. Ambos criam activation_pending/origin=integration sem aceitar gestor, tenant ou ativação enviados. Ambos têm inbox, tratamento de erro e transação comuns. O fingerprint inclui operação: trocar de endpoint usando um ID já consumido resulta em 409, não uma segunda criação.

Não se confunde esse caminho externo único com o cadastro humano mais completo da Etapa 4, que continua usando create_client e a identidade humana. A integridade física e o trigger de evento são compartilhados; não houve reescrita do cadastro humano.

Retry de evento usa o mesmo recibo e cliente. Um **novo ID de evento** é nova intenção: documento normalizado fornecido segue único por organização; conflito resulta em domain_conflict, sem merge silencioso. Nome/e-mail não são usados para deduplicar. Não existe nesta etapa mapeamento de identidade comercial externa do cliente; external_event_id é identidade do evento, não external_client_id. Quando CRM/mapeamento externo forem implementados, deverão associar identidade de negócio e permitir revisão humana de ambiguidades, sem confundir isso com idempotência de transporte. Não se promete deduplicação comercial que ainda não existe.

## 4. Concorrência: garantia e limite de evidência

Confirmados no remoto o isolamento padrão read committed e a constraint UNIQUE(organization_id,integration_id,external_event_id). A garantia não é um SELECT prévio do frontend.

- Mesma chave: SELECT ... FOR UPDATE da api_keys serializa os comandos.
- Chaves distintas da mesma integração: o índice único e INSERT ... ON CONFLICT DO NOTHING bloqueiam a segunda tentativa enquanto a primeira decide commit/rollback.
- Primeiro commit com sucesso: a segunda inserção não insere; o SELECT subsequente, em novo snapshot READ COMMITTED, lê o resultado final; não alcança o INSERT clients.
- Primeiro commit com falha tratada: o efeito interno foi desfeito pelo sub-bloco transacional; o inbox failed e o erro sanitizado são retornados pelo retry.
- Abort/rollback da transação inteira: o primeiro inbox/efeito não existe; o concorrente pode inserir e processar uma vez.
- Resposta HTTP perdida depois do commit: retry lê o mesmo resultado persistido. Não gera outro cliente.
- Timeout/aborto do concorrente: a aplicação devolve erro, não sucesso presumido; retry deve preservar o ID.
- Outra integração/tenant: namespace distinto. Mesmo namespace com payload diferente: 409.

Não há commit intermediário com received visível: inbox, efeito, resultado e log estão na mesma função/transação. Status failed é terminal para aquele ID; não existe worker de retry automático. Imutabilidade/atualização de estado não depende de componentes React.

Referência da semântica de conflito/visibilidade: [PostgreSQL 17 — Transaction Isolation](https://www.postgresql.org/docs/17/transaction-iso.html). Sob isolamento mais forte, uma falha de serialização exige retry e não permite dois commits duplicados.

**Limite explícito:** o harness PGlite possui uma conexão, portanto não prova disputa real. Tentou-se preparar PostgreSQL 17.6 temporário fora do repositório, mas o executor só mapeia UID 0 e o initdb exige usuário não-root; a restrição foi respeitada. Nenhum teste concorrente com duas conexões foi declarado executado; nenhum pacote/servidor de banco foi adicionado ao produto. Um ensaio de duas conexões permanece como reforço de homologação. A garantia de unicidade/atomicidade acima foi confirmada por revisão do SQL e catálogos, não por um teste sequencial disfarçado de concorrência.

## 5. Scopes, RLS, grants e chamadas diretas

Todas as operações de domínio verificam scopes na RPC em cada execução. clients.read, clients.create e services.read exigem o scope homônimo; webhook client.create exige webhooks.receive **e** clients.create. Estado/status/expiração e tenant são revalidados server-side. O cliente não informa scopes como autoridade. Ausência/desconhecimento é deny-by-default; nenhum endpoint externo emite chaves ou muda scopes.

As cinco tabelas técnicas têm RLS. Três policies SELECT exigem private.has_permission(organization_id,'integrations.manage') para integrations, metadados de api_keys e integration_logs. Essa função usa membership ativo/organização ativa/cargo válido. webhook_events e domain_events não têm grants/policies para leitura humana comum. Ausência de policies é fechamento deliberado.

| Operação | anon | authenticated | service_role |
| --- | --- | --- | --- |
| Leitura das cinco tabelas | Negada | Metadados/integrações/logs com permissão e RLS; inbox/domain_events negados | Sem SELECT direto nas cinco |
| key_hash / SELECT * api_keys | Negado | Negado, inclusive administrador | Só lookup RPC; sem SELECT direto |
| Escrita direta/DELETE/TRUNCATE nas cinco | Negada | Negada | Negada |
| save_integration / issue_integration_key / revoke_integration_key | Negado | EXECUTE + autorização humana interna | Negado |
| integration_key_lookup / integration_request | Negado | Negado | EXECUTE concedido ao backend |
| Helpers/trigger privados da Etapa 5 | Negado | Negado | Negado |

Todas as funções privilegiadas novas têm search_path vazio e referências qualificadas. Corpos das sete funções remotas coincidem com a migration local. Uma API Key Vyon não é JWT Supabase nem secret API key: não autentica chamadas diretas no PostgREST. Um humano pode chamar as RPCs administrativas diretamente, mas continua sujeito a integrations.manage e ao tenant; isso é intencional. A RPC de emissão aceita hash/prefixo de um administrador autorizado — a entropia é garantida pelo emissor da aplicação, não uma prova matemática de aleatoriedade de qualquer hash fornecido por um administrador que decida ignorá-lo. Isso não concede privilégios a quem não administra integrações.

Domain_events é append-only para a aplicação: trigger bloqueia UPDATE/DELETE e não há TRUNCATE concedido aos papéis da aplicação. Um dono/superusuário PostgreSQL continua capaz de manutenção/alterar triggers; não se faz promessa de imutabilidade contra o operador do banco. Eventos/logs não são um CRUD externo.

## 6. Superfície HTTP

Em todas as quatro rotas: Bearer API Key Vyon, contexto derivado da chave, no-store e erros enumerados sem stack/SQL/digest/segredo. A configuração secreta só participa da chamada backend → Supabase.

| Método e caminho | Finalidade / scope | Validação e limite | Efeitos / idempotência |
| --- | --- | --- | --- |
| GET /api/v1/clients/{uuid} | Consulta básica; clients.read | UUID; filtro organizacional e archived_at; não processa corpo | Atualiza last_used_at e log; retorna 404 para inexistente/outro tenant; sem criação de recurso |
| GET /api/v1/services?after={uuid} | Catálogo; services.read | Cursor UUID opcional; página de até 50; não processa corpo | last_used_at e log; leitura sem inbox |
| POST /api/v1/clients | Criação; clients.create | JSON estrito, até 64 KiB incremental, Idempotency-Key obrigatório; dados Zod | Inbox + cliente + evento + log atômicos; retry igual repete resultado |
| POST /api/v1/webhooks | Envelope; webhooks.receive e clients.create para client.create | Versão 1, tipo, ID estável e dados; 64 KiB; sem Content-Encoding | Mesmo comando de cliente; desconhecido gera failed/422 com payload descartado; retry idempotente |

Corpos inválidos, encoding, tamanho e mensagens de validação não são refletidos. O teste de falha de gateway inclui texto sensível simulado e confirma resposta genérica. Headers/URLs GET ainda precisam dos limites gerais do ingress, como qualquer aplicação; não foi criado rate limiter distribuído. Um emissor com scope legítimo consegue gerar volume de operações válidas: é risco operacional de quota/rate limit, não autorização para outro tenant. Antes de exposição ampla, aplicar limites do ingress e política de retenção conforme relatório original.

## C. Pendências não bloqueadoras

Mantidas: rate limiting completo, limites de tempo no proxy, política de retenção de eventos/logs, Auth E2E da Etapa 4, SMTP/redirects, proteção contra senhas vazadas, lint global preexistente, entrega outbound/filas e fornecedores específicos. Sem evidência de bypass de autorização causado por esses adiamentos nesta revisão. Rate limiting/telemetria segura são requisitos para exposição operacional ampla; não foram apresentados como já configurados.

Configurar SUPABASE_URL e SUPABASE_SECRET_KEY no servidor do primeiro deploy, jamais VITE_. Validar então Auth, UI de emissão/cópia/revogação, HTTP positivo contra o projeto real, runtime criptográfico e logs/APM. Nenhuma senha do proprietário foi usada ou solicitada. Revisar também a alternativa de papel dedicado com base no deployment escolhido. Não implementada rotação automática.

## D. Testes e regressões

- 55 testes passaram / 150 asserções: os 24 da Etapa 4 e 31 da Etapa 5.
- Dois testes reproduziram as falhas antes da correção e passaram depois. Cobertura adicional: retry por outra chave da mesma integração, scopes vazios/desconhecidos no banco, RPC de máquina negada ao humano mesmo conhecendo hash em fixture, ausência de detalhes sensíveis na resposta e de chave completa nos registros.
- Build, typecheck e lint relevante aprovados. Lint global continua 293 erros/oito avisos, dívida anterior não ampliada.
- Varredura de credenciais no código/histórico e inspeção do bundle público sem achados. Nenhum valor real de chave foi impresso.
- Concorrência real de duas conexões não executada pelas limitações explicitadas; revisão transacional concluída.
- Telemetria do deployment e E2E remoto não declarados aprovados. A homologação SQL transacional remota da implementação anterior permanece documentada; nesta rodada o remoto foi apenas consultado.

## E. Migrations e estado remoto

As cinco versões permanecem reconciliadas: 202609150001, 202609150002, 202609150003, 20260915185218 e 20260918034244. Conteúdo integral comparado por MD5 com o histórico remoto; nenhuma pendência/divergência. Adicionalmente, comparados hashes dos corpos das sete funções da Etapa 5 com pg_proc. Nenhuma migration foi alterada/reaplicada ou criada nesta revisão.

Exatamente as cinco tabelas técnicas autorizadas, além das onze da fundação; sem objeto da Etapa 6. As correções são na fronteira HTTP, acompanhadas de testes e documentação. Nenhuma mutation no Supabase real foi necessária nesta rodada.

## F. Parecer

**PR #2 tecnicamente apto para merge após as correções**, com os limites de homologação acima explícitos. Mantido em draft conforme solicitado. Não foi realizado merge, não houve mudança em main e não foi iniciada a Etapa 6.
