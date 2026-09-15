import type { Tone } from "./mock";

export type AccessStatus = "Pendente" | "Solicitado" | "Recebido" | "Validado" | "Inválido";
export type ContractStatus = "Rascunho" | "Enviado" | "Aguardando assinatura" | "Assinado" | "Recusado" | "Cancelado" | "Expirado";

export type ClientDetail = {
  id: string;
  name: string;
  trade: string;
  legal: string;
  doc: string;
  email: string;
  phone: string;
  address: string;
  manager: string;
  entry: string;
  origin: string;
  externalId?: string;
  notes: string;
  operational: string;
  operationalTone: Tone;
  financial: string;
  financialTone: Tone;
  services: string[];
  nextReport: string;
  gates: { contract: boolean; payment: boolean; access: boolean; accessLabel: string; missing: number };
  onboarding: { progress: number; owner: string; start: string; status: string; items: { label: string; done: boolean; task?: string }[] };
  contacts: { name: string; type: string; email: string; phone: string; active: boolean }[];
  contracts: { code: string; services: string; value: string; start: string; end: string; status: ContractStatus; signed: string; tone: Tone }[];
  finance: { contracted: string; paid: string; next: string; situation: string; situationTone: Tone; charges: { code: string; value: string; due: string; status: string; method: string; paid: string; tone: Tone }[] };
  access: { platform: string; kind: string; service: string; required: boolean; status: AccessStatus; requested: string; received: string; validatedBy: string }[];
  campaigns: { platform: string; account: string; active: number; invest: string; leads: string; cpa: string; roas: string; status: string; tone: Tone }[];
  demands: { title: string; owner: string; priority: string; status: string; due: string; progress: number; tasks: { title: string; owner: string; priority: string; status: string; due: string }[] }[];
  reports: { period: string; type: string; owner: string; status: string; generated: string; sent: string; tone: Tone }[];
  files: { name: string; category: string; date: string; by: string }[];
  history: { event: string; when: string; who: string; tone: Tone }[];
  alerts: { title: string; detail: string; tone: Tone }[];
};

