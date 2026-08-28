import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download } from "lucide-react";
import { FiltrosBar } from "@/components/FiltrosBar";
import { Kpi } from "@/components/Kpi";
import { DetalheMovimentacoes } from "@/components/DetalheMovimentacoes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFluxo } from "@/lib/dados";
import { brl, dataBR, num } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/constants";
import { exportarExcel } from "@/lib/exportar";

export const Route = createFileRoute("/_authenticated/pagamentos")({
  head: () => ({
    meta: [
      { title: "Pagamentos | Grupo Otávio Lage" },
      {
        name: "description",
        content: "Compromissos de pagamento por categoria, semana e empresa do grupo.",
      },
      { property: "og:title", content: "Pagamentos | Grupo Otávio Lage" },
      { property: "og:description", content: "Controle das saídas operacionais previstas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Pagamentos,
});

function Pagamentos() {
  const { fluxo, movimentacoes, empresas } = useFluxo();
  const [categoria, setCategoria] = useState<string | null>(null);

  const saidas = movimentacoes.filter((m) => m.natureza === "saida");
  const nomeEmpresa = (id: string | null) => empresas.find((e) => e.id === id)?.nome ?? "—";
  const porCategoria = fluxo.linhas
    .filter((l) => l.grupo === "pagamentos")
    .map((l) => ({ categoria: l.categoria, Total: Math.round(l.total) }))
    .sort((a, b) => b.Total - a.Total);

  return (
    <div>
      <FiltrosBar />
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Pagamentos</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            exportarExcel(
              saidas.map((m) => ({
                Empresa: nomeEmpresa(m.empresa_id),
                Categoria: m.categoria,
                Fornecedor: m.contraparte,
                Documento: m.documento,
                "Data prevista": dataBR(m.data_prevista),
                Valor: Number(m.valor_liquido),
                Status: STATUS_LABEL[m.status],
              })),
              "pagamentos",
            )
          }
        >
          <Download className="mr-1.5 h-4 w-4" /> Excel
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi titulo="Pagamentos operacionais" valor={brl(fluxo.totalPagamentos, true)} tom="negativo" />
        <Kpi titulo="Amortizações" valor={brl(fluxo.totalAmortizacoes, true)} tom="negativo" />
        <Kpi titulo="Total de saídas" valor={brl(fluxo.totalSaidas, true)} tom="negativo" />
        <Kpi titulo="Registros" valor={num(saidas.length)} />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Pagamentos por categoria</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={porCategoria}
              layout="vertical"
              margin={{ left: 60 }}
              onClick={(e) => {
                const idx = e?.activeTooltipIndex;
                if (typeof idx === "number") setCategoria(porCategoria[idx]?.categoria ?? null);
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e6e9ef" />
              <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => brl(Number(v), true)} />
              <YAxis type="category" dataKey="categoria" tick={{ fontSize: 10 }} width={130} />
              <Tooltip formatter={(v) => brl(Number(v))} />
              <Bar dataKey="Total" fill="#b03a2e" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="mt-6 overflow-hidden p-0">
        <div className="max-h-[55vh] overflow-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="sticky top-0 bg-muted">
              <tr className="text-left">
                <th className="p-2 font-medium">Empresa</th>
                <th className="p-2 font-medium">Categoria</th>
                <th className="p-2 font-medium">Fornecedor</th>
                <th className="p-2 font-medium">Data prevista</th>
                <th className="p-2 text-right font-medium">Valor</th>
                <th className="p-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {saidas.slice(0, 400).map((m) => (
                <tr key={m.id} className="border-t hover:bg-muted/40">
                  <td className="p-2">{nomeEmpresa(m.empresa_id)}</td>
                  <td className="p-2">{m.categoria}</td>
                  <td className="p-2">{m.contraparte ?? "—"}</td>
                  <td className="p-2">{dataBR(m.data_prevista)}</td>
                  <td className="num p-2 text-right text-destructive">{brl(Number(m.valor_liquido))}</td>
                  <td className="p-2 text-xs">{STATUS_LABEL[m.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <DetalheMovimentacoes
        aberto={!!categoria}
        aoFechar={() => setCategoria(null)}
        titulo={`Pagamentos — ${categoria ?? ""}`}
        movimentacoes={saidas.filter((m) => m.categoria === categoria)}
        empresas={empresas}
      />
    </div>
  );
}
