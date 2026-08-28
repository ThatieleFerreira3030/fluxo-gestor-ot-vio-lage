import { createFileRoute } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FiltrosBar } from "@/components/FiltrosBar";
import { Kpi } from "@/components/Kpi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFluxo } from "@/lib/dados";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/modo-diretoria")({
  head: () => ({
    meta: [
      { title: "Modo Diretoria | Grupo Otávio Lage" },
      {
        name: "description",
        content: "Leitura executiva simplificada do caixa: saldo, geração e alertas do período.",
      },
      { property: "og:title", content: "Modo Diretoria | Grupo Otávio Lage" },
      { property: "og:description", content: "Resumo estratégico do fluxo de caixa semanal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ModoDiretoria,
});

function ModoDiretoria() {
  const { fluxo } = useFluxo();

  const dados = fluxo.semanas.map((s, i) => ({
    semana: s.rotulo,
    Saldo: Math.round(fluxo.saldosFinais[i] ?? 0),
    Geração: Math.round((fluxo.entradasPorSemana[i] ?? 0) - (fluxo.saidasPorSemana[i] ?? 0)),
  }));

  const menorSaldo = Math.min(...(fluxo.saldosFinais.length ? fluxo.saldosFinais : [0]));
  const semanasNegativas = fluxo.saldosFinais.filter((v) => v < 0).length;
  const geracao = fluxo.totalEntradas - fluxo.totalSaidas;

  return (
    <div>
      <FiltrosBar />
      <h1 className="text-lg font-semibold">Modo Diretoria</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Visão simplificada para decisão: caixa disponível, geração do período e pontos de atenção.
      </p>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi titulo="Saldo inicial" valor={brl(fluxo.saldoInicial, true)} />
        <Kpi
          titulo="Geração de caixa"
          valor={brl(geracao, true)}
          tom={geracao >= 0 ? "positivo" : "negativo"}
        />
        <Kpi
          titulo="Menor saldo projetado"
          valor={brl(menorSaldo, true)}
          tom={menorSaldo < 0 ? "negativo" : "positivo"}
        />
        <Kpi
          titulo="Semanas com saldo negativo"
          valor={String(semanasNegativas)}
          tom={semanasNegativas ? "negativo" : "positivo"}
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Evolução do saldo projetado</CardTitle>
          <CardDescription>Saldo acumulado ao final de cada semana do horizonte</CardDescription>
        </CardHeader>
        <CardContent className="h-[380px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dados}>
              <defs>
                <linearGradient id="gradSaldoDir" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1f2d4a" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#1f2d4a" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e6e9ef" />
              <XAxis dataKey="semana" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => brl(Number(v), true)} width={90} />
              <Tooltip formatter={(v) => brl(Number(v))} />
              <Area
                type="monotone"
                dataKey="Saldo"
                stroke="#1f2d4a"
                strokeWidth={2}
                fill="url(#gradSaldoDir)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Leitura do período</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            Entradas previstas de <strong>{brl(fluxo.totalEntradas, true)}</strong> contra saídas de{" "}
            <strong>{brl(fluxo.totalSaidas, true)}</strong>.
          </p>
          <p>
            {semanasNegativas
              ? `Atenção: ${semanasNegativas} semana(s) projetam saldo negativo, com mínimo de ${brl(menorSaldo, true)}.`
              : "Nenhuma semana do horizonte projeta saldo negativo."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
