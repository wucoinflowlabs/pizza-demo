-- The orders table is really a payment ledger — one row per Coinflow payment,
-- no multi-attempt / multi-payment-per-order structure. Rename it to match.
-- Constraint renames are left to Postgres; the names keep their `orders_*`
-- prefix but function identically. Idempotent — safe to re-run.

do $$
begin
  if to_regclass('public.orders') is not null and to_regclass('public.payments') is null then
    execute 'alter table public.orders rename to payments';
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'payouts' and column_name = 'order_id'
  ) then
    execute 'alter table public.payouts rename column order_id to payment_id';
  end if;
end
$$;
