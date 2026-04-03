-- Fix recursive RLS policy lookups that reference public.profiles from within
-- policies on public.profiles and other protected tables.
--
-- Apply this after portal-ready-upgrade.sql on existing projects.

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
  limit 1
$$;

create or replace function public.current_profile_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.company_id
  from public.profiles p
  where p.id = auth.uid()
  limit 1
$$;

create or replace function public.current_profile_employee_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.employee_id
  from public.profiles p
  where p.id = auth.uid()
  limit 1
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_profile_role() = 'admin'
$$;

grant execute on function public.current_profile_role() to authenticated, anon, service_role;
grant execute on function public.current_profile_company_id() to authenticated, anon, service_role;
grant execute on function public.current_profile_employee_id() to authenticated, anon, service_role;
grant execute on function public.is_admin() to authenticated, anon, service_role;

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
drop policy if exists "admins manage onboarding requests" on public.employee_onboarding_requests;
drop policy if exists "employees read own onboarding requests" on public.employee_onboarding_requests;
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

create policy "admins manage profiles"
on public.profiles
for all
using (public.is_admin())
with check (public.is_admin());

create policy "users manage own profile"
on public.profiles
for all
using (id = auth.uid())
with check (id = auth.uid());

create policy "admins manage companies"
on public.companies
for all
using (public.is_admin())
with check (public.is_admin());

create policy "employers read own company"
on public.companies
for select
using (
  public.current_profile_role() = 'employer'
  and public.current_profile_company_id() = companies.id
);

create policy "employees read own company"
on public.companies
for select
using (
  public.current_profile_role() = 'employee'
  and exists (
    select 1
    from public.employees e
    where e.id = public.current_profile_employee_id()
      and e.company_id = companies.id
  )
);

create policy "admins manage company_users"
on public.company_users
for all
using (public.is_admin())
with check (public.is_admin());

create policy "employers read own company_users"
on public.company_users
for select
using (public.current_profile_company_id() = company_users.company_id);

create policy "admins manage employees"
on public.employees
for all
using (public.is_admin())
with check (public.is_admin());

create policy "employers read company employees"
on public.employees
for select
using (
  public.current_profile_role() = 'employer'
  and public.current_profile_company_id() = employees.company_id
);

create policy "employees read own employee row"
on public.employees
for select
using (id = public.current_profile_employee_id());

create policy "admins manage hiring_requests"
on public.hiring_requests
for all
using (public.is_admin())
with check (public.is_admin());

create policy "employers manage own hiring_requests"
on public.hiring_requests
for all
using (
  public.current_profile_role() = 'employer'
  and public.current_profile_company_id() = hiring_requests.company_id
)
with check (
  public.current_profile_role() = 'employer'
  and public.current_profile_company_id() = hiring_requests.company_id
);

create policy "admins manage onboarding requests"
on public.employee_onboarding_requests
for all
using (public.is_admin())
with check (public.is_admin());

create policy "employees read own onboarding requests"
on public.employee_onboarding_requests
for select
using (employee_id = public.current_profile_employee_id());

create policy "admins manage employee bank details"
on public.employee_bank_details
for all
using (public.is_admin())
with check (public.is_admin());

create policy "employees manage own bank details"
on public.employee_bank_details
for all
using (employee_id = public.current_profile_employee_id())
with check (employee_id = public.current_profile_employee_id());

create policy "admins manage documents"
on public.documents
for all
using (public.is_admin())
with check (public.is_admin());

create policy "employers read company documents"
on public.documents
for select
using (
  public.current_profile_role() = 'employer'
  and exists (
    select 1
    from public.employees e
    where e.id = documents.employee_id
      and e.company_id = public.current_profile_company_id()
  )
);

create policy "employees manage own documents"
on public.documents
for all
using (employee_id = public.current_profile_employee_id())
with check (employee_id = public.current_profile_employee_id());

create policy "admins manage document requirements"
on public.document_requirements
for all
using (public.is_admin())
with check (public.is_admin());

create policy "employers read document requirements"
on public.document_requirements
for select
using (
  public.current_profile_role() = 'employer'
  and (
    document_requirements.company_id is null
    or document_requirements.company_id = public.current_profile_company_id()
  )
);

