-- Nexora: uma linha por usuário com todos os dados dele. Rode uma vez no SQL Editor do Supabase.
create table if not exists public.nexora_dados (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  dados jsonb not null,
  mod bigint not null default 0,
  atualizado_em timestamptz not null default now()
);
alter table public.nexora_dados enable row level security;

-- Cada pessoa só lê e grava a própria linha.
create policy "nexora: ler os próprios dados" on public.nexora_dados for select to authenticated using ((select auth.uid()) = user_id);
create policy "nexora: criar os próprios dados" on public.nexora_dados for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "nexora: atualizar os próprios dados" on public.nexora_dados for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "nexora: apagar os próprios dados" on public.nexora_dados for delete to authenticated using ((select auth.uid()) = user_id);
