import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, Download, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Kpi } from "@/components/Kpi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useFluxo } from "@/lib/dados";
import { brl, dataBR, num } from "@/lib/format";
import { exportarExcel } from "@/lib/exportar";
import { lerArquivo, lerEndividamentoMensal, type LinhaDivida } from "@/lib/planilhas";
import { encontrarEmpresa } from "@/lib/empresas";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/dividas")({
  head: () => ({ meta: [{ title: "Dívidas e Operações | Grupo Otávio Lage" }] }),
  component: Dividas,
});

type Posicao = {
  id: string;
  data_base: string;
  empresa_id: string | null;
  tipo: string;
  credor: string;
  modalidade: string | null;
  numero_contrato: string | null;
  saldo_contabil_aproximado: number;
  indexador: string | null;
  taxa: string | null;
  vencimento: string | null;
  parcelas_restantes: number | null;
  safra_1: number;
  safra_2: number;
  safra_3: number;
  outras_safras: number;
  curto_prazo: number;
  longo_prazo: number;
  fonte: string;
  chave_origem: string;
};

type Resumo = {
  data_base: string;
  divida_bancaria: number;
  divida_tributaria: number;
  divida_bruta: number;
  curto_prazo: number;
  longo_prazo: number;
  quotas_capital: number;
  disponibilidades: number;
  divida_liquida: number;
};

type Cronograma = { data_base: string; periodo: string; ordem: number; valor: number };

type ParcelaAmortizacao = {
  id: string;
  empresa_id: string | null;
  contraparte: string | null;
  documento: string | null;
  descricao: string | null;
  data_prevista: string;
  valor_liquido: number;
  detalhe: Record<string, unknown> | null;
};

const periodoSafra = (data: string) => {
  const ano = Number(data.slice(0, 4));
  const mes = Number(data.slice(5, 7));
  const inicio = mes >= 4 ? ano : ano - 1;
  return `${String(inicio).slice(-2)}/${String(inicio + 1).slice(-2)}`;
};

const rotuloTipo = (tipo: string) =>
  tipo === "tributaria"
    ? "Tributária"
    : tipo === "acionistas"
      ? "Acionistas"
      : tipo === "bancaria"
        ? "Bancária"
        : "Outras";

