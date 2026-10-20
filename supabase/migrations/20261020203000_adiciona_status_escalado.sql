-- Mantém o estágio operacional "Escalado" separado de "Confirmado".
alter type public.status_info add value if not exists 'escalado' after 'confirmado';
