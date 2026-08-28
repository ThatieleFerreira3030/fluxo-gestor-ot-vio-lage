import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Pencil, Plus, Search } from "lucide-react";
import { FiltrosBar } from "@/components/FiltrosBar";
import { statusVariant } from "@/components/DetalheMovimentacoes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFluxo } from "@/lib/dados";
import { brl, dataBR, iso } from "@/lib/format";
import {
  CATEGORIAS_AMORTIZACAO,
  CATEGORIAS_ENTRADA,
  CATEGORIAS_PAGAMENTO,
  STATUS_LABEL,
} from "@/lib/constants";
import { exportarExcel } from "@/lib/exportar";
import type { Movimentacao } from "@/lib/fluxo";

export const Route = createFileRoute("/_authenticated/movimentacoes")({
  head: () => ({
    meta: [
      { title: "Movimentações | Fluxo de Caixa Grupo Otávio Lage" },
      {
        name: "description",
        content:
          "Cadastro e edição das movimentações previstas de entrada e saída com trilha de auditoria.",
      },
      { property: "og:title", content: "Movimentações | Grupo Otávio Lage" },
      { property: "og:description", content: "Gestão detalhada de recebimentos e pagamentos previstos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Movimentacoes,
});

const vazio = {
  empresa_id: "",
  natureza: "saida",
  categoria: "Despesas gerais",
  subcategoria: "",
  descricao: "",
  contraparte: "",
  documento: "",
  data_prevista: iso(new Date()),
  valor_liquido: 0,
  status: "estimado",
  banco: "",
  observacao: "",
};

function Movimentacoes() {
  const { movimentacoes, empresas, carregando } = useFluxo();
  const { podeEditar, perfil } = useAuth();
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [natureza, setNatureza] = useState("todas");
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<Movimentacao | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>(vazio);
  const [motivo, setMotivo] = useState("");

  const nomeEmpresa = (id: string | null) => empresas.find((e) => e.id === id)?.nome ?? "—";

  const lista = useMemo(
    () =>
      movimentacoes.filter((m) => {
        if (natureza !== "todas" && m.natureza !== natureza) return false;
        if (!busca) return true;
        const t = busca.toLowerCase();
        return [m.categoria, m.descricao, m.contraparte, m.documento, nomeEmpresa(m.empresa_id)]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(t));
      }),
    [movimentacoes, busca, natureza, empresas],
  );

  const salvar = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        empresa_id: form["empresa_id"] || null,
        valor_original: Number(form["valor_liquido"] ?? 0),
        valor_liquido: Number(form["valor_liquido"] ?? 0),
        editado_manual: true,
      } as never;
      if (editando) {
        const { error } = await supabase.from("movimentacoes").update(payload).eq("id", editando.id);
        if (error) throw error;
        await supabase.from("auditoria").insert({
          tabela: "movimentacoes",
          registro_id: editando.id,
          campo: "valor_liquido",
          valor_anterior: String(editando.valor_liquido),
          valor_novo: String(form["valor_liquido"]),
          motivo: motivo || "Edição manual",
          usuario: perfil?.email ?? "sistema",
        });
      } else {
        const { error } = await supabase.from("movimentacoes").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editando ? "Movimentação atualizada." : "Movimentação cadastrada.");
      setAberto(false);
      setEditando(null);
      setMotivo("");
      void qc.invalidateQueries({ queryKey: ["movimentacoes"] });
    },
    onError: (e: Error) => toast.error("Erro ao salvar: " + e.message),
  });

  const categorias =
    form["natureza"] === "entrada"
      ? CATEGORIAS_ENTRADA
      : [...CATEGORIAS_PAGAMENTO, ...CATEGORIAS_AMORTIZACAO];

  const abrirNovo = () => {
    setEditando(null);
    setForm(vazio);
    setAberto(true);
  };

  const abrirEdicao = (m: Movimentacao) => {
    setEditando(m);
    setForm({
      empresa_id: m.empresa_id ?? "",
      natureza: m.natureza,
      categoria: m.categoria,
      subcategoria: m.subcategoria ?? "",
      descricao: m.descricao ?? "",
      contraparte: m.contraparte ?? "",
      documento: m.documento ?? "",
      data_prevista: m.data_prevista,
      valor_liquido: Number(m.valor_liquido),
      status: m.status,
      banco: m.banco ?? "",
      observacao: m.observacao ?? "",
    });
    setAberto(true);
  };

  if (carregando) return <p className="text-sm text-muted-foreground">Carregando movimentações…</p>;

  return (
    <div>
      <FiltrosBar />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Movimentações</h1>
          <p className="text-sm text-muted-foreground">{lista.length} registros no período/filtros atuais</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="w-56 pl-8"
              placeholder="Buscar por descrição, contraparte…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <Select value={natureza} onValueChange={setNatureza}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Entradas e saídas</SelectItem>
              <SelectItem value="entrada">Somente entradas</SelectItem>
              <SelectItem value="saida">Somente saídas</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportarExcel(
                lista.map((m) => ({
                  Empresa: nomeEmpresa(m.empresa_id),
                  Natureza: m.natureza === "entrada" ? "Entrada" : "Saída",
                  Categoria: m.categoria,
                  Subcategoria: m.subcategoria,
                  Descrição: m.descricao,
                  Contraparte: m.contraparte,
                  Documento: m.documento,
                  "Data prevista": dataBR(m.data_prevista),
                  Valor: Number(m.valor_liquido),
                  Status: STATUS_LABEL[m.status],
                  Fonte: m.fonte,
                })),
                "movimentacoes",
              )
            }
          >
            <Download className="mr-1.5 h-4 w-4" /> Excel
          </Button>
          {podeEditar && (
            <Button size="sm" onClick={abrirNovo}>
              <Plus className="mr-1.5 h-4 w-4" /> Nova movimentação
            </Button>
          )}
        </div>
      </div>

      <Card className="overflow-hidden p-0 shadow-panel">
        <div className="max-h-[65vh] overflow-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="sticky top-0 z-10 bg-muted">
              <tr className="text-left">
                <th className="p-2 font-medium">Empresa</th>
                <th className="p-2 font-medium">Categoria</th>
                <th className="p-2 font-medium">Contraparte</th>
                <th className="p-2 font-medium">Documento</th>
                <th className="p-2 font-medium">Data prevista</th>
                <th className="p-2 text-right font-medium">Valor</th>
                <th className="p-2 font-medium">Status</th>
                <th className="p-2 font-medium">Fonte</th>
                <th className="p-2" />
              </tr>
            </thead>
            <tbody>
              {lista.slice(0, 500).map((m) => (
                <tr key={m.id} className="border-t hover:bg-muted/40">
                  <td className="p-2">{nomeEmpresa(m.empresa_id)}</td>
                  <td className="p-2">
                    <span className="font-medium">{m.categoria}</span>
                    {m.subcategoria && (
                      <span className="block text-xs text-muted-foreground">{m.subcategoria}</span>
                    )}
                  </td>
                  <td className="p-2">{m.contraparte ?? "—"}</td>
                  <td className="p-2 text-xs text-muted-foreground">{m.documento ?? "—"}</td>
                  <td className="p-2">{dataBR(m.data_prevista)}</td>
                  <td
                    className={`num p-2 text-right ${m.natureza === "entrada" ? "text-success" : "text-destructive"}`}
                  >
                    {brl(Number(m.valor_liquido))}
                  </td>
                  <td className="p-2">
                    <Badge variant="outline" className={statusVariant(m.status)}>
                      {STATUS_LABEL[m.status]}
                    </Badge>
                  </td>
                  <td className="p-2 text-xs text-muted-foreground">{m.fonte ?? "—"}</td>
                  <td className="p-2 text-right">
                    {podeEditar && (
                      <Button variant="ghost" size="icon" onClick={() => abrirEdicao(m)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar movimentação" : "Nova movimentação"}</DialogTitle>
            <DialogDescription>
              Alterações manuais ficam registradas na trilha de auditoria.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo label="Empresa">
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
            </Campo>
            <Campo label="Natureza">
              <Select
                value={String(form["natureza"])}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    natureza: v,
                    categoria: v === "entrada" ? CATEGORIAS_ENTRADA[0] : CATEGORIAS_PAGAMENTO[0],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                </SelectContent>
              </Select>
            </Campo>
            <Campo label="Categoria">
              <Select
                value={String(form["categoria"])}
                onValueChange={(v) => setForm({ ...form, categoria: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>
            <Campo label="Subcategoria">
              <Input
                value={String(form["subcategoria"] ?? "")}
                onChange={(e) => setForm({ ...form, subcategoria: e.target.value })}
              />
            </Campo>
            <Campo label="Contraparte">
              <Input
                value={String(form["contraparte"] ?? "")}
                onChange={(e) => setForm({ ...form, contraparte: e.target.value })}
              />
            </Campo>
            <Campo label="Documento">
              <Input
                value={String(form["documento"] ?? "")}
                onChange={(e) => setForm({ ...form, documento: e.target.value })}
              />
            </Campo>
            <Campo label="Data prevista">
              <Input
                type="date"
                value={String(form["data_prevista"])}
                onChange={(e) => setForm({ ...form, data_prevista: e.target.value })}
              />
            </Campo>
            <Campo label="Valor (R$)">
              <Input
                type="number"
                step="0.01"
                value={Number(form["valor_liquido"] ?? 0)}
                onChange={(e) => setForm({ ...form, valor_liquido: Number(e.target.value) })}
              />
            </Campo>
            <Campo label="Status">
              <Select value={String(form["status"])} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>
            <Campo label="Banco">
              <Input
                value={String(form["banco"] ?? "")}
                onChange={(e) => setForm({ ...form, banco: e.target.value })}
              />
            </Campo>
            <div className="sm:col-span-2">
              <Campo label="Descrição">
                <Textarea
                  rows={2}
                  value={String(form["descricao"] ?? "")}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                />
              </Campo>
            </div>
            {editando && (
              <div className="sm:col-span-2">
                <Campo label="Motivo da alteração (auditoria)">
                  <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} />
                </Campo>
              </div>
            )}
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

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
