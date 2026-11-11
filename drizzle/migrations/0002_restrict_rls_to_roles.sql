CREATE OR REPLACE FUNCTION public.tem_acesso()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid())
$$;
REVOKE EXECUTE ON FUNCTION public.tem_acesso() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.tem_acesso() TO authenticated;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY array['empresas','categorias','cenarios','versoes','movimentacoes','disponibilidades','regras_classificacao','contratos_financeiros','parcelas_divida','receitas_abate','importacoes','pendencias','auditoria','comentarios','parametros','lotes_importacao','resumos_endividamento','cronograma_endividamento'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "leitura autenticada" ON public.%I', t);
    EXECUTE format('CREATE POLICY "leitura autenticada" ON public.%I FOR SELECT TO authenticated USING (public.tem_acesso())', t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Usuarios autenticados leem posicoes_dividas" ON public.posicoes_dividas;
DROP POLICY IF EXISTS "Usuarios autenticados gravam posicoes_dividas" ON public.posicoes_dividas;
DROP POLICY IF EXISTS "Usuarios autenticados atualizam posicoes_dividas" ON public.posicoes_dividas;
DROP POLICY IF EXISTS "Usuarios autenticados excluem posicoes_dividas" ON public.posicoes_dividas;
CREATE POLICY "leitura autenticada" ON public.posicoes_dividas FOR SELECT TO authenticated USING (public.tem_acesso());
CREATE POLICY "editores gravam" ON public.posicoes_dividas FOR INSERT TO authenticated WITH CHECK (public.is_editor());
CREATE POLICY "editores atualizam" ON public.posicoes_dividas FOR UPDATE TO authenticated USING (public.is_editor()) WITH CHECK (public.is_editor());
CREATE POLICY "editores excluem" ON public.posicoes_dividas FOR DELETE TO authenticated USING (public.is_editor());

DROP POLICY IF EXISTS "profiles readable" ON public.profiles;
CREATE POLICY "profiles readable" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "roles readable" ON public.user_roles;
CREATE POLICY "roles readable" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));