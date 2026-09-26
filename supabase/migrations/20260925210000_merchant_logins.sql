-- Demo logins for Adora sub-merchants. The shared password is stored in
-- plaintext on purpose so the demo can sign in with a known value.
-- Row level security is on and no policies are granted, so the publishable
-- key cannot read this table. Only the server secret key can.

create table public.merchant_logins (
  email text primary key,
  merchant_id text not null,
  password text not null,
  created_at timestamptz not null default now()
);

create index merchant_logins_merchant_id_idx on public.merchant_logins (merchant_id);

alter table public.merchant_logins enable row level security;

revoke all on table public.merchant_logins from anon, authenticated;
grant all on table public.merchant_logins to service_role;
