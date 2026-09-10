/**
 * Padroniza o nome da instituição financeira.
 * A planilha de Disponíveis traz descrições livres ("APLICACAO FINANCEIRA - COOPERCRED LTDA",
 * "QUOTAS SICREDI", "BANCO ITAU C/C 04918-4"). Aqui reduzimos tudo ao nome oficial da
 * instituição, sem alterar o dado gravado — apenas a exibição/agrupamento.
 */
const sem = (t: string) =>
  (t ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();

const REGRAS: Array<[RegExp, string]> = [
  [/CAIXA ECONOMICA|\bCEF\b/, "Caixa Econômica Federal"],
  [/COOPERCRED/, "Coopercred"],
  [/EMPRECRED/, "Emprecred"],
  [/CREDIGOIAS/, "Credigoiás"],
  [/SICOOB|UNICENTRO/, "Sicoob Unicentro"],
  [/SICREDI/, "Sicredi"],
  [/BANCO DO BRASIL|\bB\.? ?BRASIL\b|\bBB\b/, "Banco do Brasil"],
  [/BRADESCO/, "Bradesco"],
  [/ITAU BBA/, "Itaú BBA"],
  [/ITAU/, "Itaú"],
  [/SANTANDER/, "Santander"],
  [/SAFRA/, "Safra"],
  [/ABC BRASIL/, "Banco ABC Brasil"],
  [/AMAZONIA/, "Banco da Amazônia"],
  [/\bINTER\b/, "Banco Inter"],
  [/CITIBANK|CITI\b/, "Citibank"],
  [/BTG/, "BTG Pactual"],
  [/\bXP\b|XP INVESTIMENTOS/, "XP Investimentos"],
  [/STONEX|STONE\b/, "StoneX"],
  [/VOTORANTIM|\bBV\b/, "Banco Votorantim"],
  [/^CAIXA$|CAIXA INTERN|CAIXA GERAL|FUNDO FIXO/, "Caixa interno"],
];

export function nomeBanco(banco: string): string {
  const t = sem(banco);
  for (const [re, nome] of REGRAS) if (re.test(t)) return nome;
  // Sem regra conhecida: devolve em caixa de título para não poluir o painel.
  return t
    .toLowerCase()
    .replace(/\b\p{L}/gu, (c) => c.toUpperCase())
    .trim();
}

/** A planilha traz o tipo em caixa alta e com acentos ("APLICAÇÃO", "CONTA POUPANÇA"). */
export function tipoChave(tipo: string) {
  const t = (tipo ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  if (t.includes("quota")) return "quotas";
  if (t.includes("aplic")) return "aplicacao";
  if (t.includes("poupan")) return "poupanca";
  if (t.includes("caixa")) return "caixa";
  if (t.includes("corrente") || t.includes("conta")) return "conta_corrente";
  return t.replace(/\s+/g, "_");
}
