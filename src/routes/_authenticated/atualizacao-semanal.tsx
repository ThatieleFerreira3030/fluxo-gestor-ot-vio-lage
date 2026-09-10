import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEmpresas, useLoteAtivo, useLotes } from "@/lib/dados";
import { montarSemanas, type Semana } from "@/lib/fluxo";
import { brl, dataBR, dataHoraBR, iso, inicioSemana } from "@/lib/format";
import {
  FONTES,
  lerArquivo,
  primeiraSemana,
  saldoInicialDe,
  ehQuota,
  type FonteId,
  type LeituraFonte,
  type LinhaMovimento,
} from "@/lib/planilhas";

export const Route = createFileRoute("/_authenticated/atualizacao-semanal")({
  head: () => ({
    meta: [
      { title: "Atualização semanal | Fluxo de Caixa Grupo Otávio Lage" },
      {
        name: "description",
        content:
          "Envio das quatro planilhas oficiais, conferência dos totais e publicação da nova versão semanal do fluxo de caixa.",
      },
      { property: "og:title", content: "Atualização semanal do fluxo de caixa" },
      {
        property: "og:description",
        content: "Leitura, conferência e substituição segura das fontes oficiais do fluxo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AtualizacaoSemanal,
});

const HORIZONTE = 13;

const semAcento = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

type Leituras = Partial<Record<FonteId, LeituraFonte>>;

function AtualizacaoSemanal() {
  const { podeEditar, user } = useAuth();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: empresas } = useEmpresas();
  const loteAtivo = useLoteAtivo();
  const lotes = useLotes();

  const [leituras, setLeituras] = useState<Leituras>({});
  const [lendo, setLendo] = useState(false);
  const [conferido, setConferido] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [detalhe, setDetalhe] = useState<{ titulo: string; linhas: LinhaMovimento[] } | null>(null);

  const dataBase = leituras.disponiveis?.dataBase ?? null;

  const receber = async (files: FileList | null) => {
    if (!files?.length) return;
    setLendo(true);
    setConferido(false);
    const novas: Leituras = { ...leituras };
    for (const file of Array.from(files)) {
      try {
        const base = novas.disponiveis?.dataBase ?? null;
        const r = await lerArquivo(file, base);
        novas[r.fonte] = r;
        // Reprocessa entradas quando a data-base chega depois.
        toast.success(`${file.name} lido como ${FONTES.find((f) => f.id === r.fonte)?.rotulo}.`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Falha ao ler o arquivo.");
      }
    }
    setLeituras(novas);
    setLendo(false);
  };

  const todos = FONTES.every((f) => leituras[f.id]);
  const erros = FONTES.flatMap((f) => leituras[f.id]?.erros ?? []);
  const movimentos = useMemo(
    () => [
      ...(leituras.entradas?.movimentos ?? []),
      ...(leituras.pagamentos?.movimentos ?? []),
      ...(leituras.amortizacoes?.movimentos ?? []),
    ],
    [leituras],
  );

  const semanas: Semana[] = useMemo(
    () => (dataBase ? montarSemanas(primeiraSemana(dataBase), HORIZONTE) : []),
    [dataBase],
  );

  const saldoInicial = leituras.disponiveis
    ? saldoInicialDe(leituras.disponiveis.disponibilidades)
    : 0;

  const grupoDe = (m: LinhaMovimento): "entradas" | "pagamentos" | "amortizacoes" =>
    m.natureza === "entrada"
      ? "entradas"
      : m.categoria === "Amortização de dívidas bancárias"
        ? "amortizacoes"
        : "pagamentos";

  const preview = useMemo(() => {
    const idx = new Map(semanas.map((s) => [s.chave, s.indice]));
    const linhasPorSemana = semanas.map(() => ({
      entradas: [] as LinhaMovimento[],
      pagamentos: [] as LinhaMovimento[],
      amortizacoes: [] as LinhaMovimento[],
    }));
    for (const m of movimentos) {
      const i = idx.get(iso(inicioSemana(m.data)));
      if (i === undefined) continue;
      linhasPorSemana[i]![grupoDe(m)].push(m);
    }
    let saldo = saldoInicial;
    const resultados = linhasPorSemana.map((l) => {
      const soma = (arr: LinhaMovimento[]) => arr.reduce((a, m) => a + m.valor, 0);
      const entradas = soma(l.entradas);
      const pagamentos = soma(l.pagamentos);
      const amortizacoes = soma(l.amortizacoes);
      const inicial = saldo;
      const final = inicial + entradas - pagamentos - amortizacoes;
      saldo = final;
      return { inicial, entradas, pagamentos, amortizacoes, final };
    });
    return { linhasPorSemana, resultados };
  }, [semanas, movimentos, saldoInicial]);

  const dentroDoPeriodo = useMemo(() => {
    const chaves = new Set(semanas.map((s) => s.chave));
    return movimentos.filter((m) => chaves.has(iso(inicioSemana(m.data))));
  }, [movimentos, semanas]);

  const totalPor = (g: "entradas" | "pagamentos" | "amortizacoes") =>
    dentroDoPeriodo.filter((m) => grupoDe(m) === g).reduce((a, m) => a + m.valor, 0);

  const porCategoria = useMemo(() => {
    const mapa = new Map<string, { grupo: string; total: number; linhas: LinhaMovimento[] }>();
    for (const m of dentroDoPeriodo) {
      const k = m.categoria;
      const at = mapa.get(k) ?? { grupo: grupoDe(m), total: 0, linhas: [] };
      at.total += m.valor;
      at.linhas.push(m);
      mapa.set(k, at);
    }
    return [...mapa.entries()].sort((a, b) => b[1].total - a[1].total);
  }, [dentroDoPeriodo]);

  const anterior = (loteAtivo.data?.totais ?? {}) as Record<string, number>;
  const podePublicar =
    podeEditar && todos && !!dataBase && erros.length === 0 && conferido && !publicando;

  const publicar = async () => {
    const disp = leituras.disponiveis;
    if (!disp || !dataBase) return;
    setPublicando(true);
    let loteId: string | null = null;
    try {
      // 1. Empresas ausentes são cadastradas para manter os filtros funcionando.
      const nomes = new Set<string>();
      disp.disponibilidades.forEach((d) => nomes.add(d.empresa));
      movimentos.forEach((m) => m.empresa && nomes.add(m.empresa));
      const existentes = new Map(
        (empresas ?? []).flatMap((e) => {
          const chaves: [string, string][] = [[semAcento(e.nome), e.id]];
          if (e.apelido) chaves.push([semAcento(e.apelido), e.id]);
          return chaves;
        }),
      );
      const faltantes = [...nomes].filter((n) => n && !existentes.has(semAcento(n)));
      if (faltantes.length) {
        const { data: criadas, error } = await supabase
          .from("empresas")
          .insert(faltantes.map((nome) => ({ nome, ativa: true, demo: false })))
          .select("id, nome");
        if (error) throw error;
        (criadas ?? []).forEach((e) => existentes.set(semAcento(e.nome), e.id));
      }
      const idEmpresa = (nome: string | null) =>
        nome ? (existentes.get(semAcento(nome)) ?? null) : null;

      // 2. Lote em rascunho.
      const numero = (lotes.data?.[0]?.numero ?? 0) + 1;
      const totais = {
        saldoInicial,
        entradas: totalPor("entradas"),
        pagamentos: totalPor("pagamentos"),
        amortizacoes: totalPor("amortizacoes"),
        saldoFinal: preview.resultados.at(-1)?.final ?? saldoInicial,
        registros: disp.disponibilidades.length + movimentos.length,
      };
      const { data: lote, error: eLote } = await supabase
        .from("lotes_importacao")
        .insert({
          numero,
          data_base: dataBase,
          status: "rascunho",
          usuario: user?.email ?? "sistema",
          arquivos: Object.fromEntries(
            FONTES.map((f) => [
              f.id,
              {
                arquivo: leituras[f.id]?.arquivo ?? null,
                abas: leituras[f.id]?.abas ?? [],
                registros:
                  (leituras[f.id]?.movimentos.length ?? 0) +
                  (leituras[f.id]?.disponibilidades.length ?? 0),
                ignorados: leituras[f.id]?.ignorados ?? 0,
                total: leituras[f.id]?.total ?? 0,
                enviadoEm: leituras[f.id]?.enviadoEm ?? null,
              },
            ]),
          ),
          totais,
          avisos: erros,
        })
        .select("id")
        .single();
      if (eLote) throw eLote;
      loteId = lote.id;

      // 3. Disponibilidades da nova posição.
      const linhasDisp = disp.disponibilidades.map((d) => ({
        lote_id: loteId,
        data_base: dataBase,
        empresa_id: idEmpresa(d.empresa),
        banco: d.descricao || d.banco || "—",
        agencia: d.agencia,
        conta: d.conta,
        codigo_conta: d.codigoConta,
        coligada: d.coligada,
        tipo: d.tipo,
        produto: d.tipo,
        saldo: d.saldo,
        disponivel_resgate: !ehQuota(d.tipo),
        valor_bloqueado: 0,
        fonte: "Disponiveis.xls",
        chave_origem: d.chave,
        demo: false,
      }));
      for (let i = 0; i < linhasDisp.length; i += 500) {
        const { error } = await supabase
          .from("disponibilidades")
          .insert(linhasDisp.slice(i, i + 500) as never);
        if (error) throw error;
      }

      // 4. Movimentações das três fontes.
      const linhasMov = movimentos.map((m) => ({
        lote_id: loteId,
        empresa_id: idEmpresa(m.empresa),
        natureza: m.natureza,
        categoria: m.categoria,
        subcategoria: m.subcategoria,
        descricao: m.descricao,
        contraparte: m.contraparte,
        documento: m.documento,
        data_prevista: m.data,
        data_vencimento: m.data,
        valor_original: m.valor,
        valor_liquido: m.valor,
        status: m.status,
        fonte: m.aba,
        detalhe: m.detalhe,
        chave_origem: m.chave,
        demo: false,
      }));
      for (let i = 0; i < linhasMov.length; i += 500) {
        const { error } = await supabase
          .from("movimentacoes")
          .insert(linhasMov.slice(i, i + 500) as never);
        if (error) throw error;
      }

      // 5. Troca atômica da versão ativa.
      const { error: ePub } = await supabase.rpc("publicar_lote", { _lote: loteId });
      if (ePub) throw ePub;

      toast.success(`Versão ${numero} publicada. O fluxo já usa apenas estas planilhas.`);
      setLeituras({});
      setConferido(false);
      await qc.invalidateQueries();
    } catch (e) {
      if (loteId) await supabase.from("lotes_importacao").delete().eq("id", loteId);
      toast.error(
        "Publicação cancelada, a versão anterior continua ativa: " +
          (e instanceof Error ? e.message : "erro desconhecido"),
      );
    } finally {
      setPublicando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Atualização semanal</h1>
          <p className="text-sm text-muted-foreground">
            Envie as quatro planilhas oficiais, confira os totais e publique a nova versão do fluxo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".xls,.xlsx"
            className="hidden"
            onChange={(e) => void receber(e.target.files)}
          />
          <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={lendo}>
            {lendo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Selecionar planilhas
          </Button>
          <Button onClick={() => void publicar()} disabled={!podePublicar}>
            {publicando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Publicar atualização
          </Button>
        </div>
      </div>

      {loteAtivo.data && (
        <p className="text-xs text-muted-foreground">
          Versão ativa: {loteAtivo.data.numero} · data-base {dataBR(loteAtivo.data.data_base)} ·
          publicada em {dataHoraBR(loteAtivo.data.publicado_em)}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {FONTES.map((f) => {
          const l = leituras[f.id];
          const registros = (l?.movimentos.length ?? 0) + (l?.disponibilidades.length ?? 0);
          return (
            <Card key={f.id} className={l ? "border-success/50" : "border-dashed"}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm">{f.rotulo}</CardTitle>
                  {l ? (
                    (l.erros.length ?? 0) > 0 ? (
                      <Badge variant="destructive">Com erros</Badge>
                    ) : (
                      <Badge variant="outline" className="border-success text-success">
                        Lido
                      </Badge>
                    )
                  ) : (
                    <Badge variant="outline">Pendente</Badge>
                  )}
                </div>
                <CardDescription className="text-xs">Esperado: {f.arquivo}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 text-xs">
                <p className="truncate">
                  <span className="text-muted-foreground">Enviado: </span>
                  {l?.arquivo ?? "—"}
                </p>
                <p>
                  <span className="text-muted-foreground">Data-base: </span>
                  {f.id === "disponiveis" ? (l?.dataBase ? dataBR(l.dataBase) : "—") : dataBase ? dataBR(dataBase) : "—"}
                </p>
                <p>
                  <span className="text-muted-foreground">Abas: </span>
                  {l?.abas.length ?? 0}
                </p>
                <p>
                  <span className="text-muted-foreground">Registros válidos: </span>
                  {registros}
                </p>
                <p>
                  <span className="text-muted-foreground">Ignorados: </span>
                  {l?.ignorados ?? 0} · <span className="text-muted-foreground">Erros: </span>
                  {l?.erros.length ?? 0}
                </p>
                <p className="font-medium">{brl(l?.total ?? 0)}</p>
                <p className="text-muted-foreground">{l ? dataHoraBR(l.enviadoEm) : "—"}</p>
                {l?.resumoAbas.length ? (
                  <div className="mt-2 space-y-0.5 border-t pt-2">
                    {l.resumoAbas.map((a) => (
                      <div key={a.aba} className="flex justify-between gap-2">
                        <span className="truncate text-muted-foreground">{a.aba}</span>
                        <span>{brl(a.total, true)}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {erros.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" /> Erros que impedem a publicação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            {erros.slice(0, 30).map((e, i) => (
              <p key={i}>• {e}</p>
            ))}
            {erros.length > 30 && <p>… e mais {erros.length - 30} ocorrências.</p>}
          </CardContent>
        </Card>
      )}

      {todos && dataBase && (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Conferência antes de publicar</CardTitle>
              <CardDescription>
                Data-base {dataBR(dataBase)} · período projetado {semanas[0]?.rotulo} a{" "}
                {semanas.at(-1)?.rotulo} ({HORIZONTE} semanas de sexta a quinta)
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {[
                ["Saldo inicial (sem Quotas)", saldoInicial, anterior["saldoInicial"]],
                ["Entradas", totalPor("entradas"), anterior["entradas"]],
                ["Pagamentos", totalPor("pagamentos"), anterior["pagamentos"]],
                ["Amortizações", totalPor("amortizacoes"), anterior["amortizacoes"]],
                [
                  "Saldo final",
                  preview.resultados.at(-1)?.final ?? saldoInicial,
                  anterior["saldoFinal"],
                ],
              ].map(([rotulo, valor, ant]) => (
                <div key={String(rotulo)} className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">{String(rotulo)}</p>
                  <p className="text-lg font-semibold">{brl(Number(valor))}</p>
                  <p className="text-xs text-muted-foreground">
                    {ant === undefined
                      ? "sem versão anterior"
                      : `versão anterior ${brl(Number(ant))} · diferença ${brl(Number(valor) - Number(ant))}`}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Totais por semana</CardTitle>
              <CardDescription>Clique em um valor para ver as linhas das planilhas.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    {["Semana", "Saldo inicial", "Entradas", "Pagamentos", "Amortizações", "Saldo final"].map(
                      (h) => (
                        <th key={h} className="p-2 text-left font-medium">
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {semanas.map((s, i) => {
                    const r = preview.resultados[i]!;
                    const l = preview.linhasPorSemana[i]!;
                    const cel = (
                      valor: number,
                      grupo: "entradas" | "pagamentos" | "amortizacoes",
                    ) => (
                      <td className="p-2">
                        <button
                          className="underline-offset-2 hover:underline"
                          onClick={() =>
                            setDetalhe({ titulo: `${grupo} · ${s.rotulo}`, linhas: l[grupo] })
                          }
                        >
                          {brl(valor)}
                        </button>
                      </td>
                    );
                    return (
                      <tr key={s.chave} className="border-t">
                        <td className="p-2">{s.rotulo}</td>
                        <td className="p-2">{brl(r.inicial)}</td>
                        {cel(r.entradas, "entradas")}
                        {cel(r.pagamentos, "pagamentos")}
                        {cel(r.amortizacoes, "amortizacoes")}
                        <td className={`p-2 font-medium ${r.final < 0 ? "text-destructive" : ""}`}>
                          {brl(r.final)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Totais por categoria no período</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 md:grid-cols-2">
              {porCategoria.map(([cat, info]) => (
                <button
                  key={cat}
                  onClick={() => setDetalhe({ titulo: cat, linhas: info.linhas })}
                  className="flex items-center justify-between rounded-md border p-2 text-left text-sm hover:bg-muted/50"
                >
                  <span>
                    {cat} <span className="text-xs text-muted-foreground">({info.grupo})</span>
                  </span>
                  <span className="font-medium">{brl(info.total)}</span>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={conferido}
                  onChange={(e) => setConferido(e.target.checked)}
                  className="h-4 w-4"
                />
                Confiro que os totais acima correspondem às planilhas enviadas.
              </label>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {podePublicar ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-warning" />
                )}
                {podeEditar
                  ? podePublicar
                    ? "Pronto para publicar"
                    : "Complete as quatro fontes, resolva os erros e aprove a conferência"
                  : "Seu perfil não permite publicar"}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Histórico de atualizações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {(lotes.data ?? []).map((l) => (
            <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
              <div>
                <p className="font-medium">
                  Versão {l.numero} · data-base {dataBR(l.data_base)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {l.usuario ?? "—"} · {dataHoraBR(l.publicado_em ?? l.created_at)} ·{" "}
                  {Number(l.totais?.["registros"] ?? 0)} registros
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span>Entradas {brl(Number(l.totais?.["entradas"] ?? 0), true)}</span>
                <span>Saídas {brl(Number(l.totais?.["pagamentos"] ?? 0) + Number(l.totais?.["amortizacoes"] ?? 0), true)}</span>
                <Badge variant={l.status === "ativo" ? "default" : "outline"}>
                  {l.status === "ativo" ? "Ativa" : "Histórico"}
                </Badge>
              </div>
            </div>
          ))}
          {!(lotes.data ?? []).length && (
            <p className="text-muted-foreground">Nenhuma atualização publicada ainda.</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!detalhe} onOpenChange={(o) => !o && setDetalhe(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              {detalhe?.titulo}
            </DialogTitle>
            <DialogDescription>
              {detalhe?.linhas.length ?? 0} linhas · total{" "}
              {brl((detalhe?.linhas ?? []).reduce((a, m) => a + m.valor, 0))}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted">
                <tr>
                  {["Aba", "Data", "Categoria", "Detalhe", "Contraparte", "Situação", "Valor"].map((h) => (
                    <th key={h} className="p-2 text-left font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(detalhe?.linhas ?? []).slice(0, 500).map((m) => (
                  <tr key={m.chave} className="border-t">
                    <td className="p-2">{m.aba}</td>
                    <td className="p-2">{dataBR(m.data)}</td>
                    <td className="p-2">{m.categoria}</td>
                    <td className="p-2">{m.subcategoria ?? m.descricao}</td>
                    <td className="p-2">{m.contraparte || "—"}</td>
                    <td className="p-2">{String(m.detalhe["Situação"] ?? m.status)}</td>
                    <td className="p-2 text-right">{brl(m.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(detalhe?.linhas.length ?? 0) > 500 && (
              <p className="p-2 text-xs text-muted-foreground">
                Mostrando as primeiras 500 linhas de {detalhe?.linhas.length}.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