const numeroPercentual = (valor: string) => {
  const numero = Number(valor.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(numero) ? numero / 100 : null;
};

const taxaEfetivaAnual = (posicao: Posicao) => {
  const taxa = posicao.taxa ?? "";
  const efetiva = taxa.match(/efetiva\s+([\d.,]+)%/i);
  if (efetiva?.[1]) return numeroPercentual(efetiva[1]);
  const indexador = (posicao.indexador ?? "").toLowerCase();
  if (indexador.includes("cdi") || indexador.includes("ipca")) return null;
  const contratual = taxa.match(/([\d.,]+)%/);
  return contratual?.[1] ? numeroPercentual(contratual[1]) : null;
};

const taxaIndexadorRegistrada = (posicao: Posicao) => {
  const taxa = posicao.taxa ?? "";
  const indice = taxa.match(/índice\s+([\d.,]+)%/i);
  return indice?.[1] ? numeroPercentual(indice[1]) : null;
};

const taxaContratualExibicao = (taxa: string | null) =>
  taxa?.split(" · índice")[0] ?? null;

const percentual = (taxa: number, casas = 2) =>
  `${(taxa * 100).toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })}%`;

const chaveCredor = (valor: string) => {
  const chave = valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (chave.includes("eco") || chave.includes("cra")) return "ecoagro";
  if (chave.includes("votorantim") || chave.includes("banco bv")) return "bv";
  if (chave.includes("btg")) return "btg";
  if (chave.includes("amazonia") || chave.includes("basa")) return "basa";
  if (chave.includes("bradesco")) return "bradesco";
  if (chave.includes("brasil")) return "bb";
  if (chave.includes("sicredi")) return "sicredi";
  if (chave.includes("sicoob")) return "sicoob";
  if (chave.includes("safra")) return "safra";
  if (chave.includes("agrolend")) return "agrolend";
  return chave.replace(/[^a-z0-9]/g, "");
};

function Dividas() {
  const { podeEditar } = useAuth();
  const arquivoRef = useRef<HTMLInputElement>(null);
  const detalhesRef = useRef<HTMLInputElement>(null);
  const [importando, setImportando] = useState(false);
  const [importandoDetalhes, setImportandoDetalhes] = useState(false);
  const [periodoSelecionado, setPeriodoSelecionado] = useState<string | null>(null);
  const { empresas, disponibilidades } = useFluxo();
  const posicoes = useQuery({
    queryKey: ["posicoes-dividas"],
    queryFn: async () => {
      const todas: Posicao[] = [];
      for (let inicio = 0; ; inicio += 1000) {
        const { data, error } = await supabase
          .from("posicoes_dividas")
          .select("*")
          .order("data_base", { ascending: false })
          .range(inicio, inicio + 999);
        if (error) {
          // A publicação do front-end pode terminar alguns instantes antes da
          // migração do banco. Nesse intervalo, mantém a visão disponível com
          // os contratos legados, em vez de derrubar toda a rota.
          if (error.code === "42P01" || error.code === "PGRST205") return [];
          throw error;
        }
        const pagina = (data ?? []) as unknown as Posicao[];
        todas.push(...pagina);
        if (pagina.length < 1000) break;
      }
      return todas;
    },
  });
  const resumos = useQuery({
    queryKey: ["resumos-endividamento"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resumos_endividamento")
        .select("*")
        .order("data_base", { ascending: true });
      if (error) {
        if (error.code === "42P01" || error.code === "PGRST205") return [] as Resumo[];
        throw error;
      }
      return (data ?? []) as Resumo[];
    },
  });
  const cronogramas = useQuery({
    queryKey: ["cronograma-endividamento"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cronograma_endividamento")
        .select("data_base,periodo,ordem,valor")
        .order("ordem", { ascending: true });
      if (error) {
        if (error.code === "42P01" || error.code === "PGRST205") return [] as Cronograma[];
        throw error;
      }
      return (data ?? []) as Cronograma[];
    },
  });
  const parcelasCronograma = useQuery({
    queryKey: ["parcelas-cronograma-dividas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movimentacoes")
        .select(
          "id,empresa_id,contraparte,documento,descricao,data_prevista,valor_liquido,detalhe",
        )
        .eq("fonte", "cronograma-amortizacoes")
        .order("data_prevista", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ParcelaAmortizacao[];
    },
  });
  const legados = useQuery({
    queryKey: ["contratos_financeiros"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contratos_financeiros")
        .select("*")
        .order("saldo_devedor", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const importarEndividamento = async (file: File | undefined) => {
    if (!file) return;
    setImportando(true);
    try {
      const leitura = await lerEndividamentoMensal(file);
      const fonte = "Endividamento mensal";
      const { error: erroResumo } = await supabase.from("resumos_endividamento").upsert(
        leitura.resumos.map((r) => ({
          data_base: r.dataBase,
          divida_bancaria: r.dividaBancaria,
          divida_tributaria: r.dividaTributaria,
          divida_bruta: r.dividaBruta,
          curto_prazo: r.curtoPrazo,
          longo_prazo: r.longoPrazo,
          quotas_capital: r.quotasCapital,
          disponibilidades: r.disponibilidades,
          divida_liquida: r.dividaLiquida,
          fonte: file.name,
          atualizado_em: new Date().toISOString(),
        })),
        { onConflict: "data_base" },
      );
      if (erroResumo) throw erroResumo;

      const { error: erroPosicoes } = await supabase.from("posicoes_dividas").upsert(
        leitura.posicoes.map((p) => ({
          data_base: leitura.dataBase,
          chave_origem: p.chave,
          tipo: p.tipo,
          credor: p.credor,
          modalidade: p.modalidade,
          numero_contrato: p.contrato,
          saldo_contabil_aproximado: p.saldoContabil,
          curto_prazo: p.curtoPrazo ?? 0,
          longo_prazo: p.longoPrazo ?? 0,
          safra_1: 0,
          safra_2: 0,
          safra_3: 0,
          outras_safras: 0,
          fonte,
        })),
        { onConflict: "data_base,chave_origem" },
      );
      if (erroPosicoes) throw erroPosicoes;

      const { error: erroLimpeza } = await supabase
        .from("cronograma_endividamento")
        .delete()
        .eq("data_base", leitura.dataBase);
      if (erroLimpeza) throw erroLimpeza;
      if (leitura.cronograma.length) {
        const { error: erroCronograma } = await supabase.from("cronograma_endividamento").insert(
          leitura.cronograma.map((c) => ({
            data_base: leitura.dataBase,
            periodo: c.periodo,
            ordem: c.ordem,
            valor: c.valor,
            fonte: file.name,
          })),
        );
        if (erroCronograma) throw erroCronograma;
      }

      await Promise.all([posicoes.refetch(), resumos.refetch(), cronogramas.refetch()]);
      toast.success(`Endividamento de ${dataBR(leitura.dataBase)} atualizado com sucesso.`);
      leitura.avisos.forEach((aviso) => toast.warning(aviso));
    } catch (e) {
      const erro = e as { message?: string; details?: string; code?: string };
      toast.error(
        `Não foi possível importar a planilha: ${
          [erro.message, erro.details, erro.code].filter(Boolean).join(" · ") || "erro desconhecido"
        }`,
        { duration: 15000 },
      );
    } finally {
      setImportando(false);
      if (arquivoRef.current) arquivoRef.current.value = "";
    }
  };

  const importarDetalhes = async (file: File | undefined) => {
    if (!file) return;
    setImportandoDetalhes(true);
    try {
      const leitura = await lerArquivo(file, null);
      if (leitura.fonte !== "amortizacoes")
        throw new Error('Selecione a planilha "Amortização de dívidas bancárias".');
      if (leitura.erros.length) throw new Error(leitura.erros.join(" "));
      if (!leitura.dataBase || !leitura.dividas?.length)
        throw new Error('Não foram encontrados os dados da aba "Saldos Atuais".');

      const dataBaseOficial = resumos.data?.at(-1)?.data_base;
      if (!dataBaseOficial)
        throw new Error('Importe primeiro a planilha "Endividamento - Gráficos".');
      if (leitura.dataBase !== dataBaseOficial)
        throw new Error(
          `As planilhas têm datas-base diferentes: ${dataBR(leitura.dataBase)} e ${dataBR(
            dataBaseOficial,
          )}.`,
        );

      const oficiais = (posicoes.data ?? []).filter(
        (p) => p.data_base === dataBaseOficial && p.fonte === "Endividamento mensal",
      );
      if (!oficiais.length)
        throw new Error(
          'Importe novamente a planilha "Endividamento - Gráficos" antes dos detalhes.',
        );

      const detalhes = leitura.dividas.filter((d) => d.tipo !== "acionistas");
      const totalGrupo = (item: LinhaDivida) =>
        detalhes
          .filter((d) =>
            item.tipo === "tributaria"
              ? d.tipo === "tributaria"
              : d.tipo === "bancaria" && chaveCredor(d.credor) === chaveCredor(item.credor),
          )
          .reduce((soma, d) => soma + d.saldoContabil, 0);
      const oficialDoDetalhe = (item: LinhaDivida) =>
        item.tipo === "tributaria"
          ? oficiais.find((p) => p.tipo === "tributaria")
          : oficiais.find(
              (p) => p.tipo === "bancaria" && chaveCredor(p.credor) === chaveCredor(item.credor),
            );

      const enriquecidos = detalhes
        .map((d) => {
          const oficial = oficialDoDetalhe(d);
          const baseGrupo = totalGrupo(d);
          if (!oficial || baseGrupo <= 0) return null;
          const proporcao = d.saldoContabil / baseGrupo;
          return {
            d,
            saldo: Number(oficial.saldo_contabil_aproximado) * proporcao,
            curto: Number(oficial.curto_prazo ?? 0) * proporcao,
            longo: Number(oficial.longo_prazo ?? 0) * proporcao,
          };
        })
        .filter((item): item is NonNullable<typeof item> => !!item);

      if (!enriquecidos.length)
        throw new Error("Os credores das duas planilhas não puderam ser relacionados.");

      const { error } = await supabase.from("posicoes_dividas").upsert(
        enriquecidos.map(({ d, saldo, curto, longo }) => ({
          data_base: dataBaseOficial,
          empresa_id: d.empresa ? (encontrarEmpresa(empresas, d.empresa)?.id ?? null) : null,
          chave_origem: d.chave,
          tipo: d.tipo,
          credor: d.credor,
          modalidade: d.modalidade,
          numero_contrato: d.contrato,
          saldo_contabil_aproximado: saldo,
          indexador: d.indexador,
          taxa: d.taxa,
          vencimento: d.vencimento,
          parcelas_restantes: d.parcelasRestantes,
          safra_1: 0,
          safra_2: 0,
          safra_3: 0,
          outras_safras: 0,
          curto_prazo: curto,
          longo_prazo: longo,
          fonte: "Saldos atuais",
        })),
        { onConflict: "data_base,chave_origem" },
      );
      if (error) throw error;

      const chavesNovas = new Set(enriquecidos.map(({ d }) => d.chave));
      const idsObsoletos = (posicoes.data ?? [])
        .filter(
          (p) =>
            p.data_base === dataBaseOficial &&
            p.fonte === "Saldos atuais" &&
            !chavesNovas.has(p.chave_origem),
        )
        .map((p) => p.id);
      if (idsObsoletos.length) {
        const { error: erroLimpeza } = await supabase
          .from("posicoes_dividas")
          .delete()
          .in("id", idsObsoletos);
        if (erroLimpeza) throw erroLimpeza;
      }

      const { error: erroLimpezaParcelas } = await supabase
        .from("movimentacoes")
        .delete()
        .eq("fonte", "cronograma-amortizacoes");
      if (erroLimpezaParcelas) throw erroLimpezaParcelas;

      if (leitura.movimentos.length) {
        const { error: erroParcelas } = await supabase.from("movimentacoes").insert(
          leitura.movimentos.map((movimento) => ({
            empresa_id: movimento.empresa
              ? (encontrarEmpresa(empresas, movimento.empresa)?.id ?? null)
              : null,
            natureza: "saida" as const,
            categoria: movimento.categoria,
            subcategoria: movimento.subcategoria,
            descricao: movimento.descricao,
            contraparte: movimento.contraparte,
            documento: movimento.documento,
            data_prevista: movimento.data,
            data_vencimento: movimento.data,
            valor_original: movimento.valor,
            valor_liquido: movimento.valor,
            status: "estimado" as const,
            fonte: "cronograma-amortizacoes",
            chave_origem: movimento.chave,
            detalhe: movimento.detalhe,
          })),
        );
        if (erroParcelas) throw erroParcelas;
      }

      await Promise.all([posicoes.refetch(), parcelasCronograma.refetch()]);
      toast.success(`Detalhes contratuais e cronograma de ${dataBR(dataBaseOficial)} atualizados com sucesso.`);
      if (enriquecidos.length < detalhes.length)
        toast.warning(
          `${detalhes.length - enriquecidos.length} contrato(s) não tinham credor correspondente na planilha de saldos.`,
        );
    } catch (e) {
      const erro = e as { message?: string; details?: string; code?: string };
      toast.error(
        `Não foi possível importar os detalhes: ${
          [erro.message, erro.details, erro.code].filter(Boolean).join(" · ") || "erro desconhecido"
        }`,
        { duration: 15000 },
      );
    } finally {
      setImportandoDetalhes(false);
      if (detalhesRef.current) detalhesRef.current.value = "";
    }
  };

  const todas = posicoes.data ?? [];
  const resumoAtual = resumos.data?.at(-1) ?? null;
  const resumoAnterior = resumos.data?.at(-2) ?? null;
  const dataBase = resumoAtual?.data_base ?? todas[0]?.data_base ?? null;
  const atuais = todas.filter((p) => p.data_base === dataBase);
  const atuaisSemFiltro = (posicoes.data ?? []).filter((p) => p.data_base === dataBase);
  const detalhesAtuais = atuais.filter((p) => p.fonte === "Saldos atuais");
  const detalhesSemFiltro = atuaisSemFiltro.filter((p) => p.fonte === "Saldos atuais");
  const oficiaisAtuais = atuais.filter((p) => p.fonte === "Endividamento mensal");
  const agregadoTemDetalhe = (agregado: Posicao) =>
    agregado.tipo === "tributaria"
      ? detalhesSemFiltro.some((p) => p.tipo === "tributaria")
      : detalhesSemFiltro.some(
          (p) => p.tipo === "bancaria" && chaveCredor(p.credor) === chaveCredor(agregado.credor),
        );
  const listaBase: Posicao[] = atuais.length
    ? detalhesAtuais.length
      ? [...detalhesAtuais, ...oficiaisAtuais.filter((p) => !agregadoTemDetalhe(p))]
      : atuais
    : (legados.data ?? [])
        .map((c) => ({
          id: c.id,
          data_base: "",
          empresa_id: c.empresa_id,
          tipo: "bancaria",
          credor: c.instituicao,
          modalidade: c.tipo_operacao,
          numero_contrato: c.numero_contrato,
          saldo_contabil_aproximado: Number(c.saldo_devedor),
          indexador: c.indexador,
          taxa: c.taxa === null ? null : `${c.taxa}%`,
          vencimento: c.data_vencimento,
          parcelas_restantes: null,
          safra_1: 0,
          safra_2: 0,
          safra_3: 0,
          outras_safras: 0,
          curto_prazo: 0,
          longo_prazo: 0,
          fonte: "Contratos cadastrados",
          chave_origem: c.id,
        }));
  // A dívida com acionistas foi encerrada e permanece apenas no histórico do banco.
  const prioridadeTipo: Record<string, number> = { bancaria: 0, tributaria: 1, outras: 2 };
  const lista = listaBase
    .filter((p) => p.tipo !== "acionistas")
    .sort((a, b) => (prioridadeTipo[a.tipo] ?? 99) - (prioridadeTipo[b.tipo] ?? 99));
  const soma = (l: Posicao[]) => l.reduce((a, p) => a + Number(p.saldo_contabil_aproximado), 0);
  const bancaria = resumoAtual?.divida_bancaria ?? soma(lista.filter((p) => p.tipo === "bancaria"));
  const tributaria =
    resumoAtual?.divida_tributaria ?? soma(lista.filter((p) => p.tipo === "tributaria"));
  const total = resumoAtual?.divida_bruta ?? bancaria + tributaria;
  const quotas =
    resumoAtual?.quotas_capital ??
    disponibilidades
      .filter((d) => d.tipo.toLowerCase().includes("quota"))
      .reduce((a, d) => a + Number(d.saldo), 0);
  const disponiveis =
    resumoAtual?.disponibilidades ??
    disponibilidades
      .filter((d) => d.disponivel_resgate && !d.tipo.toLowerCase().includes("quota"))
      .reduce((a, d) => a + Number(d.saldo) - Number(d.valor_bloqueado ?? 0), 0);
  const liquida = resumoAtual?.divida_liquida ?? total - disponiveis - quotas;
  const dividasBancariasComTaxa = lista
    .filter((p) => p.tipo === "bancaria" && Number(p.saldo_contabil_aproximado) > 0)
    .map((p) => ({ ...p, taxaEfetiva: taxaEfetivaAnual(p) }))
    .filter(
      (p): p is Posicao & { taxaEfetiva: number } =>
        p.taxaEfetiva !== null && Number.isFinite(p.taxaEfetiva),
    );
  const saldoBancarioComTaxa = dividasBancariasComTaxa.reduce(
    (soma, p) => soma + Number(p.saldo_contabil_aproximado),
    0,
  );
  const coberturaTaxas = bancaria > 0 ? saldoBancarioComTaxa / bancaria : 0;
  const taxaMediaAnualCalculada = saldoBancarioComTaxa
    ? dividasBancariasComTaxa.reduce(
        (soma, p) => soma + p.taxaEfetiva * Number(p.saldo_contabil_aproximado),
        0,
      ) / saldoBancarioComTaxa
    : null;
  const taxaMediaAnual = coberturaTaxas >= 0.95 ? taxaMediaAnualCalculada : null;
  const taxaMediaMensal =
    taxaMediaAnual === null ? null : Math.pow(1 + taxaMediaAnual, 1 / 12) - 1;
  const indexadoresTaxaMedia = Array.from(
    new Map(
      dividasBancariasComTaxa
        .map((p) => {
          const taxaIndice = taxaIndexadorRegistrada(p);
          return taxaIndice === null || !p.indexador
            ? null
            : [
                p.indexador.toUpperCase(),
                `${p.indexador.toUpperCase()} ${percentual(taxaIndice)} a.a.`,
              ];
        })
        .filter((item): item is [string, string] => item !== null),
    ).values(),
  );
  const curtoPrazo =
    resumoAtual?.curto_prazo ?? lista.reduce((a, p) => a + Number(p.curto_prazo ?? 0), 0);
  const longoPrazo =
    resumoAtual?.longo_prazo ?? lista.reduce((a, p) => a + Number(p.longo_prazo ?? 0), 0);
  const nomeEmpresa = (id: string | null) => empresas.find((e) => e.id === id)?.nome ?? "—";

  const posicoesGrafico = detalhesAtuais.length
    ? lista
    : oficiaisAtuais.length
      ? oficiaisAtuais
      : lista;
  const instituicoes = Object.entries(
    posicoesGrafico
      .filter((p) => p.tipo === "bancaria")
      .reduce<Record<string, { Saldo: number; CurtoPrazo: number; LongoPrazo: number }>>(
        (a, p) => ({
          ...a,
          [p.credor]: {
            Saldo: (a[p.credor]?.Saldo ?? 0) + Number(p.saldo_contabil_aproximado),
            CurtoPrazo: (a[p.credor]?.CurtoPrazo ?? 0) + Number(p.curto_prazo ?? 0),
            LongoPrazo: (a[p.credor]?.LongoPrazo ?? 0) + Number(p.longo_prazo ?? 0),
          },
        }),
        {},
      ),
  )
    .map(([instituicao, valores]) => ({ instituicao, ...valores }))
    .sort((a, b) => b.Saldo - a.Saldo);
  const ano = dataBase ? Number(dataBase.slice(0, 4)) : new Date().getFullYear();
  const cronogramaImportado = (cronogramas.data ?? []).filter((c) => c.data_base === dataBase);
  const cronograma = cronogramaImportado.length
    ? cronogramaImportado
    : [
        [`${ano}/${ano + 1}`, "safra_1"],
        [`${ano + 1}/${ano + 2}`, "safra_2"],
        [`${ano + 2}/${ano + 3}`, "safra_3"],
        ["Outras safras", "outras_safras"],
      ].map(([periodo, campo], ordem) => ({
        data_base: dataBase ?? "",
        periodo,
        ordem,
        valor: lista.reduce((a, p) => a + Number(p[campo as keyof Posicao] ?? 0), 0),
      }));
  const parcelasFuturas = (parcelasCronograma.data ?? []).filter(
    (parcela) => !dataBase || parcela.data_prevista > dataBase,
  );
  const parcelasDoPeriodo = periodoSelecionado
    ? parcelasFuturas.filter((parcela) => {
        const periodo = periodoSafra(parcela.data_prevista);
        if (!periodoSelecionado.endsWith("+")) return periodo === periodoSelecionado;
        const inicioSelecionado = Number(periodoSelecionado.slice(0, 2));
        return Number(periodo.slice(0, 2)) >= inicioSelecionado;
      })
    : [];
  const cronogramaSelecionado = cronograma.find((item) => item.periodo === periodoSelecionado);
  const valorDetalhe = (parcela: ParcelaAmortizacao, campo: string) => {
    const valor = parcela.detalhe?.[campo];
    return typeof valor === "number" ? valor : Number(valor ?? 0);
  };
  const totalAmortizacaoPeriodo = parcelasDoPeriodo.reduce(
    (soma, parcela) => soma + valorDetalhe(parcela, "Amortização"),
    0,
  );
  const abrirDetalheCronograma = (entrada: unknown) => {
    const item = entrada as { periodo?: string; payload?: { periodo?: string } };
    const periodo = item.periodo ?? item.payload?.periodo;
    if (periodo) setPeriodoSelecionado(periodo);
  };
  const variacaoLiquida =
    resumoAnterior && Number(resumoAnterior.divida_liquida) !== 0
      ? (liquida / Number(resumoAnterior.divida_liquida) - 1) * 100
      : null;
  const comparacaoAnual = resumoAnterior
    ? [
        {
          categoria: "Dívida bruta",
          Anterior: Number(resumoAnterior.divida_bruta),
          Atual: Number(total),
        },
        {
          categoria: "Bancária",
          Anterior: Number(resumoAnterior.divida_bancaria),
          Atual: Number(bancaria),
        },
        {
          categoria: "Tributária",
          Anterior: Number(resumoAnterior.divida_tributaria),
          Atual: Number(tributaria),
        },
        {
          categoria: "Dívida líquida",
          Anterior: Number(resumoAnterior.divida_liquida),
          Atual: Number(liquida),
        },
      ]
    : [];
  const cascataEndividamento = [
    {
      etapa: "Bancária",
      base: 0,
      aumento: Number(bancaria),
      reducao: 0,
      total: 0,
    },
    {
      etapa: "Tributária",
      base: Number(bancaria),
      aumento: Number(tributaria),
      reducao: 0,
      total: 0,
    },
    {
      etapa: "Caixa",
      base: Math.max(Number(total) - Number(disponiveis), 0),
      aumento: 0,
      reducao: Number(disponiveis),
      total: 0,
    },
    {
      etapa: "Quotas",
      base: Math.max(Number(liquida), 0),
      aumento: 0,
      reducao: Number(quotas),
      total: 0,
    },
    {
      etapa: "Dívida líquida",
      base: 0,
      aumento: 0,
      reducao: 0,
      total: Number(liquida),
    },
  ];
  const secoesAbertura = [
    {
      titulo: "Dívidas bancárias",
      dados: lista.filter((p) => p.tipo === "bancaria"),
      mensagemVazia: "Nenhuma dívida bancária encontrada para esta data-base.",
    },
    {
      titulo: "Dívidas tributárias",
      dados: lista.filter((p) => p.tipo === "tributaria"),
      mensagemVazia: "Nenhuma dívida tributária encontrada para esta data-base.",
    },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Dívidas e operações</h1>
          <p className="text-sm text-muted-foreground">
            Posição mensal consolidada{dataBase ? ` em ${dataBR(dataBase)}` : ""}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {podeEditar && (
            <>
              <input
                ref={arquivoRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => importarEndividamento(e.target.files?.[0])}
              />
              <input
                ref={detalhesRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => importarDetalhes(e.target.files?.[0])}
              />
              <Button
                size="sm"
                disabled={importando || importandoDetalhes}
                onClick={() => arquivoRef.current?.click()}
              >
                {importando ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-1.5 h-4 w-4" />
                )}
                Importar saldos
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={importando || importandoDetalhes}
                onClick={() => detalhesRef.current?.click()}
              >
                {importandoDetalhes ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-1.5 h-4 w-4" />
                )}
                Importar detalhes
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportarExcel(
                lista.map((p) => ({
                  Tipo: rotuloTipo(p.tipo),
                  Empresa: nomeEmpresa(p.empresa_id),
                  Credor: p.credor,
                  Modalidade: p.modalidade,
                  Contrato: p.numero_contrato,
                  "Saldo contábil aproximado": Number(p.saldo_contabil_aproximado),
                  "Curto prazo": Number(p.curto_prazo ?? 0),
                  "Longo prazo": Number(p.longo_prazo ?? 0),
                  Taxa: [p.indexador, p.taxa].filter(Boolean).join(" · "),
                  Vencimento: dataBR(p.vencimento),
                })),
                "dividas-operacoes",
              )
            }
          >
            <Download className="mr-1.5 h-4 w-4" /> Excel
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi titulo="Dívida total bruta" valor={brl(total, true)} tom="negativo" />
        <Kpi titulo="Dívida bancária" valor={brl(bancaria, true)} tom="negativo" />
        <Kpi titulo="Dívida tributária" valor={brl(tributaria, true)} tom="alerta" />
        <Kpi titulo="Dívida líquida" valor={brl(liquida, true)} tom="negativo" />
      </div>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Custo médio do endividamento bancário</CardTitle>
          <CardDescription>
            Média ponderada pelo saldo devedor na data-base
            {dataBase ? ` de ${dataBR(dataBase)}` : ""}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <Kpi
              titulo="Taxa média anual"
              valor={taxaMediaAnual === null ? "—" : `${percentual(taxaMediaAnual)} a.a.`}
              tom="alerta"
            />
            <Kpi
              titulo="Taxa média mensal equivalente"
              valor={taxaMediaMensal === null ? "—" : `${percentual(taxaMediaMensal)} a.m.`}
              tom="positivo"
            />
          </div>
          {taxaMediaAnual === null ? (
            <div className="mt-4 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Reimporte os detalhes da amortização para registrar os indexadores da data-base e
                calcular a taxa média com cobertura mínima de 95% da dívida bancária.
              </p>
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                Taxa mensal calculada por equivalência composta, não pela divisão da taxa anual por 12.
              </span>
              {!!indexadoresTaxaMedia.length && (
                <span>Indexadores utilizados: {indexadoresTaxaMedia.join(" · ")}</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      {posicoes.isError && (
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Os saldos contábeis ainda não puderam ser consultados.</p>
            <p className="mt-1 text-xs">
              A visão permanece disponível com os contratos já cadastrados. Tente novamente após a
              atualização do banco ou importe novamente a planilha mensal de endividamento.
            </p>
          </div>
        </div>
      )}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Resumo do endividamento</CardTitle>
          <CardDescription>Composição da dívida líquida consolidada.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Kpi titulo="Dívida bruta" valor={brl(Number(total), true)} tom="negativo" />
            <Kpi
              titulo="(-) Disponibilidades"
              valor={brl(Number(disponiveis), true)}
              tom="positivo"
            />
            <Kpi
              titulo="(-) Quotas de capital"
              valor={brl(Number(quotas), true)}
              tom="positivo"
            />
            <Kpi titulo="Dívida líquida" valor={brl(Number(liquida), true)} tom="negativo" />
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.4fr)]">
            <div className="overflow-hidden rounded-lg border">
              <div className="grid grid-cols-[1fr_auto] gap-4 border-b bg-muted/60 px-4 py-3 text-xs font-semibold">
                <span>Componente</span>
                <span>Saldo devedor</span>
              </div>
              {[
                ["Dívida bancária", bancaria, false],
                ["Dívida tributária (parcelamentos)", tributaria, false],
                ["Endividamento bruto total", total, false],
                ["(-) Disponível de caixa", disponiveis, true],
                ["(-) Quotas de capital", quotas, true],
                ["Dívida líquida total", liquida, false],
              ].map(([rotulo, valor, deducao], indice) => (
                <div
                  key={String(rotulo)}
                  className={`grid grid-cols-[1fr_auto] gap-4 px-4 py-3 text-sm ${
                    indice === 2
                      ? "bg-orange-50 font-semibold text-orange-950"
                      : indice === 5
                        ? "bg-[#0b4228] font-semibold text-white"
                        : "border-b last:border-0"
                  }`}
                >
                  <span>{String(rotulo)}</span>
                  <span className="text-right tabular-nums">
                    {deducao ? `(${brl(Number(valor))})` : brl(Number(valor))}
                  </span>
                </div>
              ))}
            </div>

            <div className="h-80 min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cascataEndividamento} margin={{ top: 20, right: 12, left: 8, bottom: 18 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="etapa" interval={0} tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => brl(Number(v), true)} />
                  <Tooltip formatter={(v) => brl(Number(v))} />
                  <Bar
                    dataKey="base"
                    name="Base"
                    stackId="cascata"
                    fill="transparent"
                    legendType="none"
                    tooltipType="none"
                  />
                  <Bar dataKey="aumento" name="Acréscimo" stackId="cascata" fill="#1f6b57" />
                  <Bar dataKey="reducao" name="Redução" stackId="cascata" fill="#ee7d24" />
                  <Bar dataKey="total" name="Dívida líquida" stackId="cascata" fill="#0b4228" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Perfil da dívida</CardTitle>
            <CardDescription>Distribuição entre curto e longo prazo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              ["Curto prazo", curtoPrazo, total ? (curtoPrazo / total) * 100 : 0],
              ["Longo prazo", longoPrazo, total ? (longoPrazo / total) * 100 : 0],
            ].map(([rotulo, valor, percentual]) => (
              <div key={String(rotulo)}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>{rotulo}</span>
                  <span className="font-semibold">
                    {brl(Number(valor), true)} · {Number(percentual).toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.min(100, Number(percentual))}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Comparação anual</CardTitle>
            <CardDescription>
              {resumoAnterior
                ? `${dataBR(resumoAnterior.data_base)} comparado a ${dataBR(dataBase)}`
                : "Será exibida após a importação de dois períodos."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Dívida líquida anterior</p>
                <p className="mt-1 font-semibold">
                  {resumoAnterior ? brl(Number(resumoAnterior.divida_liquida), true) : "—"}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Variação</p>
                <p className="mt-1 font-semibold">
                  {variacaoLiquida === null
                    ? "—"
                    : `${variacaoLiquida >= 0 ? "+" : ""}${variacaoLiquida.toFixed(1)}%`}
                </p>
              </div>
            </div>
            {resumoAnterior && (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={comparacaoAnual}
                    layout="vertical"
                    margin={{ top: 8, right: 12, left: 8, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => brl(Number(v), true)} />
                    <YAxis type="category" dataKey="categoria" width={92} />
                    <Tooltip formatter={(v) => brl(Number(v))} />
                    <Legend />
                    <Bar dataKey="Anterior" fill="#ee7d24" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="Atual" fill="#1f6b57" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cronograma por safra</CardTitle>
            <CardDescription>Provisão; não altera o saldo contábil.</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cronograma}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="periodo" />
                <YAxis tickFormatter={(v) => brl(Number(v), true)} />
                <Tooltip formatter={(v) => brl(Number(v))} />
                <Bar
                  dataKey="valor"
                  name="Amortização"
                  fill="#ee7d24"
                  className="cursor-pointer"
                  onClick={abrirDetalheCronograma}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      <Dialog
        open={!!periodoSelecionado}
        onOpenChange={(aberto) => !aberto && setPeriodoSelecionado(null)}
      >
        <DialogContent className="max-h-[88vh] max-w-6xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>Amortizações da safra {periodoSelecionado}</DialogTitle>
            <DialogDescription>
              {parcelasDoPeriodo.length} {parcelasDoPeriodo.length === 1 ? "parcela" : "parcelas"} ·
              Amortização detalhada {brl(totalAmortizacaoPeriodo)} · Total consolidado do gráfico{" "}
              {cronogramaSelecionado ? brl(Number(cronogramaSelecionado.valor)) : "—"}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[65vh] overflow-auto rounded-md border">
            <table className="w-full min-w-[1050px] text-sm">
              <thead className="sticky top-0 bg-muted">
                <tr className="text-left">
                  <th className="p-2 font-medium">Vencimento</th>
                  <th className="p-2 font-medium">Empresa</th>
                  <th className="p-2 font-medium">Credor</th>
                  <th className="p-2 font-medium">Contrato</th>
                  <th className="p-2 font-medium">Evento</th>
                  <th className="p-2 text-right font-medium">Juros</th>
                  <th className="p-2 text-right font-medium">Amortização</th>
                  <th className="p-2 text-right font-medium">Pagamento total</th>
                </tr>
              </thead>
              <tbody>
                {parcelasDoPeriodo.map((parcela) => (
                  <tr key={parcela.id} className="border-t">
                    <td className="p-2">{dataBR(parcela.data_prevista)}</td>
                    <td className="p-2">{nomeEmpresa(parcela.empresa_id)}</td>
                    <td className="p-2">{parcela.contraparte ?? "—"}</td>
                    <td className="p-2">{parcela.documento ?? "—"}</td>
                    <td className="p-2">{parcela.descricao ?? "—"}</td>
                    <td className="num p-2 text-right">
                      {brl(valorDetalhe(parcela, "Juros / remuneração"))}
                    </td>
                    <td className="num p-2 text-right text-orange-700">
                      {brl(valorDetalhe(parcela, "Amortização"))}
                    </td>
                    <td className="num p-2 text-right font-semibold text-destructive">
                      {brl(Number(parcela.valor_liquido))}
                    </td>
                  </tr>
                ))}
                {!parcelasDoPeriodo.length && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      Reimporte a planilha de detalhes para carregar as parcelas desta safra.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            A barra mantém o total consolidado da planilha “Endividamento - Gráficos”. A listagem
            utiliza as parcelas da aba “Cronograma Cronológico” da planilha de amortização.
          </p>
        </DialogContent>
      </Dialog>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Endividamento bancário por instituição</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={instituicoes} layout="vertical" margin={{ left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(v) => brl(Number(v), true)} />
              <YAxis type="category" dataKey="instituicao" width={150} />
              <Tooltip formatter={(v) => brl(Number(v))} />
              <Legend />
              <Bar dataKey="CurtoPrazo" name="Curto prazo" stackId="prazo" fill="#ee7d24" />
              <Bar dataKey="LongoPrazo" name="Longo prazo" stackId="prazo" fill="#1f6b57" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <div className="mt-6 space-y-6">
        {secoesAbertura.map(({ titulo, dados, mensagemVazia }) => (
          <Card key={titulo} className="overflow-hidden p-0">
            <div className="border-b p-4">
              <p className="font-semibold">{titulo}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {dados.length} {dados.length === 1 ? "operação" : "operações"} na data-base atual.
              </p>
            </div>
            <div className="max-h-[60vh] overflow-auto">
              <table className="w-full min-w-[1500px] text-sm">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    {[
                      "Tipo",
                      "Empresa",
                      "Credor",
                      "Modalidade / objeto",
                      "Saldo contábil",
                      "Curto prazo",
                      "Longo prazo",
                      "% da dívida",
                      "Indexador / taxa",
                      "Parcelas",
                      "Vencimento",
                    ].map((h) => (
                      <th key={h} className="p-2 text-left font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dados.map((p) => (
                    <tr key={p.id} className="border-t">
                      <td className="p-2">
                        <Badge variant="outline">{rotuloTipo(p.tipo)}</Badge>
                      </td>
                      <td className="p-2">{nomeEmpresa(p.empresa_id)}</td>
                      <td className="p-2 font-medium">{p.credor}</td>
                      <td className="p-2">{p.modalidade ?? "—"}</td>
                      <td className="num p-2 text-right text-destructive">
                        {brl(Number(p.saldo_contabil_aproximado))}
                      </td>
                      <td className="num p-2 text-right">{brl(Number(p.curto_prazo ?? 0))}</td>
                      <td className="num p-2 text-right">{brl(Number(p.longo_prazo ?? 0))}</td>
                      <td className="num p-2 text-right">
                        {total
                          ? `${((Number(p.saldo_contabil_aproximado) / total) * 100).toFixed(1)}%`
                          : "—"}
                      </td>
                      <td className="p-2">
                        {[p.indexador, taxaContratualExibicao(p.taxa)].filter(Boolean).join(" · ") || "—"}
                      </td>
                      <td className="num p-2 text-right">
                        {p.parcelas_restantes === null ? "—" : num(p.parcelas_restantes)}
                      </td>
                      <td className="p-2">{dataBR(p.vencimento)}</td>
                    </tr>
                  ))}
                  {!dados.length && (
                    <tr>
                      <td colSpan={11} className="p-8 text-center text-muted-foreground">
                        {mensagemVazia}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
