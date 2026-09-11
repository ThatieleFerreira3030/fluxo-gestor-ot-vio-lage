import * as XLSX from "xlsx";
import { addDias, inicioSemana, iso, toDate } from "./format";

/** Identificação das quatro fontes oficiais do fluxo. */
export type FonteId = "disponiveis" | "entradas" | "pagamentos" | "amortizacoes";

export const FONTES: { id: FonteId; rotulo: string; arquivo: string }[] = [
  { id: "disponiveis", rotulo: "Disponibilidades", arquivo: "Disponiveis.xls" },
  { id: "entradas", rotulo: "Entradas", arquivo: "Entradas.xlsx" },
  { id: "pagamentos", rotulo: "Pagamentos", arquivo: "Pagamentos.xlsx" },
  {
    id: "amortizacoes",
    rotulo: "Amortizações de dívidas",
    arquivo: "Armotização de dividas bancarias.xlsx",
  },
];

export const CATEGORIA_AMORTIZACAO = "Amortização de dívidas bancárias";

export type LinhaDisponibilidade = {
  chave: string;
  coligada: string;
  empresa: string;
  banco: string;
  agencia: string;
  conta: string;
  codigoConta: string;
  descricao: string;
  tipo: string;
  saldo: number;
};

export type LinhaMovimento = {
  chave: string;
  aba: string;
  natureza: "entrada" | "saida";
  categoria: string;
  subcategoria: string | null;
  descricao: string;
  contraparte: string;
  documento: string;
  empresa: string | null;
  data: string;
  valor: number;
  status: "confirmado" | "estimado" | "realizado" | "pendente";
  detalhe: Record<string, unknown>;
};

export type ResumoAba = { aba: string; registros: number; ignorados: number; total: number };

export type LeituraFonte = {
  fonte: FonteId;
  arquivo: string;
  abas: string[];
  dataBase: string | null;
  disponibilidades: LinhaDisponibilidade[];
  movimentos: LinhaMovimento[];
  resumoAbas: ResumoAba[];
  ignorados: number;
  erros: string[];
  total: number;
  enviadoEm: string;
};

/* ---------------------------------- utils --------------------------------- */

const txt = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return iso(v);
  return String(v).trim();
};

