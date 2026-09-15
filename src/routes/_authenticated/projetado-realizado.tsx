import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Scale } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { brl, dataBR, dataHoraBR } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/projetado-realizado")({
  head: () => ({
    meta: [
      { title: "Projetado x Realizado | Grupo Otávio Lage" },
      {
        name: "description",
        content: "Comparação administrativa entre os saldos projetados e as disponibilidades efetivamente realizadas.",
      },
    ],
  }),
  component: ProjetadoRealizado,
});

type Lote = {
  id: string;
  numero: number;
  data_base: string;
  status: string;
  publicado_em: string | null;
};

type Disponibilidade = {
  lote_id: string | null;
  tipo: string;
  saldo: number;
  valor_bloqueado: number;
  disponivel_resgate: boolean;
};

type Movimento = {
  lote_id: string | null;
  natureza: "entrada" | "saida";
  data_prevista: string;
  valor_liquido: number;
  valor_original: number;
  status: string;
};

type Comparacao = {
  loteAnterior: Lote;
  loteAtual: Lote;
  projetado: number;
  realizado: number;
  diferenca: number;
  desvioPct: number | null;
};

const ehQuota = (tipo: string) =>
  tipo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .includes("quota");

async function buscarComparacoes(): Promise<Comparacao[]> {
  const { data: lotesData, error: erroLotes } = await supabase
    .from("lotes_importacao")
    .select("id, numero, data_base, status, publicado_em")
    .in("status", ["ativo", "historico"])
    .order("numero", { ascending: true });
  if (erroLotes) throw erroLotes;

  const lotes = (lotesData ?? []) as Lote[];
  if (lotes.length < 2) return [];
  const ids = lotes.map((l) => l.id);

  const disponibilidades: Disponibilidade[] = [];
  for (let inicio = 0; ; inicio += 1000) {
    const { data, error } = await supabase
      .from("disponibilidades")
      .select("lote_id, tipo, saldo, valor_bloqueado, disponivel_resgate")
      .in("lote_id", ids)
      .range(inicio, inicio + 999);
    if (error) throw error;
    const pagina = (data ?? []) as Disponibilidade[];
    disponibilidades.push(...pagina);
    if (pagina.length < 1000) break;
  }

  const movimentos: Movimento[] = [];
  for (let inicio = 0; ; inicio += 1000) {
    const { data, error } = await supabase
      .from("movimentacoes")
      .select("lote_id, natureza, data_prevista, valor_liquido, valor_original, status")
      .in("lote_id", ids)
      .order("data_prevista")
      .range(inicio, inicio + 999);
    if (error) throw error;
    const pagina = (data ?? []) as Movimento[];
    movimentos.push(...pagina);
    if (pagina.length < 1000) break;
  }

  const saldoPorLote = new Map<string, number>();
  for (const d of disponibilidades) {
    if (!d.lote_id || !d.disponivel_resgate || ehQuota(d.tipo ?? "")) continue;
    const saldo = Number(d.saldo) - Number(d.valor_bloqueado ?? 0);
    saldoPorLote.set(d.lote_id, (saldoPorLote.get(d.lote_id) ?? 0) + saldo);
  }

  const movimentosPorLote = new Map<string, Movimento[]>();
  for (const m of movimentos) {
    if (!m.lote_id) continue;
    const lista = movimentosPorLote.get(m.lote_id) ?? [];
    lista.push(m);
    movimentosPorLote.set(m.lote_id, lista);
  }

  const comparacoes: Comparacao[] = [];
  for (let i = 1; i < lotes.length; i++) {
    const anterior = lotes[i - 1]!;
    const atual = lotes[i]!;
    const saldoAnterior = saldoPorLote.get(anterior.id);
    const realizado = saldoPorLote.get(atual.id);
    if (saldoAnterior === undefined || realizado === undefined) continue;

    const liquidoProjetado = (movimentosPorLote.get(anterior.id) ?? [])
      .filter(
        (m) =>
          m.status !== "cancelado" &&
          m.data_prevista > anterior.data_base &&
          m.data_prevista <= atual.data_base,
      )
      .reduce((total, m) => {
        const valor = Number(m.valor_liquido || m.valor_original || 0);
        return total + (m.natureza === "entrada" ? valor : -valor);
      }, 0);

    const projetado = saldoAnterior + liquidoProjetado;
    const diferenca = realizado - projetado;
    comparacoes.push({
      loteAnterior: anterior,
      loteAtual: atual,
      projetado,
      realizado,
      diferenca,
      desvioPct: projetado === 0 ? null : diferenca / Math.abs(projetado),
    });
  }

  return comparacoes.reverse();
}

function classeDiferenca(valor: number) {
  if (valor > 0) return "text-success";
  if (valor < 0) return "text-destructive";
  return "";
}

