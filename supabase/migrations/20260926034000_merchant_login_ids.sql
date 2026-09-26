-- Adora's id and Coinflow's id are different. merchant_id is Adora's UUID.
-- cf_submerchant_id is the id Coinflow assigned. Existing rows keep the
-- Coinflow id they already stored, and each gets a new Adora UUID.

alter table public.merchant_logins
  rename column merchant_id to cf_submerchant_id;

alter index merchant_logins_merchant_id_idx
  rename to merchant_logins_cf_submerchant_id_idx;

alter table public.merchant_logins
  add column merchant_id uuid;

update public.merchant_logins
set merchant_id = gen_random_uuid()
where merchant_id is null;

alter table public.merchant_logins
  alter column merchant_id set not null;

alter table public.merchant_logins
  alter column merchant_id set default gen_random_uuid();

alter table public.merchant_logins
  add constraint merchant_logins_merchant_id_key unique (merchant_id);

alter table public.merchant_logins
  alter column cf_submerchant_id drop not null;
