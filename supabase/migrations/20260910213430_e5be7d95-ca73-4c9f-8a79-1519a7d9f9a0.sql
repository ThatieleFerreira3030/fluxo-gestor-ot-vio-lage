REVOKE ALL ON FUNCTION public.publicar_lote(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publicar_lote(uuid) TO authenticated;