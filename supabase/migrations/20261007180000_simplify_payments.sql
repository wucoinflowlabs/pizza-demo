-- Westwood-only, minimal payment ledger. Four columns, nothing else.
-- Idempotent so a partial run is safe to re-apply.

-- Drop every FK on payouts that referenced the payments columns we're removing.
do $$
declare
  r record;
begin
  for r in
    select tc.constraint_name
    from information_schema.table_constraints tc
    where tc.table_schema = 'public'
      and tc.table_name = 'payouts'
      and tc.constraint_type = 'FOREIGN KEY'
      and tc.constraint_name in (
        'payouts_payment_same_shop',
        'payouts_order_same_shop',
        'payouts_payment_id_fkey'
      )
  loop
    execute format('alter table public.payouts drop constraint %I', r.constraint_name);
  end loop;
end
$$;

-- Rename cf_payment_id → payment_id so the surviving column keeps the data.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'payments' and column_name = 'cf_payment_id'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'payments' and column_name = 'payment_id'
  ) then
    execute 'alter table public.payments rename column cf_payment_id to payment_id';
  end if;
end
$$;

-- Add total_cents (default 0, filled from subtotal + tip for existing rows).
alter table public.payments add column if not exists total_cents integer not null default 0;
update public.payments set total_cents = subtotal_cents + tip_cents where total_cents = 0;

-- Drop everything we no longer need. CASCADE lets us remove the row-level
-- unique constraints that referenced (shop_id, business_date, ticket_number)
-- without us having to spell each one out.
alter table public.payments drop constraint if exists payments_pkey cascade;
alter table public.payments drop constraint if exists orders_pkey cascade;
alter table public.payments drop column if exists shop_id cascade;
alter table public.payments drop column if exists ticket_number cascade;
alter table public.payments drop column if exists business_date cascade;
alter table public.payments drop column if exists status cascade;
alter table public.payments drop column if exists channel cascade;
alter table public.payments drop column if exists opened_at cascade;
alter table public.payments drop column if exists id cascade;
drop index if exists payments_shop_business_date_idx;
drop index if exists orders_shop_business_date_idx;

-- payment_id becomes the primary key.
alter table public.payments alter column payment_id set not null;
alter table public.payments add primary key (payment_id);
