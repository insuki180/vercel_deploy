-- EOR portal upgrade migration
-- Apply this against the existing Supabase project to bring the schema
-- from the original 5-table shape toward the portal-ready model.
--
-- Notes
-- - This script is additive and tries to avoid destructive changes.
-- - It keeps existing columns like payrolls.month for backward compatibility.
-- - It adds the workflow tables, constraints, indexes, RLS, and storage buckets/policies.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Core table upgrades
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists full_name text,
  add column if not exists company_id uuid,
  add column if not exists employee_id uuid;

update public.profiles
set full_name = coalesce(full_name, 'Portal User')
where full_name is null;

alter table public.profiles
  alter column full_name set not null;

alter table public.companies
  add column if not exists client_country text,
  add column if not exists status text default 'active',
  add column if not exists primary_contact_name text,
  add column if not exists primary_contact_email text;

update public.companies
set status = coalesce(status, 'active')
where status is null;

alter table public.companies
  alter column status set not null;

alter table public.employees
  add column if not exists phone text,
  add column if not exists designation text,
  add column if not exists work_email text,
  add column if not exists personal_email text,
  add column if not exists contract_type text,
  add column if not exists work_location text,
  add column if not exists payroll_ready boolean default false;

update public.employees
set payroll_ready = coalesce(payroll_ready, false)
where payroll_ready is null;

alter table public.employees
  alter column payroll_ready set not null;

alter table public.documents
  add column if not exists file_name text,
  add column if not exists status text default 'pending',
  add column if not exists reviewed_by uuid,
  add column if not exists reviewed_at timestamp without time zone;

update public.documents
set status = coalesce(status, 'pending')
where status is null;

alter table public.documents
  alter column status set not null;

alter table public.payrolls
  add column if not exists company_id uuid,
  add column if not exists loss_of_pay_deduction numeric default 0,
  add column if not exists status text default 'draft',
  add column if not exists period_start date;

update public.payrolls
set loss_of_pay_deduction = coalesce(loss_of_pay_deduction, 0)
where loss_of_pay_deduction is null;

update public.payrolls
set status = coalesce(status, 'draft')
where status is null;

alter table public.payrolls
  alter column loss_of_pay_deduction set not null,
  alter column status set not null;