function statusComparacao(desvio: number | null) {
  const absoluto = Math.abs(desvio ?? 0);
  if (absoluto <= 0.01)
    return {
      rotulo: "Dentro do projetado",
      classe: "border-success text-success",
      icone: <CheckCircle2 className="mr-1 h-3 w-3" />,
    };
  if (absoluto <= 0.05)
    return {
      rotulo: "Atenção",
      classe: "border-warning text-warning",
      icone: <AlertTriangle className="mr-1 h-3 w-3" />,
    };
  return {
    rotulo: "Desvio relevante",
    classe: "border-destructive text-destructive",
    icone: <AlertTriangle className="mr-1 h-3 w-3" />,
  };
}

function ProjetadoRealizado() {
  const { perfil } = useAuth();
  const comparacoes = useQuery({
    queryKey: ["projetado-realizado"],
    queryFn: buscarComparacoes,
    enabled: perfil === "admin",
  });

  if (perfil !== "admin") return null;
  if (comparacoes.isLoading)
    return <p className="text-sm text-muted-foreground">Calculando comparações…</p>;
  if (comparacoes.error)
    return <p className="text-sm text-destructive">Não foi possível calcular as comparações.</p>;

  const lista = comparacoes.data ?? [];
  const atual = lista[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Projetado x realizado</h1>
        <p className="text-sm text-muted-foreground">
          Compara cada saldo efetivamente importado com a projeção registrada na versão anterior.
        </p>
      </div>

      {atual ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="p-4">
            <p className="text-xs uppercase text-muted-foreground">Saldo projetado</p>
            <p className="mt-1 text-xl font-semibold">{brl(atual.projetado, true)}</p>
            <p className="text-xs text-muted-foreground">Para {dataBR(atual.loteAtual.data_base)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase text-muted-foreground">Saldo efetivado</p>
            <p className="mt-1 text-xl font-semibold">{brl(atual.realizado, true)}</p>
            <p className="text-xs text-muted-foreground">Disponibilidades importadas</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase text-muted-foreground">Diferença</p>
            <p className={`mt-1 text-xl font-semibold ${classeDiferenca(atual.diferenca)}`}>
              {brl(atual.diferenca, true)}
            </p>
            <p className="text-xs text-muted-foreground">Realizado menos projetado</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase text-muted-foreground">Desvio percentual</p>
            <p className={`mt-1 text-xl font-semibold ${classeDiferenca(atual.diferenca)}`}>
              {atual.desvioPct === null
                ? "—"
                : atual.desvioPct.toLocaleString("pt-BR", {
                    style: "percent",
                    maximumFractionDigits: 2,
                  })}
            </p>
            <p className="text-xs text-muted-foreground">Em relação ao saldo projetado</p>
          </Card>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Scale className="h-4 w-4" /> Histórico de aderência
          </CardTitle>
          <CardDescription>
            A projeção considera o saldo efetivo da versão anterior mais as entradas previstas,
            menos as saídas previstas, até a nova data-base.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-muted/60">
              <tr className="text-left">
                <th className="p-2 font-medium">Data efetivada</th>
                <th className="p-2 font-medium">Comparação</th>
                <th className="p-2 text-right font-medium">Projetado</th>
                <th className="p-2 text-right font-medium">Efetivado</th>
                <th className="p-2 text-right font-medium">Diferença</th>
                <th className="p-2 text-right font-medium">Desvio</th>
                <th className="p-2 font-medium">Situação</th>
                <th className="p-2 font-medium">Publicação</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((c) => {
                const status = statusComparacao(c.desvioPct);
                return (
                  <tr key={c.loteAtual.id} className="border-t">
                    <td className="p-2 font-medium">{dataBR(c.loteAtual.data_base)}</td>
                    <td className="p-2 text-xs text-muted-foreground">
                      Versão {c.loteAnterior.numero} → {c.loteAtual.numero}
                    </td>
                    <td className="num p-2 text-right">{brl(c.projetado)}</td>
                    <td className="num p-2 text-right">{brl(c.realizado)}</td>
                    <td className={`num p-2 text-right font-medium ${classeDiferenca(c.diferenca)}`}>
                      {brl(c.diferenca)}
                    </td>
                    <td className={`num p-2 text-right ${classeDiferenca(c.diferenca)}`}>
                      {c.desvioPct === null
                        ? "—"
                        : c.desvioPct.toLocaleString("pt-BR", {
                            style: "percent",
                            maximumFractionDigits: 2,
                          })}
                    </td>
                    <td className="p-2">
                      <Badge variant="outline" className={status.classe}>
                        {status.icone}
                        {status.rotulo}
                      </Badge>
                    </td>
                    <td className="p-2 text-xs text-muted-foreground">
                      {dataHoraBR(c.loteAtual.publicado_em)}
                    </td>
                  </tr>
                );
              })}
              {!lista.length && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    A primeira comparação aparecerá quando uma nova posição de disponibilidades
                    for publicada sobre uma versão anterior.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
