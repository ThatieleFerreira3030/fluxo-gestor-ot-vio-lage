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
import { exportarExcel } from "@/lib/exportar";

export const Route = createFileRoute("/_authenticated/dividas")({
  head: () => ({
    meta: [
      { title: "Dívidas | Grupo Otávio Lage" },
      {
        name: "description",
        content: "Contratos financeiros, saldo devedor, indexadores e cronograma de amortização.",
      },
      { property: "og:title", content: "Dívidas | Grupo Otávio Lage" },
      { property: "og:description", content: "Endividamento consolidado por instituição financeira." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dividas,
});

function Dividas() {
  const { empresas, fluxo } = useFluxo();

  const contratos = useQuery({
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

  const parcelas = useQuery({
    queryKey: ["parcelas_divida"],
    queryFn: async () => {
      const { data, error } = await supabase.from("parcelas_divida").select("*").order("vencimento");
      if (error) throw error;
      return data ?? [];
    },
  });

  const lista = contratos.data ?? [];
  const nomeEmpresa = (id: string | null) => empresas.find((e) => e.id === id)?.nome ?? "—";
  const total = lista.reduce((a, c) => a + Number(c.saldo_devedor), 0);

  const porInstituicao = Object.entries(
    lista.reduce<Record<string, number>>((acc, c) => {
      acc[c.instituicao] = (acc[c.instituicao] ?? 0) + Number(c.saldo_devedor);
      return acc;
    }, {}),
  )
    .map(([instituicao, valor]) => ({ instituicao, Saldo: Math.round(valor) }))
    .sort((a, b) => b.Saldo - a.Saldo);

  const juros = (parcelas.data ?? []).reduce((a, p) => a + Number(p.juros), 0);

  return (
    <div>
      <FiltrosBar />
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Dívidas e operações financeiras</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            exportarExcel(
              lista.map((c) => ({
                Empresa: nomeEmpresa(c.empresa_id),
                Instituição: c.instituicao,
                Operação: c.tipo_operacao,
                Contrato: c.numero_contrato,
                "Valor original": Number(c.valor_original),
                "Saldo devedor": Number(c.saldo_devedor),
                Indexador: c.indexador,
                Taxa: c.taxa,
                Vencimento: dataBR(c.data_vencimento),
                Status: c.status,
              })),
              "dividas",
            )
          }
        >
          <Download className="mr-1.5 h-4 w-4" /> Excel
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi titulo="Saldo devedor total" valor={brl(total, true)} tom="negativo" />
        <Kpi titulo="Contratos ativos" valor={num(lista.filter((c) => c.status === "ativo").length)} />
        <Kpi titulo="Amortizações no período" valor={brl(fluxo.totalAmortizacoes, true)} tom="negativo" />
        <Kpi titulo="Juros previstos" valor={brl(juros, true)} tom="alerta" />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Saldo devedor por instituição</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={porInstituicao} layout="vertical" margin={{ left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e6e9ef" />
              <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => brl(Number(v), true)} />
              <YAxis type="category" dataKey="instituicao" tick={{ fontSize: 10 }} width={130} />
              <Tooltip formatter={(v) => brl(Number(v))} />
              <Bar dataKey="Saldo" fill="#1f2d4a" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="mt-6 overflow-hidden p-0">
        <div className="max-h-[55vh] overflow-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="sticky top-0 bg-muted">
              <tr className="text-left">
                <th className="p-2 font-medium">Empresa</th>
                <th className="p-2 font-medium">Instituição</th>
                <th className="p-2 font-medium">Operação</th>
                <th className="p-2 text-right font-medium">Valor original</th>
                <th className="p-2 text-right font-medium">Saldo devedor</th>
                <th className="p-2 font-medium">Indexador</th>
                <th className="p-2 text-right font-medium">Taxa</th>
                <th className="p-2 font-medium">Vencimento</th>
                <th className="p-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((c) => (
                <tr key={c.id} className="border-t hover:bg-muted/40">
                  <td className="p-2">{nomeEmpresa(c.empresa_id)}</td>
                  <td className="p-2 font-medium">{c.instituicao}</td>
                  <td className="p-2 text-xs text-muted-foreground">{c.tipo_operacao ?? "—"}</td>
                  <td className="num p-2 text-right">{brl(Number(c.valor_original), true)}</td>
                  <td className="num p-2 text-right text-destructive">{brl(Number(c.saldo_devedor), true)}</td>
                  <td className="p-2">{c.indexador ?? "—"}</td>
                  <td className="num p-2 text-right">{c.taxa ? `${num(c.taxa, 2)}%` : "—"}</td>
                  <td className="p-2">{dataBR(c.data_vencimento)}</td>
                  <td className="p-2">
                    <Badge variant="outline">{c.status}</Badge>
                  </td>
                </tr>
              ))}
              {!lista.length && (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-muted-foreground">
                    Nenhum contrato cadastrado.
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
