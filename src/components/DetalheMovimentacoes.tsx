import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { brl, dataBR, num } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/constants";
import type { Movimentacao } from "@/lib/fluxo";
import { Button } from "@/components/ui/button";
import { exportarExcel } from "@/lib/exportar";

export function statusVariant(status: string) {
  if (status === "confirmado" || status === "realizado") return "border-success text-success";
  if (status === "pendente") return "border-warning text-warning";
  if (status === "cancelado") return "border-muted-foreground text-muted-foreground";
  return "border-info text-info";
}

const normalizarCampo = (valor: string) =>
  valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const numeroDetalhe = (
  detalhe: Record<string, unknown> | null | undefined,
  campo: string,
): number | null => {
  if (!detalhe) return null;
  const chave = Object.keys(detalhe).find(
    (item) => normalizarCampo(item) === normalizarCampo(campo),
  );
  if (!chave) return null;
  const valor = detalhe[chave];
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : null;
  const texto = String(valor ?? "").trim();
  if (!texto) return null;
  const convertido = Number(
    texto
      .replace(/R\$/gi, "")
      .replace(/\s/g, "")
      .replace(/\./g, "")
      .replace(",", "."),
  );
  return Number.isFinite(convertido) ? convertido : null;
};

const brlCentavos = (valor: number | null) =>
  valor === null
    ? "—"
    : valor.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

export function DetalheMovimentacoes({
  aberto,
  aoFechar,
  titulo,
  descricao,
  movimentacoes,
  empresas,
}: {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  descricao?: string;
  movimentacoes: Movimentacao[];
  empresas: { id: string; nome: string }[];
}) {
  const nomeEmpresa = (id: string | null) => empresas.find((e) => e.id === id)?.nome ?? "—";
  const total = movimentacoes.reduce((a, m) => a + Number(m.valor_liquido), 0);
  const exibirDetalhesAbate = movimentacoes.some((m) => m.categoria === "Abate de bovinos");
  const [visiveis, setVisiveis] = useState(400);

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent className="max-h-[85vh] max-w-7xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>
            {descricao ?? "Composição detalhada do valor selecionado"} — {movimentacoes.length}{" "}
            registros · {brl(total)}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportarExcel(
                movimentacoes.map((m) => ({
                  Empresa: nomeEmpresa(m.empresa_id),
                  Natureza: m.natureza,
                  Categoria: m.categoria,
                  Descrição: m.descricao,
                  Contraparte: m.contraparte,
                  Documento: m.documento,
                  "Data prevista": dataBR(m.data_prevista),
                  ...(exibirDetalhesAbate
                    ? {
                        "Peso médio por cabeça": numeroDetalhe(
                          m.detalhe,
                          "Peso medio por cabeça",
                        ),
                        "Preço @": numeroDetalhe(m.detalhe, "Preço @"),
                      }
                    : {}),
                  Valor: Number(m.valor_liquido),
                  Status: STATUS_LABEL[m.status],
                })),
                "detalhamento-fluxo",
              )
            }
          >
            Exportar Excel
          </Button>
        </div>
        <div className="max-h-[55vh] overflow-auto rounded-md border">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="sticky top-0 bg-muted">
              <tr className="text-left">
                <th className="p-2 font-medium">Empresa</th>
                <th className="p-2 font-medium">Categoria</th>
                <th className="p-2 font-medium">Contraparte</th>
                <th className="p-2 font-medium">Documento</th>
                <th className="p-2 font-medium">Data prevista</th>
                {exibirDetalhesAbate && (
                  <>
                    <th className="whitespace-nowrap p-2 text-right font-medium">
                      Peso médio por cabeça
                    </th>
                    <th className="whitespace-nowrap p-2 text-right font-medium">Preço @</th>
                  </>
                )}
                <th className="p-2 text-right font-medium">Valor</th>
                <th className="p-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {movimentacoes.slice(0, visiveis).map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="p-2">{nomeEmpresa(m.empresa_id)}</td>
                  <td className="p-2">{m.categoria}</td>
                  <td className="p-2">{m.contraparte ?? "—"}</td>
                  <td className="p-2 text-xs text-muted-foreground">{m.documento ?? "—"}</td>
                  <td className="p-2">{dataBR(m.data_prevista)}</td>
                  {exibirDetalhesAbate && (
                    <>
                      <td className="num whitespace-nowrap p-2 text-right">
                        {numeroDetalhe(m.detalhe, "Peso medio por cabeça") === null
                          ? "—"
                          : num(numeroDetalhe(m.detalhe, "Peso medio por cabeça"), 2)}
                      </td>
                      <td className="num whitespace-nowrap p-2 text-right">
                        {brlCentavos(numeroDetalhe(m.detalhe, "Preço @"))}
                      </td>
                    </>
                  )}
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
                </tr>
              ))}
            </tbody>
          </table>
          {movimentacoes.length > visiveis && (
            <div className="border-t p-3 text-center">
              <Button variant="outline" size="sm" onClick={() => setVisiveis((v) => v + 400)}>
                Carregar mais ({movimentacoes.length - visiveis} restantes)
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
