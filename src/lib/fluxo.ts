import { addDias, inicioSemana, iso } from "./format";
import { CATEGORIAS_AMORTIZACAO, CATEGORIAS_ENTRADA, CATEGORIAS_PAGAMENTO } from "./constants";

export type Movimentacao = {
  id: string;
  empresa_id: string | null;
  natureza: "entrada" | "saida";
  categoria: string;
  subcategoria: string | null;
  descricao: string | null;
  contraparte: string | null;
  documento: string | null;
  data_prevista: string;
  data_vencimento: string | null;
  valor_liquido: number;
  valor_original: number;
  status: string;
  fonte: string | null;
  banco: string | null;
  observacao: string | null;
  demo: boolean;
  editado_manual: boolean;
  cenario_id: string | null;
};

export type Semana = { indice: number; inicio: Date; fim: Date; rotulo: string; chave: string };

export type Cenario = {
  id: string;
  nome: string;
  tipo: string;
  descricao: string | null;
  oficial: boolean;
  fator_receita: number;
  fator_despesa: number;
  saldo_minimo: number;
};

export type LinhaFluxo = {
  grupo: "entradas" | "pagamentos" | "amortizacoes";
  categoria: string;
  valores: number[];
  total: number;
};

export type ResultadoSemana = {
  saldoInicial: number;
  entradas: number;
  pagamentos: number;
  amortizacoes: number;
  saidas: number;
  disponibilidadeAntesPagamentos: number;
  liquido: number;
  saldoFinal: number;
};

export type Fluxo = {
  semanas: Semana[];
  linhas: LinhaFluxo[];
  resultados: ResultadoSemana[];
  saldoInicial: number;
  totalEntradas: number;
  totalPagamentos: number;
  totalAmortizacoes: number;
  totalSaidas: number;
  saldoFinal: number;
  menorSaldo: number;
  semanaMenorSaldo: Semana | null;
  necessidadeMaxima: number;
  semanaMaiorPagamento: Semana | null;
};

export const montarSemanas = (dataBase: string, horizonte: number): Semana[] => {
  const base = inicioSemana(dataBase);
  return Array.from({ length: horizonte }, (_, i) => {
    const ini = addDias(base, i * 7);
    const fim = addDias(ini, 6);
    return {
      indice: i,
      inicio: ini,
      fim,
      chave: iso(ini),
      rotulo: `${ini.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} a ${fim.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`,
    };
  });
};

const grupoDaCategoria = (m: Movimentacao): LinhaFluxo["grupo"] => {
  if (m.natureza === "entrada") return "entradas";
  if (
    m.subcategoria === "Amortização" ||
    (CATEGORIAS_AMORTIZACAO as readonly string[]).includes(m.categoria)
  )
    return "amortizacoes";
  return "pagamentos";
};

export const calcularFluxo = (
  movimentacoes: Movimentacao[],
  saldoInicial: number,
  semanas: Semana[],
  cenario?: Cenario | null,
): Fluxo => {
  const n = semanas.length;
  const idxPorChave = new Map(semanas.map((s) => [s.chave, s.indice]));
  const zeros = () => Array.from({ length: n }, () => 0);

  const mapa = new Map<string, LinhaFluxo>();
  const garantir = (grupo: LinhaFluxo["grupo"], categoria: string) => {
    const chave = `${grupo}::${categoria}`;
    let l = mapa.get(chave);
    if (!l) {
      l = { grupo, categoria, valores: zeros(), total: 0 };
      mapa.set(chave, l);
    }
    return l;
  };

  const fr = cenario?.fator_receita ?? 1;
  const fd = cenario?.fator_despesa ?? 1;

  for (const m of movimentacoes) {
    if (m.status === "cancelado") continue;
    const chave = iso(inicioSemana(m.data_prevista));
    const i = idxPorChave.get(chave);
    if (i === undefined) continue;
    const grupo = grupoDaCategoria(m);
    const fator = grupo === "entradas" ? fr : fd;
    const valor = Number(m.valor_liquido || m.valor_original || 0) * fator;
    const linha = garantir(grupo, m.categoria || "Não classificado");
    linha.valores[i] = (linha.valores[i] ?? 0) + valor;
    linha.total += valor;
  }

  const ordem = (grupo: LinhaFluxo["grupo"]) =>
    grupo === "entradas"
      ? (CATEGORIAS_ENTRADA as readonly string[])
      : grupo === "pagamentos"
        ? (CATEGORIAS_PAGAMENTO as readonly string[])
        : (CATEGORIAS_AMORTIZACAO as readonly string[]);

  const linhas = [...mapa.values()].sort((a, b) => {
    if (a.grupo !== b.grupo) {
      const g = ["entradas", "pagamentos", "amortizacoes"];
      return g.indexOf(a.grupo) - g.indexOf(b.grupo);
    }
    const lista = ordem(a.grupo);
    const ia = lista.indexOf(a.categoria);
    const ib = lista.indexOf(b.categoria);
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
  });

  const resultados: ResultadoSemana[] = [];
  let saldo = saldoInicial;
  for (let i = 0; i < n; i++) {
    const somaGrupo = (g: LinhaFluxo["grupo"]) =>
      linhas.filter((l) => l.grupo === g).reduce((acc, l) => acc + (l.valores[i] ?? 0), 0);
    const entradas = somaGrupo("entradas");
    const pagamentos = somaGrupo("pagamentos");
    const amortizacoes = somaGrupo("amortizacoes");
    const saidas = pagamentos + amortizacoes;
    const saldoFinal = saldo + entradas - saidas;
    resultados.push({
      saldoInicial: saldo,
      entradas,
      pagamentos,
      amortizacoes,
      saidas,
      disponibilidadeAntesPagamentos: saldo + entradas,
      liquido: entradas - saidas,
      saldoFinal,
    });
    saldo = saldoFinal;
  }

  const totalEntradas = resultados.reduce((a, r) => a + r.entradas, 0);
  const totalPagamentos = resultados.reduce((a, r) => a + r.pagamentos, 0);
  const totalAmortizacoes = resultados.reduce((a, r) => a + r.amortizacoes, 0);
  let menorSaldo = Infinity;
  let semanaMenorSaldo: Semana | null = null;
  let maiorPag = -Infinity;
  let semanaMaiorPagamento: Semana | null = null;
  resultados.forEach((r, i) => {
    if (r.saldoFinal < menorSaldo) {
      menorSaldo = r.saldoFinal;
      semanaMenorSaldo = semanas[i] ?? null;
    }
    if (r.saidas > maiorPag) {
      maiorPag = r.saidas;
      semanaMaiorPagamento = semanas[i] ?? null;
    }
  });

  return {
    semanas,
    linhas,
    resultados,
    saldoInicial,
    totalEntradas,
    totalPagamentos,
    totalAmortizacoes,
    totalSaidas: totalPagamentos + totalAmortizacoes,
    saldoFinal: resultados.length ? (resultados[resultados.length - 1]?.saldoFinal ?? saldoInicial) : saldoInicial,
    menorSaldo: resultados.length ? menorSaldo : saldoInicial,
    semanaMenorSaldo,
    necessidadeMaxima: Math.max(0, -(resultados.length ? menorSaldo : 0)),
    semanaMaiorPagamento,
  };
};