update public.payrolls p
set company_id = e.company_id
from public.employees e
where p.employee_id = e.id
  and p.company_id is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'payrolls_company_id_fkey'
  ) then
    alter table public.payrolls
      add constraint payrolls_company_id_fkey
      foreign key (company_id) references public.companies(id);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Missing foreign keys and checks
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_company_id_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_company_id_fkey
      foreign key (company_id) references public.companies(id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_employee_id_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_employee_id_fkey
      foreign key (employee_id) references public.employees(id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'companies_status_check'
  ) then
    alter table public.companies
      add constraint companies_status_check
      check (status in ('active', 'inactive'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'employees_status_check'
  ) then
    alter table public.employees
      add constraint employees_status_check
      check (status in ('draft', 'pending_onboarding', 'pending_verification', 'active', 'offboarding', 'inactive'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'documents_status_check'
  ) then
    alter table public.documents
      add constraint documents_status_check
      check (status in ('pending', 'approved', 'rejected'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'payrolls_status_check'
  ) then
    alter table public.payrolls
      add constraint payrolls_status_check
      check (status in ('draft', 'generated'));
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Workflow tables
-- ---------------------------------------------------------------------------

create table if not exists public.company_users (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'employer_admin' check (role in ('employer_admin', 'employer_manager', 'employer_viewer')),
  title text,
  phone text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamp without time zone default now()
);

create unique index if not exists company_users_company_profile_key
  on public.company_users(company_id, profile_id);

create table if not exists public.hiring_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  submitted_by uuid not null references public.profiles(id),
  reviewed_by uuid references public.profiles(id),
  candidate_name text not null,
  candidate_email text not null,
  candidate_phone text,
  designation text,
  contract_type text,
  work_location text,
  target_joining_date date,
  proposed_salary numeric not null default 0,
  currency text not null default 'INR',
  leave_policy jsonb not null default '{"casual":6,"sick":8,"earned":12}'::jsonb,
  status text not null default 'submitted',
  notes text,
  submitted_at timestamp without time zone default now(),
  reviewed_at timestamp without time zone
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'hiring_requests_status_check'
  ) then
    alter table public.hiring_requests
      add constraint hiring_requests_status_check
      check (status in ('submitted', 'approved', 'rejected', 'onboarding_open'));
  end if;
end $$;

create table if not exists public.employee_onboarding_requests (
  id uuid primary key default gen_random_uuid(),
  hiring_request_id uuid not null references public.hiring_requests(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  token text not null unique,
  status text not null default 'pending',
  expires_at timestamp without time zone,
  invited_at timestamp without time zone default now(),
  completed_at timestamp without time zone
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'employee_onboarding_requests_status_check'
  ) then
    alter table public.employee_onboarding_requests
      add constraint employee_onboarding_requests_status_check
      check (status in ('pending', 'in_progress', 'submitted', 'approved', 'expired'));
  end if;
end $$;

create unique index if not exists employee_onboarding_requests_employee_open_key
  on public.employee_onboarding_requests(employee_id)
  where status in ('pending', 'in_progress', 'submitted');

create table if not exists public.employee_bank_details (
  employee_id uuid primary key references public.employees(id) on delete cascade,
  bank_name text,
  account_number text,
  ifsc_code text,
  pan text,
  aadhaar_last4 text,
  uan text,
  esi_number text,
  created_at timestamp without time zone default now(),
  updated_at timestamp without time zone default now()
);

create table if not exists public.document_requirements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  name text not null,
  stage text not null,
  required boolean not null default true,
  created_at timestamp without time zone default now()
);

create table if not exists public.leave_policies (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid references public.employees(id) on delete cascade,
  casual integer not null default 0,
  sick integer not null default 0,
  earned integer not null default 0,
  approved_by uuid references public.profiles(id),
  created_at timestamp without time zone default now(),
  updated_at timestamp without time zone default now()
);

create unique index if not exists leave_policies_company_default_key
  on public.leave_policies(company_id)
  where employee_id is null;

create unique index if not exists leave_policies_employee_key
  on public.leave_policies(employee_id)
  where employee_id is not null;

create table if not exists public.employee_leave_balances (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  leave_type text not null check (leave_type in ('casual', 'sick', 'earned')),
  allocated integer not null default 0,
  used integer not null default 0,
  remaining integer not null default 0,
  updated_at timestamp without time zone default now(),
  unique (employee_id, leave_type)
);

create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  leave_type text not null check (leave_type in ('casual', 'sick', 'earned')),
  requested_days integer not null default 1,
  paid_days integer not null default 0,
  loss_of_pay_days integer not null default 0,
  status text not null default 'pending',
  reason text,
  start_date date,
  end_date date,
  submitted_at timestamp without time zone default now(),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamp without time zone
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'leave_requests_status_check'
  ) then
    alter table public.leave_requests
      add constraint leave_requests_status_check
      check (status in ('pending', 'approved', 'rejected'));
  end if;
end $$;

create table if not exists public.resignations (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  reason text,
  status text not null default 'pending',
  last_working_date date,
  reviewed_by uuid references public.profiles(id),
  created_at timestamp without time zone default now(),
  reviewed_at timestamp without time zone
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'resignations_status_check'
  ) then
    alter table public.resignations
      add constraint resignations_status_check
      check (status in ('pending', 'approved', 'rejected'));
  end if;
end $$;

create table if not exists public.offboarding_cases (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  status text not null default 'pending',
  checklist_summary text,
  final_settlement_status text not null default 'pending',
  created_at timestamp without time zone default now(),
  updated_at timestamp without time zone default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'offboarding_cases_status_check'
  ) then
    alter table public.offboarding_cases
      add constraint offboarding_cases_status_check
      check (status in ('pending', 'in_progress', 'completed'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'offboarding_cases_final_settlement_status_check'
  ) then
    alter table public.offboarding_cases
      add constraint offboarding_cases_final_settlement_status_check
      check (final_settlement_status in ('pending', 'ready', 'completed'));
  end if;
end $$;

create table if not exists public.employee_lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  event_type text not null,
  status text not null,
  detail text,
  created_at timestamp without time zone default now()
);

create table if not exists public.payslips (
  id uuid primary key default gen_random_uuid(),
  payroll_id uuid not null references public.payrolls(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  month text not null,
  period_start date,
  file_url text,
  file_name text,
  created_at timestamp without time zone default now()
);

create unique index if not exists payslips_payroll_id_key
  on public.payslips(payroll_id);

create unique index if not exists payrolls_employee_period_start_key
  on public.payrolls(employee_id, period_start)
  where period_start is not null;

-- ---------------------------------------------------------------------------
-- Helpful indexes for admin filters and operational queries
-- ---------------------------------------------------------------------------

create index if not exists employees_company_status_idx
  on public.employees(company_id, status);

create index if not exists employees_joining_date_idx
  on public.employees(joining_date);

create index if not exists hiring_requests_company_status_submitted_idx
  on public.hiring_requests(company_id, status, submitted_at desc);

create index if not exists leave_requests_company_status_start_idx
  on public.leave_requests(company_id, status, start_date);

create index if not exists resignations_company_status_created_idx
  on public.resignations(company_id, status, created_at desc);

create index if not exists offboarding_cases_company_status_idx
  on public.offboarding_cases(company_id, status);

create index if not exists documents_employee_status_idx
  on public.documents(employee_id, status);

create index if not exists payrolls_company_month_idx
  on public.payrolls(company_id, month);

create index if not exists payslips_employee_month_idx
  on public.payslips(employee_id, month);

-- ---------------------------------------------------------------------------
-- RLS enablement
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.company_users enable row level security;
alter table public.employees enable row level security;
alter table public.hiring_requests enable row level security;
alter table public.employee_onboarding_requests enable row level security;
alter table public.employee_bank_details enable row level security;
alter table public.documents enable row level security;
alter table public.document_requirements enable row level security;
alter table public.leave_policies enable row level security;
alter table public.employee_leave_balances enable row level security;
alter table public.leave_requests enable row level security;
alter table public.resignations enable row level security;
alter table public.offboarding_cases enable row level security;
alter table public.employee_lifecycle_events enable row level security;
alter table public.payrolls enable row level security;
alter table public.payslips enable row level security;

-- ---------------------------------------------------------------------------
-- Drop older policies so reruns stay deterministic
-- ---------------------------------------------------------------------------

drop policy if exists "admins manage profiles" on public.profiles;
drop policy if exists "users manage own profile" on public.profiles;
drop policy if exists "admins manage companies" on public.companies;
drop policy if exists "employers read own company" on public.companies;
drop policy if exists "employees read own company" on public.companies;
drop policy if exists "admins manage company_users" on public.company_users;
drop policy if exists "employers read own company_users" on public.company_users;
drop policy if exists "admins manage employees" on public.employees;
drop policy if exists "employers read company employees" on public.employees;
drop policy if exists "employees read own employee row" on public.employees;
drop policy if exists "admins manage hiring_requests" on public.hiring_requests;
drop policy if exists "employers manage own hiring_requests" on public.hiring_requests;
drop policy if exists "employees read own onboarding requests" on public.employee_onboarding_requests;
drop policy if exists "admins manage onboarding requests" on public.employee_onboarding_requests;
drop policy if exists "admins manage employee bank details" on public.employee_bank_details;
drop policy if exists "employees manage own bank details" on public.employee_bank_details;
drop policy if exists "admins manage documents" on public.documents;
drop policy if exists "employers read company documents" on public.documents;
drop policy if exists "employees manage own documents" on public.documents;
drop policy if exists "admins manage document requirements" on public.document_requirements;
drop policy if exists "employers read document requirements" on public.document_requirements;
drop policy if exists "employees read document requirements" on public.document_requirements;
drop policy if exists "admins manage leave policies" on public.leave_policies;
drop policy if exists "employers read leave policies" on public.leave_policies;
drop policy if exists "employees read own leave policies" on public.leave_policies;
drop policy if exists "admins manage leave balances" on public.employee_leave_balances;
drop policy if exists "employers read company leave balances" on public.employee_leave_balances;
drop policy if exists "employees read own leave balances" on public.employee_leave_balances;
drop policy if exists "admins manage leave requests" on public.leave_requests;
drop policy if exists "employers manage company leave requests" on public.leave_requests;
drop policy if exists "employees manage own leave requests" on public.leave_requests;
drop policy if exists "admins manage resignations" on public.resignations;
drop policy if exists "employers manage company resignations" on public.resignations;
drop policy if exists "employees manage own resignations" on public.resignations;
drop policy if exists "admins manage offboarding cases" on public.offboarding_cases;
drop policy if exists "employers manage company offboarding cases" on public.offboarding_cases;
drop policy if exists "employees read own offboarding cases" on public.offboarding_cases;
drop policy if exists "admins manage lifecycle events" on public.employee_lifecycle_events;
drop policy if exists "employers read company lifecycle events" on public.employee_lifecycle_events;
drop policy if exists "employees read own lifecycle events" on public.employee_lifecycle_events;
drop policy if exists "admins manage payrolls" on public.payrolls;
drop policy if exists "employers read company payrolls" on public.payrolls;
drop policy if exists "employees read own payrolls" on public.payrolls;
drop policy if exists "admins manage payslips" on public.payslips;
drop policy if exists "employers read company payslips" on public.payslips;
drop policy if exists "employees read own payslips" on public.payslips;

-- ---------------------------------------------------------------------------
-- RLS policies
-- ---------------------------------------------------------------------------

create policy "admins manage profiles"
on public.profiles
for all
using (exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.role = 'admin'
))
with check (exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.role = 'admin'
));

create policy "users manage own profile"
on public.profiles
for all
using (id = auth.uid())
with check (id = auth.uid());

create policy "admins manage companies"
on public.companies
for all
using (exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.role = 'admin'
))
with check (exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.role = 'admin'
));

