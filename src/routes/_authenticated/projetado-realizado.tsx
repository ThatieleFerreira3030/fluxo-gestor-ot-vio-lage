import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, GitCompareArrows, Scale } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { brl, dataBR, dataHoraBR } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/projetado-realizado")({
  head: () => ({
    meta: [
      { title: "Projetado x Realizado | Grupo Otávio Lage" },
      {
        name: "description",
        content:
          "Comparação administrativa entre os saldos projetados e as disponibilidades efetivamente realizadas.",
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
  categoria: string;
  chave_origem: string | null;
};

type AlteracaoCategoria = {
  categoria: string;
  anterior: number;
  atual: number;
  diferenca: number;
};

type Comparacao = {
  loteAnterior: Lote;
  loteAtual: Lote;
  projetado: number;
  realizado: number;
  diferenca: number;
  desvioPct: number | null;
  saldoAnterior: number;
  entradasProjetadas: number;
  saidasProjetadas: number;
  variacaoEfetiva: number;
  linhasIncluidas: number;
  linhasRetiradas: number;
  alteracoesCategorias: AlteracaoCategoria[];
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
      .select(
        "lote_id, natureza, data_prevista, valor_liquido, valor_original, status, categoria, chave_origem",
      )
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

    const movimentosAnteriores = movimentosPorLote.get(anterior.id) ?? [];
    const movimentosAtuais = movimentosPorLote.get(atual.id) ?? [];
    const movimentosDaSemana = movimentosAnteriores.filter(
      (m) =>
        m.status !== "cancelado" &&
        m.data_prevista > anterior.data_base &&
        m.data_prevista <= atual.data_base,
    );
    const valorMovimento = (m: Movimento) => Number(m.valor_liquido || m.valor_original || 0);
    const entradasProjetadas = movimentosDaSemana
      .filter((m) => m.natureza === "entrada")
      .reduce((total, m) => total + valorMovimento(m), 0);
    const saidasProjetadas = movimentosDaSemana
      .filter((m) => m.natureza === "saida")
      .reduce((total, m) => total + valorMovimento(m), 0);
    const liquidoProjetado = entradasProjetadas - saidasProjetadas;

    const futurasAnteriores = movimentosAnteriores.filter(
      (m) => m.status !== "cancelado" && m.data_prevista > atual.data_base,
    );
    const futurasAtuais = movimentosAtuais.filter(
      (m) => m.status !== "cancelado" && m.data_prevista > atual.data_base,
    );
    const chavesAnteriores = new Set(futurasAnteriores.map((m) => m.chave_origem).filter(Boolean));
    const chavesAtuais = new Set(futurasAtuais.map((m) => m.chave_origem).filter(Boolean));
    const linhasIncluidas = [...chavesAtuais].filter(
      (chave) => !chavesAnteriores.has(chave),
    ).length;
    const linhasRetiradas = [...chavesAnteriores].filter(
      (chave) => !chavesAtuais.has(chave),
    ).length;

    const categorias = new Map<string, { anterior: number; atual: number }>();
    for (const m of futurasAnteriores) {
      const item = categorias.get(m.categoria) ?? { anterior: 0, atual: 0 };
      item.anterior += (m.natureza === "entrada" ? 1 : -1) * valorMovimento(m);
      categorias.set(m.categoria, item);
    }
    for (const m of futurasAtuais) {
      const item = categorias.get(m.categoria) ?? { anterior: 0, atual: 0 };
      item.atual += (m.natureza === "entrada" ? 1 : -1) * valorMovimento(m);
      categorias.set(m.categoria, item);
    }
    const alteracoesCategorias = [...categorias.entries()]
      .map(([categoria, valores]) => ({
        categoria,
        ...valores,
        diferenca: valores.atual - valores.anterior,
      }))
      .filter((item) => Math.abs(item.diferenca) >= 0.01)
      .sort((a, b) => Math.abs(b.diferenca) - Math.abs(a.diferenca));

    const projetado = saldoAnterior + liquidoProjetado;
    const diferenca = realizado - projetado;
    comparacoes.push({
      loteAnterior: anterior,
      loteAtual: atual,
      projetado,
      realizado,
      diferenca,
      desvioPct: projetado === 0 ? null : diferenca / Math.abs(projetado),
      saldoAnterior,
      entradasProjetadas,
      saidasProjetadas,
      variacaoEfetiva: realizado - saldoAnterior,
      linhasIncluidas,
      linhasRetiradas,
      alteracoesCategorias,
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
  const [comparacaoSelecionada, setComparacaoSelecionada] = useState("");
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
  const analise =
    lista.find((comparacao) => comparacao.loteAtual.id === comparacaoSelecionada) ?? atual;

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
            <p className="text-xs text-muted-foreground">
              Para {dataBR(atual.loteAtual.data_base)}
            </p>
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

      {analise ? (
        <Card>
          <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <GitCompareArrows className="h-4 w-4" /> Análise automática entre versões
              </CardTitle>
              <CardDescription>
                Resume a semana efetivada e destaca as maiores mudanças da projeção.
              </CardDescription>
            </div>
            <Select value={analise.loteAtual.id} onValueChange={setComparacaoSelecionada}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {lista.map((comparacao) => (
                  <SelectItem key={comparacao.loteAtual.id} value={comparacao.loteAtual.id}>
                    Versão {comparacao.loteAnterior.numero} → {comparacao.loteAtual.numero} ·{" "}
                    {dataBR(comparacao.loteAtual.data_base)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Movimento líquido previsto</p>
                <p
                  className={`mt-1 font-semibold ${classeDiferenca(analise.entradasProjetadas - analise.saidasProjetadas)}`}
                >
                  {brl(analise.entradasProjetadas - analise.saidasProjetadas, true)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Entradas {brl(analise.entradasProjetadas, true)} · saídas{" "}
                  {brl(analise.saidasProjetadas, true)}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Variação efetiva do caixa</p>
                <p className={`mt-1 font-semibold ${classeDiferenca(analise.variacaoEfetiva)}`}>
                  {brl(analise.variacaoEfetiva, true)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Saldo atual menos saldo anterior
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Desvio da semana efetivada</p>
                <p className={`mt-1 font-semibold ${classeDiferenca(analise.diferenca)}`}>
                  {brl(analise.diferenca, true)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Variação efetiva menos previsão
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Mudanças na projeção futura</p>
                <p className="mt-1 font-semibold">
                  {analise.linhasIncluidas} inclusões · {analise.linhasRetiradas} retiradas
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Linhas alteradas entre as versões
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-muted/50 p-4">
              <p className="text-sm font-semibold">Diagnóstico automático</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                <li>
                  O caixa terminou{" "}
                  {analise.diferenca < 0
                    ? "abaixo"
                    : analise.diferenca > 0
                      ? "acima"
                      : "em linha com"}{" "}
                  o projetado em{" "}
                  <span className={`font-medium ${classeDiferenca(analise.diferenca)}`}>
                    {brl(Math.abs(analise.diferenca), true)}
                  </span>
                  {analise.desvioPct === null
                    ? "."
                    : ` (${Math.abs(analise.desvioPct).toLocaleString("pt-BR", { style: "percent", maximumFractionDigits: 2 })}).`}
                </li>
                <li>
                  A semana previa movimento líquido de{" "}
                  {brl(analise.entradasProjetadas - analise.saidasProjetadas, true)}, enquanto a
                  posição bancária variou {brl(analise.variacaoEfetiva, true)}.
                </li>
                <li>
                  Entre as versões, foram identificadas {analise.linhasIncluidas} inclusões e{" "}
                  {analise.linhasRetiradas} retiradas nas projeções posteriores à data efetivada.
                </li>
              </ul>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold">
                Principais alterações e possíveis gargalos
              </p>
              {analise.alteracoesCategorias.length ? (
                <div className="overflow-auto rounded-lg border">
                  <table className="w-full min-w-[620px] text-sm">
                    <thead className="bg-muted/60">
                      <tr>
                        <th className="p-2 text-left font-medium">Categoria</th>
                        <th className="p-2 text-right font-medium">Versão anterior</th>
                        <th className="p-2 text-right font-medium">Versão atual</th>
                        <th className="p-2 text-right font-medium">Alteração líquida</th>
                        <th className="p-2 text-left font-medium">Leitura</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analise.alteracoesCategorias.slice(0, 8).map((item) => (
                        <tr key={item.categoria} className="border-t">
                          <td className="p-2 font-medium">{item.categoria}</td>
                          <td className="num p-2 text-right">{brl(item.anterior)}</td>
                          <td className="num p-2 text-right">{brl(item.atual)}</td>
                          <td
                            className={`num p-2 text-right font-medium ${classeDiferenca(item.diferenca)}`}
                          >
                            {brl(item.diferenca)}
                          </td>
                          <td className="p-2 text-xs text-muted-foreground">
                            {item.diferenca < 0
                              ? "Maior pressão sobre o caixa"
                              : "Melhora da projeção de caixa"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  Não houve alteração líquida por categoria nas projeções futuras entre estas
                  versões.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
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
                    <td
                      className={`num p-2 text-right font-medium ${classeDiferenca(c.diferenca)}`}
                    >
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
                    A primeira comparação aparecerá quando uma nova posição de disponibilidades for
                    publicada sobre uma versão anterior.
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
