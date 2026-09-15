# Vyon Performance OS

Crie a primeira versão visual de um sistema web interno chamado Vyon Performance OS, utilizado pela agência de performance Vyon Performance para centralizar sua operação.

OBJETIVO DESTA ETAPA

Nesta primeira etapa quero construir exclusivamente a UI/UX do sistema utilizando dados fictícios (mock data).

NÃO implemente ainda:

Supabase;

banco de dados real;

autenticação real;

APIs externas;

webhooks;

Autentique;

Asaas;

Meta API;

Google Ads API;

TikTok API;

backend real;

regras críticas de negócio;

armazenamento de credenciais.

Quero primeiro criar e validar uma interface profissional, consistente e escalável.

Posteriormente o projeto será conectado ao GitHub e o backend será desenvolvido separadamente.

VISÃO DO PRODUTO

O Vyon Performance OS será o sistema operacional interno da Vyon Performance.

Ele deverá centralizar:

clientes;

contratos;

financeiro;

onboarding;

acessos;

campanhas;

demandas;

tarefas;

relatórios;

equipe;

integrações.

Não é um CRM.

A Vyon já possui um CRM externo.

Clientes poderão entrar no sistema:

manualmente;

futuramente através de integração/API/webhook com o CRM existente.

Também não é um gerenciador de anúncios.

Campanhas serão acompanhadas dentro do sistema, mas não editadas.

DIREÇÃO DE DESIGN

Quero um produto SaaS B2B premium, moderno, sofisticado e extremamente organizado.

A interface deve transmitir:

tecnologia;

performance;

controle;

clareza;

confiança.

Evite aparência de template administrativo genérico.

Evite excesso de:

cards;

bordas;

sombras;

gradientes;

elementos decorativos;

informações competindo pela atenção.

Priorize:

hierarquia visual;

bastante respiro;

boa tipografia;

densidade de informação equilibrada;

navegação rápida;

tabelas muito bem construídas;

filtros claros;

status facilmente identificáveis;

experiência consistente.

O sistema será utilizado principalmente em desktop.

Deve ser responsivo, mas a experiência desktop é prioridade.

Utilize uma linguagem visual consistente em todas as páginas.

Crie componentes reutilizáveis.

ESTRUTURA PRINCIPAL

Utilize uma sidebar lateral para navegação principal.

Menu:

Dashboard

Clientes

Financeiro

Gestor de Tráfego

Relatórios

Gestão de Tarefas

Equipe

Configurações

Na parte inferior da sidebar poderá existir:

perfil do usuário;

organização;

sair.

1. DASHBOARD

O Dashboard deve responder:

“O que está acontecendo na operação da Vyon e o que precisa da minha atenção?”

Crie uma visão executiva contendo exemplos de:

clientes ativos;

clientes em onboarding;

receita/recebimentos do período;

cobranças vencidas;

tarefas atrasadas;

tarefas para hoje;

demandas abertas;

relatórios pendentes;

alertas operacionais.

Inclua uma seção:

Requer atenção

Exemplos:

Cliente Alpha com pagamento vencido;

Cliente Beta aguardando acessos;

Conta de anúncios Cliente Gamma com saldo baixo;

4 tarefas atrasadas;

3 relatórios aguardando envio.

Não transforme o dashboard em uma coleção exagerada de cards.

Priorize informações acionáveis.

2. CLIENTES

Crie uma página de listagem de clientes.

Permita visualmente:

pesquisar;

filtrar;

ordenar;

cadastrar novo cliente.

Colunas sugeridas:

Cliente
Serviços
Gestor responsável
Status operacional
Status financeiro
Data de entrada
Ações

Utilize dados fictícios realistas.

Status operacional

Exemplos:

Documentação;

Contrato;

Aguardando ativação;

Onboarding;

Ativo;

Encerrado.

Status financeiro

Exemplos:

Regular;

Pendente;

Inadimplente.