create policy "employers read own company"
on public.companies
for select
using (exists (
  select 1 from public.profiles p
  where p.id = auth.uid()
    and p.role = 'employer'
    and p.company_id = companies.id
));

create policy "employees read own company"
on public.companies
for select
using (exists (
  select 1 from public.profiles p
  join public.employees e on e.id = p.employee_id
  where p.id = auth.uid()
    and p.role = 'employee'
    and e.company_id = companies.id
));

create policy "admins manage company_users"
on public.company_users
for all
using (exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.role = 'admin'
))
with check (exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.role = 'admin'
));

create policy "employers read own company_users"
on public.company_users
for select
using (exists (
  select 1 from public.profiles p
  where p.id = auth.uid()
    and p.company_id = company_users.company_id
));

create policy "admins manage employees"
on public.employees
for all
using (exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.role = 'admin'
))
with check (exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.role = 'admin'
));

create policy "employers read company employees"
on public.employees
for select
using (exists (
  select 1 from public.profiles p
  where p.id = auth.uid()
    and p.role = 'employer'
    and p.company_id = employees.company_id
));

create policy "employees read own employee row"
on public.employees
for select
using (user_id = auth.uid());

create policy "admins manage hiring_requests"
on public.hiring_requests
for all
using (exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.role = 'admin'
))
with check (exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.role = 'admin'
));

