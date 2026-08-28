import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, FileText, Printer } from "lucide-react";
import { FiltrosBar } from "@/components/FiltrosBar";
import { DetalheMovimentacoes } from "@/components/DetalheMovimentacoes";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useFluxo } from "@/lib/dados";
import { brl, inicioSemana, iso } from "@/lib/format";
import { exportarExcel, exportarPDF } from "@/lib/exportar";
import type { LinhaFluxo, Movimentacao } from "@/lib/fluxo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/fluxo-semanal")({
  head: () => ({
    meta: [
      { title: "Fluxo Semanal | Grupo Otávio Lage" },
      {
        name: "description",
        content:
          "Planilha interativa do fluxo de caixa semanal: entradas, pagamentos, amortizações e saldos por semana.",
      },
      { property: "og:title", content: "Fluxo Semanal | Grupo Otávio Lage" },
      { property: "og:description", content: "Projeção semanal detalhada por categoria gerencial." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FluxoSemanal,
});

const TITULOS: Record<LinhaFluxo["grupo"], string> = {
  entradas: "Entradas",
  pagamentos: "Pagamentos",
  amortizacoes: "Amortizações e operações financeiras",
};

function FluxoSemanal() {
  const { fluxo, cenario, movimentacoes, empresas, carregando } = useFluxo();
  const [detalhe, setDetalhe] = useState<{ titulo: string; movs: Movimentacao[] } | null>(null);
  const saldoMinimo = cenario?.saldo_minimo ?? 0;

  const abrir = (categoria: string, semanaChave?: string) =>
    setDetalhe({
      titulo: semanaChave ? `${categoria} — semana selecionada` : categoria,
      movs: movimentacoes.filter(
        (m) =>
          m.categoria === categoria &&
          (!semanaChave || iso(inicioSemana(m.data_prevista)) === semanaChave),
      ),
    });

  const cabecalho = ["Categoria", ...fluxo.semanas.map((s) => s.rotulo), "Total"];

  const linhasExport = () => {
    const linhas: (string | number)[][] = [];
    (["entradas", "pagamentos", "amortizacoes"] as const).forEach((g) => {
      linhas.push([TITULOS[g], ...fluxo.semanas.map(() => ""), ""]);
      fluxo.linhas
        .filter((l) => l.grupo === g)
        .forEach((l) => linhas.push([l.categoria, ...l.valores.map((v) => Math.round(v)), Math.round(l.total)]));
    });
    linhas.push([
      "Saldo final",
      ...fluxo.resultados.map((r) => Math.round(r.saldoFinal)),
      Math.round(fluxo.saldoFinal),
    ]);
    return linhas;
  };

  if (carregando) return <p className="text-sm text-muted-foreground">Carregando fluxo…</p>;

  const Totais = ({
    rotulo,
    valores,
    total,
    destaque,
  }: {
    rotulo: string;
    valores: number[];
    total: number;
    destaque?: "positivo" | "negativo" | "forte";
  }) => (
    <tr className="border-t bg-muted/60 font-semibold">
      <td className="sticky left-0 z-10 bg-muted/95 p-2 text-sm">{rotulo}</td>
      {valores.map((v, i) => (
        <td
          key={i}
          className={cn(
            "num p-2 text-right text-sm",
            destaque === "positivo" && "text-success",
            destaque === "negativo" && "text-destructive",
            destaque === "forte" && v < saldoMinimo && "bg-destructive/10 text-destructive",
          )}
        >
          {brl(v, true)}
        </td>
      ))}
      <td className="num p-2 text-right text-sm">{brl(total, true)}</td>
    </tr>
  );

  return (
    <div>
      <FiltrosBar />
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Fluxo de caixa semanal</h1>
          <p className="text-sm text-muted-foreground">
            Cenário {cenario?.nome ?? "Base"} · saldo mínimo de segurança {brl(saldoMinimo)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportarExcel(
                linhasExport().map((l) =>
                  Object.fromEntries(cabecalho.map((c, i) => [c, l[i] ?? ""])),
                ),
                "fluxo-semanal",
                "Fluxo",
              )
            }
          >
            <Download className="mr-1.5 h-4 w-4" /> Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportarPDF({
                titulo: "Fluxo de Caixa Semanal — Grupo Otávio Lage",
                colunas: cabecalho,
                linhas: linhasExport().map((l) =>
                  l.map((v) => (typeof v === "number" ? brl(v, true) : v)),
                ),
                arquivo: "fluxo-semanal",
                resumo: [
                  `Saldo inicial: ${brl(fluxo.saldoInicial)}`,
                  `Saldo final projetado: ${brl(fluxo.saldoFinal)}`,
                  `Menor saldo: ${brl(fluxo.menorSaldo)} (${fluxo.semanaMenorSaldo?.rotulo ?? "—"})`,
                ],
              })
            }
          >
            <FileText className="mr-1.5 h-4 w-4" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="mr-1.5 h-4 w-4" /> Imprimir
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden p-0 shadow-panel">
        <div className="overflow-auto">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="bg-primary text-primary-foreground">
                <th className="sticky left-0 z-20 bg-primary p-2 text-left font-medium">Categoria</th>
                {fluxo.semanas.map((s) => (
                  <th key={s.chave} className="whitespace-nowrap p-2 text-right font-medium">
                    {s.rotulo}
                  </th>
                ))}
                <th className="p-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              <Totais
                rotulo="Saldo inicial"
                valores={fluxo.resultados.map((r) => r.saldoInicial)}
                total={fluxo.saldoInicial}
              />
              {(["entradas", "pagamentos", "amortizacoes"] as const).map((g) => (
                <>
                  <tr key={g} className="bg-secondary">
                    <td
                      colSpan={fluxo.semanas.length + 2}
                      className="p-2 text-xs font-semibold uppercase tracking-wide text-secondary-foreground"
                    >
                      {TITULOS[g]}
                    </td>
                  </tr>
                  {fluxo.linhas
                    .filter((l) => l.grupo === g)
                    .map((l) => (
                      <tr key={`${g}-${l.categoria}`} className="border-t hover:bg-muted/40">
                        <td
                          className="sticky left-0 z-10 cursor-pointer bg-card p-2 hover:underline"
                          onClick={() => abrir(l.categoria)}
                        >
                          {l.categoria}
                        </td>
                        {l.valores.map((v, i) => (
                          <td
                            key={i}
                            onClick={() => v !== 0 && abrir(l.categoria, fluxo.semanas[i]?.chave)}
                            className={cn(
                              "num cursor-pointer p-2 text-right",
                              v === 0 && "text-muted-foreground/50",
                              g === "entradas" ? "text-success" : "text-destructive",
                            )}
                          >
                            {v === 0 ? "—" : brl(v, true)}
                          </td>
                        ))}
                        <td className="num p-2 text-right font-medium">{brl(l.total, true)}</td>
                      </tr>
                    ))}
                  <Totais
                    key={`${g}-total`}
                    rotulo={`Total ${TITULOS[g].toLowerCase()}`}
                    valores={fluxo.resultados.map((r) =>
                      g === "entradas" ? r.entradas : g === "pagamentos" ? r.pagamentos : r.amortizacoes,
                    )}
                    total={
                      g === "entradas"
                        ? fluxo.totalEntradas
                        : g === "pagamentos"
                          ? fluxo.totalPagamentos
                          : fluxo.totalAmortizacoes
                    }
                    destaque={g === "entradas" ? "positivo" : "negativo"}
                  />
                </>
              ))}
              <Totais
                rotulo="Disponibilidade antes dos pagamentos"
                valores={fluxo.resultados.map((r) => r.disponibilidadeAntesPagamentos)}
                total={fluxo.saldoInicial + fluxo.totalEntradas}
              />
              <Totais
                rotulo="Geração líquida da semana"
                valores={fluxo.resultados.map((r) => r.liquido)}
                total={fluxo.totalEntradas - fluxo.totalSaidas}
              />
              <Totais
                rotulo="Saldo final"
                valores={fluxo.resultados.map((r) => r.saldoFinal)}
                total={fluxo.saldoFinal}
                destaque="forte"
              />
            </tbody>
          </table>
        </div>
      </Card>

      <DetalheMovimentacoes
        aberto={!!detalhe}
        aoFechar={() => setDetalhe(null)}
        titulo={detalhe?.titulo ?? ""}
        movimentacoes={detalhe?.movs ?? []}
        empresas={empresas}
      />
    </div>
  );
}
