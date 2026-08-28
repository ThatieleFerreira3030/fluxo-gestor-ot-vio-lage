import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Plus } from "lucide-react";
import { FiltrosBar } from "@/components/FiltrosBar";
import { Kpi } from "@/components/Kpi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFiltros, useFluxo } from "@/lib/dados";
import { calcularFluxo, montarSemanas } from "@/lib/fluxo";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/cenarios")({
  head: () => ({
    meta: [
      { title: "Cenários | Grupo Otávio Lage" },
      {
        name: "description",
        content: "Simulação de cenários base, otimista e pessimista sobre o fluxo de caixa semanal.",
      },
      { property: "og:title", content: "Cenários | Grupo Otávio Lage" },
      { property: "og:description", content: "Compare projeções de caixa por cenário." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Cenarios,
});

function Cenarios() {
  const { cenarios, movimentacoes, fluxo, cenario, carregando } = useFluxo();
  const { filtros, setFiltros } = useFiltros();
  const { podeEditar } = useAuth();
  const qc = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    tipo: "otimista",
    descricao: "",
    fator_receita: 1,
    fator_despesa: 1,
    saldo_minimo: 0,
  });

  const semanas = montarSemanas(filtros.dataBase, filtros.horizonte);

  const comparativo = cenarios.map((c) => {
    const f = calcularFluxo(movimentacoes, fluxo.saldoInicial, semanas, c);
    return {
      cenario: c.nome,
      "Saldo final": Math.round(f.saldoFinal),
      "Menor saldo": Math.round(f.menorSaldo),
      Entradas: Math.round(f.totalEntradas),
      Saídas: Math.round(f.totalSaidas),
      id: c.id,
      oficial: c.oficial,
      saldoMinimo: c.saldo_minimo,
    };
  });

  const criar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("cenarios").insert(form as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cenário criado.");
      setAberto(false);
      void qc.invalidateQueries({ queryKey: ["cenarios"] });
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });

  const tornarOficial = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("cenarios").update({ oficial: false }).neq("id", id);
      const { error } = await supabase.from("cenarios").update({ oficial: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cenário oficial atualizado.");
      void qc.invalidateQueries({ queryKey: ["cenarios"] });
    },
  });

  if (carregando) return <p className="text-sm text-muted-foreground">Carregando cenários…</p>;

  return (
    <div>
      <FiltrosBar />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Cenários</h1>
          <p className="text-sm text-muted-foreground">
            Cenário ativo: {cenario?.nome ?? "Base"} · receita ×{cenario?.fator_receita ?? 1} · despesa ×
            {cenario?.fator_despesa ?? 1}
          </p>
        </div>
        {podeEditar && (
          <Button size="sm" onClick={() => setAberto(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Novo cenário
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi titulo="Saldo final (cenário ativo)" valor={brl(fluxo.saldoFinal, true)} />
        <Kpi titulo="Menor saldo" valor={brl(fluxo.menorSaldo, true)} tom="alerta" />
        <Kpi titulo="Entradas" valor={brl(fluxo.totalEntradas, true)} tom="positivo" />
        <Kpi titulo="Saídas" valor={brl(fluxo.totalSaidas, true)} tom="negativo" />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Comparativo entre cenários</CardTitle>
          <CardDescription>Mesmo período e filtros, fatores distintos de receita e despesa</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparativo}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e6e9ef" />
              <XAxis dataKey="cenario" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => brl(Number(v), true)} width={80} />
              <Tooltip formatter={(v) => brl(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Saldo final" fill="#1f2d4a" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Menor saldo" fill="#c98a1e" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="mt-6 overflow-hidden p-0">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted">
            <tr className="text-left">
              <th className="p-2 font-medium">Cenário</th>
              <th className="p-2 text-right font-medium">Entradas</th>
              <th className="p-2 text-right font-medium">Saídas</th>
              <th className="p-2 text-right font-medium">Saldo final</th>
              <th className="p-2 text-right font-medium">Menor saldo</th>
              <th className="p-2 text-right font-medium">Saldo mínimo</th>
              <th className="p-2" />
            </tr>
          </thead>
          <tbody>
            {comparativo.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-2 font-medium">
                  {c.cenario}{" "}
                  {c.oficial && (
                    <Badge variant="outline" className="ml-1 border-success text-success">
                      Oficial
                    </Badge>
                  )}
                </td>
                <td className="num p-2 text-right text-success">{brl(c.Entradas, true)}</td>
                <td className="num p-2 text-right text-destructive">{brl(c["Saídas"], true)}</td>
                <td className="num p-2 text-right">{brl(c["Saldo final"], true)}</td>
                <td className="num p-2 text-right">{brl(c["Menor saldo"], true)}</td>
                <td className="num p-2 text-right text-muted-foreground">{brl(Number(c.saldoMinimo), true)}</td>
                <td className="p-2 text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setFiltros({ cenarioId: c.id })}>
                      Aplicar
                    </Button>
                    {podeEditar && !c.oficial && (
                      <Button variant="ghost" size="sm" onClick={() => tornarOficial.mutate(c.id)}>
                        Tornar oficial
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo cenário</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs text-muted-foreground">Nome</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="base">Base</SelectItem>
                  <SelectItem value="otimista">Otimista</SelectItem>
                  <SelectItem value="pessimista">Pessimista</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Saldo mínimo (R$)</Label>
              <Input
                type="number"
                value={form.saldo_minimo}
                onChange={(e) => setForm({ ...form, saldo_minimo: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Fator de receita</Label>
              <Input
                type="number"
                step="0.01"
                value={form.fator_receita}
                onChange={(e) => setForm({ ...form, fator_receita: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Fator de despesa</Label>
              <Input
                type="number"
                step="0.01"
                value={form.fator_despesa}
                onChange={(e) => setForm({ ...form, fator_despesa: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs text-muted-foreground">Descrição</Label>
              <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={() => criar.mutate()} disabled={criar.isPending}>
              Criar cenário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
