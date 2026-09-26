-- The login row is keyed by Adora's id. Email stays unique so a sign-in
-- can still find the row.

alter table public.merchant_logins
  add constraint merchant_logins_email_key unique (email);

alter table public.merchant_logins
  drop constraint merchant_logins_pkey;

alter table public.merchant_logins
  drop constraint merchant_logins_merchant_id_key;

alter table public.merchant_logins
  rename column merchant_id to id;

alter table public.merchant_logins
  add primary key (id);