create policy "employers manage own hiring_requests"
on public.hiring_requests
for all
using (exists (
  select 1 from public.profiles p
  where p.id = auth.uid()
    and p.role = 'employer'
    and p.company_id = hiring_requests.company_id
))
with check (exists (
  select 1 from public.profiles p
  where p.id = auth.uid()
    and p.role = 'employer'
    and p.company_id = hiring_requests.company_id
));

create policy "admins manage onboarding requests"
on public.employee_onboarding_requests
for all
using (exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.role = 'admin'
))
with check (exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.role = 'admin'
));

create policy "employees read own onboarding requests"
on public.employee_onboarding_requests
for select
using (exists (
  select 1
  from public.profiles p
  where p.id = auth.uid()
    and p.employee_id = employee_onboarding_requests.employee_id
));

create policy "admins manage employee bank details"
on public.employee_bank_details
for all
using (exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.role = 'admin'
))
with check (exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.role = 'admin'
));

create policy "employees manage own bank details"
on public.employee_bank_details
for all
using (exists (
  select 1 from public.profiles p
  where p.id = auth.uid()
    and p.employee_id = employee_bank_details.employee_id
))
with check (exists (
  select 1 from public.profiles p
  where p.id = auth.uid()
    and p.employee_id = employee_bank_details.employee_id
));

create policy "admins manage documents"
on public.documents
for all
using (exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.role = 'admin'
))
with check (exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.role = 'admin'
));

create policy "employers read company documents"
on public.documents
for select
using (exists (
  select 1
  from public.profiles p
  join public.employees e on e.id = documents.employee_id
  where p.id = auth.uid()
    and p.role = 'employer'
    and p.company_id = e.company_id
));

