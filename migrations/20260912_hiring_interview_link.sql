-- Smart Interview database (not the ERP database).
alter table public.interviews add column if not exists hiring_application_id uuid;
create unique index if not exists interviews_hiring_application_unique on public.interviews(hiring_application_id);
