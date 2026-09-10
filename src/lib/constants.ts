export const CATEGORIAS_ENTRADA = [
  "Abate de bovinos",
  "Soja",
  "Cana",
  "Milho",
  "Cliente Touro",
  "Cliente Palmeiras",
  "Látex",
  "Remuneração de avais",
  "StoneX",
  "Outros recebimentos",
  "Operações de crédito",
] as const;

export const CATEGORIAS_PAGAMENTO = [
  "Compra de bovinos",
  "Folha Salarial",
  "Impostos",
  "Parcelamentos",
  "Dividendos aos sócios",
  "Despesas Gerais",
  "PPR e bônus executivo",
  "Compra de ações",
  "StoneX",
] as const;

export const CATEGORIAS_AMORTIZACAO = [
  "Amortização de dívidas bancárias",
  "Bradesco",
  "Safra",
  "Sicredi",
  "Unicentro",
  "Banco da Amazônia",
  "Banco Inter",
  "Banco do Brasil",
  "Banco Votorantim",
  "CCB",
  "ABC Brasil",
  "XP Investimentos",
  "Swap XP",
  "EcoAgro CRA 2021",
  "EcoAgro CRA 2024",
  "EcoAgro CRA 2026",
  "BTG",
  "Agrolend",
  "Outros",
] as const;

export const STATUS_LABEL: Record<string, string> = {
  confirmado: "Confirmado",
  estimado: "Estimado",
  pendente: "Pendente",
  realizado: "Realizado",
  cancelado: "Cancelado",
};

export const HORIZONTES = [
  4, 8, 12, 16, 20, 24, 25, 26, 27, 28, 29, 30, 39, 52, 78, 104, 156, 208, 260, 416,
];

export const TIPOS_FONTE = [
  { valor: "contas_a_pagar", rotulo: "Contas a pagar" },
  { valor: "contas_a_receber", rotulo: "Contas a receber" },
  { valor: "saldos_bancarios", rotulo: "Saldos bancários" },
  { valor: "aplicacoes", rotulo: "Aplicações" },
  { valor: "projecao_abate", rotulo: "Projeção de abate" },
  { valor: "impostos", rotulo: "Impostos" },
  { valor: "dividas", rotulo: "Dívidas" },
  { valor: "receitas_manuais", rotulo: "Receitas manuais" },
  { valor: "fluxo_anterior", rotulo: "Planilha completa do fluxo anterior" },
];