/** Validações automáticas do fluxo (encadeamento, somas e classificação). */
export const validarFluxo = (fluxo: Fluxo) => {
  const checagens: { nome: string; ok: boolean; detalhe: string }[] = [];
  const tol = 0.01;

  let encadeado = true;
  for (let i = 1; i < fluxo.resultados.length; i++) {
    const ant = fluxo.resultados[i - 1]!;
    const atual = fluxo.resultados[i]!;
    if (Math.abs(ant.saldoFinal - atual.saldoInicial) > tol) encadeado = false;
  }
  checagens.push({
    nome: "Saldo final alimenta a semana seguinte",
    ok: encadeado,
    detalhe: "Saldo final da semana anterior igual ao saldo inicial da seguinte",
  });

  const somaOk = fluxo.resultados.every(
    (r) => Math.abs(r.saldoInicial + r.entradas - r.saidas - r.saldoFinal) <= tol,
  );
  checagens.push({
    nome: "Saldo inicial + entradas − saídas = saldo final",
    ok: somaOk,
    detalhe: "Fórmula conferida em todas as semanas",
  });

  const totalCat = fluxo.linhas
    .filter((l) => l.grupo === "entradas")
    .reduce((a, l) => a + l.total, 0);
  checagens.push({
    nome: "Total de receitas igual à soma das categorias",
    ok: Math.abs(totalCat - fluxo.totalEntradas) <= tol,
    detalhe: "Conferência das entradas",
  });

  const totalPag = fluxo.linhas
    .filter((l) => l.grupo === "pagamentos")
    .reduce((a, l) => a + l.total, 0);
  checagens.push({
    nome: "Total de pagamentos igual à soma das categorias",
    ok: Math.abs(totalPag - fluxo.totalPagamentos) <= tol,
    detalhe: "Conferência dos pagamentos operacionais",
  });

  const totalAmo = fluxo.linhas
    .filter((l) => l.grupo === "amortizacoes")
    .reduce((a, l) => a + l.total, 0);
  checagens.push({
    nome: "Total de amortizações igual à soma das instituições",
    ok: Math.abs(totalAmo - fluxo.totalAmortizacoes) <= tol,
    detalhe: "Conferência das operações financeiras",
  });

  const semClassificacao = fluxo.linhas.some((l) => l.categoria === "Não classificado");
  checagens.push({
    nome: "Nenhum valor sem classificação no fluxo",
    ok: !semClassificacao,
    detalhe: semClassificacao
      ? "Existem movimentações sem categoria gerencial"
      : "Todas as movimentações classificadas",
  });

  const semErroReferencia = fluxo.resultados.every((r) => Number.isFinite(r.saldoFinal));
  checagens.push({
    nome: "Nenhum erro de referência no cálculo",
    ok: semErroReferencia,
    detalhe: "Todas as semanas com valores numéricos válidos",
  });

  return { checagens, conciliado: checagens.every((c) => c.ok) };
};