create policy "employees manage own documents"
on public.documents
for all
using (exists (
  select 1
  from public.profiles p
  where p.id = auth.uid()
    and p.employee_id = documents.employee_id
))
with check (exists (
  select 1
  from public.profiles p
  where p.id = auth.uid()
    and p.employee_id = documents.employee_id
));

create policy "admins manage document requirements"
on public.document_requirements
for all
using (exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.role = 'admin'
))
with check (exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.role = 'admin'
));

create policy "employers read document requirements"
on public.document_requirements
for select
using (exists (
  select 1 from public.profiles p
  where p.id = auth.uid()
    and p.role = 'employer'
    and (document_requirements.company_id is null or document_requirements.company_id = p.company_id)
));

create policy "employees read document requirements"
on public.document_requirements
for select
using (exists (
  select 1
  from public.profiles p
  join public.employees e on e.id = p.employee_id
  where p.id = auth.uid()
    and (document_requirements.company_id is null or document_requirements.company_id = e.company_id)
));

create policy "admins manage leave policies"
on public.leave_policies
for all
using (exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.role = 'admin'
))
with check (exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.role = 'admin'
));

create policy "employers read leave policies"
on public.leave_policies
for select
using (exists (
  select 1 from public.profiles p
  where p.id = auth.uid()
    and p.role = 'employer'
    and p.company_id = leave_policies.company_id
));

create policy "employees read own leave policies"
on public.leave_policies
for select
using (exists (
  select 1 from public.profiles p
  where p.id = auth.uid()
    and (leave_policies.employee_id is null or p.employee_id = leave_policies.employee_id)
));

create policy "admins manage leave balances"
on public.employee_leave_balances
for all
using (exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.role = 'admin'
))
with check (exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.role = 'admin'
));

create policy "employers read company leave balances"
on public.employee_leave_balances
for select
using (exists (
  select 1
  from public.profiles p
  join public.employees e on e.id = employee_leave_balances.employee_id
  where p.id = auth.uid()
    and p.role = 'employer'
    and p.company_id = e.company_id
));

create policy "employees read own leave balances"
on public.employee_leave_balances
for select
using (exists (
  select 1 from public.profiles p
  where p.id = auth.uid()
    and p.employee_id = employee_leave_balances.employee_id
));

create policy "admins manage leave requests"
on public.leave_requests
for all
using (exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.role = 'admin'
))
with check (exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.role = 'admin'
));

create policy "employers manage company leave requests"
on public.leave_requests
for all
using (exists (
  select 1 from public.profiles p
  where p.id = auth.uid()
    and p.role = 'employer'
    and p.company_id = leave_requests.company_id
))
with check (exists (
  select 1 from public.profiles p
  where p.id = auth.uid()
    and p.role = 'employer'
    and p.company_id = leave_requests.company_id
));

create policy "employees manage own leave requests"
on public.leave_requests
for all
using (exists (
  select 1 from public.profiles p
  where p.id = auth.uid()
    and p.employee_id = leave_requests.employee_id
))
with check (exists (
  select 1 from public.profiles p
  where p.id = auth.uid()
    and p.employee_id = leave_requests.employee_id
));

create policy "admins manage resignations"
on public.resignations
for all
using (exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.role = 'admin'
))
with check (exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.role = 'admin'
));

create policy "employers manage company resignations"
on public.resignations
for all
using (exists (
  select 1 from public.profiles p
  where p.id = auth.uid()
    and p.role = 'employer'
    and p.company_id = resignations.company_id
))
with check (exists (
  select 1 from public.profiles p
  where p.id = auth.uid()
    and p.role = 'employer'
    and p.company_id = resignations.company_id
));

create policy "employees manage own resignations"
on public.resignations
for all
using (exists (
  select 1 from public.profiles p
  where p.id = auth.uid()
    and p.employee_id = resignations.employee_id
))
with check (exists (
  select 1 from public.profiles p
  where p.id = auth.uid()
    and p.employee_id = resignations.employee_id
));

create policy "admins manage offboarding cases"
on public.offboarding_cases
for all
using (exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.role = 'admin'
))
with check (exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.role = 'admin'
));

create policy "employers manage company offboarding cases"
on public.offboarding_cases
for all
using (exists (
  select 1 from public.profiles p
  where p.id = auth.uid()
    and p.role = 'employer'
    and p.company_id = offboarding_cases.company_id
))
with check (exists (
  select 1 from public.profiles p
  where p.id = auth.uid()
    and p.role = 'employer'
    and p.company_id = offboarding_cases.company_id
));