3. CADASTRO DE CLIENTE

Crie a experiência visual para cadastro manual.

Campos:

Identificação

Pessoa Física / Pessoa Jurídica;

Razão Social / Nome;

Nome Fantasia;

CPF/CNPJ.

Contato

E-mail;

Telefone;

Endereço.

Responsáveis

Permitir adicionar múltiplos contatos.

Exemplos de tipos:

Principal;

Financeiro;

Marketing;

Administrativo.

Informações internas

Gestor responsável;

Data de entrada;

Observações.

Serviços

Permitir selecionar um ou vários serviços.

O catálogo de serviços será dinâmico.

Utilize inicialmente exemplos:

Google Ads;

Meta Ads;

TikTok Ads;

GPT Ads;

Site;

Landing Page;

SDR IA;

Automações;

Treinamento Comercial;

Execução de Demanda Comercial.

Cada serviço possui um valor base apenas como referência.

Ao adicionar ao cliente, deve ser possível informar o valor negociado, que pode ser diferente do valor base.

4. VISÃO 360º DO CLIENTE

Esta será uma das telas mais importantes.

Crie uma página detalhada do cliente com header contendo:

Nome;

Status;

Gestor responsável;

Serviços contratados;

informações relevantes.

Utilize navegação interna por abas.

Sugestão:

Visão Geral

Dados

Contratos

Financeiro

Onboarding

Acessos

Campanhas

Demandas e Tarefas

Relatórios

Arquivos

Histórico

5. VISÃO GERAL DO CLIENTE

A primeira aba deve apresentar um resumo realmente útil.

Exemplos:

Contrato
Assinado

Financeiro
Em dia

Acessos
6 de 8 validados

Onboarding
75%

Gestor
João Silva

Serviços
Meta Ads + Google Ads

Próximo relatório
18/09

Também apresente:

tarefas abertas;

demandas;

alertas;

últimas atividades.

6. ATIVAÇÃO DO CLIENTE

Existe uma regra muito importante no produto.

Um cliente somente poderá ser considerado ATIVO quando três condições forem satisfeitas:

Contrato assinado;

Primeiro pagamento confirmado;

Todos os acessos obrigatórios validados.

Represente isso visualmente.

Exemplo:

Ativação do cliente

Contrato
✓ Assinado

Primeiro pagamento
✓ Pago

Acessos obrigatórios
6/8 recebidos

Cliente ainda não pode ser ativado

Quando os três requisitos estiverem concluídos:

Cliente Ativo

Nesta etapa implemente somente a representação visual dessa lógica utilizando mock data.

7. ONBOARDING

Crie uma área visual de onboarding por cliente.

Mostrar:

progresso;

responsável;

data de início;

status;

checklist;

tarefas.

Exemplo:

Onboarding — Cliente Alpha

████████░░ 80%

Itens:

✓ Reunião de onboarding
✓ Receber identidade visual
✓ Acesso Meta
✓ Acesso Google Ads
○ Google Tag Manager
○ Validar tracking

O onboarding poderá variar conforme os serviços contratados.

8. ACESSOS

Crie uma área para acompanhar os acessos necessários.

NÃO crie campos para armazenar senhas.

Exemplos:

Meta Business Manager
Meta Ads
Facebook Page
Instagram
Google Ads
Google Analytics
Google Tag Manager
WordPress
CRM

Status:

Pendente;

Solicitado;

Recebido;

Validado;

Inválido.

Mostrar claramente quais acessos estão bloqueando a ativação do cliente.

9. FINANCEIRO

Crie um módulo financeiro focado em recebíveis dos clientes.

Não é um ERP contábil.

Mostrar:

Total recebido;

A receber;

Vencido;

Próximos vencimentos.

Criar tabela de cobranças com:

Cliente
Contrato
Valor
Vencimento
Status
Forma de pagamento
Data de pagamento
Ações

Status:

A vencer;

