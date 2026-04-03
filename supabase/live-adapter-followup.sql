-- Follow-up patch after portal-ready-upgrade.sql
-- Required for the current live adapter implementation.

alter table public.employees
  add column if not exists phone text,
  add column if not exists designation text;