create policy "employees read own offboarding cases"
on public.offboarding_cases
for select
using (exists (
  select 1 from public.profiles p
  where p.id = auth.uid()
    and p.employee_id = offboarding_cases.employee_id
));

create policy "admins manage lifecycle events"
on public.employee_lifecycle_events
for all
using (exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.role = 'admin'
))
with check (exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.role = 'admin'
));

create policy "employers read company lifecycle events"
on public.employee_lifecycle_events
for select
using (exists (
  select 1
  from public.profiles p
  join public.employees e on e.id = employee_lifecycle_events.employee_id
  where p.id = auth.uid()
    and p.role = 'employer'
    and p.company_id = e.company_id
));

create policy "employees read own lifecycle events"
on public.employee_lifecycle_events
for select
using (exists (
  select 1 from public.profiles p
  where p.id = auth.uid()
    and p.employee_id = employee_lifecycle_events.employee_id
));

create policy "admins manage payrolls"
on public.payrolls
for all
using (exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.role = 'admin'
))
with check (exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.role = 'admin'
));

create policy "employers read company payrolls"
on public.payrolls
for select
using (exists (
  select 1 from public.profiles p
  where p.id = auth.uid()
    and p.role = 'employer'
    and p.company_id = payrolls.company_id
));

create policy "employees read own payrolls"
on public.payrolls
for select
using (exists (
  select 1 from public.profiles p
  where p.id = auth.uid()
    and p.employee_id = payrolls.employee_id
));

create policy "admins manage payslips"
on public.payslips
for all
using (exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.role = 'admin'
))
with check (exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.role = 'admin'
));

create policy "employers read company payslips"
on public.payslips
for select
using (exists (
  select 1
  from public.profiles p
  join public.employees e on e.id = payslips.employee_id
  where p.id = auth.uid()
    and p.role = 'employer'
    and p.company_id = e.company_id
));

create policy "employees read own payslips"
on public.payslips
for select
using (exists (
  select 1 from public.profiles p
  where p.id = auth.uid()
    and p.employee_id = payslips.employee_id
));

-- ---------------------------------------------------------------------------
-- Storage buckets and storage policies
-- Path convention assumed:
--   docs/<employee_id>/<filename>
--   payslips/<employee_id>/<filename>
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('docs', 'docs', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('payslips', 'payslips', false)
on conflict (id) do nothing;

drop policy if exists "admins manage docs bucket" on storage.objects;
drop policy if exists "admins manage payslips bucket" on storage.objects;
drop policy if exists "employees manage own docs bucket" on storage.objects;
drop policy if exists "employees read own payslips bucket" on storage.objects;
drop policy if exists "employers read company docs bucket" on storage.objects;
drop policy if exists "employers read company payslips bucket" on storage.objects;

create policy "admins manage docs bucket"
on storage.objects
for all
using (
  bucket_id = 'docs'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
)
with check (
  bucket_id = 'docs'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

create policy "admins manage payslips bucket"
on storage.objects
for all
using (
  bucket_id = 'payslips'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
)
with check (
  bucket_id = 'payslips'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

create policy "employees manage own docs bucket"
on storage.objects
for all
using (
  bucket_id = 'docs'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.employee_id::text = split_part(name, '/', 2)
  )
)
with check (
  bucket_id = 'docs'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.employee_id::text = split_part(name, '/', 2)
  )
);

create policy "employees read own payslips bucket"
on storage.objects
for select
using (
  bucket_id = 'payslips'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.employee_id::text = split_part(name, '/', 2)
  )
);

create policy "employers read company docs bucket"
on storage.objects
for select
using (
  bucket_id = 'docs'
  and exists (
    select 1
    from public.profiles p
    join public.employees e on e.id::text = split_part(name, '/', 2)
    where p.id = auth.uid()
      and p.role = 'employer'
      and p.company_id = e.company_id
  )
);

create policy "employers read company payslips bucket"
on storage.objects
for select
using (
  bucket_id = 'payslips'
  and exists (
    select 1
    from public.profiles p
    join public.employees e on e.id::text = split_part(name, '/', 2)
    where p.id = auth.uid()
      and p.role = 'employer'
      and p.company_id = e.company_id
  )
);
