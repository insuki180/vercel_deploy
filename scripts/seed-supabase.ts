import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type SeedUser = {
  email: string;
  password: string;
  fullName: string;
  role: "admin" | "employer" | "employee";
};

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

async function ensureAuthUser(
  client: SupabaseClient,
  input: SeedUser,
) {
  const { data: listData, error: listError } = await client.auth.admin.listUsers();
  if (listError) {
    throw listError;
  }

  const existing = listData.users.find(
    (entry) => entry.email?.toLowerCase() === input.email.toLowerCase(),
  );
  if (existing) {
    return existing;
  }

  const { data, error } = await client.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      full_name: input.fullName,
    },
  });

  if (error || !data.user) {
    throw error ?? new Error(`Failed to create auth user for ${input.email}`);
  }

  return data.user;
}

async function ensureEmptyProject(client: SupabaseClient) {
  const checks = await Promise.all([
    client.from("profiles").select("*", { count: "exact", head: true }),
    client.from("companies").select("*", { count: "exact", head: true }),
    client.auth.admin.listUsers(),
  ]);

  const profileCount = checks[0].count ?? 0;
  const companyCount = checks[1].count ?? 0;
  const authUserCount = checks[2].data.users.length;

  if (profileCount > 0 || companyCount > 0 || authUserCount > 0) {
    throw new Error(
      "Supabase project is not empty. This seed script is intentionally non-destructive.",
    );
  }
}

async function resetKnownSeedData(client: SupabaseClient) {
  const seedEmails = ["admin@eor.com", "employer@globex.com", "employee@globex.com"];

  await client.from("profiles").update({ company_id: null, employee_id: null }).neq("id", "");

  await client.from("documents").delete().neq("id", crypto.randomUUID());
  await client.from("employee_lifecycle_events").delete().neq("id", crypto.randomUUID());
  await client.from("leave_requests").delete().neq("id", crypto.randomUUID());
  await client.from("employee_leave_balances").delete().neq("id", crypto.randomUUID());
  await client.from("leave_policies").delete().neq("id", crypto.randomUUID());
  await client.from("employee_bank_details").delete().neq("employee_id", crypto.randomUUID());
  await client.from("payslips").delete().neq("id", crypto.randomUUID());
  await client.from("payrolls").delete().neq("id", crypto.randomUUID());
  await client.from("employee_onboarding_requests").delete().neq("id", crypto.randomUUID());
  await client.from("hiring_requests").delete().neq("id", crypto.randomUUID());
  await client.from("offboarding_cases").delete().neq("id", crypto.randomUUID());
  await client.from("resignations").delete().neq("id", crypto.randomUUID());
  await client.from("company_users").delete().neq("id", crypto.randomUUID());
  await client.from("employees").delete().neq("id", crypto.randomUUID());
  await client.from("companies").delete().neq("id", crypto.randomUUID());
  await client.from("profiles").delete().neq("id", crypto.randomUUID());

  const { data: listData } = await client.auth.admin.listUsers();
  for (const user of listData.users) {
    if (user.email && seedEmails.includes(user.email.toLowerCase())) {
      await client.auth.admin.deleteUser(user.id);
    }
  }
}

