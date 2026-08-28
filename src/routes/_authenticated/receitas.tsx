import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download } from "lucide-react";
import { FiltrosBar } from "@/components/FiltrosBar";
import { Kpi } from "@/components/Kpi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useFluxo } from "@/lib/dados";
import { brl, dataBR, num } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/constants";
import { exportarExcel } from "@/lib/exportar";

export const Route = createFileRoute("/_authenticated/receitas")({
  head: () => ({
    meta: [
      { title: "Receitas | Grupo Otávio Lage" },
      {
        name: "description",
        content: "Projeção de receitas de abate, grãos e demais recebimentos do grupo.",
      },
      { property: "og:title", content: "Receitas | Grupo Otávio Lage" },
      { property: "og:description", content: "Faturamento projetado e realizado por categoria." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Receitas,
});

function Receitas() {
  const { fluxo, movimentacoes, empresas } = useFluxo();
  const abate = useQuery({
    queryKey: ["receitas_abate"],
    queryFn: async () => {
      const { data, error } = await supabase.from("receitas_abate").select("*").order("data_prevista");
      if (error) throw error;
      return data ?? [];
    },
  });

  const nomeEmpresa = (id: string | null) => empresas.find((e) => e.id === id)?.nome ?? "—";
  const entradas = movimentacoes.filter((m) => m.natureza === "entrada");
  const porCategoria = fluxo.linhas
    .filter((l) => l.grupo === "entradas")
    .map((l) => ({ categoria: l.categoria, Total: Math.round(l.total) }))
    .sort((a, b) => b.Total - a.Total);

  const totalAbate = (abate.data ?? []).reduce((a, r) => a + Number(r.faturamento_projetado), 0);
  const cabecas = (abate.data ?? []).reduce((a, r) => a + Number(r.quantidade), 0);

  return (
    <div>
      <FiltrosBar />
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Receitas</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            exportarExcel(
              entradas.map((m) => ({
                Empresa: nomeEmpresa(m.empresa_id),
                Categoria: m.categoria,
                Cliente: m.contraparte,
                "Data prevista": dataBR(m.data_prevista),
                Valor: Number(m.valor_liquido),
                Status: STATUS_LABEL[m.status],
              })),
              "receitas",
            )
          }
        >
          <Download className="mr-1.5 h-4 w-4" /> Excel
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi titulo="Receitas projetadas" valor={brl(fluxo.totalEntradas, true)} tom="positivo" />
        <Kpi titulo="Faturamento de abate" valor={brl(totalAbate, true)} />
        <Kpi titulo="Cabeças programadas" valor={num(cabecas)} />
        <Kpi titulo="Registros de entrada" valor={num(entradas.length)} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Receitas por categoria</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porCategoria} layout="vertical" margin={{ left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6e9ef" />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => brl(Number(v), true)} />
                <YAxis type="category" dataKey="categoria" tick={{ fontSize: 10 }} width={120} />
                <Tooltip formatter={(v) => brl(Number(v))} />
                <Bar dataKey="Total" fill="#2f7d55" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="border-b bg-muted px-3 py-2 text-sm font-medium">Programação de abate</div>
          <div className="max-h-80 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/70">
                <tr className="text-left">
                  <th className="p-2 font-medium">Empresa</th>
                  <th className="p-2 font-medium">Data prevista</th>
                  <th className="p-2 font-medium">Categoria</th>
                  <th className="p-2 text-right font-medium">Qtd.</th>
                  <th className="p-2 text-right font-medium">Faturamento</th>
                  <th className="p-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {(abate.data ?? []).map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-2">{nomeEmpresa(r.empresa_id)}</td>
                    <td className="p-2">{dataBR(r.data_prevista)}</td>
                    <td className="p-2">{r.categoria_animal ?? "—"}</td>
                    <td className="num p-2 text-right">{num(r.quantidade)}</td>
                    <td className="num p-2 text-right text-success">
                      {brl(Number(r.faturamento_projetado), true)}
                    </td>
                    <td className="p-2">
                      <Badge variant="outline">{STATUS_LABEL[r.status] ?? r.status}</Badge>
                    </td>
                  </tr>
                ))}
                {!(abate.data ?? []).length && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">
                      Sem programação de abate cadastrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
