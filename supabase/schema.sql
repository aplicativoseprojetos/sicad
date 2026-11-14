-- ============================================================
-- SICAD - Sistema de Cadastro e Consulta de Indivíduos
-- Schema SQL DDL para Supabase (PostgreSQL)
-- ============================================================

-- Habilitar extensões necessárias
create extension if not exists "pgcrypto";

-- ============================================================
-- 1. TABELA: profiles (sincronizada com auth.users)
-- ============================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  nome        text,
  matricula   text,
  role        text not null default 'operador' check (role in ('operador', 'admin')),
  created_at  timestamptz not null default now()
);

-- Trigger para criar perfil automaticamente ao criar usuário
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, nome)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'nome', new.email)
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 2. TABELA: individuos (ficha principal)
-- ============================================================
create table if not exists public.individuos (
  id                    uuid primary key default gen_random_uuid(),
  -- Identificação Básica
  nome_completo         text not null,
  vulgo                 text,
  matricula_registro    text,
  rg                    text,
  cpf                   text,
  -- Localização
  cep                   text,
  endereco_rua          text,
  endereco_numero       text,
  endereco_bairro       text,
  endereco_cidade       text,
  endereco_estado       text,
  endereco_complemento  text,
  -- Dados Criminais
  artigos_criminais     text[] default '{}',
  modus_operandi        text,
  -- Características Físicas
  altura                numeric(3,2),   -- ex: 1.75
  peso                  numeric(5,1),   -- ex: 80.5
  compleicao_fisica     text,
  cor_olhos             text,
  cor_cabelo            text,
  sinais_caracteristicos text,
  -- Metadados
  criado_por            uuid not null references public.profiles(id),
  criado_em             timestamptz not null default now(),
  atualizado_em         timestamptz not null default now()
);

-- Índices para buscas rápidas
create index if not exists idx_individuos_nome on public.individuos using gin (to_tsvector('portuguese', nome_completo));
create index if not exists idx_individuos_vulgo on public.individuos (vulgo);
create index if not exists idx_individuos_cpf on public.individuos (cpf);
create index if not exists idx_individuos_cidade on public.individuos (endereco_cidade);
create index if not exists idx_individuos_bairro on public.individuos (endereco_bairro);
create index if not exists idx_individuos_criado_por on public.individuos (criado_por);

-- Trigger para atualizar atualizado_em
create or replace function public.update_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists set_atualizado_em on public.individuos;
create trigger set_atualizado_em
  before update on public.individuos
  for each row execute function public.update_atualizado_em();

-- ============================================================
-- 3. TABELA: fotos
-- ============================================================
create table if not exists public.fotos (
  id            uuid primary key default gen_random_uuid(),
  individuo_id  uuid not null references public.individuos(id) on delete cascade,
  storage_path  text not null,
  descricao     text,  -- 'frente', 'perfil_direito', 'perfil_esquerdo', 'tatuagem', 'marca'
  ordem         int not null default 0,
  criado_em     timestamptz not null default now()
);

create index if not exists idx_fotos_individuo on public.fotos (individuo_id);

-- ============================================================
-- 4. TABELA: observacoes (histórico colaborativo)
-- ============================================================
create table if not exists public.observacoes (
  id            uuid primary key default gen_random_uuid(),
  individuo_id  uuid not null references public.individuos(id) on delete cascade,
  autor_id      uuid not null references public.profiles(id),
  autor_nome    text not null,
  texto         text not null,
  criado_em     timestamptz not null default now()
);

create index if not exists idx_observacoes_individuo on public.observacoes (individuo_id);

-- ============================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- --- profiles ---
alter table public.profiles enable row level security;

create policy "Perfis visíveis para usuários autenticados"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Usuário pode atualizar próprio perfil"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- --- individuos ---
alter table public.individuos enable row level security;

create policy "Indivíduos visíveis para autenticados"
  on public.individuos for select
  to authenticated
  using (true);

create policy "Autenticados podem cadastrar indivíduos"
  on public.individuos for insert
  to authenticated
  with check (auth.uid() = criado_por);

create policy "Apenas autor ou admin pode editar"
  on public.individuos for update
  to authenticated
  using (
    auth.uid() = criado_por
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  )
  with check (
    auth.uid() = criado_por
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

create policy "Apenas autor ou admin pode excluir"
  on public.individuos for delete
  to authenticated
  using (
    auth.uid() = criado_por
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- --- fotos ---
alter table public.fotos enable row level security;

create policy "Fotos visíveis para autenticados"
  on public.fotos for select
  to authenticated
  using (true);

create policy "Autor do indivíduo ou admin pode inserir fotos"
  on public.fotos for insert
  to authenticated
  with check (
    exists (
      select 1 from public.individuos
      where individuos.id = individuo_id
      and (
        individuos.criado_por = auth.uid()
        or exists (
          select 1 from public.profiles
          where profiles.id = auth.uid() and profiles.role = 'admin'
        )
      )
    )
  );

create policy "Autor do indivíduo ou admin pode excluir fotos"
  on public.fotos for delete
  to authenticated
  using (
    exists (
      select 1 from public.individuos
      where individuos.id = individuo_id
      and (
        individuos.criado_por = auth.uid()
        or exists (
          select 1 from public.profiles
          where profiles.id = auth.uid() and profiles.role = 'admin'
        )
      )
    )
  );

-- --- observacoes ---
alter table public.observacoes enable row level security;

create policy "Observações visíveis para autenticados"
  on public.observacoes for select
  to authenticated
  using (true);

create policy "Autenticados podem inserir observações"
  on public.observacoes for insert
  to authenticated
  with check (auth.uid() = autor_id);

create policy "Apenas autor da observação pode editar"
  on public.observacoes for update
  to authenticated
  using (auth.uid() = autor_id)
  with check (auth.uid() = autor_id);

create policy "Apenas autor da observação ou admin pode excluir"
  on public.observacoes for delete
  to authenticated
  using (
    auth.uid() = autor_id
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- ============================================================
-- 6. STORAGE BUCKET (executar via Supabase Dashboard ou API)
-- ============================================================
-- No Supabase Dashboard → Storage:
-- 1. Criar bucket "fotos" (público para leitura)
-- 2. Políticas do bucket:
--    - SELECT (download): authenticated = true
--    - INSERT (upload): authenticated = true
--    - DELETE: verificar se o usuário é autor do indivíduo relacionado

-- Alternativa via SQL:
insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', true)
on conflict (id) do nothing;

create policy "Fotos acessíveis publicamente"
  on storage.objects for select
  using (bucket_id = 'fotos');

create policy "Autenticados podem fazer upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'fotos');

create policy "Autenticados podem deletar próprios uploads"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'fotos');