Pago;

Vencido;

Cancelado.

Criar filtros por:

cliente;

status;

período.

Utilize dados fictícios.

10. CONTRATOS

Contratos aparecem principalmente dentro do cliente.

Mostrar:

contrato;

serviços;

valor;

início;

término;

status;

assinatura.

Status:

Rascunho;

Enviado;

Aguardando assinatura;

Assinado;

Recusado;

Cancelado;

Expirado.

Futuramente haverá integração com Autentique.

Nesta etapa apenas simule visualmente os estados.

11. GESTOR DE TRÁFEGO

Crie uma área operacional para acompanhamento das contas dos clientes.

IMPORTANTE:

Não é possível editar campanhas através deste sistema.

O objetivo é acompanhar performance e identificar problemas.

Mostrar inicialmente clientes e suas contas de anúncios.

Plataformas:

Meta Ads;

Google Ads;

TikTok Ads;

GPT Ads.

Mostrar exemplos de:

investimento;

orçamento;

saldo quando aplicável;

campanhas ativas;

leads;

CPA;

ROAS;

alertas.

Crie filtros por:

cliente;

plataforma;

período;

status.

12. DETALHE DE PERFORMANCE

Ao abrir um cliente ou conta, mostrar:

performance geral;

evolução temporal;

campanhas;

principais métricas.

Exemplos:

Investimento
Impressões
Cliques
CTR
CPC
CPM
Leads
Conversões
CPA
ROAS

Utilize gráficos limpos e profissionais.

Não exagere na quantidade de gráficos.

13. DEMANDAS

Demanda e tarefa são conceitos diferentes.

Demanda = necessidade/objetivo operacional.

Exemplo:

“Criar campanha Black Friday”

Uma demanda poderá possuir várias tarefas.

Mostrar:

Cliente;

Título;

Responsável;

Prioridade;

Status;

Prazo;

Progresso das tarefas.

14. GESTÃO DE TAREFAS

Crie módulo de tarefas.

Toda tarefa operacional relacionada a um cliente deverá mostrar claramente esse cliente.

Campos:

Título;

Cliente;

Demanda relacionada;

Responsável;

Departamento;

Prioridade;

Status;

Prazo.

Status:

Pendente;

Em andamento;

Aguardando;

Concluída;

Cancelada.

Prioridade:

Baixa;

Normal;

Alta;

Urgente.

Crie inicialmente visualização em lista/tabela.

Se fizer sentido visualmente, disponibilize também Kanban, mas não deixe o Kanban dominar a experiência.

Filtros:

cliente;

responsável;

departamento;

status;

prioridade;

prazo.

15. RELATÓRIOS

Relatórios são um módulo próprio.

Crie página mostrando:

Cliente
Período
Tipo
Responsável
Status
Data de geração
Data de envio

Status:

Pendente;

Gerando;

Gerado;

Em revisão;

Enviado;

Erro.

Permitir visualmente:

gerar relatório;

visualizar;

revisar;

enviar;

selecionar vários;

envio em massa.

Nesta etapa não implemente geração real.

Utilize mock data.

16. EQUIPE

Crie página de gestão da equipe.

Mostrar:

Nome;

Foto;

E-mail;

Departamento;

Cargo;

Status;

Último acesso.

Permitir visualmente:

convidar usuário;

editar usuário;

ativar/desativar.

Somente usuários convidados poderão acessar o sistema futuramente.

17. DEPARTAMENTOS E CARGOS

Dentro da área de Equipe ou Configurações, permitir administrar:

Departamentos

criar;

editar;

desativar.

Cargos

criar;

editar;

desativar.

Os cargos possuirão permissões.

18. PERMISSÕES

Crie uma interface simples para configurar permissões por cargo.

Exemplo de matriz:

| Módulo | Visualizar | Criar | Editar | Excluir | Administrar |
| Clientes | ✓ | ✓ | ✓ | — | — |
| Financeiro | ✓ | — | — | — | — |
| Equipe | — | — | — | — | — |