const semAcento = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export const numero = (v: unknown): number | null => {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (v === null || v === undefined) return null;
  const s = String(v)
    .replace(/[R$\s]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  if (!s || !/^-?\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

/** Converte célula de data (Date, serial Excel ou texto) em ISO. */
export const dataCelula = (v: unknown): string | null => {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) {
    return `${v.getUTCFullYear()}-${String(v.getUTCMonth() + 1).padStart(2, "0")}-${String(
      v.getUTCDate(),
    ).padStart(2, "0")}`;
  }
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (!d || !d.y) return null;
    return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const s = String(v).trim();
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (br) {
    const [, d, m, y] = br;
    const ano = (y ?? "").length === 2 ? `20${y}` : y;
    return `${ano}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return null;
};

const matriz = (ws: XLSX.WorkSheet, deLinha = 0): unknown[][] =>
  XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null, range: deLinha, raw: true });

const linhaVazia = (r: unknown[]) => r.every((c) => c === null || c === undefined || txt(c) === "");

const acharAba = (wb: XLSX.WorkBook, alvo: string) =>
  wb.SheetNames.find((n) => semAcento(n) === semAcento(alvo)) ??
  wb.SheetNames.find((n) => semAcento(n).includes(semAcento(alvo)));

const statusDaSituacao = (s: string): LinhaMovimento["status"] => {
  const v = semAcento(s);
  if (v.includes("recebido") || v.includes("pago") || v.includes("realizado")) return "realizado";
  if (v.includes("previsao") || v.includes("provisao") || v.includes("estimad")) return "estimado";
  if (v.includes("faturado") || v.includes("agendado") || v.includes("escalado")) return "confirmado";
  return v ? "confirmado" : "estimado";
};

const colunas = (cab: unknown[]) => {
  const mapa = new Map<string, number>();
  cab.forEach((c, i) => {
    const k = semAcento(txt(c));
    if (k && !mapa.has(k)) mapa.set(k, i);
  });
  return (...nomes: string[]) => {
    for (const n of nomes) {
      const i = mapa.get(semAcento(n));
      if (i !== undefined) return i;
    }
    for (const n of nomes) {
      for (const [k, i] of mapa) if (k.includes(semAcento(n))) return i;
    }
    return -1;
  };
};

/* ------------------------------- identificação ----------------------------- */

export const identificarFonte = (wb: XLSX.WorkBook): FonteId | null => {
  const nomes = wb.SheetNames.map(semAcento);
  if (nomes.some((n) => n.includes("cronograma"))) return "amortizacoes";
  if (nomes.some((n) => n.includes("disponiveis"))) return "disponiveis";
  if (nomes.some((n) => n.includes("abate de bovinos")) || nomes.some((n) => n.includes("latex")))
    return "entradas";
  if (
    nomes.some((n) => n.includes("compra de bovinos")) ||
    nomes.some((n) => n.includes("folha salarial"))
  )
    return "pagamentos";
  return null;
};

/* -------------------------------- Disponiveis ------------------------------ */

const lerDisponiveis = (wb: XLSX.WorkBook, arquivo: string): LeituraFonte => {
  const erros: string[] = [];
  const nomeAba = acharAba(wb, "Disponiveis") ?? wb.SheetNames[0]!;
  const ws = wb.Sheets[nomeAba]!;
  const linhas = matriz(ws);

  let dataBase: string | null = null;
  for (const r of linhas.slice(0, 3)) {
    for (const c of r) {
      const s = txt(c);
      const m = s.match(/data\s*base\s*:?\s*(.+)/i);
      if (m) dataBase = dataCelula(m[1]?.trim()) ?? dataCelula(c);
      if (dataBase) break;
    }
    if (dataBase) break;
  }
  if (!dataBase) erros.push("Data-base não encontrada na parte superior da planilha Disponiveis.");

  const cab = linhas[2] ?? [];
  const col = colunas(cab);
  const iColigada = col("COLIGADA");
  const iEmpresa = col("EMPRESA");
  const iBanco = col("BANCO");
  const iAgencia = col("AGENCIA");
  const iConta = col("CONTA");
  const iCodigo = col("CODIGO CONTA");
  const iDesc = col("DESCRIÇÃO", "DESCRICAO");
  const iTipo = col("TIPO");
  const iSaldo = col("SALDO");
  if ([iEmpresa, iSaldo, iTipo].some((i) => i < 0))
    erros.push("Colunas obrigatórias ausentes na aba Disponiveis (EMPRESA, TIPO, SALDO).");

  const vistos = new Set<string>();
  const itens: LinhaDisponibilidade[] = [];
  let ignorados = 0;

  for (const r of linhas.slice(3)) {
    if (linhaVazia(r)) continue;
    const empresa = txt(r[iEmpresa]);
    const saldo = numero(r[iSaldo]);
    if (!empresa || saldo === null) {
      ignorados++;
      continue;
    }
    const chave = [
      txt(r[iColigada]),
      txt(r[iBanco]),
      txt(r[iAgencia]),
      txt(r[iConta]),
      txt(r[iCodigo]),
    ].join("|");
    if (vistos.has(chave)) {
      ignorados++;
      continue;
    }
    vistos.add(chave);
    itens.push({
      chave,
      coligada: txt(r[iColigada]),
      empresa,
      banco: txt(r[iBanco]),
      agencia: txt(r[iAgencia]),
      conta: txt(r[iConta]),
      codigoConta: txt(r[iCodigo]),
      descricao: txt(r[iDesc]),
      tipo: txt(r[iTipo]),
      saldo,
    });
  }

  return {
    fonte: "disponiveis",
    arquivo,
    abas: wb.SheetNames,
    dataBase,
    disponibilidades: itens,
    movimentos: [],
    resumoAbas: [
      {
        aba: nomeAba,
        registros: itens.length,
        ignorados,
        total: itens.reduce((a, d) => a + d.saldo, 0),
      },
    ],
    ignorados,
    erros,
    total: itens.reduce((a, d) => a + d.saldo, 0),
    enviadoEm: new Date().toISOString(),
  };
};

/** Quotas não compõem o saldo inicial do fluxo. */
export const ehQuota = (tipo: string) => semAcento(tipo).includes("quota");

export const saldoInicialDe = (itens: LinhaDisponibilidade[]) =>
  itens.filter((d) => !ehQuota(d.tipo)).reduce((a, d) => a + d.saldo, 0);

/* ------------------------------ abas genéricas ----------------------------- */

type CfgAba = {
  aba: string;
  categoria: string;
  natureza: "entrada" | "saida";
  colValor: string[];
  colData: string[];
  extras?: string[];
};

const lerAbaSimples = (
  wb: XLSX.WorkBook,
  cfg: CfgAba,
): { movimentos: LinhaMovimento[]; resumo: ResumoAba; erros: string[] } | null => {
  const nome = acharAba(wb, cfg.aba);
  if (!nome) return null;
  const linhas = matriz(wb.Sheets[nome]!);
  const cab = linhas[0] ?? [];
  const col = colunas(cab);
  const iValor = col(...cfg.colValor);
  const iData = col(...cfg.colData);
  const erros: string[] = [];
  const movimentos: LinhaMovimento[] = [];
  let ignorados = 0;

  if (iValor < 0 || iData < 0) {
    // Abas informativas ("Sem Provisão para o periodo") não são erro.
    const aviso = linhas
      .flat()
      .some((c) => semAcento(txt(c)).includes("sem provisao"));
    if (!aviso) erros.push(`Aba "${nome}": colunas obrigatórias não localizadas.`);
    return {
      movimentos: [],
      resumo: { aba: nome, registros: 0, ignorados: 0, total: 0 },
      erros,
    };
  }

  linhas.slice(1).forEach((r, idx) => {
    if (linhaVazia(r)) return;
    const valor = numero(r[iValor]);
    const data = dataCelula(r[iData]);
    if (valor === null || !data || valor === 0) {
      ignorados++;
      return;
    }
    const detalhe: Record<string, unknown> = { aba: nome };
    cab.forEach((c, i) => {
      const k = txt(c);
      if (k) detalhe[k] = r[i] instanceof Date ? dataCelula(r[i]) : (r[i] ?? null);
    });
    const situacao = txt(r[col("Situação", "Situacao")] ?? "");
    const destino = txt(r[col("Destino", "Mercado")] ?? "");
    movimentos.push({
      chave: `${nome}|${idx}|${data}|${valor}|${destino}`,
      aba: nome,
      natureza: cfg.natureza,
      categoria: cfg.categoria,
      subcategoria: txt(r[col("Categoria")] ?? "") || null,
      descricao: cfg.categoria,
      contraparte: destino,
      documento: "",
      empresa: null,
      data,
      valor: Math.abs(valor),
      status: statusDaSituacao(situacao),
      detalhe,
    });
  });

  return {
    movimentos,
    resumo: {
      aba: nome,
      registros: movimentos.length,
      ignorados,
      total: movimentos.reduce((a, m) => a + m.valor, 0),
    },
    erros,
  };
};

/* --------------------------------- Entradas -------------------------------- */

const lerEntradas = (wb: XLSX.WorkBook, arquivo: string, dataBase: string | null): LeituraFonte => {
  const movimentos: LinhaMovimento[] = [];
  const resumoAbas: ResumoAba[] = [];
  const erros: string[] = [];
  let ignorados = 0;

  const cfgs: CfgAba[] = [
    {
      aba: "Abate de bovinos",
      categoria: "Abate de bovinos",
      natureza: "entrada",
      colValor: ["Faturamento"],
      colData: ["Data de recebimento"],
    },
    {
      aba: "SOJA",
      categoria: "Soja",
      natureza: "entrada",
      colValor: ["Faturamento"],
      colData: ["Data de recebimento"],
    },
    {
      aba: "Cana",
      categoria: "Cana",
      natureza: "entrada",
      colValor: ["Faturamento"],
      colData: ["Data de recebimento"],
    },
    {
      aba: "Milho",
      categoria: "Milho",
      natureza: "entrada",
      colValor: ["Faturamento"],
      colData: ["Data de recebimento"],
    },
    {
      aba: "Cliente Palmeiras",
      categoria: "Cliente Palmeiras",
      natureza: "entrada",
      colValor: ["Faturamento"],
      colData: ["Data de recebimento"],
    },
    {
      aba: "LATEX",
      categoria: "Látex",
      natureza: "entrada",
      colValor: ["VALOR"],
      colData: ["Data de recebimento"],
    },
    {
      aba: "Remuneração de havais",
      categoria: "Remuneração de avais",
      natureza: "entrada",
      colValor: ["Faturamento"],
      colData: ["Data de recebimento"],
    },
  ];

  for (const cfg of cfgs) {
    const res = lerAbaSimples(wb, cfg);
    if (!res) {
      erros.push(`Aba "${cfg.aba}" não encontrada em ${arquivo}.`);
      continue;
    }
    let lista = res.movimentos;
    let extraIgnorados = 0;
    if (cfg.categoria === "Cliente Palmeiras" && dataBase) {
      const antes = lista.length;
      lista = lista.filter((m) => !(m.status === "realizado" && m.data <= dataBase));
      extraIgnorados = antes - lista.length;
    }
    movimentos.push(...lista);
    ignorados += res.resumo.ignorados + extraIgnorados;
    erros.push(...res.erros);
    resumoAbas.push({
      aba: res.resumo.aba,
      registros: lista.length,
      ignorados: res.resumo.ignorados + extraIgnorados,
      total: lista.reduce((a, m) => a + m.valor, 0),
    });
  }

  // Cliente Touro: layout de títulos a receber.
  const nomeTouro = acharAba(wb, "Cliente Touro");
  if (!nomeTouro) {
    erros.push('Aba "Cliente Touro" não encontrada em Entradas.xlsx.');
  } else {
    const linhas = matriz(wb.Sheets[nomeTouro]!);
    const cab = linhas[0] ?? [];
    const col = colunas(cab);
    const iVenc = col("DATA VENCIMENTO");
    const iDoc = col("NUMERO DOCUMENTO");
    const iNome = col("NOME FORNECEDOR");
    const iCpf = col("CNPJ_CPF");
    const iValor = col("VALOR LIQUIDO");
    let ign = 0;
    const vistos = new Set<string>();
    const lista: LinhaMovimento[] = [];
    for (const r of linhas.slice(1)) {
      if (linhaVazia(r)) continue;
      const data = dataCelula(r[iVenc]);
      const valor = numero(r[iValor]);
      if (!data || valor === null || valor === 0) {
        ign++;
        continue;
      }
      const chave = `${txt(r[iDoc])}|${txt(r[iCpf])}|${data}|${valor}`;
      if (vistos.has(chave)) {
        ign++;
        continue;
      }
      vistos.add(chave);
      lista.push({
        chave,
        aba: nomeTouro,
        natureza: "entrada",
        categoria: "Cliente Touro",
        subcategoria: null,
        descricao: "Título a receber",
        contraparte: txt(r[iNome]),
        documento: txt(r[iDoc]),
        empresa: null,
        data,
        valor: Math.abs(valor),
        status: "confirmado",
        detalhe: {
          aba: nomeTouro,
          "DATA EMISSAO": dataCelula(r[col("DATA EMISSAO")]),
          "DATA VENCIMENTO": data,
          "NUMERO DOCUMENTO": txt(r[iDoc]),
          "NOME FORNECEDOR": txt(r[iNome]),
          CNPJ_CPF: txt(r[iCpf]),
          "VALOR LIQUIDO": valor,
        },
      });
    }
    movimentos.push(...lista);
    ignorados += ign;
    resumoAbas.push({
      aba: nomeTouro,
      registros: lista.length,
      ignorados: ign,
      total: lista.reduce((a, m) => a + m.valor, 0),
    });
  }

  return {
    fonte: "entradas",
    arquivo,
    abas: wb.SheetNames,
    dataBase: null,
    disponibilidades: [],
    movimentos,
    resumoAbas,
    ignorados,
    erros,
    total: movimentos.reduce((a, m) => a + m.valor, 0),
    enviadoEm: new Date().toISOString(),
  };
};

/* -------------------------------- Pagamentos ------------------------------- */

const ultimoDiaDoMes = (ano: number, mes: number) => new Date(ano, mes, 0).getDate();

const lerImpostos = (wb: XLSX.WorkBook) => {
  const nome = acharAba(wb, "Impostos");
  if (!nome) return null;
  const linhas = matriz(wb.Sheets[nome]!);
  const cab = linhas[0] ?? [];
  const col = colunas(cab);
  const iDesc = col("Descrição", "Descricao");
  const iVenc = col("Vencimento");
  const iColigada = col("Coligada");
  const meses: { idx: number; competencia: string }[] = [];
  cab.forEach((c, i) => {
    if (i <= Math.max(iDesc, iVenc, iColigada)) return;
    const d = dataCelula(c);
    if (d) meses.push({ idx: i, competencia: d });
  });

  const movimentos: LinhaMovimento[] = [];
  let ignorados = 0;
  for (const r of linhas.slice(1)) {
    if (linhaVazia(r)) continue;
    const desc = txt(r[iDesc]);
    if (!desc || semAcento(desc).startsWith("total")) continue;
    const regraVenc = txt(r[iVenc]);
    const coligada = txt(r[iColigada]);
    for (const m of meses) {
      const valor = numero(r[m.idx]);
      if (valor === null || valor === 0) {
        ignorados++;
        continue;
      }
      const ref = toDate(m.competencia);
      const ano = ref.getFullYear();
      const mes = ref.getMonth() + 1;
      const ultimo = ultimoDiaDoMes(ano, mes);
      const numDia = regraVenc.match(/(\d{1,2})(?:\s*\/\s*(\d{1,2}))?/);
      let dia = ultimo;
      if (numDia) {
        const d1 = Number(numDia[1]);
        const d2 = numDia[2] ? Number(numDia[2]) : null;
        dia = Math.min(d2 ?? d1, ultimo);
        if (d2 && d2 >= 30) dia = ultimo;
      }
      const data = `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
      movimentos.push({
        chave: `Impostos|${desc}|${coligada}|${m.competencia}`,
        aba: nome,
        natureza: "saida",
        categoria: "Impostos",
        subcategoria: desc,
        descricao: desc,
        contraparte: coligada,
        documento: "",
        empresa: null,
        data,
        valor: Math.abs(valor),
        status: "estimado",
        detalhe: {
          aba: nome,
          Descrição: desc,
          Vencimento: regraVenc,
          Coligada: coligada,
          Competência: m.competencia,
          "Data de Pagamento": data,
          Valor: valor,
        },
      });
    }
  }
  return {
    movimentos,
    resumo: {
      aba: nome,
      registros: movimentos.length,
      ignorados,
      total: movimentos.reduce((a, x) => a + x.valor, 0),
    },
  };
};

const lerPagamentos = (wb: XLSX.WorkBook, arquivo: string): LeituraFonte => {
  const movimentos: LinhaMovimento[] = [];
  const resumoAbas: ResumoAba[] = [];
  const erros: string[] = [];
  let ignorados = 0;

  const cfgs: CfgAba[] = [
    {
      aba: "Compra de bovinos",
      categoria: "Compra de bovinos",
      natureza: "saida",
      colValor: ["Faturamento", "Pagamento"],
      colData: ["Data de Pagamento"],
    },
    {
      aba: "Folha Salarial",
      categoria: "Folha Salarial",
      natureza: "saida",
      colValor: ["Pagamento"],
      colData: ["Data de Pagamento"],
    },
    {
      aba: "Parcelamentos",
      categoria: "Parcelamentos",
      natureza: "saida",
      colValor: ["Pagamento", "Faturamento"],
      colData: ["Data de Pagamento"],
    },
    {
      aba: "Dividencos aos socios",
      categoria: "Dividendos aos sócios",
      natureza: "saida",
      colValor: ["Pagamento", "Faturamento"],
      colData: ["Data de Pagamento"],
    },
    {
      aba: "Despesas Gerais",
      categoria: "Despesas Gerais",
      natureza: "saida",
      colValor: ["Faturamento", "Pagamento"],
      colData: ["Data de Pagamento"],
    },
  ];

  for (const cfg of cfgs) {
    const res = lerAbaSimples(wb, cfg);
    if (!res) {
      erros.push(`Aba "${cfg.aba}" não encontrada em ${arquivo}.`);
      continue;
    }
    movimentos.push(...res.movimentos);
    ignorados += res.resumo.ignorados;
    erros.push(...res.erros);
    resumoAbas.push(res.resumo);
  }

  const imp = lerImpostos(wb);
  if (!imp) erros.push('Aba "Impostos" não encontrada em Pagamentos.xlsx.');
  else {
    movimentos.push(...imp.movimentos);
    ignorados += imp.resumo.ignorados;
    resumoAbas.push(imp.resumo);
  }

  return {
    fonte: "pagamentos",
    arquivo,
    abas: wb.SheetNames,
    dataBase: null,
    disponibilidades: [],
    movimentos,
    resumoAbas,
    ignorados,
    erros,
    total: movimentos.reduce((a, m) => a + m.valor, 0),
    enviadoEm: new Date().toISOString(),
  };
};

/* ------------------------------- Amortizações ------------------------------ */

const lerAmortizacoes = (wb: XLSX.WorkBook, arquivo: string): LeituraFonte => {
  const erros: string[] = [];
  const nome = acharAba(wb, "Cronograma") ?? wb.SheetNames[0]!;
  const linhas = matriz(wb.Sheets[nome]!);
  const cab = linhas[3] ?? [];
  const col = colunas(cab);
  const iVenc = col("Vencimento");
  const iId = col("ID");
  const iEmpresa = col("Empresa");
  const iCredor = col("Credor");
  const iEvento = col("Evento");
  const iSaldoIni = col("Saldo inicial");
  const iJuros = col("Juros / remuneração", "Juros");
  const iAmort = col("Amortização");
  const iTotal = col("Pagamento total");
  const iSaldoFim = col("Saldo final");
  const iFonte = col("Fonte");

  if ([iVenc, iTotal].some((i) => i < 0))
    erros.push("Colunas Vencimento e/ou Pagamento total não localizadas na aba Cronograma.");

  const movimentos: LinhaMovimento[] = [];
  const vistos = new Set<string>();
  let ignorados = 0;

  linhas.slice(4).forEach((r) => {
    if (linhaVazia(r)) return;
    const data = dataCelula(r[iVenc]);
    if (!data) {
      ignorados++;
      return;
    }
    const totalPlanilha = numero(r[iTotal]);
    if (totalPlanilha === null) {
      erros.push(
        `Linha com vencimento ${data} (${txt(r[iId])}) sem valor numérico em "Pagamento total".`,
      );
      return;
    }
    const juros = numero(r[iJuros]) ?? 0;
    const amortizacao = numero(r[iAmort]) ?? 0;
    // O valor oficial da parcela é exatamente o "Pagamento total" calculado na planilha.
    // Juros e amortização permanecem preservados separadamente para conferência.
    const total = totalPlanilha;
    const chave = `${txt(r[iId])}|${data}|${txt(r[iEmpresa])}|${txt(r[iCredor])}`;
    if (vistos.has(chave)) {
      ignorados++;
      return;
    }
    vistos.add(chave);
    movimentos.push({
      chave,
      aba: nome,
      natureza: "saida",
      categoria: CATEGORIA_AMORTIZACAO,
      subcategoria: txt(r[iCredor]),
      descricao: txt(r[iEvento]) || "Pagamento de dívida",
      contraparte: txt(r[iCredor]),
      documento: txt(r[iId]),
      empresa: txt(r[iEmpresa]) || null,
      data,
      valor: Math.abs(total),
      status: "confirmado",
      detalhe: {
        aba: nome,
        ID: txt(r[iId]),
        Empresa: txt(r[iEmpresa]),
        Credor: txt(r[iCredor]),
        Evento: txt(r[iEvento]),
        "Saldo inicial": numero(r[iSaldoIni]),
        "Juros / remuneração": juros,
        Amortização: amortizacao,
        "Pagamento total": total,
        "Saldo final": numero(r[iSaldoFim]),
        Fonte: txt(r[iFonte]),
      },
    });
  });

  return {
    fonte: "amortizacoes",
    arquivo,
    abas: wb.SheetNames,
    dataBase: null,
    disponibilidades: [],
    movimentos,
    resumoAbas: [
      {
        aba: nome,
        registros: movimentos.length,
        ignorados,
        total: movimentos.reduce((a, m) => a + m.valor, 0),
      },
    ],
    ignorados,
    erros,
    total: movimentos.reduce((a, m) => a + m.valor, 0),
    enviadoEm: new Date().toISOString(),
  };
};

/* ---------------------------------- leitura -------------------------------- */

export const lerArquivo = async (
  file: File,
  dataBaseConhecida: string | null,
): Promise<LeituraFonte> => {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { cellDates: true });
  const fonte = identificarFonte(wb);
  if (!fonte) {
    throw new Error(
      `Não foi possível identificar "${file.name}". Verifique se é uma das quatro planilhas oficiais.`,
    );
  }
  if (fonte === "disponiveis") return lerDisponiveis(wb, file.name);
  if (fonte === "entradas") return lerEntradas(wb, file.name, dataBaseConhecida);
  if (fonte === "pagamentos") return lerPagamentos(wb, file.name);
  return lerAmortizacoes(wb, file.name);
};

/** Primeira semana projetada: sexta-feira da semana seguinte à data-base. */
export const primeiraSemana = (dataBase: string) => iso(inicioSemana(addDias(toDate(dataBase), 1)));
