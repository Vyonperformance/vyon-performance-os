export type Tone = "success" | "warning" | "danger" | "info" | "neutral";
export const clients = [
 {id:"alpha",name:"Alphora Commerce",services:["Meta Ads","Google Ads"],manager:"João Silva",operational:"Ativo",financial:"Regular",entry:"02/06/2026",tone:"success" as Tone},
 {id:"beta",name:"Boreal Odonto",services:["Meta Ads"],manager:"Ana Prado",operational:"Aguardando ativação",financial:"Regular",entry:"14/08/2026",tone:"warning" as Tone},
 {id:"gamma",name:"Gamma Educação",services:["Google Ads","Landing Page"],manager:"Léo Martins",operational:"Ativo",financial:"Inadimplente",entry:"11/03/2026",tone:"danger" as Tone},
 {id:"delta",name:"Delta Saúde",services:["Meta Ads","TikTok Ads"],manager:"Marina Costa",operational:"Aguardando ativação",financial:"Pendente",entry:"01/09/2026",tone:"warning" as Tone},
 {id:"kora",name:"Kora Engenharia",services:["Google Ads","Site"],manager:"Júlia Reis",operational:"Ativo",financial:"Regular",entry:"19/01/2026",tone:"success" as Tone},
 {id:"norte",name:"Norte Capital",services:["GPT Ads","SDR IA"],manager:"João Silva",operational:"Documentação",financial:"Regular",entry:"08/09/2026",tone:"info" as Tone},
];
export const attention = [
 {title:"Gamma Educação com pagamento vencido",detail:"R$ 6.800 · vencido há 3 dias",area:"Financeiro",tone:"danger" as Tone,to:"/financeiro"},
 {title:"Boreal Odonto aguardando acessos",detail:"Meta Business e GTM · bloqueia ativação",area:"Onboarding",tone:"warning" as Tone,to:"/clientes/beta"},
 {title:"Conta Gamma com saldo baixo",detail:"Google Ads · R$ 320 restantes",area:"Tráfego",tone:"danger" as Tone,to:"/trafego"},
 {title:"4 tarefas atrasadas na operação",detail:"2 urgentes · responsáveis: Léo, Ana",area:"Tarefas",tone:"warning" as Tone,to:"/tarefas"},
 {title:"3 relatórios aguardando envio",detail:"Alphora, Delta e Kora · prazo 18/09",area:"Relatórios",tone:"info" as Tone,to:"/relatorios"},
];
export const charges=[
 {client:"Gamma Educação",contract:"CTR-0261",value:"R$ 6.800,00",due:"11/09/2026",status:"Vencido",method:"Boleto",paid:"—",tone:"danger" as Tone},
 {client:"Delta Saúde",contract:"CTR-0294",value:"R$ 4.200,00",due:"16/09/2026",status:"A vencer",method:"Pix",paid:"—",tone:"warning" as Tone},
 {client:"Alphora Commerce",contract:"CTR-0208",value:"R$ 8.400,00",due:"10/09/2026",status:"Pago",method:"Boleto",paid:"09/09/2026",tone:"success" as Tone},
 {client:"Kora Engenharia",contract:"CTR-0182",value:"R$ 5.600,00",due:"20/09/2026",status:"A vencer",method:"Pix",paid:"—",tone:"info" as Tone},
 {client:"Boreal Odonto",contract:"CTR-0288",value:"R$ 3.200,00",due:"05/09/2026",status:"Pago",method:"Cartão",paid:"05/09/2026",tone:"success" as Tone},
];
export const tasks=[
 {title:"Revisar criativos da campanha institucional",client:"Alphora Commerce",demand:"Campanha de aquisição Q4",owner:"Ana Prado",department:"Design",priority:"Alta",status:"Em andamento",due:"Hoje, 14:00"},
 {title:"Validar eventos do Google Tag Manager",client:"Boreal Odonto",demand:"Concluir onboarding",owner:"Léo Martins",department:"Tráfego",priority:"Urgente",status:"Aguardando",due:"Ontem"},
 {title:"Consolidar dados do relatório mensal",client:"Kora Engenharia",demand:"Relatório de agosto",owner:"Júlia Reis",department:"Performance",priority:"Normal",status:"Pendente",due:"18/09"},
 {title:"Solicitar comprovante de pagamento",client:"Gamma Educação",demand:"Regularizar cobrança",owner:"Marina Costa",department:"Financeiro",priority:"Urgente",status:"Em andamento",due:"Hoje, 10:00"},
 {title:"Publicar nova landing page",client:"Delta Saúde",demand:"Ativação do cliente",owner:"Rafael Nunes",department:"Tecnologia",priority:"Alta",status:"Pendente",due:"20/09"},
];
export const reports=[
 {client:"Alphora Commerce",period:"Ago/2026",type:"Performance 360º",owner:"João Silva",status:"Em revisão",generated:"12/09",sent:"—"},
 {client:"Delta Saúde",period:"Ago/2026",type:"Mídia paga",owner:"Marina Costa",status:"Pendente",generated:"—",sent:"—"},
 {client:"Kora Engenharia",period:"Ago/2026",type:"Executivo",owner:"Júlia Reis",status:"Gerado",generated:"13/09",sent:"—"},
 {client:"Boreal Odonto",period:"Ago/2026",type:"Mídia paga",owner:"Ana Prado",status:"Enviado",generated:"10/09",sent:"11/09"},
];
export const team=[
 {name:"Marina Costa",initials:"MC",email:"marina@vyon.com.br",department:"Operações",role:"Head de Operações",status:"Ativo",last:"Hoje, 19:42"},
 {name:"João Silva",initials:"JS",email:"joao@vyon.com.br",department:"Performance",role:"Gestor Sênior",status:"Ativo",last:"Hoje, 18:16"},
 {name:"Ana Prado",initials:"AP",email:"ana@vyon.com.br",department:"Atendimento",role:"Customer Success",status:"Ativo",last:"Hoje, 17:58"},
 {name:"Léo Martins",initials:"LM",email:"leo@vyon.com.br",department:"Performance",role:"Gestor de Tráfego",status:"Ativo",last:"Ontem, 21:10"},
 {name:"Júlia Reis",initials:"JR",email:"julia@vyon.com.br",department:"Performance",role:"Analista",status:"Convidado",last:"Nunca"},
];