async function main() {
  const url = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const shouldReset = process.argv.includes("--reset");

  const client = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  if (shouldReset) {
    await resetKnownSeedData(client);
  } else {
    await ensureEmptyProject(client);
  }

  const adminAuth = await ensureAuthUser(client, {
    email: "admin@eor.com",
    password: "Admin@123",
    fullName: "Aarav Admin",
    role: "admin",
  });
  const employerAuth = await ensureAuthUser(client, {
    email: "employer@globex.com",
    password: "Employer@123",
    fullName: "Morgan Employer",
    role: "employer",
  });
  const employeeAuth = await ensureAuthUser(client, {
    email: "employee@globex.com",
    password: "Employee@123",
    fullName: "Priya Sharma",
    role: "employee",
  });

  const companyId = crypto.randomUUID();
  const inactiveCompanyId = crypto.randomUUID();
  const activeEmployeeId = crypto.randomUUID();
  const pendingEmployeeId = crypto.randomUUID();
  const companyUserId = crypto.randomUUID();
  const hiringApprovedId = crypto.randomUUID();
  const hiringSubmittedId = crypto.randomUUID();
  const onboardingId = crypto.randomUUID();
  const bankDetailsId = activeEmployeeId;
  const leavePolicyDefaultId = crypto.randomUUID();
  const leavePolicyPendingId = crypto.randomUUID();
  const leaveRequestApprovedId = crypto.randomUUID();
  const leaveRequestPendingId = crypto.randomUUID();
  const resignationId = crypto.randomUUID();
  const payrollId = crypto.randomUUID();
  const payslipId = crypto.randomUUID();

  const now = "2026-04-03T09:00:00.000Z";

  const { error: profilesError } = await client.from("profiles").insert([
    {
      id: adminAuth.id,
      role: "admin",
      full_name: "Aarav Admin",
      created_at: now,
    },
    {
      id: employerAuth.id,
      role: "employer",
      full_name: "Morgan Employer",
      created_at: now,
    },
    {
      id: employeeAuth.id,
      role: "employee",
      full_name: "Priya Sharma",
      created_at: now,
    },
  ]);
  if (profilesError) {
    throw profilesError;
  }

  const { error: companiesError } = await client.from("companies").insert([
    {
      id: companyId,
      name: "Globex Remote Labs",
      country: "India",
      client_country: "United States",
      status: "active",
      created_by: adminAuth.id,
      created_at: now,
      primary_contact_name: "Morgan Employer",
      primary_contact_email: "employer@globex.com",
    },
    {
      id: inactiveCompanyId,
      name: "Dormant Client Co",
      country: "India",
      client_country: "United Kingdom",
      status: "inactive",
      created_by: adminAuth.id,
      created_at: now,
      primary_contact_name: "Legacy Contact",
      primary_contact_email: "legacy@client.co",
    },
  ]);
  if (companiesError) {
    throw companiesError;
  }

  const { error: companyUsersError } = await client.from("company_users").insert({
    id: companyUserId,
    company_id: companyId,
    profile_id: employerAuth.id,
    role: "employer_admin",
    title: "People Operations Lead",
    phone: "+1 555 0188",
    status: "active",
    created_at: now,
  });
  if (companyUsersError) {
    throw companyUsersError;
  }

  const { error: employeesError } = await client.from("employees").insert([
    {
      id: activeEmployeeId,
      user_id: employeeAuth.id,
      company_id: companyId,
      full_name: "Priya Sharma",
      phone: "+91 9876543210",
      designation: "Senior Operations Analyst",
      work_email: "employee@globex.com",
      personal_email: "priya.personal@example.com",
      contract_type: "Full-time",
      work_location: "Bengaluru",
      country: "India",
      salary: 95000,
      currency: "INR",
      status: "active",
      joining_date: "2026-02-10",
      payroll_ready: true,
      created_at: now,
    },
    {
      id: pendingEmployeeId,
      company_id: companyId,
      full_name: "Riya Patel",
      phone: "+91 9000001111",
      designation: "People Coordinator",
      work_email: "candidate@globex.com",
      contract_type: "Fixed-term",
      work_location: "Pune",
      country: "India",
      salary: 72000,
      currency: "INR",
      status: "pending_onboarding",
      joining_date: "2026-05-01",
      payroll_ready: false,
      created_at: now,
    },
  ]);
  if (employeesError) {
    throw employeesError;
  }

  const { error: profileLinkError } = await client
    .from("profiles")
    .upsert([
      {
        id: employerAuth.id,
        role: "employer",
        full_name: "Morgan Employer",
        company_id: companyId,
        created_at: now,
      },
      {
        id: employeeAuth.id,
        role: "employee",
        full_name: "Priya Sharma",
        company_id: companyId,
        employee_id: activeEmployeeId,
        created_at: now,
      },
    ]);
  if (profileLinkError) {
    throw profileLinkError;
  }

  const { error: hiringError } = await client.from("hiring_requests").insert([
    {
      id: hiringApprovedId,
      company_id: companyId,
      submitted_by: employerAuth.id,
      reviewed_by: adminAuth.id,
      candidate_name: "Riya Patel",
      candidate_email: "candidate@globex.com",
      candidate_phone: "+91 9000001111",
      designation: "People Coordinator",
      contract_type: "Fixed-term",
      work_location: "Pune",
      target_joining_date: "2026-05-01",
      proposed_salary: 72000,
      currency: "INR",
      leave_policy: { casual: 5, sick: 7, earned: 10 },
      status: "onboarding_open",
      notes: "Urgent hire for support expansion.",
      submitted_at: now,
      reviewed_at: now,
    },
    {
      id: hiringSubmittedId,
      company_id: companyId,
      submitted_by: employerAuth.id,
      candidate_name: "Kabir Mehta",
      candidate_email: "kabir@candidate.com",
      candidate_phone: "+91 9888800000",
      designation: "Payroll Specialist",
      contract_type: "Full-time",
      work_location: "Remote",
      target_joining_date: "2026-05-15",
      proposed_salary: 88000,
      currency: "INR",
      leave_policy: { casual: 6, sick: 8, earned: 12 },
      status: "submitted",
      notes: "Need payroll experience with India operations.",
      submitted_at: now,
    },
  ]);
  if (hiringError) {
    throw hiringError;
  }

  const { error: onboardingError } = await client.from("employee_onboarding_requests").insert({
    id: onboardingId,
    hiring_request_id: hiringApprovedId,
    employee_id: pendingEmployeeId,
    company_id: companyId,
    token: "invite-riya-2026",
    status: "pending",
    expires_at: "2026-05-20T00:00:00.000Z",
    invited_at: now,
  });
  if (onboardingError) {
    throw onboardingError;
  }

  const { error: bankError } = await client.from("employee_bank_details").insert({
    employee_id: bankDetailsId,
    bank_name: "HDFC Bank",
    account_number: "XXXXXX4567",
    ifsc_code: "HDFC0001234",
    pan: "ABCDE1234F",
    aadhaar_last4: "1122",
    uan: "100200300400",
    esi_number: "ESI1029384",
    created_at: now,
    updated_at: now,
  });
  if (bankError) {
    throw bankError;
  }

  const { error: leavePolicyError } = await client.from("leave_policies").insert([
    {
      id: leavePolicyDefaultId,
      company_id: companyId,
      casual: 6,
      sick: 8,
      earned: 12,
      approved_by: adminAuth.id,
      created_at: now,
      updated_at: now,
    },
    {
      id: leavePolicyPendingId,
      company_id: companyId,
      employee_id: pendingEmployeeId,
      casual: 5,
      sick: 7,
      earned: 10,
      approved_by: adminAuth.id,
      created_at: now,
      updated_at: now,
    },
  ]);
  if (leavePolicyError) {
    throw leavePolicyError;
  }

  const { error: leaveBalancesError } = await client.from("employee_leave_balances").insert([
    { employee_id: activeEmployeeId, leave_type: "casual", allocated: 6, used: 2, remaining: 4, updated_at: now },
    { employee_id: activeEmployeeId, leave_type: "sick", allocated: 8, used: 1, remaining: 7, updated_at: now },
    { employee_id: activeEmployeeId, leave_type: "earned", allocated: 12, used: 0, remaining: 12, updated_at: now },
    { employee_id: pendingEmployeeId, leave_type: "casual", allocated: 5, used: 0, remaining: 5, updated_at: now },
    { employee_id: pendingEmployeeId, leave_type: "sick", allocated: 7, used: 0, remaining: 7, updated_at: now },
    { employee_id: pendingEmployeeId, leave_type: "earned", allocated: 10, used: 0, remaining: 10, updated_at: now },
  ]);
  if (leaveBalancesError) {
    throw leaveBalancesError;
  }

  const { error: documentsError } = await client.from("documents").insert([
    {
      id: crypto.randomUUID(),
      employee_id: activeEmployeeId,
      type: "PAN",
      file_name: "pan-card.pdf",
      file_url: "/demo/pan-card.pdf",
      status: "approved",
      created_at: now,
    },
    {
      id: crypto.randomUUID(),
      employee_id: activeEmployeeId,
      type: "Aadhaar",
      file_name: "aadhaar.pdf",
      file_url: "/demo/aadhaar.pdf",
      status: "approved",
      created_at: now,
    },
    {
      id: crypto.randomUUID(),
      employee_id: pendingEmployeeId,
      type: "Bank Proof",
      file_name: "bank-proof.pdf",
      file_url: "/demo/bank-proof.pdf",
      status: "pending",
      created_at: now,
    },
  ]);
  if (documentsError) {
    throw documentsError;
  }

  const { error: lifecycleError } = await client.from("employee_lifecycle_events").insert([
    {
      id: crypto.randomUUID(),
      employee_id: activeEmployeeId,
      event_type: "onboarding",
      status: "approved",
      detail: "Employee verified and activated.",
      created_at: now,
    },
    {
      id: crypto.randomUUID(),
      employee_id: pendingEmployeeId,
      event_type: "onboarding",
      status: "pending",
      detail: "Onboarding invite sent to employee.",
      created_at: now,
    },
  ]);
  if (lifecycleError) {
    throw lifecycleError;
  }

  const { error: leaveRequestError } = await client.from("leave_requests").insert([
    {
      id: leaveRequestApprovedId,
      employee_id: activeEmployeeId,
      company_id: companyId,
      leave_type: "casual",
      requested_days: 2,
      paid_days: 2,
      loss_of_pay_days: 0,
      status: "approved",
      reason: "Family travel",
      start_date: "2026-03-12",
      end_date: "2026-03-13",
      submitted_at: now,
      reviewed_by: employerAuth.id,
      reviewed_at: now,
    },
    {
      id: leaveRequestPendingId,
      employee_id: activeEmployeeId,
      company_id: companyId,
      leave_type: "sick",
      requested_days: 1,
      paid_days: 1,
      loss_of_pay_days: 0,
      status: "pending",
      reason: "Medical rest",
      start_date: "2026-04-09",
      end_date: "2026-04-09",
      submitted_at: now,
    },
  ]);
  if (leaveRequestError) {
    throw leaveRequestError;
  }

  const { error: resignationError } = await client.from("resignations").insert({
    id: resignationId,
    employee_id: activeEmployeeId,
    company_id: companyId,
    reason: "Relocating cities",
    status: "pending",
    last_working_date: "2026-05-15",
    created_at: now,
  });
  if (resignationError) {
    throw resignationError;
  }

  const { error: payrollError } = await client.from("payrolls").insert({
    id: payrollId,
    employee_id: activeEmployeeId,
    company_id: companyId,
    month: "2026-03",
    period_start: "2026-03-01",
    base_salary: 95000,
    tax: 9500,
    loss_of_pay_deduction: 0,
    net_salary: 85500,
    status: "generated",
    created_at: now,
  });
  if (payrollError) {
    throw payrollError;
  }

  const { error: payslipError } = await client.from("payslips").insert({
    id: payslipId,
    payroll_id: payrollId,
    employee_id: activeEmployeeId,
    month: "2026-03",
    period_start: "2026-03-01",
    file_name: "priya-sharma-2026-03.pdf",
    file_url: `/api/payslips/${payrollId}`,
    created_at: now,
  });
  if (payslipError) {
    throw payslipError;
  }

  console.log(JSON.stringify({
    ok: true,
    admin: { email: "admin@eor.com", password: "Admin@123" },
    employer: { email: "employer@globex.com", password: "Employer@123" },
    employee: { email: "employee@globex.com", password: "Employee@123" },
    onboardingToken: "invite-riya-2026",
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
