-- ===== enums =====
create type public.app_role as enum ('admin','financeiro','diretoria');
create type public.status_info as enum ('confirmado','estimado','pendente','realizado','cancelado');
create type public.natureza_mov as enum ('entrada','saida');

-- ===== profiles =====
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  email text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles readable" on public.profiles for select to authenticated using (true);
create policy "profiles self update" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles self insert" on public.profiles for insert to authenticated with check (auth.uid() = id);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_editor()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role in ('admin','financeiro'))
$$;

create policy "roles readable" on public.user_roles for select to authenticated using (true);
create policy "admin manage roles" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- new users: profile + default financeiro role (first user becomes admin)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nome, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', split_part(new.email,'@',1)), new.email)
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role)
  values (new.id, case when (select count(*) from public.user_roles) = 0 then 'admin'::public.app_role else 'financeiro'::public.app_role end)
  on conflict do nothing;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===== core =====
create table public.empresas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  apelido text,
  cnpj text,
  grupo text,
  ativa boolean not null default true,
  demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  grupo text not null,
  nome text not null,
  subcategoria text,
  ordem int not null default 0,
  ativa boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.cenarios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text not null default 'base',
  descricao text,
  oficial boolean not null default false,
  fator_receita numeric not null default 1,
  fator_despesa numeric not null default 1,
  saldo_minimo numeric not null default 0,
  created_at timestamptz not null default now()
);

create table public.versoes (
  id uuid primary key default gen_random_uuid(),
  numero int not null,
  data_base date not null,
  periodo_inicio date,
  periodo_fim date,
  cenario_id uuid references public.cenarios(id),
  status text not null default 'aberta',
  responsavel text,
  observacoes text,
  consolidado jsonb,
  fechada_em timestamptz,
  created_at timestamptz not null default now()
);

create table public.movimentacoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id) on delete set null,
  filial text,
  natureza public.natureza_mov not null,
  categoria text not null default 'Não classificado',
  subcategoria text,
  descricao text,
  contraparte text,
  documento text,
  tipo_documento text,
  cpf_cnpj text,
  data_emissao date,
  data_vencimento date,
  data_prevista date not null,
  data_baixa date,
  valor_original numeric not null default 0,
  valor_liquido numeric not null default 0,
  valor_baixado numeric not null default 0,
  banco text,
  fonte text default 'manual',
  competencia text,
  status public.status_info not null default 'estimado',
  observacao text,
  responsavel text,
  cenario_id uuid references public.cenarios(id),
  versao_id uuid references public.versoes(id),
  importacao_id uuid,
  demo boolean not null default false,
  editado_manual boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.movimentacoes (data_prevista);
create index on public.movimentacoes (empresa_id);