const alpha: ClientDetail = {
  id: "alpha",
  name: "Alphora Commerce",
  trade: "Alphora",
  legal: "Alphora Comércio Digital LTDA",
  doc: "28.114.902/0001-45",
  email: "contato@alphora.com.br",
  phone: "(11) 4002-8922",
  address: "Av. Brigadeiro Faria Lima, 1811 · Conj. 1102 · São Paulo/SP",
  manager: "João Silva",
  entry: "02/06/2026",
  origin: "Indicação · Cliente Kora Engenharia",
  externalId: "CRM-4821",
  notes: "Conta estratégica. Reuniões quinzenais às terças, 10h. Aprovação de criativos pelo comitê de marketing.",
  operational: "Ativo",
  operationalTone: "success",
  financial: "Regular",
  financialTone: "success",
  services: ["Meta Ads", "Google Ads"],
  nextReport: "18/09/2026",
  gates: { contract: true, payment: true, access: true, accessLabel: "8/8 validados", missing: 0 },
  onboarding: {
    progress: 100, owner: "João Silva", start: "02/06/2026", status: "Concluído",
    items: [
      { label: "Reunião de onboarding", done: true },
      { label: "Identidade visual", done: true },
      { label: "Definição de estratégia", done: true },
      { label: "Acesso Meta", done: true },
      { label: "Acesso Google Ads", done: true },
      { label: "Google Tag Manager", done: true },
      { label: "Validar tracking", done: true },
    ],
  },
  contacts: [
    { name: "Renata Vasques", type: "Principal", email: "renata@alphora.com.br", phone: "(11) 98812-4410", active: true },
    { name: "Paulo Menezes", type: "Financeiro", email: "financeiro@alphora.com.br", phone: "(11) 4002-8922", active: true },
    { name: "Bruna Tavares", type: "Marketing", email: "bruna@alphora.com.br", phone: "(11) 99120-3388", active: true },
    { name: "Carlos Brito", type: "Administrativo", email: "carlos@alphora.com.br", phone: "(11) 3322-1180", active: false },
  ],
  contracts: [
    { code: "CTR-0208", services: "Meta Ads + Google Ads", value: "R$ 8.400/mês", start: "01/06/2026", end: "31/05/2027", status: "Assinado", signed: "01/06/2026", tone: "success" },
    { code: "CTR-0155", services: "Meta Ads", value: "R$ 5.200/mês", start: "01/06/2025", end: "31/05/2026", status: "Expirado", signed: "28/05/2025", tone: "neutral" },
  ],
  finance: {
    contracted: "R$ 8.400/mês", paid: "R$ 33.600", next: "10/10/2026", situation: "Regular", situationTone: "success",
    charges: [
      { code: "COB-1042", value: "R$ 8.400,00", due: "10/09/2026", status: "Pago", method: "Boleto", paid: "09/09/2026", tone: "success" },
      { code: "COB-0987", value: "R$ 8.400,00", due: "10/08/2026", status: "Pago", method: "Boleto", paid: "10/08/2026", tone: "success" },
      { code: "COB-0931", value: "R$ 8.400,00", due: "10/07/2026", status: "Pago", method: "Pix", paid: "08/07/2026", tone: "success" },
      { code: "COB-0880", value: "R$ 8.400,00", due: "10/06/2026", status: "Pago", method: "Pix", paid: "10/06/2026", tone: "success" },
      { code: "COB-1101", value: "R$ 8.400,00", due: "10/10/2026", status: "A vencer", method: "Boleto", paid: "—", tone: "info" },
    ],
  },
  access: [
    { platform: "Meta Business Manager", kind: "Parceria", service: "Meta Ads", required: true, status: "Validado", requested: "02/06/2026", received: "03/06/2026", validatedBy: "João Silva" },
    { platform: "Meta Ads", kind: "Conta de anúncios", service: "Meta Ads", required: true, status: "Validado", requested: "02/06/2026", received: "03/06/2026", validatedBy: "João Silva" },
    { platform: "Facebook Page", kind: "Função de administrador", service: "Meta Ads", required: true, status: "Validado", requested: "02/06/2026", received: "04/06/2026", validatedBy: "Ana Prado" },
    { platform: "Instagram", kind: "Conta profissional", service: "Meta Ads", required: false, status: "Validado", requested: "02/06/2026", received: "04/06/2026", validatedBy: "Ana Prado" },
    { platform: "Google Ads", kind: "Vínculo de MCC", service: "Google Ads", required: true, status: "Validado", requested: "03/06/2026", received: "05/06/2026", validatedBy: "João Silva" },
    { platform: "Google Analytics", kind: "Propriedade GA4", service: "Google Ads", required: true, status: "Validado", requested: "03/06/2026", received: "05/06/2026", validatedBy: "Léo Martins" },
    { platform: "Google Tag Manager", kind: "Contêiner", service: "Google Ads", required: true, status: "Validado", requested: "03/06/2026", received: "06/06/2026", validatedBy: "Léo Martins" },
    { platform: "WordPress", kind: "Editor", service: "Landing Page", required: true, status: "Validado", requested: "04/06/2026", received: "06/06/2026", validatedBy: "Rafael Nunes" },
  ],
  campaigns: [
    { platform: "Meta Ads", account: "Alphora · BM 4821", active: 6, invest: "R$ 15.600", leads: "412", cpa: "R$ 37,86", roas: "3,8×", status: "Ativa", tone: "success" },
    { platform: "Google Ads", account: "Alphora · 882-441-9920", active: 4, invest: "R$ 11.200", leads: "268", cpa: "R$ 41,79", roas: "3,1×", status: "Ativa", tone: "success" },
  ],
  demands: [
    {
      title: "Campanha de aquisição Q4", owner: "João Silva", priority: "Alta", status: "Em andamento", due: "30/09/2026", progress: 60,
      tasks: [
        { title: "Revisar criativos da campanha institucional", owner: "Ana Prado", priority: "Alta", status: "Em andamento", due: "Hoje, 14:00" },
        { title: "Estruturar públicos de remarketing", owner: "Léo Martins", priority: "Normal", status: "Pendente", due: "19/09" },
        { title: "Aprovar verba adicional com o cliente", owner: "João Silva", priority: "Normal", status: "Concluída", due: "12/09" },
      ],
    },
    {
      title: "Relatório de setembro", owner: "Júlia Reis", priority: "Normal", status: "Pendente", due: "18/09/2026", progress: 25,
      tasks: [
        { title: "Consolidar métricas das duas plataformas", owner: "Júlia Reis", priority: "Normal", status: "Pendente", due: "17/09" },
        { title: "Revisar narrativa executiva", owner: "João Silva", priority: "Normal", status: "Pendente", due: "18/09" },
      ],
    },
  ],
  reports: [
    { period: "Ago/2026", type: "Performance 360º", owner: "João Silva", status: "Em revisão", generated: "12/09/2026", sent: "—", tone: "warning" },
    { period: "Jul/2026", type: "Performance 360º", owner: "João Silva", status: "Enviado", generated: "10/08/2026", sent: "11/08/2026", tone: "success" },
    { period: "Jun/2026", type: "Mídia paga", owner: "Léo Martins", status: "Enviado", generated: "09/07/2026", sent: "09/07/2026", tone: "success" },
  ],
  files: [
    { name: "CTR-0208 — contrato assinado.pdf", category: "Contratos", date: "01/06/2026", by: "João Silva" },
    { name: "Cartão CNPJ.pdf", category: "Documentos", date: "02/06/2026", by: "Ana Prado" },
    { name: "Relatório Jul-2026.pdf", category: "Relatórios", date: "10/08/2026", by: "João Silva" },
    { name: "Criativos institucional Q4.zip", category: "Criativos", date: "05/09/2026", by: "Bruna Tavares" },
    { name: "Ata da reunião de estratégia.docx", category: "Outros", date: "08/09/2026", by: "Ana Prado" },
  ],
  history: [
    { event: "Relatório de julho enviado ao cliente", when: "11/08/2026 · 09:12", who: "João Silva", tone: "info" },
    { event: "Cliente ativado", when: "06/06/2026 · 18:40", who: "Sistema", tone: "success" },
    { event: "Acesso Google Tag Manager validado", when: "06/06/2026 · 16:02", who: "Léo Martins", tone: "success" },
    { event: "Pagamento confirmado — COB-0880", when: "10/06/2026 · 11:30", who: "Financeiro", tone: "success" },
    { event: "Cobrança criada — COB-0880", when: "02/06/2026 · 10:05", who: "Marina Costa", tone: "neutral" },
    { event: "Contrato CTR-0208 assinado", when: "01/06/2026 · 15:48", who: "Renata Vasques", tone: "success" },
    { event: "Contrato CTR-0208 enviado para assinatura", when: "31/05/2026 · 17:20", who: "João Silva", tone: "neutral" },
  ],
  alerts: [
    { title: "Relatório de agosto aguarda revisão", detail: "Responsável João Silva · prazo 18/09/2026", tone: "warning" },
    { title: "Renovação contratual em 8 meses", detail: "CTR-0208 encerra em 31/05/2027", tone: "info" },
  ],
};

