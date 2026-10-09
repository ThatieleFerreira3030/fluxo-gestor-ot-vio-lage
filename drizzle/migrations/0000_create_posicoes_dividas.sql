CREATE TABLE public.posicoes_dividas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id UUID REFERENCES public.lotes_importacao(id) ON DELETE SET NULL,
  data_base DATE NOT NULL,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
  chave_origem TEXT,
  tipo TEXT NOT NULL DEFAULT 'bancaria',
  credor TEXT NOT NULL,
  modalidade TEXT,
  numero_contrato TEXT,
  saldo_contabil_aproximado NUMERIC NOT NULL DEFAULT 0,
  indexador TEXT,
  taxa TEXT,
  vencimento DATE,
  parcelas_restantes INTEGER,
  safra_1 NUMERIC NOT NULL DEFAULT 0,
  safra_2 NUMERIC NOT NULL DEFAULT 0,
  safra_3 NUMERIC NOT NULL DEFAULT 0,
  outras_safras NUMERIC NOT NULL DEFAULT 0,
  fonte TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (data_base, chave_origem)
);

CREATE INDEX idx_posicoes_dividas_data_base ON public.posicoes_dividas (data_base);
CREATE INDEX idx_posicoes_dividas_lote ON public.posicoes_dividas (lote_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.posicoes_dividas TO authenticated;
GRANT ALL ON public.posicoes_dividas TO service_role;

ALTER TABLE public.posicoes_dividas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados leem posicoes_dividas"
  ON public.posicoes_dividas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados gravam posicoes_dividas"
  ON public.posicoes_dividas FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Usuarios autenticados atualizam posicoes_dividas"
  ON public.posicoes_dividas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Usuarios autenticados excluem posicoes_dividas"
  ON public.posicoes_dividas FOR DELETE TO authenticated USING (true);