import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, Download, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { FiltrosBar } from "@/components/FiltrosBar";
import { Kpi } from "@/components/Kpi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useFluxo } from "@/lib/dados";
import { brl, dataBR, num } from "@/lib/format";
import { exportarExcel } from "@/lib/exportar";
import { lerEndividamentoMensal } from "@/lib/planilhas";
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

const rotuloTipo = (tipo: string) =>
  tipo === "tributaria"
    ? "Tributária"
    : tipo === "acionistas"
      ? "Acionistas"
      : tipo === "bancaria"
        ? "Bancária"
        : "Outras";

function Dividas() {
  const { podeEditar } = useAuth();
  const arquivoRef = useRef<HTMLInputElement>(null);
  const [importando, setImportando] = useState(false);
  const { empresas, empresasFiltradas, disponibilidades } = useFluxo();
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

  const ids = new Set(empresasFiltradas.map((e) => e.id));
  const todas = (posicoes.data ?? []).filter((p) => !p.empresa_id || ids.has(p.empresa_id));
  const resumoAtual = resumos.data?.at(-1) ?? null;
  const resumoAnterior = resumos.data?.at(-2) ?? null;
  const dataBase = resumoAtual?.data_base ?? todas[0]?.data_base ?? null;
  const atuais = todas.filter((p) => p.data_base === dataBase);
  const listaBase: Posicao[] = atuais.length
    ? atuais
    : (legados.data ?? [])
        .filter((c) => !c.empresa_id || ids.has(c.empresa_id))
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
        }));
  // A dívida com acionistas foi encerrada e permanece apenas no histórico do banco.
  const lista = listaBase.filter((p) => p.tipo !== "acionistas");
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
  const curtoPrazo =
    resumoAtual?.curto_prazo ?? lista.reduce((a, p) => a + Number(p.curto_prazo ?? 0), 0);
  const longoPrazo =
    resumoAtual?.longo_prazo ?? lista.reduce((a, p) => a + Number(p.longo_prazo ?? 0), 0);
  const nomeEmpresa = (id: string | null) => empresas.find((e) => e.id === id)?.nome ?? "—";

  const instituicoes = Object.entries(
    lista
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
  const historico = resumos.data?.length
    ? resumos.data.map((r) => ({
        data: r.data_base,
        rotulo: dataBR(r.data_base),
        bruta: Number(r.divida_bruta),
        liquida: Number(r.divida_liquida),
      }))
    : Object.entries(
        todas.reduce<Record<string, number>>(
          (a, p) => ({
            ...a,
            [p.data_base]: (a[p.data_base] ?? 0) + Number(p.saldo_contabil_aproximado),
          }),
          {},
        ),
      )
        .map(([data, valor]) => ({ data, rotulo: dataBR(data), bruta: valor, liquida: valor }))
        .sort((a, b) => a.data.localeCompare(b.data));
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
  const variacaoLiquida =
    resumoAnterior && Number(resumoAnterior.divida_liquida) !== 0
      ? (liquida / Number(resumoAnterior.divida_liquida) - 1) * 100
      : null;

  return (
    <div>
      <FiltrosBar />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Dívidas e operações</h1>
          <p className="text-sm text-muted-foreground">
            Posição mensal consolidada{dataBase ? ` em ${dataBR(dataBase)}` : ""}. Importe a
            planilha “Endividamento - Gráficos” para atualizar a visão.
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
              <Button size="sm" disabled={importando} onClick={() => arquivoRef.current?.click()}>
                {importando ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-1.5 h-4 w-4" />
                )}
                Importar mês
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
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Dívida bruta", total],
            ["(-) Disponibilidades", disponiveis],
            ["(-) Quotas de capital", quotas],
            ["Dívida líquida", liquida],
          ].map(([r, v]) => (
            <div key={String(r)} className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">{r}</p>
              <p className="font-semibold">{brl(Number(v))}</p>
            </div>
          ))}
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
          <CardContent className="grid grid-cols-2 gap-4">
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
          </CardContent>
        </Card>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evolução da dívida bruta</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historico}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="rotulo" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => brl(Number(v), true)} />
                <Tooltip formatter={(v) => brl(Number(v))} />
                <Legend />
                <Line dataKey="bruta" name="Dívida bruta" stroke="#ee7d24" strokeWidth={3} />
                <Line dataKey="liquida" name="Dívida líquida" stroke="#1f6b57" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
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
                <Bar dataKey="valor" name="Amortização" fill="#ee7d24" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
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
      <Card className="mt-6 overflow-hidden p-0">
        <div className="border-b p-4">
          <p className="font-semibold">Abertura das dívidas e operações</p>
          <p className="text-xs text-muted-foreground">
            Saldo oficial da coluna “Saldo contábil aproximado”, aba “Saldos atuais”.
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
              {lista.map((p) => (
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
                    {[p.indexador, p.taxa].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className="num p-2 text-right">
                    {p.parcelas_restantes === null ? "—" : num(p.parcelas_restantes)}
                  </td>
                  <td className="p-2">{dataBR(p.vencimento)}</td>
                </tr>
              ))}
              {!lista.length && (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-muted-foreground">
                    Importe a planilha mensal de endividamento.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
