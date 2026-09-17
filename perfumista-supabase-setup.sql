-- ============================================================
-- Perfumista — ativar SYNC entre aparelhos (rodar UMA vez)
-- Onde: Supabase -> projeto tgbnxnftahjrphxpazvz -> SQL Editor -> colar e RUN.
-- Cria a tabela + as 2 funções (RPC) que o app (web/lib/sync.ts) já chama.
-- Depois disso a sync liga sozinha quando você usar um código.
-- ============================================================

create table if not exists public.perfumista_state (
  code       text primary key,
  state      jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Bloqueia acesso direto à tabela; tudo passa pelas RPC (security definer).
alter table public.perfumista_state enable row level security;

-- Lê o estado de um código.
create or replace function public.perfumista_get(p_code text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select state from public.perfumista_state where code = p_code;
$$;

-- Grava/atualiza o estado de um código (upsert).
create or replace function public.perfumista_set(p_code text, p_state jsonb)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.perfumista_state (code, state, updated_at)
  values (p_code, p_state, now())
  on conflict (code) do update
    set state = excluded.state, updated_at = now();
$$;

-- Permite a chave publishable (anon) chamar as funções.
grant execute on function public.perfumista_get(text)         to anon, authenticated;
grant execute on function public.perfumista_set(text, jsonb)  to anon, authenticated;

-- Recarrega o cache do PostgREST (pra as funções aparecerem na hora).
notify pgrst, 'reload schema';
