-- Garante que a fotografia contábil mensal das dívidas exista antes do front-end
-- tentar publicar a aba "Saldos atuais".
CREATE TABLE IF NOT EXISTS public.posicoes_dividas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id uuid REFERENCES public.lotes_importacao(id) ON DELETE SET NULL,
  data_base date NOT NULL,
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE SET NULL,
  chave_origem text NOT NULL,
  tipo text NOT NULL DEFAULT 'bancaria'
    CHECK (tipo IN ('bancaria', 'tributaria', 'acionistas', 'outras')),
  credor text NOT NULL,
  modalidade text,
  numero_contrato text,
  saldo_contabil_aproximado numeric NOT NULL DEFAULT 0,
  indexador text,
  taxa text,
  vencimento date,
  parcelas_restantes integer,
  safra_1 numeric NOT NULL DEFAULT 0,
  safra_2 numeric NOT NULL DEFAULT 0,
  safra_3 numeric NOT NULL DEFAULT 0,
  outras_safras numeric NOT NULL DEFAULT 0,
  fonte text NOT NULL DEFAULT 'Saldos atuais',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (data_base, chave_origem)
);

CREATE INDEX IF NOT EXISTS posicoes_dividas_data_base_idx
  ON public.posicoes_dividas (data_base DESC);
CREATE INDEX IF NOT EXISTS posicoes_dividas_tipo_idx
  ON public.posicoes_dividas (tipo);
CREATE INDEX IF NOT EXISTS posicoes_dividas_lote_idx
  ON public.posicoes_dividas (lote_id);
CREATE INDEX IF NOT EXISTS posicoes_dividas_empresa_idx
  ON public.posicoes_dividas (empresa_id);

ALTER TABLE public.posicoes_dividas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leitura autenticada" ON public.posicoes_dividas;
DROP POLICY IF EXISTS "escrita editores" ON public.posicoes_dividas;
DROP POLICY IF EXISTS "update editores" ON public.posicoes_dividas;
DROP POLICY IF EXISTS "delete editores" ON public.posicoes_dividas;

CREATE POLICY "leitura autenticada"
  ON public.posicoes_dividas
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "escrita editores"
  ON public.posicoes_dividas
  FOR INSERT TO authenticated
  WITH CHECK (public.is_editor());

CREATE POLICY "update editores"
  ON public.posicoes_dividas
  FOR UPDATE TO authenticated
  USING (public.is_editor())
  WITH CHECK (public.is_editor());

CREATE POLICY "delete editores"
  ON public.posicoes_dividas
  FOR DELETE TO authenticated
  USING (public.is_editor());

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.posicoes_dividas TO authenticated;
GRANT ALL ON public.posicoes_dividas TO service_role;

-- Faz a API do Supabase reconhecer imediatamente a nova tabela.
NOTIFY pgrst, 'reload schema';
