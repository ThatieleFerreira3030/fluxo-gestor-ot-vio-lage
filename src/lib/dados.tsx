import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { calcularFluxo, montarSemanas, type Cenario, type Movimentacao } from "./fluxo";
import { addDias, inicioSemana, iso, toDate } from "./format";

/** Quotas não compõem o saldo inicial do fluxo. */
const ehQuota = (tipo: string) =>
  tipo.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes("quota");

export type Empresa = {
  id: string;
  nome: string;
  apelido: string | null;
  grupo: string | null;
  cnpj: string | null;
  ativa: boolean;
  demo: boolean;
};

export type Disponibilidade = {
  id: string;
  data_base: string;
  empresa_id: string | null;
  banco: string;
  agencia: string | null;
  conta: string | null;
  tipo: string;
  produto: string | null;
  saldo: number;
  percentual_cdi: number | null;
  liquidez: string | null;
  disponivel_resgate: boolean;
  valor_bloqueado: number;
  observacao: string | null;
  fonte: string | null;
  responsavel: string | null;
  demo: boolean;
  coligada?: string | null;
  codigo_conta?: string | null;
  lote_id?: string | null;
};

type Filtros = {
  dataBase: string;
  horizonte: number;
  /** Vazio = todas as empresas (respeitando o filtro de grupo). */
  empresaIds: string[];
  grupo: string;
  cenarioId: string;
  status: string;
};

type Ctx = {
  filtros: Filtros;
  setFiltros: (f: Partial<Filtros>) => void;
};

const FiltrosCtx = createContext<Ctx>({
  filtros: {
    dataBase: "",
    horizonte: 13,
    empresaIds: [],
    grupo: "todos",
    cenarioId: "",
    status: "todos",
  },
  setFiltros: () => {},
});

export type LoteImportacao = {
  id: string;
  numero: number;
  data_base: string;
  status: string;
  arquivos: Record<string, unknown>;
  totais: Record<string, number>;
  avisos: unknown;
  usuario: string | null;
  publicado_em: string | null;
  created_at: string;
};

/** Atualização semanal atualmente publicada (única versão ativa). */
export const useLoteAtivo = () =>
  useQuery({
    queryKey: ["lote-ativo"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lotes_importacao")
        .select("*")
        .eq("status", "ativo")
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as LoteImportacao | null;
    },
  });

export const useLotes = () =>
  useQuery({
    queryKey: ["lotes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lotes_importacao")
        .select("*")
        .order("numero", { ascending: false });
      if (error) throw error;
      return (data ?? []) as LoteImportacao[];
    },
  });

export function FiltrosProvider({ children }: { children: ReactNode }) {
  const [filtros, setF] = useState<Filtros>({
    dataBase: iso(inicioSemana(new Date())),
    horizonte: 13,
    empresaIds: [],
    grupo: "todos",
    cenarioId: "",
    status: "todos",
  });
  const lote = useLoteAtivo();
  const dataBaseLote = lote.data?.data_base ?? null;
  const [dataBaseManual, setDataBaseManual] = useState(false);

  useEffect(() => {
    if (!dataBaseLote || dataBaseManual) return;
    const inicio = iso(inicioSemana(addDias(toDate(dataBaseLote), 1)));
    setF((a) => (a.dataBase === inicio ? a : { ...a, dataBase: inicio }));
  }, [dataBaseLote, dataBaseManual]);

  const valor = useMemo(
    () => ({
      filtros,
      setFiltros: (p: Partial<Filtros>) => {
        if (p.dataBase) setDataBaseManual(true);
        setF((a) => ({ ...a, ...p }));
      },
    }),
    [filtros],
  );
  return <FiltrosCtx.Provider value={valor}>{children}</FiltrosCtx.Provider>;
}

export const useFiltros = () => useContext(FiltrosCtx);

export const useEmpresas = () =>
  useQuery({
    queryKey: ["empresas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("empresas").select("*").order("nome");
      if (error) throw error;
      return (data ?? []) as Empresa[];
    },
  });

