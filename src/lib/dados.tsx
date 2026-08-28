import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { calcularFluxo, montarSemanas, type Cenario, type Movimentacao } from "./fluxo";
import { inicioSemana, iso } from "./format";

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

export function FiltrosProvider({ children }: { children: ReactNode }) {
  const [filtros, setF] = useState<Filtros>({
    dataBase: iso(inicioSemana(new Date())),
    horizonte: 13,
    empresaIds: [],
    grupo: "todos",
    cenarioId: "",
    status: "todos",
  });
  const valor = useMemo(
    () => ({ filtros, setFiltros: (p: Partial<Filtros>) => setF((a) => ({ ...a, ...p })) }),
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

export const useMovimentacoes = () =>
  useQuery({
    queryKey: ["movimentacoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movimentacoes")
        .select("*")
        .order("data_prevista")
        .limit(20000);
      if (error) throw error;
      return (data ?? []) as unknown as Movimentacao[];
    },
  });

export const useDisponibilidades = () =>
  useQuery({
    queryKey: ["disponibilidades"],
    queryFn: async () => {
      const { data, error } = await supabase.from("disponibilidades").select("*").order("banco");
      if (error) throw error;
      return (data ?? []) as unknown as Disponibilidade[];
    },
  });

/** Fluxo consolidado já aplicando os filtros globais. */
export function useFluxo() {
  const { filtros } = useFiltros();
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

  const saldoInicial = disponibilidades
    .filter((d) => d.disponivel_resgate)
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
    carregando: movs.isLoading || disp.isLoading || empresas.isLoading,
  };
}
