-- TakaTrack: apply to a NEW/development Supabase project after review.
-- No service-role key is used by application requests.
begin;
create schema if not exists takatrack_private;
revoke all on schema takatrack_private from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.categories (
  id text primary key,
  name_bn text not null, name_en text not null,
  type text not null check (type in ('income', 'expense')),
  icon text not null, color text not null, sort_order integer not null,
  unique (id, type)
);
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  amount_paisa bigint not null check (amount_paisa between 1 and 9000000000000),
  category_id text not null,
  occurred_on date not null check (occurred_on between '1900-01-01' and '2100-12-31'),
  note text check (char_length(note) <= 500),
  input_method text not null default 'manual' check (input_method in ('manual', 'ai_text', 'ai_voice')),
  client_request_id uuid not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key (category_id, type) references public.categories(id, type),
  unique (user_id, client_request_id)
);
create index transactions_user_date_idx on public.transactions(user_id, occurred_on desc, created_at desc, id desc);
create index transactions_user_category_date_idx on public.transactions(user_id, category_id, occurred_on);
create index transactions_user_type_date_idx on public.transactions(user_id, type, occurred_on);
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category_id text not null,
  category_type text not null default 'expense' check (category_type = 'expense'),
  month date not null check (extract(day from month) = 1 and month between '1900-01-01' and '2100-12-01'),
  limit_paisa bigint not null check (limit_paisa between 1 and 9000000000000),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key (category_id, category_type) references public.categories(id, type),
  unique (user_id, category_id, month)
);
-- Receipts contain a hash and IDs, never financial descriptions. Retain until account deletion.
create table public.transaction_requests (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  request_id uuid not null, payload_hash text not null, transaction_ids uuid[] not null,
  created_at timestamptz not null default now(), primary key (user_id, request_id)
);
create table takatrack_private.ai_rate_windows (
  user_id uuid not null references auth.users(id) on delete cascade,
  bucket text not null, window_start timestamptz not null, count integer not null,
  primary key (user_id, bucket, window_start)
);

