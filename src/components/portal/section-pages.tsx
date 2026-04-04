"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import {
  approveEmployeeAction,
  createAdminAction,
  createCompanyFormAction,
  createHiringRequestAction,
  reviewHiringRequestAction,
  reviewLeaveRequestAction,
  reviewResignationAction,
  runPayrollAction,
  submitLeaveRequestAction,
  submitResignationAction,
  toggleCompanyStatusAction,
  updateOffboardingStatusAction,
  uploadEmployeeDocumentAction,
} from "@/lib/portal/actions";
import { initialCreateCompanyActionState } from "@/lib/portal/action-states";
import type { CreateCompanyActionState } from "@/lib/portal/action-states";
import type {
  CompanyRecord,
  DashboardSummaryCard,
  EmployeeRecord,
  EmployerProfile,
  PortalState,
  PortalUser,
} from "@/lib/portal/types";
import { DetailModal } from "@/components/portal/detail-modal";
import { DataTable } from "@/components/ui/data-table";
import {
  Badge,
  EmptyState,
  Input,
  MetricCard,
  Panel,
  PendingSubmitButton,
  PortalPage,
  Select,
  StatusBadge,
  TextArea,
} from "@/components/ui/portal-kit";

function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getCompanyMap(state: PortalState) {
  return Object.fromEntries(state.companies.map((company) => [company.id, company]));
}

function MetricGrid({ metrics }: { metrics: DashboardSummaryCard[] }) {
  return metrics.map((metric) => (
    <MetricCard key={metric.label} label={metric.label} value={metric.value} hint={metric.hint} tone={metric.tone} />
  ));
}

