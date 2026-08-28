import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";
import { FiltrosBar } from "@/components/FiltrosBar";
import { Kpi } from "@/components/Kpi";
import { DetalheMovimentacoes } from "@/components/DetalheMovimentacoes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { brl, dataBR, inicioSemana, iso, pct } from "@/lib/format";
import { useFluxo } from "@/lib/dados";
import type { Movimentacao } from "@/lib/fluxo";
import { CATEGORIAS_AMORTIZACAO } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Visão Executiva | Fluxo de Caixa Semanal – Grupo Otávio Lage" },
      {
        name: "description",
        content:
          "Painel executivo do fluxo de caixa semanal do Grupo Otávio Lage: saldos, entradas, saídas, amortizações e projeção por semana.",
      },
      { property: "og:title", content: "Visão Executiva | Fluxo de Caixa Semanal" },
      {
        property: "og:description",
        content: "Projeção semanal de caixa consolidada por empresa, cenário e versão.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VisaoExecutiva,
});

const CORES = ["#1f2d4a", "#2f7d55", "#b03a2e", "#c98a1e", "#3a6ea5", "#6b7f9e", "#7d5ba6", "#3e8e8e"];

function VisaoExecutiva() {
  const { fluxo, cenario, disponibilidades, movimentacoes, empresas, carregando } = useFluxo();
  const [detalhe, setDetalhe] = useState<{ titulo: string; movs: Movimentacao[] } | null>(null);

  const contas = disponibilidades.filter((d) => d.tipo === "conta_corrente");
  const aplicacoes = disponibilidades.filter((d) => d.tipo === "aplicacao");
  const totalContas = contas.reduce((a, d) => a + Number(d.saldo), 0);
  const totalAplicacoes = aplicacoes.reduce((a, d) => a + Number(d.saldo), 0);
  const liquidezImediata = disponibilidades
    .filter((d) => d.liquidez === "imediata")
    .reduce((a, d) => a + Number(d.saldo), 0);
  const naoConfirmados = movimentacoes
    .filter((m) => m.status === "pendente" || m.status === "estimado")
    .reduce((a, m) => a + Number(m.valor_liquido), 0);

  const saldoMinimo = cenario?.saldo_minimo ?? 0;

  const dadosSemanais = fluxo.semanas.map((s, i) => ({
    semana: s.rotulo,
    "Saldo inicial": Math.round(fluxo.resultados[i]?.saldoInicial ?? 0),
    Entradas: Math.round(fluxo.resultados[i]?.entradas ?? 0),
    Saídas: Math.round(fluxo.resultados[i]?.saidas ?? 0),
    "Saldo final": Math.round(fluxo.resultados[i]?.saldoFinal ?? 0),
  }));

  const composicao = (grupo: "entradas" | "pagamentos") =>
    fluxo.linhas
      .filter((l) => l.grupo === grupo)
      .map((l) => ({ name: l.categoria, value: Math.round(l.total) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

  const maioresCompromissos = useMemo(
    () =>
      [...movimentacoes]
        .filter((m) => m.natureza === "saida")
        .sort((a, b) => Number(b.valor_liquido) - Number(a.valor_liquido))
        .slice(0, 8),
    [movimentacoes],
  );

  const semanasAlerta = fluxo.resultados
    .map((r, i) => ({ r, s: fluxo.semanas[i]! }))
    .filter((x) => x.r.saldoFinal < saldoMinimo);

  const abrirSemana = (indice: number) => {
    const s = fluxo.semanas[indice];
    if (!s) return;
    setDetalhe({
      titulo: `Movimentações da semana ${s.rotulo}`,
      movs: movimentacoes.filter((m) => iso(inicioSemana(m.data_prevista)) === s.chave),
    });
  };

  const abrirCategoria = (categoria: string) =>
    setDetalhe({
      titulo: `Composição — ${categoria}`,
      movs: movimentacoes.filter((m) => m.categoria === categoria),
    });

  if (carregando) return <p className="text-sm text-muted-foreground">Carregando dados do fluxo…</p>;

  return (
    <div>
      <FiltrosBar />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-6">
        <Kpi titulo="Saldo disponível inicial" valor={brl(fluxo.saldoInicial, true)} detalhe="Contas + aplicações" />
        <Kpi titulo="Contas bancárias" valor={brl(totalContas, true)} detalhe={`${contas.length} contas`} />
        <Kpi titulo="Aplicações" valor={brl(totalAplicacoes, true)} detalhe={`${aplicacoes.length} aplicações`} />
        <Kpi
          titulo="Entradas projetadas"
          valor={brl(fluxo.totalEntradas, true)}
          tom="positivo"
          icone={<TrendingUp className="h-4 w-4 text-success" />}
        />
        <Kpi
          titulo="Saídas projetadas"
          valor={brl(fluxo.totalSaidas, true)}
          tom="negativo"
          icone={<TrendingDown className="h-4 w-4 text-destructive" />}
        />
        <Kpi titulo="Amortizações" valor={brl(fluxo.totalAmortizacoes, true)} tom="negativo" />
        <Kpi
          titulo="Geração líquida de caixa"
          valor={brl(fluxo.totalEntradas - fluxo.totalSaidas, true)}
          tom={fluxo.totalEntradas - fluxo.totalSaidas >= 0 ? "positivo" : "negativo"}
        />
        <Kpi
          titulo="Saldo final projetado"
          valor={brl(fluxo.saldoFinal, true)}
          tom={fluxo.saldoFinal >= saldoMinimo ? "positivo" : "negativo"}
        />
        <Kpi
          titulo="Menor saldo projetado"
          valor={brl(fluxo.menorSaldo, true)}
          tom={fluxo.menorSaldo >= saldoMinimo ? "neutro" : "negativo"}
          onClick={() => abrirSemana(fluxo.semanaMenorSaldo?.indice ?? 0)}
        />
        <Kpi
          titulo="Semana de menor saldo"
          valor={fluxo.semanaMenorSaldo?.rotulo ?? "—"}
          detalhe={fluxo.semanaMenorSaldo ? dataBR(fluxo.semanaMenorSaldo.inicio) : ""}
          onClick={() => abrirSemana(fluxo.semanaMenorSaldo?.indice ?? 0)}
        />
        <Kpi
          titulo="Necessidade máxima de caixa"
          valor={brl(fluxo.necessidadeMaxima, true)}
          tom={fluxo.necessidadeMaxima > 0 ? "negativo" : "positivo"}
        />
        <Kpi titulo="Liquidez imediata" valor={brl(liquidezImediata, true)} detalhe="Disponível para resgate" />
        <Kpi titulo="Valores não confirmados" valor={brl(naoConfirmados, true)} tom="alerta" detalhe="Estimados + pendentes" />
      </div>

      {semanasAlerta.length > 0 && (
        <Card className="mt-6 border-warning/60 bg-warning/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-warning" />
            <div>
              <p className="text-sm font-medium">
                {semanasAlerta.length} semana(s) com saldo abaixo do mínimo de {brl(saldoMinimo)}
              </p>
              <p className="text-xs text-muted-foreground">
                {semanasAlerta
                  .slice(0, 6)
                  .map((x) => `${x.s.rotulo} (${brl(x.r.saldoFinal, true)})`)
                  .join(" · ")}
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Evolução semanal do caixa</CardTitle>
            <CardDescription>Saldo inicial, entradas, saídas e saldo final por semana</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={dadosSemanais}
                onClick={(e) => typeof e?.activeTooltipIndex === "number" && abrirSemana(e.activeTooltipIndex)}
              >
                <defs>
                  <linearGradient id="gSaldo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1f2d4a" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#1f2d4a" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6e9ef" />
                <XAxis dataKey="semana" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => brl(Number(v), true)} width={80} />
                <Tooltip formatter={(v) => brl(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="Saldo final" stroke="#1f2d4a" fill="url(#gSaldo)" strokeWidth={2} />
                <Line type="monotone" dataKey="Entradas" stroke="#2f7d55" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="Saídas" stroke="#b03a2e" dot={false} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Entradas x Saídas por semana</CardTitle>
            <CardDescription>Clique para abrir o detalhamento</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dadosSemanais}
                onClick={(e) => typeof e?.activeTooltipIndex === "number" && abrirSemana(e.activeTooltipIndex)}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e6e9ef" />
                <XAxis dataKey="semana" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => brl(Number(v), true)} width={70} />
                <Tooltip formatter={(v) => brl(Number(v))} />
                <Bar dataKey="Entradas" fill="#2f7d55" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Saídas" fill="#b03a2e" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Composição das receitas</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={composicao("entradas")}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={95}
                  onClick={(d: { name?: string }) => d?.name && abrirCategoria(d.name)}
                >
                  {composicao("entradas").map((_, i) => (
                    <Cell key={i} fill={CORES[i % CORES.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => brl(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Composição dos pagamentos</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={composicao("pagamentos")}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={95}
                  onClick={(d: { name?: string }) => d?.name && abrirCategoria(d.name)}
                >
                  {composicao("pagamentos").map((_, i) => (
                    <Cell key={i} fill={CORES[(i + 2) % CORES.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => brl(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Maiores compromissos do período</CardTitle>
            <CardDescription>Top 8 pagamentos previstos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {maioresCompromissos.map((m) => (
              <button
                key={m.id}
                onClick={() => abrirCategoria(m.categoria)}
                className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm hover:bg-muted"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{m.categoria}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {m.contraparte} · {dataBR(m.data_prevista)}
                  </span>
                </span>
                <span className="num shrink-0 text-destructive">{brl(Number(m.valor_liquido), true)}</span>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs uppercase text-muted-foreground">Semana mais crítica</p>
          <p className="mt-1 text-lg font-semibold">{fluxo.semanaMenorSaldo?.rotulo ?? "—"}</p>
          <p className="text-sm text-destructive">{brl(fluxo.menorSaldo)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-muted-foreground">Concentração de pagamentos</p>
          <p className="mt-1 text-lg font-semibold">{fluxo.semanaMaiorPagamento?.rotulo ?? "—"}</p>
          <p className="text-sm text-muted-foreground">
            {fluxo.totalSaidas > 0
              ? pct(
                  (fluxo.resultados[fluxo.semanaMaiorPagamento?.indice ?? 0]?.saidas ?? 0) / fluxo.totalSaidas,
                )
              : "0%"}{" "}
            das saídas do período
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-muted-foreground">Peso das amortizações</p>
          <p className="mt-1 text-lg font-semibold">
            {fluxo.totalSaidas > 0 ? pct(fluxo.totalAmortizacoes / fluxo.totalSaidas) : "0%"}
          </p>
          <p className="text-sm text-muted-foreground">
            {CATEGORIAS_AMORTIZACAO.length} instituições monitoradas
          </p>
        </Card>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        <Badge variant="outline" className="mr-2 border-warning text-warning">
          Demonstração
        </Badge>
        Base carregada com dados fictícios para conferência das telas.
      </p>

      <DetalheMovimentacoes
        aberto={!!detalhe}
        aoFechar={() => setDetalhe(null)}
        titulo={detalhe?.titulo ?? ""}
        movimentacoes={detalhe?.movs ?? []}
        empresas={empresas}
      />
    </div>
  );
}
