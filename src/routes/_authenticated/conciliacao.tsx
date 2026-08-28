import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, XCircle } from "lucide-react";
import { FiltrosBar } from "@/components/FiltrosBar";
import { Kpi } from "@/components/Kpi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useFluxo } from "@/lib/dados";
import { validarFluxo } from "@/lib/fluxo";
import { brl, dataHoraBR } from "@/lib/format";
import { exportarPDF } from "@/lib/exportar";

export const Route = createFileRoute("/_authenticated/conciliacao")({
  head: () => ({
    meta: [
      { title: "Conciliação | Grupo Otávio Lage" },
      {
        name: "description",
        content: "Validações automáticas do fluxo de caixa, pendências e itens sem classificação.",
      },
      { property: "og:title", content: "Conciliação | Grupo Otávio Lage" },
      { property: "og:description", content: "Checagens de consistência do fluxo semanal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Conciliacao,
});

function Conciliacao() {
  const { fluxo, movimentacoes, carregando } = useFluxo();
  const { checagens, conciliado } = validarFluxo(fluxo);

  const pendencias = useQuery({
    queryKey: ["pendencias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pendencias")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const semClassificacao = movimentacoes.filter((m) => m.categoria === "Não classificado");
  const semData = movimentacoes.filter((m) => !m.data_prevista);
  const naoConfirmados = movimentacoes.filter((m) => m.status === "estimado" || m.status === "pendente");

  if (carregando) return <p className="text-sm text-muted-foreground">Carregando conciliação…</p>;

  return (
    <div>
      <FiltrosBar />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Conciliação e validações</h1>
          <p className="text-sm text-muted-foreground">
            Verificado em {dataHoraBR(new Date())} ·{" "}
            {conciliado ? "fluxo conciliado" : "há inconsistências a tratar"}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            exportarPDF({
              titulo: "Relatório de conciliação — Fluxo de Caixa Semanal",
              colunas: ["Checagem", "Resultado", "Detalhe"],
              linhas: checagens.map((c) => [c.nome, c.ok ? "OK" : "Falha", c.detalhe]),
              arquivo: "conciliacao",
            })
          }
        >
          Exportar PDF
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi
          titulo="Status geral"
          valor={conciliado ? "Conciliado" : "Divergente"}
          tom={conciliado ? "positivo" : "negativo"}
        />
        <Kpi titulo="Sem classificação" valor={semClassificacao.length} tom={semClassificacao.length ? "alerta" : "positivo"} />
        <Kpi titulo="Sem data prevista" valor={semData.length} tom={semData.length ? "alerta" : "positivo"} />
        <Kpi
          titulo="Valores não confirmados"
          valor={brl(naoConfirmados.reduce((a, m) => a + Number(m.valor_liquido), 0), true)}
          detalhe={`${naoConfirmados.length} registros`}
          tom="alerta"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Checagens automáticas</CardTitle>
            <CardDescription>Regras aplicadas a cada recálculo do fluxo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {checagens.map((c) => (
              <div key={c.nome} className="flex items-start gap-3 rounded-md border p-3">
                {c.ok ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                ) : (
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                )}
                <div>
                  <p className="text-sm font-medium">{c.nome}</p>
                  <p className="text-xs text-muted-foreground">{c.detalhe}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pendências registradas</CardTitle>
            <CardDescription>Itens que exigem tratamento do time financeiro</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(pendencias.data ?? []).map((p) => (
              <div key={p.id} className="flex items-start justify-between gap-3 rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">{p.descricao}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.tipo} · {dataHoraBR(p.created_at)}
                  </p>
                </div>
                <div className="text-right">
                  <Badge
                    variant="outline"
                    className={p.severidade === "critico" ? "border-destructive text-destructive" : "border-warning text-warning"}
                  >
                    {p.severidade}
                  </Badge>
                  <p className="num mt-1 text-xs">{brl(Number(p.valor_afetado ?? 0), true)}</p>
                </div>
              </div>
            ))}
            {!(pendencias.data ?? []).length && (
              <p className="text-sm text-muted-foreground">Nenhuma pendência aberta.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {semClassificacao.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Movimentações sem classificação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-72 overflow-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted">
                  <tr className="text-left">
                    <th className="p-2 font-medium">Descrição</th>
                    <th className="p-2 font-medium">Contraparte</th>
                    <th className="p-2 text-right font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {semClassificacao.slice(0, 100).map((m) => (
                    <tr key={m.id} className="border-t">
                      <td className="p-2">{m.descricao ?? "—"}</td>
                      <td className="p-2">{m.contraparte ?? "—"}</td>
                      <td className="num p-2 text-right">{brl(Number(m.valor_liquido))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