create table public.disponibilidades (
  id uuid primary key default gen_random_uuid(),
  data_base date not null,
  empresa_id uuid references public.empresas(id) on delete cascade,
  banco text not null,
  agencia text,
  conta text,
  tipo text not null default 'conta_corrente',
  produto text,
  saldo numeric not null default 0,
  percentual_cdi numeric,
  liquidez text default 'imediata',
  data_vencimento date,
  carencia date,
  disponivel_resgate boolean not null default true,
  valor_bloqueado numeric not null default 0,
  observacao text,
  fonte text default 'manual',
  responsavel text,
  demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.regras_classificacao (
  id uuid primary key default gen_random_uuid(),
  campo text not null default 'plano_financeiro',
  condicao text not null default 'contem',
  valor text not null,
  empresa_id uuid references public.empresas(id) on delete cascade,
  categoria_destino text not null,
  subcategoria text,
  prioridade int not null default 10,
  vigencia_inicio date,
  ativa boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.contratos_financeiros (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id) on delete cascade,
  instituicao text not null,
  tipo_operacao text,
  numero_contrato text,
  data_contratacao date,
  valor_original numeric not null default 0,
  saldo_devedor numeric not null default 0,
  indexador text,
  taxa numeric,
  data_vencimento date,
  periodicidade text,
  garantias text,
  status text not null default 'ativo',
  observacoes text,
  demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.parcelas_divida (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references public.contratos_financeiros(id) on delete cascade,
  vencimento date not null,
  principal numeric not null default 0,
  juros numeric not null default 0,
  status public.status_info not null default 'estimado',
  created_at timestamptz not null default now()
);

create table public.receitas_abate (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id) on delete cascade,
  data_embarque date,
  data_abate date,
  data_prevista date not null,
  categoria_animal text,
  quantidade int not null default 0,
  peso_estimado numeric,
  mercado text,
  destino text,
  preco numeric,
  faturamento_projetado numeric not null default 0,
  faturamento_realizado numeric,
  status public.status_info not null default 'estimado',
  demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.importacoes (
  id uuid primary key default gen_random_uuid(),
  tipo_fonte text not null,
  arquivo_nome text,
  aba text,
  mapeamento jsonb,
  total_linhas int not null default 0,
  importadas int not null default 0,
  rejeitadas int not null default 0,
  duplicadas int not null default 0,
  status text not null default 'concluida',
  usuario text,
  created_at timestamptz not null default now()
);

create table public.pendencias (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  severidade text not null default 'alerta',
  descricao text not null,
  referencia_id uuid,
  valor_afetado numeric default 0,
  resolvida boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.auditoria (
  id uuid primary key default gen_random_uuid(),
  usuario text,
  tabela text not null,
  registro_id uuid,
  campo text,
  valor_anterior text,
  valor_novo text,
  motivo text,
  versao_id uuid references public.versoes(id),
  created_at timestamptz not null default now()
);

create table public.comentarios (
  id uuid primary key default gen_random_uuid(),
  contexto text not null,
  referencia text,
  texto text not null,
  usuario text,
  created_at timestamptz not null default now()
);

create table public.parametros (
  chave text primary key,
  valor text,
  descricao text
);

do $$
declare t text;
begin
  foreach t in array array['empresas','categorias','cenarios','versoes','movimentacoes','disponibilidades','regras_classificacao','contratos_financeiros','parcelas_divida','receitas_abate','importacoes','pendencias','auditoria','comentarios','parametros'] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "leitura autenticada" on public.%I for select to authenticated using (true)', t);
    execute format('create policy "escrita editores" on public.%I for insert to authenticated with check (public.is_editor())', t);
    execute format('create policy "update editores" on public.%I for update to authenticated using (public.is_editor()) with check (public.is_editor())', t);
    execute format('create policy "delete editores" on public.%I for delete to authenticated using (public.is_editor())', t);
  end loop;
end $$;

insert into public.parametros(chave,valor,descricao) values
 ('saldo_minimo','5000000','Saldo mínimo de caixa desejado (R$)'),
 ('horizonte_padrao','13','Horizonte padrão em semanas');

insert into public.empresas (nome, grupo, ativa, demo) values
 ('Vera Cruz Agropecuária','Agro',true,true),
 ('OL Látex','Indústria',true,true),
 ('OL Látex Tocantins','Indústria',true,true),
 ('Palmeiras Empreendimentos Imobiliários','Imobiliário',true,true),
 ('Planagri','Agro',true,true),
 ('Goiás Carne/Cooperboi','Proteína',true,true),
 ('RVC','Serviços',true,true),
 ('Parque das Estrelas','Imobiliário',true,true),
 ('Serra Bonita','Agro',true,true),
 ('Solo Verde','Agro',true,true);

insert into public.categorias (grupo, nome, ordem) values
 ('disponibilidades','Contas bancárias',1),('disponibilidades','Aplicações financeiras',2),
 ('entradas','Abate de bovinos',1),('entradas','Soja',2),('entradas','Cana',3),('entradas','Milho',4),
 ('entradas','Cliente Touro',5),('entradas','Cliente Palmeiras',6),('entradas','Látex',7),('entradas','StoneX',8),
 ('entradas','Remuneração de aval',9),('entradas','Outros recebimentos',10),('entradas','Operações de crédito',11),
 ('pagamentos','Compra de bovinos',1),('pagamentos','Folha salarial',2),('pagamentos','PPR e bônus executivo',3),
 ('pagamentos','Impostos',4),('pagamentos','Parcelamentos',5),('pagamentos','Compra de ações',6),
 ('pagamentos','Dividendos aos sócios',7),('pagamentos','StoneX',8),('pagamentos','Despesas gerais',9),
 ('amortizacoes','Bradesco',1),('amortizacoes','Safra',2),('amortizacoes','Sicredi',3),('amortizacoes','Unicentro',4),
 ('amortizacoes','Banco da Amazônia',5),('amortizacoes','Banco Inter',6),('amortizacoes','Banco do Brasil',7),
 ('amortizacoes','Banco Votorantim',8),('amortizacoes','CCB',9),('amortizacoes','ABC Brasil',10),
 ('amortizacoes','XP Investimentos',11),('amortizacoes','Swap XP',12),('amortizacoes','EcoAgro CRA 2021',13),
 ('amortizacoes','EcoAgro CRA 2024',14),('amortizacoes','EcoAgro CRA 2026',15),('amortizacoes','BTG',16),
 ('amortizacoes','Agrolend',17),('amortizacoes','Outros',18);

insert into public.cenarios (nome,tipo,descricao,oficial,fator_receita,fator_despesa,saldo_minimo) values
 ('Base','base','Cenário oficial do fluxo',true,1,1,5000000),
 ('Conservador','conservador','Receitas 12% menores e despesas 5% maiores',false,0.88,1.05,5000000),
 ('Otimista','otimista','Receitas 8% maiores e despesas 3% menores',false,1.08,0.97,5000000);

insert into public.regras_classificacao (campo,condicao,valor,categoria_destino,prioridade) values
 ('plano_financeiro','contem','COMPRA BOVINO','Compra de bovinos',1),
 ('plano_financeiro','contem','TRIBUTO','Impostos',2),
 ('plano_financeiro','contem','GUIA','Impostos',3),
 ('plano_financeiro','contem','FOLHA','Folha salarial',4),
 ('plano_financeiro','contem','ENCARGO','Folha salarial',5),
 ('plano_financeiro','contem','PARCELAMENTO','Parcelamentos',6),
 ('fornecedor','contem','BANCO','Amortizações',7),
 ('plano_financeiro','contem','FORNECEDOR','Despesas gerais',20);

do $$
declare
  db date := (date_trunc('week', current_date))::date;
  e record; i int; w int; k int;
  bancos text[] := array['Bradesco','Safra','Sicredi','Banco do Brasil','BTG','Banco Inter','ABC Brasil','XP Investimentos'];
  ent text[] := array['Abate de bovinos','Soja','Cana','Milho','Cliente Touro','Cliente Palmeiras','Látex','StoneX','Remuneração de aval','Outros recebimentos','Operações de crédito'];
  pag text[] := array['Compra de bovinos','Folha salarial','PPR e bônus executivo','Impostos','Parcelamentos','Compra de ações','Dividendos aos sócios','StoneX','Despesas gerais'];
  amo text[] := array['Bradesco','Safra','Sicredi','Unicentro','Banco da Amazônia','Banco Inter','Banco do Brasil','Banco Votorantim','CCB','ABC Brasil','XP Investimentos','Swap XP','EcoAgro CRA 2021','EcoAgro CRA 2024','EcoAgro CRA 2026','BTG','Agrolend'];
  base_cen uuid;
  ctr uuid;
  vnum int := 1;
  seed numeric;
begin
  select id into base_cen from public.cenarios where tipo='base';

  for e in select * from public.empresas order by nome loop
    i := 0;
    for k in 1..3 loop
      i := i + 1;
      insert into public.disponibilidades (data_base, empresa_id, banco, agencia, conta, tipo, produto, saldo, percentual_cdi, liquidez, disponivel_resgate, fonte, responsavel, demo)
      values (db, e.id, bancos[1 + ((abs(hashtext(e.nome||k)) ) % 8)], '0'||(1000+k)::text, (20000+k*7)::text,
        case when k=3 then 'aplicacao' else 'conta_corrente' end,
        case when k=3 then 'CDB Liquidez Diária' else 'Conta movimento' end,
        round((abs(hashtext(e.nome||'s'||k)) % 4500000)::numeric/100,2) + 150000,
        case when k=3 then 101 + (abs(hashtext(e.nome)) % 8) else null end,
        case when k=3 then 'd_mais_1' else 'imediata' end, true, 'Demonstração','Importação demo', true);
    end loop;

    for w in 0..12 loop
      for k in 1..3 loop
        seed := (abs(hashtext(e.nome||'e'||w||k)) % 2200000)::numeric;
        insert into public.movimentacoes (empresa_id, natureza, categoria, descricao, contraparte, documento, data_emissao, data_vencimento, data_prevista, valor_original, valor_liquido, status, fonte, cenario_id, demo, competencia)
        values (e.id,'entrada', ent[1 + (abs(hashtext(e.nome||w||k)) % 11)],
          'Recebimento previsto — demonstração', 'Cliente '||(1+(abs(hashtext(e.nome||w||k))%40))::text,
          'REC-'||to_char(db + (w*7), 'YYYYMMDD')||'-'||k||substr(md5(e.nome),1,4),
          db + (w*7) - 20, db + (w*7), db + (w*7), round(seed/10,2)+80000, round(seed/10,2)+80000,
          (case when w=0 then 'confirmado' when w<3 then 'confirmado' when w<7 then 'estimado' else 'pendente' end)::public.status_info,
          'Demonstração', base_cen, true, to_char(db + (w*7),'MM/YYYY'));
      end loop;
      for k in 1..4 loop
        seed := (abs(hashtext(e.nome||'p'||w||k)) % 1800000)::numeric;
        insert into public.movimentacoes (empresa_id, natureza, categoria, descricao, contraparte, documento, data_emissao, data_vencimento, data_prevista, valor_original, valor_liquido, status, fonte, cenario_id, demo, competencia)
        values (e.id,'saida', pag[1 + (abs(hashtext(e.nome||'p'||w||k)) % 9)],
          'Pagamento previsto — demonstração', 'Fornecedor '||(1+(abs(hashtext(e.nome||'p'||w||k))%60))::text,
          'PAG-'||to_char(db + (w*7), 'YYYYMMDD')||'-'||k||substr(md5(e.nome),1,4),
          db + (w*7) - 25, db + (w*7), db + (w*7), round(seed/10,2)+60000, round(seed/10,2)+60000,
          (case when w<2 then 'confirmado' when w<6 then 'estimado' else 'pendente' end)::public.status_info,
          'Demonstração', base_cen, true, to_char(db + (w*7),'MM/YYYY'));
      end loop;
    end loop;
  end loop;

  for e in select * from public.empresas order by nome limit 6 loop
    for k in 1..3 loop
      insert into public.contratos_financeiros (empresa_id, instituicao, tipo_operacao, numero_contrato, data_contratacao, valor_original, saldo_devedor, indexador, taxa, data_vencimento, periodicidade, status, demo)
      values (e.id, amo[1 + (abs(hashtext(e.nome||'c'||k)) % 17)],
        case when k=1 then 'Capital de giro' when k=2 then 'CRA' else 'Financiamento' end,
        'CT-'||upper(substr(md5(e.nome||k),1,8)), db - 400, 20000000 + (abs(hashtext(e.nome||k))%30000000),
        12000000 + (abs(hashtext(e.nome||k))%18000000), 'CDI', 1.2 + ((abs(hashtext(e.nome||k))%400)::numeric/100),
        db + 720, 'mensal','ativo', true)
      returning id into ctr;
      for w in 0..12 loop
        if (w + k) % 3 = 0 then
          insert into public.parcelas_divida (contrato_id, vencimento, principal, juros, status)
          values (ctr, db + (w*7), 300000 + (abs(hashtext(e.nome||k||w))%2200000), 40000 + (abs(hashtext(e.nome||'j'||k||w))%300000),
            (case when w<3 then 'confirmado' else 'estimado' end)::public.status_info);
          insert into public.movimentacoes (empresa_id, natureza, categoria, subcategoria, descricao, contraparte, documento, data_vencimento, data_prevista, valor_original, valor_liquido, status, fonte, cenario_id, demo)
          values (e.id,'saida', amo[1 + (abs(hashtext(e.nome||'c'||k)) % 17)], 'Amortização',
            'Amortização de contrato — demonstração', amo[1 + (abs(hashtext(e.nome||'c'||k)) % 17)],
            'CT-'||upper(substr(md5(e.nome||k),1,8))||'/'||w, db + (w*7), db + (w*7),
            340000 + (abs(hashtext(e.nome||k||w))%2400000), 340000 + (abs(hashtext(e.nome||k||w))%2400000),
            (case when w<3 then 'confirmado' else 'estimado' end)::public.status_info, 'Demonstração', base_cen, true);
        end if;
      end loop;
    end loop;
  end loop;

  for e in select * from public.empresas where grupo in ('Agro','Proteína') loop
    for w in 0..12 loop
      insert into public.receitas_abate (empresa_id, data_embarque, data_abate, data_prevista, categoria_animal, quantidade, peso_estimado, mercado, destino, preco, faturamento_projetado, status, demo)
      values (e.id, db+(w*7)-3, db+(w*7)-1, db+(w*7)+7,
        (array['Boi gordo','Novilha','Vaca'])[1+(abs(hashtext(e.nome||w))%3)],
        200 + (abs(hashtext(e.nome||'q'||w))%900), 17.5 + ((abs(hashtext(e.nome||w))%40)::numeric/10),
        (array['Interno','Exportação'])[1+(w%2)], 'Frigorífico Goiás Carne',
        320 + ((abs(hashtext(e.nome||'pr'||w))%4000)::numeric/100),
        900000 + (abs(hashtext(e.nome||'f'||w))%2500000),
        (case when w<3 then 'confirmado' else 'estimado' end)::public.status_info, true);
    end loop;
  end loop;

  insert into public.versoes (numero, data_base, periodo_inicio, periodo_fim, cenario_id, status, responsavel, observacoes)
  values (vnum, db, db, db+90, base_cen, 'aberta', 'Financeiro', 'Versão inicial de demonstração');

  insert into public.importacoes (tipo_fonte, arquivo_nome, total_linhas, importadas, rejeitadas, duplicadas, usuario, status)
  values ('contas_a_pagar','base_contas_pagar_demo.xlsx', 820, 812, 5, 3, 'Financeiro','concluida'),
         ('saldos_bancarios','saldos_bancos_demo.xlsx', 30, 30, 0, 0, 'Financeiro','concluida');

  insert into public.pendencias (tipo, severidade, descricao, valor_afetado) values
   ('sem_categoria','critica','12 movimentações importadas sem categoria gerencial', 1840000),
   ('duplicidade','alerta','3 documentos com possível duplicidade na base de contas a pagar', 260000),
   ('saldo_desatualizado','alerta','Saldos bancários de 2 empresas sem atualização na data-base', 0);
end $$;