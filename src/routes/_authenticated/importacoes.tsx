import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileSpreadsheet, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEmpresas } from "@/lib/dados";
import { TIPOS_FONTE, CATEGORIAS_ENTRADA } from "@/lib/constants";
import { brl, dataHoraBR, iso, toDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/importacoes")({
  head: () => ({
    meta: [
      { title: "Importações | Grupo Otávio Lage" },
      {
        name: "description",
        content: "Importação de planilhas Excel de contas a pagar, receber, saldos e projeções de abate.",
      },
      { property: "og:title", content: "Importações | Grupo Otávio Lage" },
      { property: "og:description", content: "Carga de dados por planilha com mapeamento de colunas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Importacoes,
});

type Linha = Record<string, unknown>;

const CAMPOS = [
  { chave: "empresa", rotulo: "Empresa" },
  { chave: "categoria", rotulo: "Categoria" },
  { chave: "descricao", rotulo: "Descrição" },
  { chave: "contraparte", rotulo: "Contraparte / Fornecedor" },
  { chave: "documento", rotulo: "Documento" },
  { chave: "data_prevista", rotulo: "Data prevista / vencimento" },
  { chave: "valor", rotulo: "Valor" },
  { chave: "banco", rotulo: "Banco" },
];

function Importacoes() {
  const { podeEditar, user } = useAuth();
  const { data: empresas } = useEmpresas();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState("");
  const [abas, setAbas] = useState<string[]>([]);
  const [aba, setAba] = useState("");
  const [wb, setWb] = useState<XLSX.WorkBook | null>(null);
  const [colunas, setColunas] = useState<string[]>([]);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [mapa, setMapa] = useState<Record<string, string>>({});
  const [tipoFonte, setTipoFonte] = useState("contas_a_pagar");
  const [enviando, setEnviando] = useState(false);

  const historico = useQuery({
    queryKey: ["importacoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("importacoes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });

  const carregarAba = (livro: XLSX.WorkBook, nome: string) => {
    const ws = livro.Sheets[nome];
    if (!ws) return;
    const dados = XLSX.utils.sheet_to_json<Linha>(ws, { defval: "" });
    const cols = Object.keys(dados[0] ?? {});
    setColunas(cols);
    setLinhas(dados);
    const auto: Record<string, string> = {};
    CAMPOS.forEach((c) => {
      const achado = cols.find((col) =>
        col
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .includes(c.chave.split("_")[0] ?? c.chave),
      );
      if (achado) auto[c.chave] = achado;
    });
    setMapa(auto);
  };

  const aoSelecionar = async (file: File) => {
    const buf = await file.arrayBuffer();
    const livro = XLSX.read(buf, { cellDates: true });
    setWb(livro);
    setArquivo(file.name);
    setAbas(livro.SheetNames);
    const primeira = livro.SheetNames[0] ?? "";
    setAba(primeira);
    carregarAba(livro, primeira);
  };

  const normalizarData = (v: unknown): string => {
    if (v instanceof Date) return iso(v);
    if (typeof v === "number") {
      const d = XLSX.SSF.parse_date_code(v);
      if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
    }
    const s = String(v ?? "").trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
      const [d, m, y] = s.split("/");
      return `${y}-${m}-${d}`;
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    return iso(new Date());
  };

  const normalizarValor = (v: unknown) => {
    if (typeof v === "number") return v;
    const s = String(v ?? "0")
      .replace(/[^\d,.-]/g, "")
      .replace(/\./g, "")
      .replace(",", ".");
    return Number(s) || 0;
  };

  const importar = async () => {
    if (!linhas.length) return;
    setEnviando(true);
    const natureza = tipoFonte === "contas_a_receber" || tipoFonte === "projecao_abate" ? "entrada" : "saida";
    const registros = linhas
      .map((l) => {
        const nomeEmpresa = String(l[mapa["empresa"] ?? ""] ?? "").trim();
        const empresa = (empresas ?? []).find(
          (e) =>
            e.nome.toLowerCase() === nomeEmpresa.toLowerCase() ||
            (e.apelido ?? "").toLowerCase() === nomeEmpresa.toLowerCase(),
        );
        const valor = normalizarValor(l[mapa["valor"] ?? ""]);
        return {
          empresa_id: empresa?.id ?? null,
          natureza,
          categoria:
            String(l[mapa["categoria"] ?? ""] ?? "").trim() ||
            (natureza === "entrada" ? CATEGORIAS_ENTRADA[0] : "Despesas gerais"),
          descricao: String(l[mapa["descricao"] ?? ""] ?? ""),
          contraparte: String(l[mapa["contraparte"] ?? ""] ?? ""),
          documento: String(l[mapa["documento"] ?? ""] ?? ""),
          banco: String(l[mapa["banco"] ?? ""] ?? ""),
          data_prevista: normalizarData(l[mapa["data_prevista"] ?? ""]),
          valor_original: Math.abs(valor),
          valor_liquido: Math.abs(valor),
          status: "estimado",
          fonte: tipoFonte,
        };
      })
      .filter((r) => r.valor_liquido > 0);

    const rejeitadas = linhas.length - registros.length;
    const { error } = await supabase.from("movimentacoes").insert(registros as never);
    if (error) {
      setEnviando(false);
      toast.error("Falha na importação: " + error.message);
      return;
    }
    await supabase.from("importacoes").insert({
      tipo_fonte: tipoFonte,
      arquivo_nome: arquivo,
      aba,
      mapeamento: mapa,
      total_linhas: linhas.length,
      importadas: registros.length,
      rejeitadas,
      duplicadas: 0,
      usuario: user?.email ?? "sistema",
    });
    setEnviando(false);
    toast.success(`${registros.length} registros importados (${rejeitadas} ignorados).`);
    setLinhas([]);
    setColunas([]);
    setArquivo("");
    void qc.invalidateQueries({ queryKey: ["movimentacoes"] });
    void historico.refetch();
  };

  const totalPrevisto = linhas.reduce((a, l) => a + normalizarValor(l[mapa["valor"] ?? ""]), 0);

  return (
    <div>
      <h1 className="text-lg font-semibold">Importações</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Carregue planilhas Excel, confira o mapeamento das colunas e importe para o fluxo.
      </p>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Nova importação</CardTitle>
            <CardDescription>Formatos aceitos: .xlsx, .xls e .csv</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Tipo de fonte</Label>
                <Select value={tipoFonte} onValueChange={setTipoFonte}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_FONTE.map((t) => (
                      <SelectItem key={t.valor} value={t.valor}>
                        {t.rotulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs text-muted-foreground">Arquivo</Label>
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && void aoSelecionar(e.target.files[0])}
                  />
                  <Button variant="outline" className="w-full justify-start" onClick={() => inputRef.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" />
                    {arquivo || "Selecionar planilha"}
                  </Button>
                </div>
              </div>
            </div>

            {abas.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Aba da planilha</Label>
                <Select
                  value={aba}
                  onValueChange={(v) => {
                    setAba(v);
                    if (wb) carregarAba(wb, v);
                  }}
                >
                  <SelectTrigger className="max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {abas.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {colunas.length > 0 && (
              <>
                <div>
                  <p className="mb-2 text-sm font-medium">Mapeamento de colunas</p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {CAMPOS.map((c) => (
                      <div key={c.chave} className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">{c.rotulo}</Label>
                        <Select
                          value={mapa[c.chave] ?? "__nenhuma"}
                          onValueChange={(v) => setMapa({ ...mapa, [c.chave]: v === "__nenhuma" ? "" : v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__nenhuma">Não utilizar</SelectItem>
                            {colunas.map((col) => (
                              <SelectItem key={col} value={col}>
                                {col}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-md border">
                  <div className="flex items-center justify-between border-b bg-muted px-3 py-2 text-sm">
                    <span>
                      Pré-visualização — {linhas.length} linhas · total {brl(totalPrevisto)}
                    </span>
                    <Badge variant="outline">{aba}</Badge>
                  </div>
                  <div className="max-h-64 overflow-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50">
                        <tr>
                          {colunas.slice(0, 8).map((c) => (
                            <th key={c} className="p-2 text-left font-medium">
                              {c}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {linhas.slice(0, 12).map((l, i) => (
                          <tr key={i} className="border-t">
                            {colunas.slice(0, 8).map((c) => (
                              <td key={c} className="p-2">
                                {l[c] instanceof Date ? dataHoraBR(l[c] as Date) : String(l[c] ?? "")}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => void importar()} disabled={!podeEditar || enviando}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Importar {linhas.length} linhas
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Histórico de importações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(historico.data ?? []).map((h) => (
              <div key={h.id} className="rounded-md border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{h.arquivo_nome ?? h.tipo_fonte}</span>
                  <Badge variant="outline">{h.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {dataHoraBR(h.created_at)} · {h.usuario ?? "—"}
                </p>
                <p className="mt-1 text-xs">
                  {h.importadas} importadas · {h.rejeitadas} rejeitadas · {h.duplicadas} duplicadas
                </p>
              </div>
            ))}
            {!(historico.data ?? []).length && (
              <p className="text-sm text-muted-foreground">Nenhuma importação registrada ainda.</p>
            )}
          </CardContent>
        </Card>
      </div>
      <p className="sr-only">{dataHoraBR(toDate(new Date()))}</p>
    </div>
  );
}
