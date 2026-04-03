create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key,
  role text not null check (role in ('admin', 'employer', 'employee')),
  full_name text not null,
  company_id uuid,
  employee_id uuid,
  created_at timestamp without time zone default now()
);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text not null default 'India',
  client_country text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_by uuid references public.profiles(id),
  primary_contact_name text,
  primary_contact_email text,
  created_at timestamp without time zone default now()
);

create table if not exists public.company_users (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  phone text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamp without time zone default now()
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  company_id uuid not null references public.companies(id) on delete cascade,
  full_name text not null,
  work_email text not null,
  personal_email text,
  phone text,
  designation text,
  contract_type text,
  work_location text,
  country text not null default 'India',
  salary numeric not null default 0,
  currency text not null default 'INR',
  status text not null default 'draft',
  payroll_ready boolean not null default false,
  joining_date date,
  created_at timestamp without time zone default now()
);

create table if not exists public.hiring_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  submitted_by uuid not null references public.profiles(id),
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

create table if not exists public.employee_bank_details (
  employee_id uuid primary key references public.employees(id) on delete cascade,
  bank_name text,
  account_number text,
  ifsc_code text,
  pan text,
  aadhaar_last4 text,
  uan text,
  esi_number text,
  created_at timestamp without time zone default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  file_url text,
  file_name text,
  type text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamp without time zone default now()
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
  created_at timestamp without time zone default now()
);

create table if not exists public.employee_leave_balances (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  leave_type text not null check (leave_type in ('casual', 'sick', 'earned')),
  allocated integer not null default 0,
  used integer not null default 0,
  remaining integer not null default 0,
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
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reason text,
  start_date date,
  end_date date,
  submitted_at timestamp without time zone default now(),
  reviewed_at timestamp without time zone
);

create table if not exists public.resignations (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  last_working_date date,
  created_at timestamp without time zone default now()
);

create table if not exists public.offboarding_cases (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed')),
  checklist_summary text,
  final_settlement_status text not null default 'pending',
  created_at timestamp without time zone default now()
);

create table if not exists public.employee_lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  event_type text not null,
  status text not null,
  detail text,
  created_at timestamp without time zone default now()
);

create table if not exists public.payrolls (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  month text not null,
  base_salary numeric not null default 0,
  tax numeric not null default 0,
  loss_of_pay_deduction numeric not null default 0,
  net_salary numeric not null default 0,
  status text not null default 'draft' check (status in ('draft', 'generated')),
  created_at timestamp without time zone default now()
);

create table if not exists public.payslips (
  id uuid primary key default gen_random_uuid(),
  payroll_id uuid not null references public.payrolls(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  month text not null,
  file_url text,
  file_name text,
  created_at timestamp without time zone default now()
);
