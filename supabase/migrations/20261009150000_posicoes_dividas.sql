create table if not exists public.posicoes_dividas (
  id uuid primary key default gen_random_uuid(),
  lote_id uuid references public.lotes_importacao(id) on delete set null,
  data_base date not null,
  empresa_id uuid references public.empresas(id) on delete set null,
  chave_origem text not null,
  tipo text not null default 'bancaria' check (tipo in ('bancaria','tributaria','acionistas','outras')),
  credor text not null,
  modalidade text,
  numero_contrato text,
  saldo_contabil_aproximado numeric not null default 0,
  indexador text,
  taxa text,
  vencimento date,
  parcelas_restantes integer,
  safra_1 numeric not null default 0,
  safra_2 numeric not null default 0,
  safra_3 numeric not null default 0,
  outras_safras numeric not null default 0,
  fonte text not null default 'Saldos atuais',
  created_at timestamptz not null default now(),
  unique (data_base, chave_origem)
);

create index if not exists posicoes_dividas_data_base_idx on public.posicoes_dividas(data_base desc);
create index if not exists posicoes_dividas_tipo_idx on public.posicoes_dividas(tipo);

alter table public.posicoes_dividas enable row level security;
create policy "leitura autenticada" on public.posicoes_dividas
  for select to authenticated using (true);
create policy "escrita editores" on public.posicoes_dividas
  for insert to authenticated with check (is_editor());
create policy "update editores" on public.posicoes_dividas
  for update to authenticated using (is_editor()) with check (is_editor());
create policy "delete editores" on public.posicoes_dividas
  for delete to authenticated using (is_editor());

grant select, insert, update, delete on public.posicoes_dividas to authenticated;
grant all on public.posicoes_dividas to service_role;
