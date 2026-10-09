-- Consolida razões sociais e nomes fantasia que representam a mesma empresa.
-- Os vínculos são transferidos antes da exclusão, preservando todo o histórico.
create or replace function public.chave_empresa(valor text)
returns text
language sql
immutable
as $$
  select case
    when chave = 'VERA CRUZ AGROPECUARIA' then 'VERA CRUZ AGROPECUARIA'
    when chave = 'OL LATEX' then 'OL LATEX'
    when chave = 'OL LATEX TOCANTINS' then 'OL LATEX TOCANTINS'
    when chave = 'PALMEIRAS EMPREENDIMENTOS IMOBILIARIOS' then 'PALMEIRAS EMPREENDIMENTOS IMOBILIARIOS'
    when chave in ('PLANAGRI', 'PLANAGRI AGROPECUARIA') then 'PLANAGRI'
    when chave in ('GOIAS CARNE', 'COOPERBOI', 'GOIAS CARNE COOPERBOI') then 'GOIAS CARNE COOPERBOI'
    when chave = 'RVC' then 'RVC'
    when chave = 'PARQUE DAS ESTRELAS' then 'PARQUE DAS ESTRELAS'
    when chave = 'SERRA BONITA' then 'SERRA BONITA'
    when chave = 'SOLO VERDE' then 'SOLO VERDE'
    else chave
  end
  from (
    select trim(regexp_replace(
      regexp_replace(
        translate(upper(coalesce(valor, '')), 'ÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ', 'AAAAEEEIIIOOOOUUUC'),
        '[^A-Z0-9]+', ' ', 'g'
      ),
      '\m(SOCIEDADE ANONIMA|LIMITADA|EIRELI|SPE|S A|SA|LTDA|ME|EPP)\M', ' ', 'g'
    )) as chave
  ) normalizado;
$$;

do $$
declare
  grupo record;
  duplicada record;
  id_oficial uuid;
  nome_oficial text;
begin
  for grupo in
    select public.chave_empresa(nome) as chave
    from public.empresas
    group by public.chave_empresa(nome)
    having count(*) > 1
  loop
    nome_oficial := case grupo.chave
      when 'VERA CRUZ AGROPECUARIA' then 'Vera Cruz Agropecuária'
      when 'OL LATEX' then 'OL Látex'
      when 'OL LATEX TOCANTINS' then 'OL Látex Tocantins'
      when 'PALMEIRAS EMPREENDIMENTOS IMOBILIARIOS' then 'Palmeiras Empreendimentos Imobiliários'
      when 'PLANAGRI' then 'Planagri'
      when 'GOIAS CARNE COOPERBOI' then 'Goiás Carne/Cooperboi'
      when 'RVC' then 'RVC'
      when 'PARQUE DAS ESTRELAS' then 'Parque das Estrelas'
      when 'SERRA BONITA' then 'Serra Bonita'
      when 'SOLO VERDE' then 'Solo Verde'
      else null
    end;

    select id into id_oficial
    from public.empresas
    where public.chave_empresa(nome) = grupo.chave
    order by (nome = nome_oficial) desc, created_at, id
    limit 1;

    for duplicada in
      select id from public.empresas
      where public.chave_empresa(nome) = grupo.chave and id <> id_oficial
    loop
      update public.movimentacoes set empresa_id = id_oficial where empresa_id = duplicada.id;
      update public.disponibilidades set empresa_id = id_oficial where empresa_id = duplicada.id;
      update public.regras_classificacao set empresa_id = id_oficial where empresa_id = duplicada.id;
      update public.contratos_financeiros set empresa_id = id_oficial where empresa_id = duplicada.id;
      update public.receitas_abate set empresa_id = id_oficial where empresa_id = duplicada.id;
      delete from public.empresas where id = duplicada.id;
    end loop;

    if nome_oficial is not null then
      update public.empresas set nome = nome_oficial where id = id_oficial;
    end if;
  end loop;
end $$;
