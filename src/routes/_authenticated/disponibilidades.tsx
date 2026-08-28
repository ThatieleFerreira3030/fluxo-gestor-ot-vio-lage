import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Plus } from "lucide-react";
import { FiltrosBar } from "@/components/FiltrosBar";
import { Kpi } from "@/components/Kpi";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFluxo } from "@/lib/dados";
import { brl, dataBR, iso, num } from "@/lib/format";
import { exportarExcel } from "@/lib/exportar";

export const Route = createFileRoute("/_authenticated/disponibilidades")({
  head: () => ({
    meta: [
      { title: "Disponibilidades | Grupo Otávio Lage" },
      {
        name: "description",
        content: "Saldos bancários e aplicações financeiras por banco, empresa e liquidez.",
      },
      { property: "og:title", content: "Disponibilidades | Grupo Otávio Lage" },
      { property: "og:description", content: "Controle de caixa, contas e aplicações do grupo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Disponibilidades,
});

function Disponibilidades() {
  const { disponibilidades, empresas, carregando } = useFluxo();
  const { podeEditar } = useAuth();
  const qc = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({
    data_base: iso(new Date()),
    empresa_id: "",
    banco: "",
    agencia: "",
    conta: "",
    tipo: "conta_corrente",
    produto: "",
    saldo: 0,
    percentual_cdi: null,
    liquidez: "imediata",
    valor_bloqueado: 0,
  });

  const nomeEmpresa = (id: string | null) => empresas.find((e) => e.id === id)?.nome ?? "—";
  const contas = disponibilidades.filter((d) => d.tipo === "conta_corrente");
  const aplicacoes = disponibilidades.filter((d) => d.tipo !== "conta_corrente");
  const soma = (l: typeof disponibilidades) => l.reduce((a, d) => a + Number(d.saldo), 0);

  const porBanco = Object.entries(
    disponibilidades.reduce<Record<string, number>>((acc, d) => {
      acc[d.banco] = (acc[d.banco] ?? 0) + Number(d.saldo);
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  const salvar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("disponibilidades").insert({
        ...form,
        empresa_id: form["empresa_id"] || null,
        percentual_cdi: form["percentual_cdi"] ? Number(form["percentual_cdi"]) : null,
        saldo: Number(form["saldo"] ?? 0),
        valor_bloqueado: Number(form["valor_bloqueado"] ?? 0),
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Disponibilidade registrada.");
      setAberto(false);
      void qc.invalidateQueries({ queryKey: ["disponibilidades"] });
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });

  if (carregando) return <p className="text-sm text-muted-foreground">Carregando disponibilidades…</p>;

  return (
    <div>
      <FiltrosBar />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Disponibilidades</h1>
          <p className="text-sm text-muted-foreground">Saldos bancários e aplicações financeiras</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportarExcel(
                disponibilidades.map((d) => ({
                  Empresa: nomeEmpresa(d.empresa_id),
                  Banco: d.banco,
                  Agência: d.agencia,
                  Conta: d.conta,
                  Tipo: d.tipo,
                  Produto: d.produto,
                  Saldo: Number(d.saldo),
                  "% CDI": d.percentual_cdi,
                  Liquidez: d.liquidez,
                  Bloqueado: Number(d.valor_bloqueado),
                  "Data-base": dataBR(d.data_base),
                })),
                "disponibilidades",
              )
            }
          >
            <Download className="mr-1.5 h-4 w-4" /> Excel
          </Button>
          {podeEditar && (
            <Button size="sm" onClick={() => setAberto(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Novo saldo
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi titulo="Total disponível" valor={brl(soma(disponibilidades), true)} />
        <Kpi titulo="Contas correntes" valor={brl(soma(contas), true)} detalhe={`${contas.length} contas`} />
        <Kpi titulo="Aplicações" valor={brl(soma(aplicacoes), true)} detalhe={`${aplicacoes.length} produtos`} />
        <Kpi
          titulo="Valores bloqueados"
          valor={brl(disponibilidades.reduce((a, d) => a + Number(d.valor_bloqueado), 0), true)}
          tom="alerta"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-4">
        <Card className="p-4 xl:col-span-1">
          <p className="mb-3 text-sm font-semibold">Concentração por banco</p>
          <div className="space-y-2">
            {porBanco.map(([banco, valor]) => (
              <div key={banco}>
                <div className="flex justify-between text-xs">
                  <span>{banco}</span>
                  <span className="num">{brl(valor, true)}</span>
                </div>
                <div className="mt-1 h-1.5 rounded bg-muted">
                  <div
                    className="h-1.5 rounded bg-primary"
                    style={{ width: `${(valor / (porBanco[0]?.[1] || 1)) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="overflow-hidden p-0 shadow-panel xl:col-span-3">
          <div className="max-h-[60vh] overflow-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="sticky top-0 bg-muted">
                <tr className="text-left">
                  <th className="p-2 font-medium">Empresa</th>
                  <th className="p-2 font-medium">Banco</th>
                  <th className="p-2 font-medium">Conta / Produto</th>
                  <th className="p-2 font-medium">Tipo</th>
                  <th className="p-2 text-right font-medium">Saldo</th>
                  <th className="p-2 text-right font-medium">% CDI</th>
                  <th className="p-2 font-medium">Liquidez</th>
                  <th className="p-2 text-right font-medium">Bloqueado</th>
                </tr>
              </thead>
              <tbody>
                {disponibilidades.map((d) => (
                  <tr key={d.id} className="border-t hover:bg-muted/40">
                    <td className="p-2">{nomeEmpresa(d.empresa_id)}</td>
                    <td className="p-2 font-medium">{d.banco}</td>
                    <td className="p-2 text-xs text-muted-foreground">
                      {d.produto ?? [d.agencia, d.conta].filter(Boolean).join(" / ") ?? "—"}
                    </td>
                    <td className="p-2">
                      <Badge variant="outline">
                        {d.tipo === "conta_corrente" ? "Conta corrente" : "Aplicação"}
                      </Badge>
                    </td>
                    <td className="num p-2 text-right">{brl(Number(d.saldo))}</td>
                    <td className="num p-2 text-right">
                      {d.percentual_cdi ? `${num(d.percentual_cdi, 1)}%` : "—"}
                    </td>
                    <td className="p-2 capitalize">{d.liquidez ?? "—"}</td>
                    <td className="num p-2 text-right text-warning">
                      {Number(d.valor_bloqueado) ? brl(Number(d.valor_bloqueado)) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Novo saldo / aplicação</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Empresa</Label>
              <Select
                value={String(form["empresa_id"] ?? "")}
                onValueChange={(v) => setForm({ ...form, empresa_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {empresas.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Banco</Label>
              <Input value={String(form["banco"])} onChange={(e) => setForm({ ...form, banco: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Tipo</Label>
              <Select value={String(form["tipo"])} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conta_corrente">Conta corrente</SelectItem>
                  <SelectItem value="aplicacao">Aplicação</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Saldo (R$)</Label>
              <Input
                type="number"
                value={Number(form["saldo"] ?? 0)}
                onChange={(e) => setForm({ ...form, saldo: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Produto</Label>
              <Input
                value={String(form["produto"] ?? "")}
                onChange={(e) => setForm({ ...form, produto: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">% do CDI</Label>
              <Input
                type="number"
                onChange={(e) => setForm({ ...form, percentual_cdi: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Liquidez</Label>
              <Select value={String(form["liquidez"])} onValueChange={(v) => setForm({ ...form, liquidez: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="imediata">Imediata</SelectItem>
                  <SelectItem value="d1">D+1</SelectItem>
                  <SelectItem value="carencia">Com carência</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Data-base</Label>
              <Input
                type="date"
                value={String(form["data_base"])}
                onChange={(e) => setForm({ ...form, data_base: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={() => salvar.mutate()} disabled={salvar.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
