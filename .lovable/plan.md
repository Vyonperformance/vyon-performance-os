# Vyon Performance OS — MVP visual navegável

## Objetivo
Construir uma primeira versão exclusivamente visual, desktop-first e responsiva, com dados fictícios. A direção escolhida será **Signal Density**: interface sóbria, precisa, compacta e orientada a operação, sem excesso de cartões, sombras ou elementos decorativos.

## Entregas
- Estrutura global com sidebar, cabeçalho contextual, busca, notificações e perfil.
- Design system em tons neutros com verde institucional, tipografia Inter, estados semânticos e componentes reutilizáveis.
- Dashboard executivo com indicadores compactos, lista “Requer atenção”, clientes e contas de mídia em observação.
- Clientes: listagem com busca/filtros, cadastro manual em fluxo organizado e visão 360º com abas.
- Visão do cliente: resumo, regra visual de ativação, onboarding, acessos, contratos, financeiro, campanhas, demandas/tarefas, relatórios, arquivos e histórico.
- Financeiro: indicadores de recebíveis, filtros e tabela de cobranças.
- Gestor de Tráfego: contas, alertas, métricas e detalhe de performance com gráficos enxutos.
- Gestão de Tarefas: lista principal, demandas relacionadas, filtros e alternância visual para Kanban secundário.
- Relatórios: tabela, seleção múltipla e ações simuladas de gerar, revisar, visualizar e enviar.
- Equipe: usuários, departamentos, cargos e matriz visual de permissões.
- Configurações: organização, catálogo de serviços, integrações simuladas e futura área de API.
- Estados de interface: badges, alertas, modais/drawers, paginação, breadcrumbs, empty/loading states e timeline.

## Navegação e comportamento
- Cada módulo principal terá URL própria e metadados específicos.
- Linhas, alertas e atalhos serão navegáveis entre entidades relacionadas.
- Busca, filtros, abas, formulários, modais e seleções funcionarão apenas no navegador com mock data.
- Nenhuma autenticação, persistência, API, integração ou regra crítica real será implementada.

## Estrutura técnica
- Componentes compartilhados para shell, cabeçalhos, filtros, tabelas, métricas, estados e timeline.
- Mock data e tipos centralizados para facilitar futura substituição pelo backend.
- Gráficos com a biblioteca já disponível, preservando carregamento e legibilidade.
- Verificação final em desktop e mobile, incluindo navegação, ausência de sobreposições e erros visuais.
