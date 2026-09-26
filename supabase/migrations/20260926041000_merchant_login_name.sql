-- Store name for a login. Not unique: two locations of the same shop
-- can share it. Null until Adora has a name for that login.

alter table public.merchant_logins
  add column name text;

update public.merchant_logins
set name = 'Lamonica''s NY Pizza'
where email = 'hello@lamonicasnypizza.com'
  and name is null;