Não implemente autorização real nesta etapa.

Somente UI.

19. CONFIGURAÇÕES

Crie uma área de configurações organizada em categorias.

Organização

Dados da Vyon Performance.

Serviços

Gerenciamento do catálogo de serviços.

Permitir visualmente:

criar serviço;

editar;

definir valor base;

ativar/desativar.

Integrações

Criar cards/linhas para:

CRM Vyon;

Autentique;

Asaas;

Meta;

Google;

TikTok.

Estados:

Conectado;

Não conectado;

Erro.

Não implemente conexão real.

API

Interface futura para:

API Keys;

Webhooks;

Endpoints.

Novamente: apenas representação visual nesta etapa.

20. NOTIFICAÇÕES

Crie uma área discreta de notificações.

Exemplos:

Contrato assinado;

Cobrança vencida;

Cliente aguardando acessos;

Tarefa atribuída;

Tarefa atrasada;

Relatório pendente;

Saldo baixo.

Não transforme notificações em elemento dominante da interface.

21. DADOS FICTÍCIOS

Crie dados fictícios suficientes para conseguirmos avaliar a experiência real.

Utilize diferentes situações.

Exemplo:

Cliente Alpha
Ativo
Meta Ads + Google Ads
Financeiro regular

Cliente Beta
Onboarding
Meta Ads
Aguardando 2 acessos

Cliente Gamma
Ativo
Google Ads
Financeiro inadimplente

Cliente Delta
Aguardando ativação
Contrato assinado
Pagamento pendente

Utilize nomes fictícios profissionais.

22. COMPONENTES

Crie componentes reutilizáveis para:

tabelas;

filtros;

busca;

status badges;

modais;

drawers;

formulários;

empty states;

loading states;

alertas;

paginação;

breadcrumbs;

cards de métricas;

timeline/histórico.

Evite duplicar componentes semelhantes entre módulos.

23. EXPERIÊNCIA

Priorize produtividade.

O usuário deverá conseguir chegar rapidamente de:

Dashboard
→ Cliente
→ Problema
→ Demanda/Tarefa

ou:

Dashboard
→ Cobrança vencida
→ Cliente
→ Financeiro

ou:

Dashboard
→ Alerta de campanha
→ Cliente
→ Conta/Campanha.

A navegação entre entidades relacionadas deve ser intuitiva.

24. SEGURANÇA — REGRA PARA ESTA ETAPA

Apesar de esta versão utilizar apenas dados fictícios, prepare o frontend considerando que futuramente existirão dados privados.

Não coloque:

API Keys reais;

tokens;

secrets;

senhas;

credenciais;

dados reais de clientes.

Não implemente atalhos inseguros para facilitar uma futura conexão com backend.

25. RESTRIÇÕES DE ESCOPO

NÃO crie nesta versão:

CRM;

portal do cliente;

aplicativo mobile;

editor de campanhas;

chat interno;

ERP completo;

contas a pagar;

DRE;

conciliação bancária;

RH;

sistema de assinatura próprio;

construtor visual de automações;

IA autônoma;

white-label;

multiagência.

26. IMPORTANTE

Não invente novos módulos principais sem necessidade.

Se identificar uma oportunidade de melhoria estrutural, mantenha a arquitetura solicitada e sinalize a sugestão em vez de alterar significativamente o produto.

Neste momento o objetivo é:

construir uma excelente representação visual e navegável do MVP do Vyon Performance OS utilizando dados fictícios.

Não tente resolver backend, banco ou integrações nesta etapa.

Comece criando a estrutura geral do sistema, design system, sidebar, dashboard e principais páginas.

Mantenha código organizado e componentes reutilizáveis para facilitar a conexão futura com backend real.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/11ed6b10-c4d3-408b-b8d1-d2d36283b155).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
