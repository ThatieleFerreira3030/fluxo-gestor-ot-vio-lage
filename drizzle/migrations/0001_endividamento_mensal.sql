ALTER TABLE public.posicoes_dividas
  ADD COLUMN IF NOT EXISTS curto_prazo numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS longo_prazo numeric NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.resumos_endividamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_base date NOT NULL UNIQUE,
  divida_bancaria numeric NOT NULL DEFAULT 0,
  divida_tributaria numeric NOT NULL DEFAULT 0,
  divida_bruta numeric NOT NULL DEFAULT 0,
  curto_prazo numeric NOT NULL DEFAULT 0,
  longo_prazo numeric NOT NULL DEFAULT 0,
  quotas_capital numeric NOT NULL DEFAULT 0,
  disponibilidades numeric NOT NULL DEFAULT 0,
  divida_liquida numeric NOT NULL DEFAULT 0,
  fonte text NOT NULL DEFAULT 'Endividamento - Graficos.xlsx',
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cronograma_endividamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_base date NOT NULL,
  periodo text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  valor numeric NOT NULL DEFAULT 0,
  fonte text NOT NULL DEFAULT 'Endividamento - Graficos.xlsx',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (data_base, periodo)
);

CREATE INDEX IF NOT EXISTS resumos_endividamento_data_idx ON public.resumos_endividamento (data_base DESC);
CREATE INDEX IF NOT EXISTS cronograma_endividamento_data_idx ON public.cronograma_endividamento (data_base DESC, ordem);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.resumos_endividamento TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cronograma_endividamento TO authenticated;
GRANT ALL ON public.resumos_endividamento TO service_role;
GRANT ALL ON public.cronograma_endividamento TO service_role;

ALTER TABLE public.resumos_endividamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cronograma_endividamento ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leitura autenticada" ON public.resumos_endividamento;
DROP POLICY IF EXISTS "escrita editores" ON public.resumos_endividamento;
DROP POLICY IF EXISTS "update editores" ON public.resumos_endividamento;
DROP POLICY IF EXISTS "delete editores" ON public.resumos_endividamento;
CREATE POLICY "leitura autenticada" ON public.resumos_endividamento FOR SELECT TO authenticated USING (true);
CREATE POLICY "escrita editores" ON public.resumos_endividamento FOR INSERT TO authenticated WITH CHECK (public.is_editor());
CREATE POLICY "update editores" ON public.resumos_endividamento FOR UPDATE TO authenticated USING (public.is_editor()) WITH CHECK (public.is_editor());
CREATE POLICY "delete editores" ON public.resumos_endividamento FOR DELETE TO authenticated USING (public.is_editor());

DROP POLICY IF EXISTS "leitura autenticada" ON public.cronograma_endividamento;
DROP POLICY IF EXISTS "escrita editores" ON public.cronograma_endividamento;
DROP POLICY IF EXISTS "update editores" ON public.cronograma_endividamento;
DROP POLICY IF EXISTS "delete editores" ON public.cronograma_endividamento;
CREATE POLICY "leitura autenticada" ON public.cronograma_endividamento FOR SELECT TO authenticated USING (true);
CREATE POLICY "escrita editores" ON public.cronograma_endividamento FOR INSERT TO authenticated WITH CHECK (public.is_editor());
CREATE POLICY "update editores" ON public.cronograma_endividamento FOR UPDATE TO authenticated USING (public.is_editor()) WITH CHECK (public.is_editor());
CREATE POLICY "delete editores" ON public.cronograma_endividamento FOR DELETE TO authenticated USING (public.is_editor());

NOTIFY pgrst, 'reload schema';