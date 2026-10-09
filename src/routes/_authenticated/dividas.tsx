import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download } from "lucide-react";
import { FiltrosBar } from "@/components/FiltrosBar";
import { Kpi } from "@/components/Kpi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useFluxo } from "@/lib/dados";
import { brl, dataBR, num } from "@/lib/format";
import { exportarExcel } from "@/lib/exportar";

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
};

const rotuloTipo = (tipo: string) =>
  tipo === "tributaria"
    ? "Tributária"
    : tipo === "acionistas"
      ? "Acionistas"
      : tipo === "bancaria"
        ? "Bancária"
        : "Outras";

function Dividas() {
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
        if (error) throw error;
        const pagina = (data ?? []) as Posicao[];
        todas.push(...pagina);
        if (pagina.length < 1000) break;
      }
      return todas;
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

  const ids = new Set(empresasFiltradas.map((e) => e.id));
  const todas = (posicoes.data ?? []).filter((p) => !p.empresa_id || ids.has(p.empresa_id));
  const dataBase = todas[0]?.data_base ?? null;
  const atuais = todas.filter((p) => p.data_base === dataBase);
  const lista: Posicao[] = atuais.length
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
        }));
  const soma = (l: Posicao[]) => l.reduce((a, p) => a + Number(p.saldo_contabil_aproximado), 0);
  const total = soma(lista),
    bancaria = soma(lista.filter((p) => p.tipo === "bancaria"));
  const tributaria = soma(lista.filter((p) => p.tipo === "tributaria"));
  const acionistas = soma(lista.filter((p) => p.tipo === "acionistas"));
  const quotas = disponibilidades
    .filter((d) => d.tipo.toLowerCase().includes("quota"))
    .reduce((a, d) => a + Number(d.saldo), 0);
  const disponiveis = disponibilidades
    .filter((d) => d.disponivel_resgate && !d.tipo.toLowerCase().includes("quota"))
    .reduce((a, d) => a + Number(d.saldo) - Number(d.valor_bloqueado ?? 0), 0);
  const liquida = total - disponiveis - quotas;
  const nomeEmpresa = (id: string | null) => empresas.find((e) => e.id === id)?.nome ?? "—";

  const instituicoes = Object.entries(
    lista
      .filter((p) => p.tipo === "bancaria")
      .reduce<Record<string, number>>(
        (a, p) => ({ ...a, [p.credor]: (a[p.credor] ?? 0) + Number(p.saldo_contabil_aproximado) }),
        {},
      ),
  )
    .map(([instituicao, Saldo]) => ({ instituicao, Saldo }))
    .sort((a, b) => b.Saldo - a.Saldo);
  const historico = Object.entries(
    todas.reduce<Record<string, number>>(
      (a, p) => ({
        ...a,
        [p.data_base]: (a[p.data_base] ?? 0) + Number(p.saldo_contabil_aproximado),
      }),
      {},
    ),
  )
    .map(([data, valor]) => ({ data, rotulo: dataBR(data), valor }))
    .sort((a, b) => a.data.localeCompare(b.data));
  const ano = dataBase ? Number(dataBase.slice(0, 4)) : new Date().getFullYear();
  const cronograma = [
    [`${ano}/${ano + 1}`, "safra_1"],
    [`${ano + 1}/${ano + 2}`, "safra_2"],
    [`${ano + 2}/${ano + 3}`, "safra_3"],
    ["Outras safras", "outras_safras"],
  ].map(([periodo, campo]) => ({
    periodo,
    valor: lista.reduce((a, p) => a + Number(p[campo as keyof Posicao] ?? 0), 0),
  }));

  return (
    <div>
      <FiltrosBar />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Dívidas e operações</h1>
          <p className="text-sm text-muted-foreground">
            Saldos contábeis oficiais{dataBase ? ` em ${dataBR(dataBase)}` : ""}; o cronograma é
            utilizado somente como provisão.
          </p>
        </div>
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
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Kpi titulo="Dívida total bruta" valor={brl(total, true)} tom="negativo" />
        <Kpi titulo="Dívida bancária" valor={brl(bancaria, true)} tom="negativo" />
        <Kpi titulo="Dívida tributária" valor={brl(tributaria, true)} tom="alerta" />
        <Kpi titulo="Dívida com acionistas" valor={brl(acionistas, true)} />
        <Kpi titulo="Dívida líquida" valor={brl(liquida, true)} tom="negativo" />
      </div>
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
                <Line dataKey="valor" name="Dívida bruta" stroke="#1f6b57" strokeWidth={3} />
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
              <Bar dataKey="Saldo" fill="#1f6b57" />
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
          <table className="w-full min-w-[1200px] text-sm">
            <thead className="sticky top-0 bg-muted">
              <tr>
                {[
                  "Tipo",
                  "Empresa",
                  "Credor",
                  "Modalidade / objeto",
                  "Saldo contábil",
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
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    Importe a planilha com a aba “Saldos atuais”.
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