export const useCenarios = () =>
  useQuery({
    queryKey: ["cenarios"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cenarios").select("*").order("created_at");
      if (error) throw error;
      return (data ?? []) as Cenario[];
    },
  });

export const useMovimentacoes = () => {
  const lote = useLoteAtivo();
  const loteId = lote.data?.id ?? null;
  return useQuery({
    queryKey: ["movimentacoes", loteId],
    enabled: !lote.isLoading,
    queryFn: async () => {
      let q = supabase.from("movimentacoes").select("*").order("data_prevista").limit(50000);
      // Depois da primeira publicação, só a versão ativa alimenta o fluxo.
      if (loteId) q = q.eq("lote_id", loteId);
      else q = q.is("lote_id", null);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Movimentacao[];
    },
  });
};

export const useDisponibilidades = () => {
  const lote = useLoteAtivo();
  const loteId = lote.data?.id ?? null;
  return useQuery({
    queryKey: ["disponibilidades", loteId],
    enabled: !lote.isLoading,
    queryFn: async () => {
      let q = supabase.from("disponibilidades").select("*").order("banco");
      if (loteId) q = q.eq("lote_id", loteId);
      else q = q.is("lote_id", null);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Disponibilidade[];
    },
  });
};

/** Fluxo consolidado já aplicando os filtros globais. */
export function useFluxo() {
  const { filtros } = useFiltros();
  const lote = useLoteAtivo();
  const empresas = useEmpresas();
  const cenarios = useCenarios();
  const movs = useMovimentacoes();
  const disp = useDisponibilidades();

  const cenario =
    cenarios.data?.find((c) => c.id === filtros.cenarioId) ??
    cenarios.data?.find((c) => c.oficial) ??
    null;

  const empresasFiltradas = useMemo(() => {
    let lista = empresas.data ?? [];
    if (filtros.empresaIds.length > 0) {
      const ids = new Set(filtros.empresaIds);
      lista = lista.filter((e) => ids.has(e.id));
    }
    if (filtros.grupo !== "todos") lista = lista.filter((e) => e.grupo === filtros.grupo);
    return lista;
  }, [empresas.data, filtros.empresaIds, filtros.grupo]);

  const idsPermitidos = useMemo(
    () => new Set(empresasFiltradas.map((e) => e.id)),
    [empresasFiltradas],
  );

  const movimentacoes = useMemo(
    () =>
      (movs.data ?? []).filter(
        (m) =>
          (!m.empresa_id || idsPermitidos.has(m.empresa_id)) &&
          (filtros.status === "todos" || m.status === filtros.status),
      ),
    [movs.data, idsPermitidos, filtros.status],
  );

  const disponibilidades = useMemo(
    () => (disp.data ?? []).filter((d) => !d.empresa_id || idsPermitidos.has(d.empresa_id)),
    [disp.data, idsPermitidos],
  );

  // Saldo inicial = soma dos saldos disponíveis, exceto Quotas.
  const saldoInicial = disponibilidades
    .filter((d) => d.disponivel_resgate && !ehQuota(d.tipo ?? ""))
    .reduce((a, d) => a + Number(d.saldo) - Number(d.valor_bloqueado ?? 0), 0);

  const semanas = useMemo(
    () => montarSemanas(filtros.dataBase, filtros.horizonte),
    [filtros.dataBase, filtros.horizonte],
  );

  const fluxo = useMemo(
    () => calcularFluxo(movimentacoes, saldoInicial, semanas, cenario),
    [movimentacoes, saldoInicial, semanas, cenario],
  );

  return {
    fluxo,
    cenario,
    cenarios: cenarios.data ?? [],
    empresas: empresas.data ?? [],
    empresasFiltradas,
    movimentacoes,
    disponibilidades,
    lote: lote.data ?? null,
    carregando: movs.isLoading || disp.isLoading || empresas.isLoading,
  };
}