create function takatrack_private.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = clock_timestamp(); return new; end $$;
create trigger profiles_updated before update on public.profiles for each row execute function takatrack_private.touch_updated_at();
create trigger transactions_updated before update on public.transactions for each row execute function takatrack_private.touch_updated_at();
create trigger budgets_updated before update on public.budgets for each row execute function takatrack_private.touch_updated_at();
create function takatrack_private.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, display_name)
  values (new.id, left(coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', ''), 80));
  return new;
end $$;
create trigger takatrack_on_auth_user_created after insert on auth.users for each row execute function takatrack_private.handle_new_user();
-- Existing Auth users get profiles only; never example financial records.
insert into public.profiles(id, display_name) select id, left(coalesce(raw_user_meta_data->>'display_name', raw_user_meta_data->>'full_name', ''),80) from auth.users on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.transaction_requests enable row level security;
alter table takatrack_private.ai_rate_windows enable row level security;
create policy profiles_read on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy profiles_update on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy categories_read on public.categories for select to authenticated using (true);
create policy transactions_read on public.transactions for select to authenticated using ((select auth.uid()) = user_id);
create policy transactions_insert on public.transactions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy transactions_update on public.transactions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy transactions_delete on public.transactions for delete to authenticated using ((select auth.uid()) = user_id);
create policy budgets_read on public.budgets for select to authenticated using ((select auth.uid()) = user_id);
create policy budgets_insert on public.budgets for insert to authenticated with check ((select auth.uid()) = user_id);
create policy budgets_update on public.budgets for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy budgets_delete on public.budgets for delete to authenticated using ((select auth.uid()) = user_id);
create policy receipts_read on public.transaction_requests for select to authenticated using ((select auth.uid()) = user_id);
create policy receipts_insert on public.transaction_requests for insert to authenticated with check ((select auth.uid()) = user_id);
-- Explicit privileges, not Supabase's project defaults.
revoke all on public.profiles, public.categories, public.transactions, public.budgets, public.transaction_requests from anon, authenticated;
grant select on public.profiles, public.categories to authenticated;
grant update(display_name) on public.profiles to authenticated;
grant select, insert, update, delete on public.transactions, public.budgets to authenticated;
grant select, insert on public.transaction_requests to authenticated;

-- Complete-record aggregate, independent of PostgREST row limits and UI pagination.
create function public.month_snapshot(p_month date, p_through date default null)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare result jsonb; last_day date; through_day date;
begin
  if auth.uid() is null then raise exception 'Unauthorized' using errcode = '42501'; end if;
  if p_month is null or extract(day from p_month) <> 1 or p_month not between '1900-01-01' and '2100-12-01' then
    raise exception 'Invalid month' using errcode = '22023';
  end if;
  last_day := (p_month + interval '1 month - 1 day')::date;
  through_day := coalesce(p_through, last_day);
  if through_day < p_month or through_day > last_day then raise exception 'Invalid period' using errcode = '22023'; end if;
  with matching as materialized (
    select * from public.transactions where user_id = auth.uid() and occurred_on between p_month and through_day
  ), totals as (
    select coalesce(sum(amount_paisa) filter(where type = 'income'), 0)::text as income,
           coalesce(sum(amount_paisa) filter(where type = 'expense'), 0)::text as expense,
           count(*) as count, coalesce(string_agg(id::text || updated_at::text, ',' order by id), '') as revision
    from matching
  ), grouped as (
    select category_id, sum(amount_paisa)::text as amount_paisa from matching where type = 'expense' group by category_id
  ), month_budgets as (
    select * from public.budgets where user_id = auth.uid() and month = p_month
  ) select jsonb_build_object(
    'income', totals.income, 'expense', totals.expense, 'count', totals.count,
    'categories', coalesce((select jsonb_agg(to_jsonb(grouped) order by category_id) from grouped), '[]'::jsonb),
    'budgets', coalesce((select jsonb_agg(to_jsonb(month_budgets) order by category_id) from month_budgets), '[]'::jsonb),
    'revision', md5(totals.revision || coalesce((select string_agg(id::text || updated_at::text, ',' order by id) from month_budgets), ''))
  ) into result from totals;
  return result;
end $$;

-- One atomic transaction; concurrent retries serialize on a per-user request key.
-- User identity is ALWAYS taken from the verified JWT, never p_items.user_id.
create function public.save_transactions(p_request_id uuid, p_items jsonb)
returns uuid[] language plpgsql security invoker set search_path = '' as $$
declare uid uuid := auth.uid(); hash text; existing public.transaction_requests%rowtype;
  item jsonb; ids uuid[] := '{}'; new_id uuid;
begin
  if uid is null then raise exception 'Unauthorized' using errcode = '42501'; end if;
  if p_request_id is null or p_items is null or jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'Invalid batch' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) not between 1 and 20 then
    raise exception 'Invalid batch' using errcode = '22023';
  end if;
  hash := md5(p_items::text);
  perform pg_advisory_xact_lock(hashtextextended(uid::text || p_request_id::text, 0));
  select * into existing from public.transaction_requests where user_id = uid and request_id = p_request_id;
  if found then
    if existing.payload_hash <> hash then raise exception 'Request key reused with different payload' using errcode = '22023'; end if;
    return existing.transaction_ids;
  end if;
  for item in select value from jsonb_array_elements(p_items) loop
    -- Reject fractional money before bigint cast (Postgres casts can round).
    if jsonb_typeof(item->'amount_paisa') is distinct from 'number' or (item->>'amount_paisa') !~ '^[0-9]+$' then
      raise exception 'Money must be integer paisa' using errcode = '22023';
    end if;
    insert into public.transactions(user_id, type, title, amount_paisa, category_id, occurred_on, note, input_method, client_request_id)
    values(uid, item->>'type', item->>'title', (item->>'amount_paisa')::bigint,
      item->>'category_id', (item->>'occurred_on')::date, nullif(item->>'note', ''),
      item->>'input_method', (item->>'client_request_id')::uuid)
    returning id into new_id;
    ids := array_append(ids, new_id);
  end loop;
  insert into public.transaction_requests(user_id, request_id, payload_hash, transaction_ids) values(uid, p_request_id, hash, ids);
  return ids;
end $$;

-- Distributed limits survive serverless cold starts. Deliberate narrow definer function:
-- fixed quotas; no user/limit argument; no caller access to the underlying table.
create function public.consume_ai_quota(p_kind text) returns boolean
language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); affected integer; minute_start timestamptz := date_trunc('minute', now()); day_start timestamptz := date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';
begin
  if uid is null then raise exception 'Unauthorized' using errcode = '42501'; end if;
  if p_kind is null or p_kind not in ('transcribe', 'extract', 'summary') then raise exception 'Invalid operation'; end if;
  delete from takatrack_private.ai_rate_windows where user_id = uid and window_start < now() - interval '2 days';
  insert into takatrack_private.ai_rate_windows as w values(uid, 'minute', minute_start, 1)
    on conflict (user_id, bucket, window_start) do update set count = w.count + 1 where w.count < 8;
  get diagnostics affected = row_count;
  if affected = 0 then return false; end if;
  insert into takatrack_private.ai_rate_windows as w values(uid, 'day', day_start, 1)
    on conflict (user_id, bucket, window_start) do update set count = w.count + 1 where w.count < 60;
  get diagnostics affected = row_count;
  return affected = 1;
end $$;

revoke all on function public.month_snapshot(date,date), public.save_transactions(uuid,jsonb), public.consume_ai_quota(text) from public, anon;
grant execute on function public.month_snapshot(date,date), public.save_transactions(uuid,jsonb), public.consume_ai_quota(text) to authenticated;
commit;
