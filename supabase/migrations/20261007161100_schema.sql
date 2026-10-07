-- Schema a new database needs for the app as it works today.
-- Columns prefixed cf_ are ids assigned by Coinflow.
-- Shops share their id with merchant_logins, so a shop is a merchant that can sign in.
-- The publishable key cannot read these tables. Only the server secret key can.

create table public.merchant_logins (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  cf_submerchant_id text,
  password text not null,
  created_at timestamptz not null default now()
);

create index merchant_logins_cf_submerchant_id_idx
  on public.merchant_logins (cf_submerchant_id);

create table public.shops (
  id uuid primary key references public.merchant_logins (id),
  cf_submerchant_id text unique,
  name text not null,
  timezone text not null,
  city text not null,
  region text not null,
  form_submitted_at timestamptz,
  kyb_completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id),
  name text not null,
  cf_user_id text,
  created_at timestamptz not null default now(),
  unique (id, shop_id)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id),
  ticket_number text not null,
  business_date date not null,
  server_id uuid,
  status text not null,
  subtotal_cents integer not null,
  opened_at timestamptz not null default now(),
  unique (id, shop_id),
  unique (shop_id, business_date, ticket_number),
  constraint orders_status_known check (
    status in ('open', 'paid', 'voided', 'refunded', 'disputed')
  ),
  constraint orders_subtotal_nonnegative check (subtotal_cents >= 0),
  constraint orders_server_same_shop foreign key (server_id, shop_id)
    references public.staff (id, shop_id)
);

create index orders_shop_business_date_idx
  on public.orders (shop_id, business_date);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null,
  shop_id uuid not null,
  cf_payment_id text unique,
  attempt integer not null,
  status text not null,
  method text not null,
  subtotal_cents integer not null,
  tip_cents integer not null default 0,
  amount_cents integer not null,
  settled_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, shop_id),
  unique (order_id, attempt),
  constraint payments_same_shop foreign key (order_id, shop_id)
    references public.orders (id, shop_id),
  constraint payments_attempt_positive check (attempt >= 1),
  constraint payments_status_known check (
    status in (
      'pending',
      'settled',
      'failed',
      'refunded',
      'dispute_open',
      'won',
      'lost',
      'voided'
    )
  ),
  constraint payments_amounts_nonnegative check (
    subtotal_cents >= 0 and tip_cents >= 0 and amount_cents >= 0
  ),
  constraint payments_amount_is_subtotal_plus_tip check (
    amount_cents = subtotal_cents + tip_cents
  )
);

create index payments_shop_created_at_idx
  on public.payments (shop_id, created_at);

create table public.payout_accounts (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id),
  staff_id uuid,
  rail text not null,
  display text not null,
  cf_destination_id text,
  created_at timestamptz not null default now(),
  unique (id, shop_id),
  constraint payout_accounts_rail_known check (rail in ('venmo', 'ach', 'push_to_card')),
  constraint payout_accounts_staff_same_shop foreign key (staff_id, shop_id)
    references public.staff (id, shop_id)
);

create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id),
  order_id uuid,
  payment_id uuid,
  payout_account_id uuid not null,
  rail text not null,
  ach_speed text,
  amount_cents integer not null,
  status text not null,
  cf_transfer_id text unique,
  created_at timestamptz not null default now(),
  constraint payouts_rail_known check (rail in ('venmo', 'ach', 'push_to_card')),
  constraint payouts_status_known check (status in ('pending', 'completed', 'failed')),
  constraint payouts_amount_positive check (amount_cents > 0),
  constraint payouts_ach_speed_only_for_ach check (
    (rail = 'ach' and ach_speed in ('standard', 'same_day', 'instant'))
    or (rail <> 'ach' and ach_speed is null)
  ),
  constraint payouts_order_same_shop foreign key (order_id, shop_id)
    references public.orders (id, shop_id),
  constraint payouts_payment_same_shop foreign key (payment_id, shop_id)
    references public.payments (id, shop_id),
  constraint payouts_account_same_shop foreign key (payout_account_id, shop_id)
    references public.payout_accounts (id, shop_id)
);

create index payouts_shop_created_at_idx
  on public.payouts (shop_id, created_at);

alter table public.merchant_logins enable row level security;
alter table public.shops enable row level security;
alter table public.staff enable row level security;
alter table public.orders enable row level security;
alter table public.payments enable row level security;
alter table public.payout_accounts enable row level security;
alter table public.payouts enable row level security;

revoke all on table public.merchant_logins from anon, authenticated;
revoke all on table public.shops from anon, authenticated;
revoke all on table public.staff from anon, authenticated;
revoke all on table public.orders from anon, authenticated;
revoke all on table public.payments from anon, authenticated;
revoke all on table public.payout_accounts from anon, authenticated;
revoke all on table public.payouts from anon, authenticated;

grant all on table public.merchant_logins to service_role;
grant all on table public.shops to service_role;
grant all on table public.staff to service_role;
grant all on table public.orders to service_role;
grant all on table public.payments to service_role;
grant all on table public.payout_accounts to service_role;
grant all on table public.payouts to service_role;
