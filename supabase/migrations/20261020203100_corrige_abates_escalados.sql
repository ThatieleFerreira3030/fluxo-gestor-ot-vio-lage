-- Corrige registros de abate importados antes da criação do status "Escalado".
-- A migração fica separada da alteração do enum para que o novo valor já esteja
-- disponível em uma transação posterior.
update public.movimentacoes
set status = 'escalado'::public.status_info
where categoria = 'Abate de bovinos'
  and status = 'confirmado'
  and lower(coalesce(detalhe ->> 'Situação', detalhe ->> 'Situacao', '')) like '%escalado%';
