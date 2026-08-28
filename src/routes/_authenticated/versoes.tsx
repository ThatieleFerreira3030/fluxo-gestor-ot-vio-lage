import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Lock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFluxo, useFiltros } from "@/lib/dados";
import { brl, dataBR, dataHoraBR, addDias, toDate, iso } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/versoes")({
  head: () => ({
    meta: [
      { title: "Histórico de Versões | Grupo Otávio Lage" },
      {
        name: "description",
        content: "Versões semanais fechadas do fluxo de caixa e trilha de auditoria das alterações.",
      },
      { property: "og:title", content: "Histórico de Versões | Grupo Otávio Lage" },
      { property: "og:description", content: "Rastreabilidade das projeções semanais publicadas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Versoes,
});

type Consolidado = {
  saldoInicial?: number;
  saldoFinal?: number;
  menorSaldo?: number;
  entradas?: number;
  saidas?: number;
};

function Versoes() {
  const { fluxo, cenario } = useFluxo();
  const { filtros } = useFiltros();
  const { podeEditar, user } = useAuth();
  const qc = useQueryClient();

  const versoes = useQuery({
    queryKey: ["versoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("versoes")
        .select("*")
        .order("numero", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const auditoria = useQuery({
    queryKey: ["auditoria"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("auditoria")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const fechar = useMutation({
    mutationFn: async () => {
      const numero = ((versoes.data?.[0]?.numero as number | undefined) ?? 0) + 1;
      const { error } = await supabase.from("versoes").insert({
        numero,
        data_base: filtros.dataBase,
        periodo_inicio: filtros.dataBase,
        periodo_fim: iso(addDias(toDate(filtros.dataBase), filtros.horizonte * 7 - 1)),
        cenario_id: cenario?.id ?? null,
        status: "fechada",
        responsavel: user?.email ?? "sistema",
        fechada_em: new Date().toISOString(),
        consolidado: {
          saldoInicial: fluxo.saldoInicial,
          saldoFinal: fluxo.saldoFinal,
          menorSaldo: fluxo.menorSaldo,
          entradas: fluxo.totalEntradas,
          saidas: fluxo.totalSaidas,
        },
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Versão fechada e publicada.");
      void qc.invalidateQueries({ queryKey: ["versoes"] });
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Histórico de versões</h1>
          <p className="text-sm text-muted-foreground">
            Cada fechamento semanal guarda o consolidado do fluxo para comparação futura.
          </p>
        </div>
        {podeEditar && (
          <Button size="sm" onClick={() => fechar.mutate()} disabled={fechar.isPending}>
            <Plus className="mr-1.5 h-4 w-4" /> Fechar versão atual
          </Button>
        )}
      </div>

      <Card className="overflow-hidden p-0 shadow-panel">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-muted">
            <tr className="text-left">
              <th className="p-2 font-medium">Versão</th>
              <th className="p-2 font-medium">Data-base</th>
              <th className="p-2 font-medium">Período</th>
              <th className="p-2 text-right font-medium">Saldo inicial</th>
              <th className="p-2 text-right font-medium">Saldo final</th>
              <th className="p-2 text-right font-medium">Menor saldo</th>
              <th className="p-2 font-medium">Responsável</th>
              <th className="p-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {(versoes.data ?? []).map((v) => {
              const c = (v.consolidado ?? {}) as Consolidado;
              return (
                <tr key={v.id} className="border-t">
                  <td className="p-2 font-medium">v{v.numero}</td>
                  <td className="p-2">{dataBR(v.data_base)}</td>
                  <td className="p-2 text-xs text-muted-foreground">
                    {dataBR(v.periodo_inicio)} a {dataBR(v.periodo_fim)}
                  </td>
                  <td className="num p-2 text-right">{brl(c.saldoInicial ?? 0, true)}</td>
                  <td className="num p-2 text-right">{brl(c.saldoFinal ?? 0, true)}</td>
                  <td className="num p-2 text-right">{brl(c.menorSaldo ?? 0, true)}</td>
                  <td className="p-2 text-xs">{v.responsavel ?? "—"}</td>
                  <td className="p-2">
                    <Badge variant="outline" className={v.status === "fechada" ? "border-success text-success" : ""}>
                      {v.status === "fechada" ? (
                        <>
                          <Lock className="mr-1 h-3 w-3" /> Fechada
                        </>
                      ) : (
                        "Aberta"
                      )}
                    </Badge>
                  </td>
                </tr>
              );
            })}
            {!(versoes.data ?? []).length && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-sm text-muted-foreground">
                  Nenhuma versão fechada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Trilha de auditoria</CardTitle>
          <CardDescription>Últimas alterações manuais registradas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {(auditoria.data ?? []).map((a) => (
            <div key={a.id} className="rounded-md border p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">
                  {a.tabela} · {a.campo ?? "registro"}
                </span>
                <span className="text-xs text-muted-foreground">{dataHoraBR(a.created_at)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {a.valor_anterior ?? "—"} → {a.valor_novo ?? "—"} · {a.usuario ?? "sistema"}
              </p>
              {a.motivo && <p className="mt-1 text-xs">Motivo: {a.motivo}</p>}
            </div>
          ))}
          {!(auditoria.data ?? []).length && (
            <p className="text-sm text-muted-foreground">Nenhuma alteração registrada.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
