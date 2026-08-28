export const CATEGORIAS_ENTRADA = [
  "Abate de bovinos",
  "Soja",
  "Cana",
  "Milho",
  "Cliente Touro",
  "Cliente Palmeiras",
  "Látex",
  "StoneX",
  "Remuneração de aval",
  "Outros recebimentos",
  "Operações de crédito",
] as const;

export const CATEGORIAS_PAGAMENTO = [
  "Compra de bovinos",
  "Folha salarial",
  "PPR e bônus executivo",
  "Impostos",
  "Parcelamentos",
  "Compra de ações",
  "Dividendos aos sócios",
  "StoneX",
  "Despesas gerais",
] as const;

export const CATEGORIAS_AMORTIZACAO = [
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

export const HORIZONTES = [4, 8, 13, 26, 52];

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