create policy "employees read document requirements"
on public.document_requirements
for select
using (
  document_requirements.company_id is null
  or exists (
    select 1
    from public.employees e
    where e.id = public.current_profile_employee_id()
      and e.company_id = document_requirements.company_id
  )
);

create policy "admins manage leave policies"
on public.leave_policies
for all
using (public.is_admin())
with check (public.is_admin());

create policy "employers read leave policies"
on public.leave_policies
for select
using (public.current_profile_company_id() = leave_policies.company_id);

create policy "employees read own leave policies"
on public.leave_policies
for select
using (
  leave_policies.employee_id is null
  or leave_policies.employee_id = public.current_profile_employee_id()
);

create policy "admins manage leave balances"
on public.employee_leave_balances
for all
using (public.is_admin())
with check (public.is_admin());

create policy "employers read company leave balances"
on public.employee_leave_balances
for select
using (
  public.current_profile_role() = 'employer'
  and exists (
    select 1
    from public.employees e
    where e.id = employee_leave_balances.employee_id
      and e.company_id = public.current_profile_company_id()
  )
);

create policy "employees read own leave balances"
on public.employee_leave_balances
for select
using (employee_id = public.current_profile_employee_id());

create policy "admins manage leave requests"
on public.leave_requests
for all
using (public.is_admin())
with check (public.is_admin());

create policy "employers manage company leave requests"
on public.leave_requests
for all
using (
  public.current_profile_role() = 'employer'
  and public.current_profile_company_id() = leave_requests.company_id
)
with check (
  public.current_profile_role() = 'employer'
  and public.current_profile_company_id() = leave_requests.company_id
);

create policy "employees manage own leave requests"
on public.leave_requests
for all
using (employee_id = public.current_profile_employee_id())
with check (employee_id = public.current_profile_employee_id());

create policy "admins manage resignations"
on public.resignations
for all
using (public.is_admin())
with check (public.is_admin());

create policy "employers manage company resignations"
on public.resignations
for all
using (
  public.current_profile_role() = 'employer'
  and public.current_profile_company_id() = resignations.company_id
)
with check (
  public.current_profile_role() = 'employer'
  and public.current_profile_company_id() = resignations.company_id
);

create policy "employees manage own resignations"
on public.resignations
for all
using (employee_id = public.current_profile_employee_id())
with check (employee_id = public.current_profile_employee_id());

create policy "admins manage offboarding cases"
on public.offboarding_cases
for all
using (public.is_admin())
with check (public.is_admin());

create policy "employers manage company offboarding cases"
on public.offboarding_cases
for all
using (
  public.current_profile_role() = 'employer'
  and public.current_profile_company_id() = offboarding_cases.company_id
)
with check (
  public.current_profile_role() = 'employer'
  and public.current_profile_company_id() = offboarding_cases.company_id
);

create policy "employees read own offboarding cases"
on public.offboarding_cases
for select
using (employee_id = public.current_profile_employee_id());

create policy "admins manage lifecycle events"
on public.employee_lifecycle_events
for all
using (public.is_admin())
with check (public.is_admin());

create policy "employers read company lifecycle events"
on public.employee_lifecycle_events
for select
using (
  public.current_profile_role() = 'employer'
  and exists (
    select 1
    from public.employees e
    where e.id = employee_lifecycle_events.employee_id
      and e.company_id = public.current_profile_company_id()
  )
);

create policy "employees read own lifecycle events"
on public.employee_lifecycle_events
for select
using (employee_id = public.current_profile_employee_id());

create policy "admins manage payrolls"
on public.payrolls
for all
using (public.is_admin())
with check (public.is_admin());

create policy "employers read company payrolls"
on public.payrolls
for select
using (
  public.current_profile_role() = 'employer'
  and public.current_profile_company_id() = payrolls.company_id
);

create policy "employees read own payrolls"
on public.payrolls
for select
using (employee_id = public.current_profile_employee_id());

create policy "admins manage payslips"
on public.payslips
for all
using (public.is_admin())
with check (public.is_admin());

create policy "employers read company payslips"
on public.payslips
for select
using (
  public.current_profile_role() = 'employer'
  and exists (
    select 1
    from public.employees e
    where e.id = payslips.employee_id
      and e.company_id = public.current_profile_company_id()
  )
);

create policy "employees read own payslips"
on public.payslips
for select
using (employee_id = public.current_profile_employee_id());