function EmployeeDetailContent({
  employee,
  state,
  employerName,
}: {
  employee: EmployeeRecord;
  state: PortalState;
  employerName?: string;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50/70 p-4">
        <h4 className="font-semibold text-slate-950">Employee profile</h4>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4"><dt>Name</dt><dd>{employee.fullName}</dd></div>
          <div className="flex justify-between gap-4"><dt>Email</dt><dd>{employee.workEmail}</dd></div>
          <div className="flex justify-between gap-4"><dt>Phone</dt><dd>{employee.phone}</dd></div>
          <div className="flex justify-between gap-4"><dt>Designation</dt><dd>{employee.designation}</dd></div>
          <div className="flex justify-between gap-4"><dt>Employer</dt><dd>{employerName ?? "-"}</dd></div>
          <div className="flex justify-between gap-4"><dt>Status</dt><dd><StatusBadge status={employee.status} /></dd></div>
        </dl>
        {employee.status === "pending_verification" ? (
          <form action={approveEmployeeAction.bind(null, employee.id)} className="mt-4">
            <PendingSubmitButton idleLabel="Approve onboarding" pendingLabel="Approving..." />
          </form>
        ) : null}
      </div>
      <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50/70 p-4">
        <h4 className="font-semibold text-slate-950">Leave and documents</h4>
        <div className="mt-4 space-y-3">
          {state.leaveBalances
            .filter((entry) => entry.employeeId === employee.id)
            .map((entry) => (
              <div key={entry.leaveType} className="rounded-2xl bg-white p-3 text-sm">
                <p className="font-semibold text-slate-950">{entry.leaveType}</p>
                <p className="text-slate-500">
                  Allocated {entry.allocated} · Used {entry.used} · Remaining {entry.remaining}
                </p>
              </div>
            ))}
          {state.documents
            .filter((entry) => entry.employeeId === employee.id)
            .map((entry) => (
              <div key={entry.id} className="rounded-2xl bg-white p-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-semibold text-slate-950">{entry.type}</p>
                  <StatusBadge status={entry.status} />
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

function EmployerDetailContent({
  employer,
  contact,
}: {
  employer: CompanyRecord;
  contact?: EmployerProfile;
}) {
  return (
    <div className="grid gap-4">
      <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50/70 p-4">
        <h4 className="font-semibold text-slate-950">Employer profile</h4>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4"><dt>Employer</dt><dd>{employer.name}</dd></div>
          <div className="flex justify-between gap-4"><dt>Country</dt><dd>{employer.clientCountry || employer.country || "-"}</dd></div>
          <div className="flex justify-between gap-4"><dt>Primary contact</dt><dd>{employer.primaryContactName || contact?.name || "-"}</dd></div>
          <div className="flex justify-between gap-4"><dt>Contact email</dt><dd>{employer.primaryContactEmail || "-"}</dd></div>
          <div className="flex justify-between gap-4"><dt>Contact phone</dt><dd>{contact?.phone || "-"}</dd></div>
          <div className="flex justify-between gap-4"><dt>Status</dt><dd><StatusBadge status={employer.status} /></dd></div>
        </dl>
      </div>
    </div>
  );
}

export function AdminSectionPage({
  section,
  state,
  user,
  metrics,
}: {
  section: string;
  state: PortalState;
  user: PortalUser;
  metrics: DashboardSummaryCard[];
}) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [selectedEmployerId, setSelectedEmployerId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [companyCreateState, companyCreateFormAction] = useActionState<CreateCompanyActionState, FormData>(
    createCompanyFormAction,
    initialCreateCompanyActionState,
  );
  const companyById = useMemo(() => getCompanyMap(state), [state]);
  const selectedEmployee = state.employees.find((employee) => employee.id === selectedEmployeeId);
  const selectedEmployer = state.companies.find((employer) => employer.id === selectedEmployerId);
  const selectedEmployerContact = selectedEmployer
    ? state.employers.find((entry) => entry.companyId === selectedEmployer.id)
    : undefined;

  const filteredEmployees = state.employees.filter((employee) => {
    const matchesSearch =
      !search ||
      employee.fullName.toLowerCase().includes(search.toLowerCase()) ||
      employee.designation.toLowerCase().includes(search.toLowerCase()) ||
      employee.workEmail.toLowerCase().includes(search.toLowerCase());
    const matchesCompany = companyFilter === "all" || employee.companyId === companyFilter;
    const matchesStatus = statusFilter === "all" || employee.status === statusFilter;
    const matchesDate = !dateFilter || employee.joiningDate >= dateFilter;
    return matchesSearch && matchesCompany && matchesStatus && matchesDate;
  });

  const filteredEmployers = state.companies.filter((employer) => {
    const contact = state.employers.find((entry) => entry.companyId === employer.id);
    const matchesSearch =
      !search ||
      employer.name.toLowerCase().includes(search.toLowerCase()) ||
      employer.primaryContactName.toLowerCase().includes(search.toLowerCase()) ||
      employer.primaryContactEmail.toLowerCase().includes(search.toLowerCase()) ||
      contact?.phone?.toLowerCase().includes(search.toLowerCase());
    const matchesCompany = companyFilter === "all" || employer.id === companyFilter;
    const matchesStatus = statusFilter === "all" || employer.status === statusFilter;
    return matchesSearch && matchesCompany && matchesStatus;
  });

  const filteredHiring = state.hiringRequests.filter((request) => {
    const matchesSearch =
      !search ||
      request.candidateName.toLowerCase().includes(search.toLowerCase()) ||
      request.designation.toLowerCase().includes(search.toLowerCase());
    const matchesCompany = companyFilter === "all" || request.companyId === companyFilter;
    const matchesStatus = statusFilter === "all" || request.status === statusFilter;
    const matchesDate = !dateFilter || request.submittedAt >= dateFilter;
    return matchesSearch && matchesCompany && matchesStatus && matchesDate;
  });

  const filteredLeaves = state.leaveRequests.filter((request) => {
    const employee = state.employees.find((entry) => entry.id === request.employeeId);
    const matchesSearch =
      !search ||
      employee?.fullName.toLowerCase().includes(search.toLowerCase()) ||
      request.leaveType.toLowerCase().includes(search.toLowerCase());
    const matchesCompany = companyFilter === "all" || request.companyId === companyFilter;
    const matchesStatus = statusFilter === "all" || request.status === statusFilter;
    const matchesDate = !dateFilter || request.startDate >= dateFilter;
    return matchesSearch && matchesCompany && matchesStatus && matchesDate;
  });

  return (
    <>
      <PortalPage
        eyebrow="Admin workspace"
        title="Operational visibility for employers, people, payroll, approvals, and lifecycle controls."
        description="Manage employers, hiring approvals, employee verification, leave governance, payroll generation, and offboarding from dedicated sections."
        metrics={section === "overview" ? <MetricGrid metrics={metrics} /> : undefined}
      >
        {section !== "overview" ? (
          <Panel title="Filters" description="Search and narrow records across admin sections.">
            <div className="grid gap-4 md:grid-cols-4">
              <Input placeholder="Search records" value={search} onChange={(event) => setSearch(event.target.value)} />
              <Select value={companyFilter} onChange={(event) => setCompanyFilter(event.target.value)}>
                <option value="all">All employers</option>
                {state.companies.map((company) => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </Select>
              <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="submitted">Submitted</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="generated">Generated</option>
                <option value="in_progress">In progress</option>
              </Select>
              <Input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
            </div>
          </Panel>
        ) : null}

        {section === "overview" ? (
          <div className="grid gap-6 xl:grid-cols-2">
            <Panel title="Priority queues" description="Fast access to the highest-volume operational sections.">
              <div className="grid gap-4 md:grid-cols-2">
                <Link href="/admin/hiring" className="rounded-[1.5rem] border border-slate-100 bg-slate-50/70 p-5">
                  <p className="text-sm font-semibold text-slate-950">Hiring</p>
                  <p className="mt-2 text-sm text-slate-500">{state.hiringRequests.filter((entry) => entry.status === "submitted").length} pending approvals</p>
                </Link>
                <Link href="/admin/onboarding" className="rounded-[1.5rem] border border-slate-100 bg-slate-50/70 p-5">
                  <p className="text-sm font-semibold text-slate-950">Onboarding</p>
                  <p className="mt-2 text-sm text-slate-500">{state.employees.filter((entry) => entry.status === "pending_verification").length} awaiting activation</p>
                </Link>
                <Link href="/admin/leave" className="rounded-[1.5rem] border border-slate-100 bg-slate-50/70 p-5">
                  <p className="text-sm font-semibold text-slate-950">Leave</p>
                  <p className="mt-2 text-sm text-slate-500">{state.leaveRequests.filter((entry) => entry.status === "pending").length} requests waiting</p>
                </Link>
                <Link href="/admin/payroll" className="rounded-[1.5rem] border border-slate-100 bg-slate-50/70 p-5">
                  <p className="text-sm font-semibold text-slate-950">Payroll</p>
                  <p className="mt-2 text-sm text-slate-500">{state.payrolls.length} generated records</p>
                </Link>
              </div>
            </Panel>
            <Panel title="Recent activity" description="Latest lifecycle, document, and resignation updates.">
              <div className="space-y-3">
                {state.lifecycleEvents.slice(0, 5).map((event) => (
                  <div key={event.id} className="rounded-[1.35rem] border border-slate-100 bg-white p-4">
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-semibold text-slate-950">{event.type.replaceAll("_", " ")}</p>
                      <StatusBadge status={event.status} />
                    </div>
                    <p className="mt-2 text-sm text-slate-500">{event.detail}</p>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        ) : null}

        {section === "employers" ? (
          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <Panel title="Add employer" description="Create a new employer account and a working employer login in one step.">
              <form action={companyCreateFormAction} className="grid gap-4">
                <Input name="name" placeholder="Employer name" />
                <Input name="clientCountry" placeholder="Employer country" />
                <Input name="contactName" placeholder="Primary contact name" />
                <Input name="contactEmail" placeholder="Primary contact email" />
                <Input name="password" type="password" placeholder="Temporary password (optional)" />
                <PendingSubmitButton idleLabel="Create employer and login" pendingLabel="Creating..." />
              </form>
              {companyCreateState.status !== "idle" ? (
                <div
                  className={`mt-5 rounded-[1.5rem] border p-4 ${
                    companyCreateState.status === "success"
                      ? "border-emerald-200 bg-emerald-50/80"
                      : "border-rose-200 bg-rose-50/80"
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-950">{companyCreateState.message}</p>
                  {companyCreateState.credentials ? (
                    <div className="mt-3 grid gap-2 text-sm text-slate-600">
                      <p><span className="font-semibold text-slate-950">Employer:</span> {companyCreateState.credentials.employerName}</p>
                      <p><span className="font-semibold text-slate-950">Email:</span> {companyCreateState.credentials.employerEmail}</p>
                      <p><span className="font-semibold text-slate-950">Temporary password:</span> {companyCreateState.credentials.employerPassword}</p>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </Panel>
            <Panel title="Employer directory" description="Manage employer status, primary contacts, and record details.">
              <div className="grid gap-4 md:grid-cols-2">
                {filteredEmployers.map((company) => (
                  <article
                    key={company.id}
                    className="rounded-[1.5rem] border border-slate-100 bg-slate-50/70 p-4 transition hover:border-sky-200 hover:bg-white"
                  >
                    <button type="button" onClick={() => setSelectedEmployerId(company.id)} className="w-full text-left">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-slate-950">{company.name}</p>
                          <p className="text-sm text-slate-500">{company.clientCountry} employer · India delivery</p>
                        </div>
                        <StatusBadge status={company.status} />
                      </div>
                      <p className="mt-4 text-sm text-slate-600">{company.primaryContactName}</p>
                      <p className="text-sm text-slate-500">{company.primaryContactEmail}</p>
                    </button>
                    <div className="mt-4 flex gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedEmployerId(company.id)}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-200 hover:text-sky-700"
                      >
                        View employer
                      </button>
                      <form action={toggleCompanyStatusAction.bind(null, company.id)} className="flex-1">
                        <PendingSubmitButton
                          idleLabel={company.status === "active" ? "Deactivate employer" : "Reactivate employer"}
                          pendingLabel="Saving..."
                          variant="secondary"
                          className="w-full"
                        />
                      </form>
                    </div>
                  </article>
                ))}
              </div>
            </Panel>
          </div>
        ) : null}

        {section === "employees" ? (
          <Panel title="Employee records" description="Filter by person, employer, date, and status.">
            <DataTable
              rows={filteredEmployees}
              emptyTitle="No employees match the current filters"
              emptyDescription="Clear the filters or approve more hiring requests."
              onRowClick={(row) => setSelectedEmployeeId(row.id)}
              activeRowId={selectedEmployeeId}
              columns={[
                { key: "fullName", header: "Employee", sortable: true },
                { key: "designation", header: "Designation" },
                { key: "company", header: "Employer", render: (row) => companyById[row.companyId]?.name ?? "-" },
                { key: "joiningDate", header: "Joining Date" },
                { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
                { key: "payrollReady", header: "Payroll", render: (row) => <Badge tone={row.payrollReady ? "emerald" : "amber"}>{row.payrollReady ? "Ready" : "Pending"}</Badge> },
              ]}
            />
          </Panel>
        ) : null}

        {section === "hiring" ? (
          <Panel title="Hiring approvals" description="Review requests and finalize approved leave entitlements before onboarding opens.">
            <div className="space-y-4">
              {filteredHiring.map((request) => (
                <article key={request.id} className="rounded-[1.75rem] border border-slate-100 bg-slate-50/70 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">{request.candidateName}</h3>
                      <p className="text-sm text-slate-500">{request.designation} · {companyById[request.companyId]?.name ?? "-"}</p>
                    </div>
                    <StatusBadge status={request.status} />
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <div className="rounded-2xl bg-white p-3 text-sm"><p className="text-xs uppercase tracking-[0.28em] text-slate-400">Salary</p><p className="mt-1 font-semibold text-slate-950">INR {request.proposedSalary.toLocaleString("en-IN")}</p></div>
                    <div className="rounded-2xl bg-white p-3 text-sm"><p className="text-xs uppercase tracking-[0.28em] text-slate-400">Joining</p><p className="mt-1 font-semibold text-slate-950">{request.targetJoiningDate || "-"}</p></div>
                    <div className="rounded-2xl bg-white p-3 text-sm"><p className="text-xs uppercase tracking-[0.28em] text-slate-400">Leave policy</p><p className="mt-1 font-semibold text-slate-950">C {request.leavePolicy.casual} · S {request.leavePolicy.sick} · E {request.leavePolicy.earned}</p></div>
                    <div className="rounded-2xl bg-white p-3 text-sm"><p className="text-xs uppercase tracking-[0.28em] text-slate-400">Submitted</p><p className="mt-1 font-semibold text-slate-950">{formatDate(request.submittedAt)}</p></div>
                  </div>
                  {request.status === "submitted" ? (
                    <div className="mt-4 grid gap-3 md:grid-cols-5">
                      <form action={reviewHiringRequestAction.bind(null, request.id)} className="contents">
                        <input type="hidden" name="decision" value="approved" />
                        <Input name="leaveCasual" defaultValue={request.leavePolicy.casual} />
                        <Input name="leaveSick" defaultValue={request.leavePolicy.sick} />
                        <Input name="leaveEarned" defaultValue={request.leavePolicy.earned} />
                        <PendingSubmitButton idleLabel="Approve and open onboarding" pendingLabel="Approving..." />
                      </form>
                      <form action={reviewHiringRequestAction.bind(null, request.id)}>
                        <input type="hidden" name="decision" value="rejected" />
                        <input type="hidden" name="leaveCasual" value={String(request.leavePolicy.casual)} />
                        <input type="hidden" name="leaveSick" value={String(request.leavePolicy.sick)} />
                        <input type="hidden" name="leaveEarned" value={String(request.leavePolicy.earned)} />
                        <PendingSubmitButton idleLabel="Reject" pendingLabel="Rejecting..." variant="ghost" className="w-full border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100" />
                      </form>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </Panel>
        ) : null}

        {section === "onboarding" ? (
          <Panel title="Onboarding queue" description="Track pending invitations, submitted onboarding, and activation-ready employees.">
            <DataTable
              rows={state.onboardingRequests}
              emptyTitle="No onboarding requests yet"
              emptyDescription="Approved hiring requests will open onboarding here."
              columns={[
                { key: "token", header: "Invite Token" },
                { key: "employee", header: "Employee", render: (row) => state.employees.find((entry) => entry.id === row.employeeId)?.fullName ?? "-" },
                { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
                { key: "invitedAt", header: "Invited", render: (row) => formatDate(row.invitedAt) },
                { key: "expiresAt", header: "Expires", render: (row) => formatDate(row.expiresAt) },
              ]}
            />
          </Panel>
        ) : null}

        {section === "leave" ? (
          <Panel title="Leave governance" description="Review paid versus loss-of-pay outcomes before approval.">
            <DataTable
              rows={filteredLeaves}
              emptyTitle="No leave requests match the current filters"
              emptyDescription="Employee leave requests will appear here."
              columns={[
                { key: "employee", header: "Employee", render: (row) => state.employees.find((entry) => entry.id === row.employeeId)?.fullName ?? "-" },
                { key: "leaveType", header: "Leave Type", sortable: true },
                { key: "requestedDays", header: "Days" },
                { key: "paidDays", header: "Paid vs LOP", render: (row) => `${row.paidDays} paid · ${row.lossOfPayDays} LOP` },
                { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
                {
                  key: "actions",
                  header: "Actions",
                  render: (row) =>
                    row.status === "pending" ? (
                      <div className="flex gap-2">
                        <form action={reviewLeaveRequestAction.bind(null, row.id, "approved")}><PendingSubmitButton idleLabel="Approve" pendingLabel="Approving..." variant="secondary" /></form>
                        <form action={reviewLeaveRequestAction.bind(null, row.id, "rejected")}><PendingSubmitButton idleLabel="Reject" pendingLabel="Rejecting..." variant="ghost" /></form>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400">Resolved</span>
                    ),
                },
              ]}
            />
          </Panel>
        ) : null}

        {section === "payroll" ? (
          <Panel title="Payroll engine" description="Generate payroll for active, payroll-ready employees.">
            <form action={runPayrollAction} className="flex flex-wrap gap-3">
              <Input type="month" name="month" defaultValue="2026-04" className="max-w-xs" />
              <PendingSubmitButton idleLabel="Run payroll" pendingLabel="Running..." />
            </form>
            <div className="mt-5 space-y-3">
              {state.payrolls.map((payroll) => {
                const employee = state.employees.find((entry) => entry.id === payroll.employeeId);
                return (
                  <div key={payroll.id} className="rounded-[1.5rem] border border-slate-100 bg-slate-50/70 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-950">{employee?.fullName ?? "-"}</p>
                        <p className="text-sm text-slate-500">{payroll.month}</p>
                      </div>
                      <StatusBadge status={payroll.status} />
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                      <div className="rounded-2xl bg-white p-3">Base: INR {payroll.baseSalary.toLocaleString("en-IN")}</div>
                      <div className="rounded-2xl bg-white p-3">Tax: INR {payroll.tax.toLocaleString("en-IN")}</div>
                      <div className="rounded-2xl bg-white p-3">Net: INR {payroll.netSalary.toLocaleString("en-IN")}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        ) : null}

        {section === "payslips" ? (
          <Panel title="Payslips" description="Generated payroll artifacts available to employees.">
            <DataTable
              rows={state.payslips}
              emptyTitle="No payslips generated yet"
              emptyDescription="Run payroll to create the first payslips."
              columns={[
                { key: "month", header: "Month" },
                { key: "employee", header: "Employee", render: (row) => state.employees.find((entry) => entry.id === row.employeeId)?.fullName ?? "-" },
                { key: "fileName", header: "File name" },
                { key: "actions", header: "Actions", render: (row) => <Link href={`/api/payslips/${row.id}`} className="text-sm font-semibold text-sky-700">Open PDF</Link> },
              ]}
            />
          </Panel>
        ) : null}

        {section === "documents" ? (
          <Panel title="Documents" description="Review uploaded employee documents and verification status.">
            <DataTable
              rows={state.documents}
              emptyTitle="No documents uploaded yet"
              emptyDescription="Employee uploads will appear here."
              columns={[
                { key: "type", header: "Type" },
                { key: "employee", header: "Employee", render: (row) => state.employees.find((entry) => entry.id === row.employeeId)?.fullName ?? "-" },
                { key: "fileName", header: "File name" },
                { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
              ]}
            />
          </Panel>
        ) : null}

        {section === "resignations" ? (
          <Panel title="Resignation queue" description="Review employee resignation requests before offboarding begins.">
            <DataTable
              rows={state.resignations}
              emptyTitle="No resignations yet"
              emptyDescription="Employee resignation requests will appear here."
              columns={[
                { key: "employee", header: "Employee", render: (row) => state.employees.find((entry) => entry.id === row.employeeId)?.fullName ?? "-" },
                { key: "lastWorkingDate", header: "Last working day" },
                { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
                {
                  key: "actions",
                  header: "Actions",
                  render: (row) =>
                    row.status === "pending" ? (
                      <div className="flex gap-2">
                        <form action={reviewResignationAction.bind(null, row.id, "approved")}><PendingSubmitButton idleLabel="Approve" pendingLabel="Approving..." variant="secondary" /></form>
                        <form action={reviewResignationAction.bind(null, row.id, "rejected")}><PendingSubmitButton idleLabel="Reject" pendingLabel="Rejecting..." variant="ghost" /></form>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400">Resolved</span>
                    ),
                },
              ]}
            />
          </Panel>
        ) : null}

        {section === "offboarding" ? (
          <Panel title="Offboarding" description="Track final settlement and exit completion.">
            <div className="space-y-4">
              {state.offboardingCases.map((entry) => {
                const employee = state.employees.find((record) => record.id === entry.employeeId);
                return (
                  <div key={entry.id} className="rounded-[1.35rem] border border-slate-100 bg-white p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-950">{employee?.fullName ?? "-"}</p>
                        <p className="text-sm text-slate-500">{entry.checklistSummary}</p>
                      </div>
                      <StatusBadge status={entry.status} />
                    </div>
                    <div className="mt-3 flex gap-2">
                      <form action={updateOffboardingStatusAction.bind(null, entry.id, "in_progress")}><PendingSubmitButton idleLabel="Mark in progress" pendingLabel="Saving..." variant="secondary" /></form>
                      <form action={updateOffboardingStatusAction.bind(null, entry.id, "completed")}><PendingSubmitButton idleLabel="Complete" pendingLabel="Saving..." /></form>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        ) : null}

        {section === "admins" ? (
          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <Panel title="Add admin account" description="Create another admin who can access the full operations workspace.">
              <form action={createAdminAction} className="grid gap-4">
                <Input name="fullName" placeholder="Admin full name" />
                <Input name="email" placeholder="Admin email" />
                <Input type="password" name="password" placeholder="Temporary password" />
                <PendingSubmitButton idleLabel="Create admin" pendingLabel="Creating..." />
              </form>
            </Panel>
            <Panel title="Current admins" description="All current admin profiles in the portal.">
              <div className="space-y-3">
                {state.users.filter((entry) => entry.role === "admin").map((admin) => (
                  <div key={admin.id} className="rounded-[1.35rem] border border-slate-100 bg-white p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-950">{admin.name}</p>
                        <p className="text-sm text-slate-500">{admin.email || "Email available after auth sync"}</p>
                      </div>
                      <Badge tone="emerald">Admin</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        ) : null}

        {section === "settings" ? (
          <Panel title="Settings" description="Workspace settings and account information.">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.35rem] border border-slate-100 bg-slate-50/70 p-4">
                <p className="font-semibold text-slate-950">Signed in as</p>
                <p className="mt-2 text-sm text-slate-500">{user.name}</p>
                <p className="text-sm text-slate-500">{user.email}</p>
              </div>
              <div className="rounded-[1.35rem] border border-slate-100 bg-slate-50/70 p-4">
                <p className="font-semibold text-slate-950">Permissions</p>
                <p className="mt-2 text-sm text-slate-500">This role can manage employers, approvals, payroll, and lifecycle operations.</p>
              </div>
            </div>
          </Panel>
        ) : null}
      </PortalPage>

      <DetailModal title={selectedEmployee ? selectedEmployee.fullName : "Employee details"} open={Boolean(selectedEmployee)} onClose={() => setSelectedEmployeeId(null)}>
        {selectedEmployee ? <EmployeeDetailContent employee={selectedEmployee} state={state} employerName={companyById[selectedEmployee.companyId]?.name} /> : null}
      </DetailModal>
      <DetailModal title={selectedEmployer ? selectedEmployer.name : "Employer details"} open={Boolean(selectedEmployer)} onClose={() => setSelectedEmployerId(null)}>
        {selectedEmployer ? <EmployerDetailContent employer={selectedEmployer} contact={selectedEmployerContact} /> : null}
      </DetailModal>
    </>
  );
}

export function EmployerSectionPage({
  section,
  state,
  user,
  metrics,
}: {
  section: string;
  state: PortalState;
  user: PortalUser;
  metrics: DashboardSummaryCard[];
}) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [teamSearch, setTeamSearch] = useState("");
  const company = state.companies[0];
  const selectedEmployee = state.employees.find((employee) => employee.id === selectedEmployeeId);
  const filteredTeam = useMemo(
    () =>
      state.employees.filter(
        (employee) =>
          !teamSearch ||
          employee.fullName.toLowerCase().includes(teamSearch.toLowerCase()) ||
          employee.designation.toLowerCase().includes(teamSearch.toLowerCase()),
      ),
    [state.employees, teamSearch],
  );

  return (
    <>
      <PortalPage
        eyebrow="Employer workspace"
        title="Manage hiring demand, employee records, and approval queues."
        description="Use dedicated sections to submit hiring requests, track team changes, review leave, and monitor payroll visibility."
        metrics={section === "overview" ? <MetricGrid metrics={metrics} /> : undefined}
      >
        {section === "overview" ? (
          <div className="grid gap-6 xl:grid-cols-3">
            <Link href="/employer/hiring" className="rounded-[1.5rem] border border-slate-100 bg-white p-5">
              <p className="font-semibold text-slate-950">Hiring</p>
              <p className="mt-2 text-sm text-slate-500">{state.hiringRequests.length} requests in progress</p>
            </Link>
            <Link href="/employer/team" className="rounded-[1.5rem] border border-slate-100 bg-white p-5">
              <p className="font-semibold text-slate-950">Team</p>
              <p className="mt-2 text-sm text-slate-500">{state.employees.length} employees under this employer</p>
            </Link>
            <Link href="/employer/leave" className="rounded-[1.5rem] border border-slate-100 bg-white p-5">
              <p className="font-semibold text-slate-950">Leave</p>
              <p className="mt-2 text-sm text-slate-500">{state.leaveRequests.filter((entry) => entry.status === "pending").length} requests awaiting action</p>
            </Link>
          </div>
        ) : null}

        {section === "hiring" ? (
          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <Panel title="Submit hiring request" description="Include the paid leave entitlements offered for this employee.">
              <form action={createHiringRequestAction} className="grid gap-4">
                <input type="hidden" name="companyId" value={user.companyId} />
                <input type="hidden" name="submittedByUserId" value={user.id} />
                <div className="grid gap-4 md:grid-cols-2">
                  <Input name="candidateName" placeholder="Candidate full name" />
                  <Input name="candidateEmail" placeholder="Candidate work email" />
                  <Input name="candidatePhone" placeholder="Candidate phone" />
                  <Input name="designation" placeholder="Designation" />
                  <Input name="contractType" placeholder="Contract type" />
                  <Input name="workLocation" placeholder="Work location" />
                  <Input type="date" name="targetJoiningDate" />
                  <Input type="number" name="proposedSalary" placeholder="Monthly salary (INR)" />
                  <Input type="number" name="leaveCasual" placeholder="Casual leave" defaultValue={6} />
                  <Input type="number" name="leaveSick" placeholder="Sick leave" defaultValue={8} />
                  <Input type="number" name="leaveEarned" placeholder="Earned leave" defaultValue={12} />
                </div>
                <TextArea name="notes" placeholder="Role notes, urgency, or approvals context" />
                <PendingSubmitButton idleLabel="Create hiring request" pendingLabel="Creating..." />
              </form>
            </Panel>
            <Panel title="Hiring pipeline" description="Track submitted requests and onboarding activity.">
              <div className="grid gap-4 md:grid-cols-2">
                {state.hiringRequests.map((request) => (
                  <article key={request.id} className="rounded-[1.5rem] border border-slate-100 bg-slate-50/70 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-950">{request.candidateName}</p>
                        <p className="text-sm text-slate-500">{request.designation}</p>
                      </div>
                      <StatusBadge status={request.status} />
                    </div>
                    <p className="mt-3 text-sm text-slate-600">Leave policy: C {request.leavePolicy.casual} · S {request.leavePolicy.sick} · E {request.leavePolicy.earned}</p>
                  </article>
                ))}
              </div>
            </Panel>
          </div>
        ) : null}

        {section === "team" ? (
          <Panel title="Team directory" description="Search the current workforce and open employee details.">
            <div className="mb-4">
              <Input placeholder="Search team members" value={teamSearch} onChange={(event) => setTeamSearch(event.target.value)} />
            </div>
            <DataTable
              rows={filteredTeam}
              emptyTitle="No team members found"
              emptyDescription="Approved and onboarded employees will appear here."
              onRowClick={(row) => setSelectedEmployeeId(row.id)}
              activeRowId={selectedEmployeeId}
              columns={[
                { key: "fullName", header: "Employee", sortable: true },
                { key: "designation", header: "Designation" },
                { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
                { key: "salary", header: "Salary", render: (row) => `INR ${row.salary.toLocaleString("en-IN")}` },
              ]}
            />
          </Panel>
        ) : null}

        {section === "leave" ? (
          <Panel title="Leave approval queue" description="See paid-versus-LOP outcomes before approving.">
            <div className="space-y-3">
              {state.leaveRequests.map((request) => {
                const employee = state.employees.find((entry) => entry.id === request.employeeId);
                return (
                  <div key={request.id} className="rounded-[1.5rem] border border-slate-100 bg-slate-50/70 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-950">{employee?.fullName ?? "-"}</p>
                        <p className="text-sm text-slate-500">{request.leaveType} · {request.requestedDays} days</p>
                      </div>
                      <StatusBadge status={request.status} />
                    </div>
                    <p className="mt-3 text-sm text-slate-600">{request.paidDays} paid · {request.lossOfPayDays} loss of pay</p>
                    {request.status === "pending" ? (
                      <div className="mt-3 flex gap-2">
                        <form action={reviewLeaveRequestAction.bind(null, request.id, "approved")}><PendingSubmitButton idleLabel="Approve" pendingLabel="Approving..." variant="secondary" /></form>
                        <form action={reviewLeaveRequestAction.bind(null, request.id, "rejected")}><PendingSubmitButton idleLabel="Reject" pendingLabel="Rejecting..." variant="ghost" /></form>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </Panel>
        ) : null}

        {section === "payroll" ? (
          <Panel title="Payroll visibility" description="Latest generated payroll rows for your employer account.">
            <div className="space-y-3">
              {state.payrolls.map((payroll) => {
                const employee = state.employees.find((entry) => entry.id === payroll.employeeId);
                return (
                  <div key={payroll.id} className="rounded-[1.5rem] border border-slate-100 bg-white p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-950">{employee?.fullName ?? "-"}</p>
                        <p className="text-sm text-slate-500">{payroll.month}</p>
                      </div>
                      <Badge tone="emerald">Net INR {payroll.netSalary.toLocaleString("en-IN")}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        ) : null}

        {section === "resignations" ? (
          <Panel title="Resignations" description="Review resignation requests from your team.">
            <div className="space-y-3">
              {state.resignations.map((request) => {
                const employee = state.employees.find((entry) => entry.id === request.employeeId);
                return (
                  <div key={request.id} className="rounded-[1.5rem] border border-slate-100 bg-slate-50/70 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-950">{employee?.fullName ?? "-"}</p>
                        <p className="text-sm text-slate-500">Last working date {request.lastWorkingDate}</p>
                      </div>
                      <StatusBadge status={request.status} />
                    </div>
                    {request.status === "pending" ? (
                      <div className="mt-3 flex gap-2">
                        <form action={reviewResignationAction.bind(null, request.id, "approved")}><PendingSubmitButton idleLabel="Approve" pendingLabel="Approving..." variant="secondary" /></form>
                        <form action={reviewResignationAction.bind(null, request.id, "rejected")}><PendingSubmitButton idleLabel="Reject" pendingLabel="Rejecting..." variant="ghost" /></form>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </Panel>
        ) : null}

        {section === "offboarding" ? (
          <Panel title="Offboarding status" description="Track exit progress and final settlement readiness.">
            <div className="space-y-3">
              {state.offboardingCases.map((entry) => {
                const employee = state.employees.find((record) => record.id === entry.employeeId);
                return (
                  <div key={entry.id} className="rounded-[1.35rem] border border-slate-100 bg-white p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-950">{employee?.fullName ?? "-"}</p>
                        <p className="text-sm text-slate-500">{entry.checklistSummary}</p>
                      </div>
                      <StatusBadge status={entry.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        ) : null}

        {section === "settings" ? (
          <Panel title="Settings" description="Account and employer context for this workspace.">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.35rem] border border-slate-100 bg-slate-50/70 p-4">
                <p className="font-semibold text-slate-950">Employer</p>
                <p className="mt-2 text-sm text-slate-500">{company?.name ?? "-"}</p>
                <p className="text-sm text-slate-500">{company?.status ?? "-"}</p>
              </div>
              <div className="rounded-[1.35rem] border border-slate-100 bg-slate-50/70 p-4">
                <p className="font-semibold text-slate-950">Signed in as</p>
                <p className="mt-2 text-sm text-slate-500">{user.name}</p>
                <p className="text-sm text-slate-500">{user.email}</p>
              </div>
            </div>
          </Panel>
        ) : null}
      </PortalPage>

      <DetailModal title={selectedEmployee ? selectedEmployee.fullName : "Employee details"} open={Boolean(selectedEmployee)} onClose={() => setSelectedEmployeeId(null)}>
        {selectedEmployee ? <EmployeeDetailContent employee={selectedEmployee} state={state} employerName={company?.name} /> : null}
      </DetailModal>
    </>
  );
}

export function EmployeeSectionPage({
  section,
  state,
  employeeId,
  metrics,
}: {
  section: string;
  state: PortalState;
  employeeId: string;
  metrics: DashboardSummaryCard[];
}) {
  const employee = state.employees.find((entry) => entry.id === employeeId);
  const balances = state.leaveBalances.filter((entry) => entry.employeeId === employeeId);
  const leaveRequests = state.leaveRequests.filter((entry) => entry.employeeId === employeeId);
  const documents = state.documents.filter((entry) => entry.employeeId === employeeId);
  const payslips = state.payslips.filter((entry) => entry.employeeId === employeeId);
  const resignations = state.resignations.filter((entry) => entry.employeeId === employeeId);
  const onboarding = state.onboardingRequests.find((entry) => entry.employeeId === employeeId);

  if (!employee) {
    return <EmptyState title="Employee not found" description="This workspace could not load the employee profile." />;
  }

  return (
    <PortalPage
      eyebrow="Employee workspace"
      title={`Welcome back, ${employee.fullName}.`}
      description="Track your profile, onboarding, leave balances, documents, payslips, and resignation workflow in dedicated sections."
      metrics={section === "overview" ? <MetricGrid metrics={metrics} /> : undefined}
    >
      {section === "overview" ? (
        <div className="grid gap-6 xl:grid-cols-3">
          <Link href="/employee/profile" className="rounded-[1.5rem] border border-slate-100 bg-white p-5">
            <p className="font-semibold text-slate-950">Profile</p>
            <p className="mt-2 text-sm text-slate-500">{employee.designation}</p>
          </Link>
          <Link href="/employee/leave" className="rounded-[1.5rem] border border-slate-100 bg-white p-5">
            <p className="font-semibold text-slate-950">Leave</p>
            <p className="mt-2 text-sm text-slate-500">{balances.reduce((sum, entry) => sum + entry.remaining, 0)} total leave remaining</p>
          </Link>
          <Link href="/employee/payslips" className="rounded-[1.5rem] border border-slate-100 bg-white p-5">
            <p className="font-semibold text-slate-950">Payslips</p>
            <p className="mt-2 text-sm text-slate-500">{payslips.length} generated files</p>
          </Link>
        </div>
      ) : null}

      {section === "onboarding" ? (
        <Panel title="Onboarding status" description="Current onboarding and verification progress.">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.35rem] border border-slate-100 bg-slate-50/70 p-4">
              <p className="font-semibold text-slate-950">Status</p>
              <div className="mt-3"><StatusBadge status={onboarding?.status ?? employee.status} /></div>
            </div>
            <div className="rounded-[1.35rem] border border-slate-100 bg-slate-50/70 p-4">
              <p className="font-semibold text-slate-950">Timeline</p>
              <p className="mt-2 text-sm text-slate-500">Invited: {formatDate(onboarding?.invitedAt)}</p>
              <p className="text-sm text-slate-500">Submitted: {formatDate(onboarding?.completedAt)}</p>
            </div>
          </div>
        </Panel>
      ) : null}

      {section === "profile" ? (
        <Panel title="Profile" description="Employment details and approved leave policy.">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50/70 p-4">
              <h3 className="font-semibold text-slate-950">{employee.designation}</h3>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-4"><dt>Work email</dt><dd>{employee.workEmail}</dd></div>
                <div className="flex justify-between gap-4"><dt>Phone</dt><dd>{employee.phone}</dd></div>
                <div className="flex justify-between gap-4"><dt>Joining date</dt><dd>{employee.joiningDate}</dd></div>
                <div className="flex justify-between gap-4"><dt>Status</dt><dd><StatusBadge status={employee.status} /></dd></div>
                <div className="flex justify-between gap-4"><dt>Salary</dt><dd>INR {employee.salary.toLocaleString("en-IN")}</dd></div>
              </dl>
            </div>
            <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50/70 p-4">
              <h3 className="font-semibold text-slate-950">Leave policy</h3>
              <div className="mt-4 space-y-3">
                {balances.map((entry) => (
                  <div key={entry.leaveType} className="rounded-2xl bg-white p-3 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-semibold text-slate-950">{entry.leaveType}</p>
                      <Badge tone={entry.remaining > 0 ? "emerald" : "rose"}>{entry.remaining} remaining</Badge>
                    </div>
                    <p className="mt-1 text-slate-500">Allocated {entry.allocated} · Used {entry.used}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Panel>
      ) : null}

      {section === "documents" ? (
        <Panel title="Documents" description="Upload tracked documents for admin review.">
          <form action={uploadEmployeeDocumentAction.bind(null, employeeId)} className="grid gap-4">
            <Select name="type" defaultValue="Address Proof">
              <option value="Address Proof">Address Proof</option>
              <option value="Signed Agreement">Signed Agreement</option>
              <option value="Education Proof">Education Proof</option>
              <option value="General">General</option>
            </Select>
            <Input name="fileName" placeholder="File name to track" />
            <PendingSubmitButton idleLabel="Add document" pendingLabel="Uploading..." />
          </form>
          <div className="mt-5 space-y-3">
            {documents.map((document) => (
              <div key={document.id} className="rounded-[1.35rem] border border-slate-100 bg-slate-50/70 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-950">{document.type}</p>
                    <p className="text-sm text-slate-500">{document.fileName}</p>
                  </div>
                  <StatusBadge status={document.status} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      {section === "leave" ? (
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Panel title="Apply leave" description="See whether your next request will be paid leave or loss of pay.">
            <form action={submitLeaveRequestAction.bind(null, employeeId)} className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Select name="leaveType" defaultValue="casual">
                  <option value="casual">Casual leave</option>
                  <option value="sick">Sick leave</option>
                  <option value="earned">Earned leave</option>
                </Select>
                <Input type="number" name="requestedDays" defaultValue={1} />
                <Input type="date" name="startDate" />
                <Input type="date" name="endDate" />
              </div>
              <TextArea name="reason" placeholder="Leave reason" />
              <PendingSubmitButton idleLabel="Submit leave request" pendingLabel="Submitting..." />
            </form>
          </Panel>
          <Panel title="Leave balances and requests" description="Track paid leave, used leave, and loss-of-pay outcomes.">
            <div className="space-y-3">
              {balances.map((entry) => (
                <div key={entry.leaveType} className="rounded-[1.35rem] border border-slate-100 bg-white p-4">
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-semibold text-slate-950">{entry.leaveType}</p>
                    <Badge tone={entry.remaining > 0 ? "emerald" : "rose"}>{entry.remaining} remaining</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">Allocated {entry.allocated} · Used {entry.used}</p>
                </div>
              ))}
              {leaveRequests.map((request) => (
                <div key={request.id} className="rounded-[1.35rem] border border-slate-100 bg-slate-50/70 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-950">{request.leaveType}</p>
                      <p className="text-sm text-slate-500">{request.startDate} to {request.endDate}</p>
                    </div>
                    <StatusBadge status={request.status} />
                  </div>
                  <p className="mt-3 text-sm text-slate-600">{request.paidDays} paid · {request.lossOfPayDays} loss of pay</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      ) : null}

      {section === "payslips" ? (
        <Panel title="Payslips" description="Download generated payslips when payroll has been run for you.">
          <div className="space-y-3">
            {payslips.map((payslip) => (
              <div key={payslip.id} className="rounded-[1.35rem] border border-slate-100 bg-slate-50/70 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-950">{payslip.month}</p>
                    <p className="text-sm text-slate-500">{payslip.fileName}</p>
                  </div>
                  <Link href={`/api/payslips/${payslip.id}`} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
                    Download PDF
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      {section === "resignation" ? (
        <Panel title="Resignation" description="Submit a resignation request for employer and admin review.">
          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <form action={submitResignationAction.bind(null, employeeId)} className="grid gap-4">
              <Input type="date" name="lastWorkingDate" />
              <TextArea name="reason" placeholder="Reason for resignation" />
              <PendingSubmitButton idleLabel="Submit resignation request" pendingLabel="Submitting..." />
            </form>
            <div className="space-y-3">
              {resignations.map((request) => (
                <div key={request.id} className="rounded-[1.35rem] border border-slate-100 bg-slate-50/70 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-950">Last working date {request.lastWorkingDate}</p>
                      <p className="text-sm text-slate-500">{request.reason}</p>
                    </div>
                    <StatusBadge status={request.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      ) : null}

      {section === "settings" ? (
        <Panel title="Settings" description="Account details for this workspace.">
          <div className="rounded-[1.35rem] border border-slate-100 bg-slate-50/70 p-4">
            <p className="font-semibold text-slate-950">{employee.fullName}</p>
            <p className="mt-2 text-sm text-slate-500">{employee.workEmail}</p>
            <p className="text-sm text-slate-500">{employee.status.replaceAll("_", " ")}</p>
          </div>
        </Panel>
      ) : null}
    </PortalPage>
  );
}
