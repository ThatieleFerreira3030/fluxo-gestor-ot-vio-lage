CREATE TABLE IF NOT EXISTS public.lotes_importacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero integer NOT NULL,
  data_base date NOT NULL,
  status text NOT NULL DEFAULT 'rascunho',
  arquivos jsonb NOT NULL DEFAULT '{}'::jsonb,
  totais jsonb NOT NULL DEFAULT '{}'::jsonb,
  avisos jsonb NOT NULL DEFAULT '[]'::jsonb,
  usuario text,
  publicado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lotes_importacao TO authenticated;
GRANT ALL ON public.lotes_importacao TO service_role;

ALTER TABLE public.lotes_importacao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leitura autenticada" ON public.lotes_importacao;
DROP POLICY IF EXISTS "escrita editores" ON public.lotes_importacao;
DROP POLICY IF EXISTS "update editores" ON public.lotes_importacao;
DROP POLICY IF EXISTS "delete editores" ON public.lotes_importacao;
CREATE POLICY "leitura autenticada" ON public.lotes_importacao FOR SELECT TO authenticated USING (true);
CREATE POLICY "escrita editores" ON public.lotes_importacao FOR INSERT TO authenticated WITH CHECK (is_editor());
CREATE POLICY "update editores" ON public.lotes_importacao FOR UPDATE TO authenticated USING (is_editor()) WITH CHECK (is_editor());
CREATE POLICY "delete editores" ON public.lotes_importacao FOR DELETE TO authenticated USING (is_editor());

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $fn$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS lotes_importacao_updated_at ON public.lotes_importacao;
CREATE TRIGGER lotes_importacao_updated_at BEFORE UPDATE ON public.lotes_importacao
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE UNIQUE INDEX IF NOT EXISTS lotes_importacao_um_ativo ON public.lotes_importacao (status) WHERE status = 'ativo';

ALTER TABLE public.movimentacoes ADD COLUMN IF NOT EXISTS lote_id uuid REFERENCES public.lotes_importacao(id) ON DELETE CASCADE;
ALTER TABLE public.movimentacoes ADD COLUMN IF NOT EXISTS detalhe jsonb;
ALTER TABLE public.movimentacoes ADD COLUMN IF NOT EXISTS chave_origem text;
CREATE INDEX IF NOT EXISTS movimentacoes_lote_idx ON public.movimentacoes (lote_id);

ALTER TABLE public.disponibilidades ADD COLUMN IF NOT EXISTS lote_id uuid REFERENCES public.lotes_importacao(id) ON DELETE CASCADE;
ALTER TABLE public.disponibilidades ADD COLUMN IF NOT EXISTS coligada text;
ALTER TABLE public.disponibilidades ADD COLUMN IF NOT EXISTS codigo_conta text;
ALTER TABLE public.disponibilidades ADD COLUMN IF NOT EXISTS chave_origem text;
CREATE INDEX IF NOT EXISTS disponibilidades_lote_idx ON public.disponibilidades (lote_id);

CREATE OR REPLACE FUNCTION public.publicar_lote(_lote uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_editor() THEN
    RAISE EXCEPTION 'Sem permissão para publicar atualizações';
  END IF;
  UPDATE public.lotes_importacao SET status = 'historico' WHERE status = 'ativo' AND id <> _lote;
  UPDATE public.lotes_importacao SET status = 'ativo', publicado_em = now() WHERE id = _lote;
END;
$$;