const beta: ClientDetail = {
  id: "beta",
  name: "Boreal Odonto",
  trade: "Boreal",
  legal: "Boreal Serviços Odontológicos LTDA",
  doc: "41.209.336/0001-08",
  email: "contato@borealodonto.com.br",
  phone: "(41) 3030-7712",
  address: "Rua Comendador Araújo, 499 · Sala 804 · Curitiba/PR",
  manager: "Ana Prado",
  entry: "14/08/2026",
  origin: "Inbound · Formulário do site",
  externalId: "CRM-5177",
  notes: "Cliente em implantação. Time interno enxuto; acessos dependem do TI terceirizado.",
  operational: "Aguardando ativação",
  operationalTone: "warning",
  financial: "Regular",
  financialTone: "success",
  services: ["Meta Ads"],
  nextReport: "05/10/2026",
  gates: { contract: true, payment: true, access: false, accessLabel: "6/8 validados", missing: 2 },
  onboarding: {
    progress: 71, owner: "Ana Prado", start: "14/08/2026", status: "Em andamento",
    items: [
      { label: "Reunião de onboarding", done: true },
      { label: "Identidade visual", done: true },
      { label: "Definição de estratégia", done: true },
      { label: "Acesso Meta", done: true },
      { label: "Acesso Google Ads", done: true },
      { label: "Google Tag Manager", done: false, task: "Solicitar acesso ao GTM ao TI terceirizado" },
      { label: "Validar tracking", done: false, task: "Validar eventos do Google Tag Manager" },
    ],
  },
  contacts: [
    { name: "Dra. Helena Bueno", type: "Principal", email: "helena@borealodonto.com.br", phone: "(41) 99812-2201", active: true },
    { name: "Sérgio Lopes", type: "Financeiro", email: "financeiro@borealodonto.com.br", phone: "(41) 3030-7712", active: true },
    { name: "Tainá Ribeiro", type: "Marketing", email: "taina@borealodonto.com.br", phone: "(41) 99640-1178", active: true },
  ],
  contracts: [
    { code: "CTR-0288", services: "Meta Ads", value: "R$ 3.200/mês", start: "14/08/2026", end: "14/08/2027", status: "Assinado", signed: "14/08/2026", tone: "success" },
    { code: "CTR-0301", services: "Landing Page", value: "R$ 4.900 (único)", start: "—", end: "—", status: "Aguardando assinatura", signed: "—", tone: "warning" },
  ],
  finance: {
    contracted: "R$ 3.200/mês", paid: "R$ 6.400", next: "05/10/2026", situation: "Regular", situationTone: "success",
    charges: [
      { code: "COB-1088", value: "R$ 3.200,00", due: "05/09/2026", status: "Pago", method: "Cartão", paid: "05/09/2026", tone: "success" },
      { code: "COB-1020", value: "R$ 3.200,00", due: "05/08/2026", status: "Pago", method: "Cartão", paid: "05/08/2026", tone: "success" },
      { code: "COB-1150", value: "R$ 3.200,00", due: "05/10/2026", status: "A vencer", method: "Cartão", paid: "—", tone: "info" },
      { code: "COB-0999", value: "R$ 1.200,00", due: "20/08/2026", status: "Cancelado", method: "Pix", paid: "—", tone: "neutral" },
    ],
  },
  access: [
    { platform: "Meta Business Manager", kind: "Parceria", service: "Meta Ads", required: true, status: "Validado", requested: "14/08/2026", received: "15/08/2026", validatedBy: "Ana Prado" },
    { platform: "Meta Ads", kind: "Conta de anúncios", service: "Meta Ads", required: true, status: "Validado", requested: "14/08/2026", received: "15/08/2026", validatedBy: "Ana Prado" },
    { platform: "Facebook Page", kind: "Função de administrador", service: "Meta Ads", required: true, status: "Recebido", requested: "14/08/2026", received: "18/08/2026", validatedBy: "—" },
    { platform: "Instagram", kind: "Conta profissional", service: "Meta Ads", required: false, status: "Validado", requested: "14/08/2026", received: "16/08/2026", validatedBy: "Ana Prado" },
    { platform: "Google Ads", kind: "Vínculo de MCC", service: "Google Ads", required: true, status: "Validado", requested: "16/08/2026", received: "20/08/2026", validatedBy: "Léo Martins" },
    { platform: "Google Analytics", kind: "Propriedade GA4", service: "Google Ads", required: true, status: "Solicitado", requested: "01/09/2026", received: "—", validatedBy: "—" },
    { platform: "Google Tag Manager", kind: "Contêiner", service: "Google Ads", required: true, status: "Pendente", requested: "—", received: "—", validatedBy: "—" },
    { platform: "WordPress", kind: "Editor", service: "Landing Page", required: false, status: "Validado", requested: "18/08/2026", received: "19/08/2026", validatedBy: "Rafael Nunes" },
  ],
  campaigns: [
    { platform: "Meta Ads", account: "Boreal · BM 5177", active: 2, invest: "R$ 4.100", leads: "96", cpa: "R$ 42,70", roas: "2,2×", status: "Em teste", tone: "warning" },
  ],
  demands: [
    {
      title: "Concluir onboarding", owner: "Ana Prado", priority: "Urgente", status: "Em andamento", due: "19/09/2026", progress: 70,
      tasks: [
        { title: "Solicitar acesso ao GTM ao TI terceirizado", owner: "Ana Prado", priority: "Urgente", status: "Aguardando", due: "Ontem" },
        { title: "Validar eventos do Google Tag Manager", owner: "Léo Martins", priority: "Urgente", status: "Pendente", due: "19/09" },
        { title: "Confirmar propriedade GA4", owner: "Léo Martins", priority: "Alta", status: "Aguardando", due: "18/09" },
      ],
    },
    {
      title: "Primeira campanha de captação", owner: "Léo Martins", priority: "Alta", status: "Pendente", due: "25/09/2026", progress: 20,
      tasks: [
        { title: "Estruturar público local de Curitiba", owner: "Léo Martins", priority: "Alta", status: "Em andamento", due: "21/09" },
        { title: "Receber criativos da clínica", owner: "Tainá Ribeiro", priority: "Normal", status: "Pendente", due: "22/09" },
      ],
    },
  ],
  reports: [
    { period: "Ago/2026", type: "Mídia paga", owner: "Ana Prado", status: "Enviado", generated: "10/09/2026", sent: "11/09/2026", tone: "success" },
    { period: "Set/2026", type: "Mídia paga", owner: "Ana Prado", status: "Pendente", generated: "—", sent: "—", tone: "warning" },
  ],
  files: [
    { name: "CTR-0288 — contrato assinado.pdf", category: "Contratos", date: "14/08/2026", by: "Ana Prado" },
    { name: "Contrato social.pdf", category: "Documentos", date: "14/08/2026", by: "Sérgio Lopes" },
    { name: "Manual da marca Boreal.pdf", category: "Documentos", date: "16/08/2026", by: "Tainá Ribeiro" },
    { name: "Relatório Ago-2026.pdf", category: "Relatórios", date: "10/09/2026", by: "Ana Prado" },
    { name: "Fotos da clínica.zip", category: "Criativos", date: "20/08/2026", by: "Tainá Ribeiro" },
  ],
  history: [
    { event: "Acesso Google Analytics solicitado", when: "01/09/2026 · 10:22", who: "Léo Martins", tone: "warning" },
    { event: "Relatório de agosto enviado", when: "11/09/2026 · 08:40", who: "Ana Prado", tone: "info" },
    { event: "Tarefa criada — Validar eventos do GTM", when: "30/08/2026 · 14:11", who: "Ana Prado", tone: "neutral" },
    { event: "Acesso Google Ads validado", when: "20/08/2026 · 17:05", who: "Léo Martins", tone: "success" },
    { event: "Pagamento confirmado — COB-1020", when: "05/08/2026 · 09:15", who: "Financeiro", tone: "success" },
    { event: "Contrato CTR-0288 assinado", when: "14/08/2026 · 11:30", who: "Dra. Helena Bueno", tone: "success" },
    { event: "Contrato CTR-0288 enviado para assinatura", when: "13/08/2026 · 16:00", who: "Ana Prado", tone: "neutral" },
  ],
  alerts: [
    { title: "2 acessos obrigatórios bloqueiam a ativação", detail: "Google Analytics e Google Tag Manager", tone: "danger" },
    { title: "Contrato CTR-0301 aguardando assinatura", detail: "Landing Page · enviado há 4 dias", tone: "warning" },
    { title: "Relatório de setembro ainda não gerado", detail: "Previsto para 05/10/2026", tone: "info" },
  ],
};

export const clientDetails: Record<string, ClientDetail> = { alpha, beta };

export function getClientDetail(id: string): ClientDetail {
  return clientDetails[id] ?? { ...beta, id, name: nameFor(id) };
}

function nameFor(id: string) {
  const map: Record<string, string> = { gamma: "Gamma Educação", delta: "Delta Saúde", kora: "Kora Engenharia", norte: "Norte Capital" };
  return map[id] ?? "Cliente";
}
