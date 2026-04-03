"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { approveEmployeeAction, createCompanyAction, reviewHiringRequestAction, reviewLeaveRequestAction, reviewResignationAction, runPayrollAction, toggleCompanyStatusAction, updateOffboardingStatusAction } from "@/lib/portal/actions";
import type { DashboardSummaryCard, PortalState } from "@/lib/portal/types";
import { DataTable } from "@/components/ui/data-table";
import { Badge, Button, Input, MetricCard, Panel, PortalPage, Select, StatusBadge } from "@/components/ui/portal-kit";
import { DetailModal } from "@/components/portal/detail-modal";

function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function AdminDashboard({
  state,
  metrics,
}: {
  state: PortalState;
  metrics: DashboardSummaryCard[];
}) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [selectedEmployerId, setSelectedEmployerId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  const companyById = useMemo(
    () => Object.fromEntries(state.companies.map((company) => [company.id, company])),
    [state.companies],
  );

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

  const filteredEmployers = state.employers.filter((employer) => {
    const company = companyById[employer.companyId];
    const matchesSearch =
      !search ||
      employer.name.toLowerCase().includes(search.toLowerCase()) ||
      employer.title.toLowerCase().includes(search.toLowerCase()) ||
      company?.name.toLowerCase().includes(search.toLowerCase());
    const matchesCompany = companyFilter === "all" || employer.companyId === companyFilter;
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

  const filteredOffboarding = state.offboardingCases.filter((entry) => {
    const employee = state.employees.find((record) => record.id === entry.employeeId);
    const matchesSearch =
      !search ||
      employee?.fullName.toLowerCase().includes(search.toLowerCase()) ||
      entry.checklistSummary.toLowerCase().includes(search.toLowerCase());
    const matchesCompany = companyFilter === "all" || entry.companyId === companyFilter;
    const matchesStatus = statusFilter === "all" || entry.status === statusFilter;
    return matchesSearch && matchesCompany && matchesStatus;
  });

  const selectedEmployee = state.employees.find((employee) => employee.id === selectedEmployeeId);
  const selectedEmployer = state.employers.find((employer) => employer.id === selectedEmployerId);

  return (
    <>
      <PortalPage
        eyebrow="Admin Control Room"
        title="Operational visibility for people, payroll, approvals, and company controls."
        description="This admin workspace manages client companies, employer access, hiring approvals, employee verification, leave governance, payroll generation, and offboarding."
        sourceLabel="Demo state with workflow actions"
        actions={
          <>
            <Link href="/onboarding/invite-riya-2026" className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">
              Sample onboarding link
            </Link>
          </>
        }
        metrics={metrics.map((metric) => (
          <MetricCard key={metric.label} label={metric.label} value={metric.value} hint={metric.hint} tone={metric.tone} />
        ))}
      >
        <Panel title="Global filters" description="These filters apply across the main admin queues and list sections.">
          <div className="grid gap-4 md:grid-cols-4">
            <Input placeholder="Search employee, employer, or request" value={search} onChange={(event) => setSearch(event.target.value)} />
            <Select value={companyFilter} onChange={(event) => setCompanyFilter(event.target.value)}>
              <option value="all">All companies</option>
              {state.companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
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

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Panel title="Create company" description="Admins can add client companies and then activate or deactivate them later.">
            <form action={createCompanyAction} className="grid gap-4">
              <Input name="name" placeholder="Client company name" />
              <Input name="clientCountry" placeholder="Client country" />
              <Input name="contactName" placeholder="Primary contact name" />
              <Input name="contactEmail" placeholder="Primary contact email" />
              <Button type="submit">Create company</Button>
            </form>
          </Panel>

          <Panel title="Company controls" description="Deactivate companies without deleting history or losing payroll records.">
            <div className="grid gap-4 md:grid-cols-2">
              {state.companies.map((company) => (
                <div key={company.id} className="rounded-[1.5rem] border border-slate-100 bg-slate-50/70 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-950">{company.name}</p>
                      <p className="text-sm text-slate-500">{company.clientCountry} client · India delivery</p>
                    </div>
                    <StatusBadge status={company.status} />
                  </div>
                  <p className="mt-4 text-sm text-slate-600">{company.primaryContactEmail}</p>
                  <form action={toggleCompanyStatusAction.bind(null, company.id)} className="mt-4">
                    <Button type="submit" variant="secondary">
                      {company.status === "active" ? "Deactivate company" : "Reactivate company"}
                    </Button>
                  </form>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <Panel title="Employer records" description="Click a row to open the employer detail modal.">
          <DataTable
            rows={filteredEmployers}
            emptyTitle="No employers match the current filters"
            emptyDescription="Adjust the admin filters or add a company contact."
            onRowClick={(row) => setSelectedEmployerId(row.id)}
            activeRowId={selectedEmployerId}
            columns={[
              { key: "name", header: "Employer", sortable: true },
              { key: "title", header: "Title" },
              {
                key: "company",
                header: "Company",
                render: (row) => companyById[row.companyId]?.name ?? "-",
              },
              { key: "phone", header: "Phone" },
              {
                key: "status",
                header: "Status",
                render: (row) => <StatusBadge status={row.status} />,
              },
            ]}
          />
        </Panel>

        <Panel title="Employee records" description="Filter by employee, company, date, and status. Open any row for full employee details.">
          <DataTable
            rows={filteredEmployees}
            emptyTitle="No employees match the current filters"
            emptyDescription="Clear filters or approve more hiring requests."
            onRowClick={(row) => setSelectedEmployeeId(row.id)}
            activeRowId={selectedEmployeeId}
            columns={[
              { key: "fullName", header: "Employee", sortable: true },
              { key: "designation", header: "Designation" },
              {
                key: "company",
                header: "Company",
                render: (row) => companyById[row.companyId]?.name ?? "-",
              },
              { key: "joiningDate", header: "Joining Date" },
              {
                key: "status",
                header: "Status",
                render: (row) => <StatusBadge status={row.status} />,
              },
              {
                key: "payrollReady",
                header: "Payroll",
                render: (row) => (
                  <Badge tone={row.payrollReady ? "emerald" : "amber"}>
                    {row.payrollReady ? "Ready" : "Pending"}
                  </Badge>
                ),
              },
            ]}
          />
        </Panel>

        <Panel title="Hiring approvals" description="Employer requests can be reviewed and leave entitlements can be edited before onboarding opens.">
          <div className="space-y-4">
            {filteredHiring.map((request) => (
              <article key={request.id} className="rounded-[1.75rem] border border-slate-100 bg-slate-50/70 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-950">{request.candidateName}</h3>
                    <p className="text-sm text-slate-500">
                      {request.designation} · {companyById[request.companyId]?.name ?? "-"}
                    </p>
                  </div>
                  <StatusBadge status={request.status} />
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <div className="rounded-2xl bg-white p-3 text-sm">
                    <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Salary</p>
                    <p className="mt-1 font-semibold text-slate-950">INR {request.proposedSalary.toLocaleString("en-IN")}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-3 text-sm">
                    <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Joining</p>
                    <p className="mt-1 font-semibold text-slate-950">{request.targetJoiningDate}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-3 text-sm">
                    <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Leave policy</p>
                    <p className="mt-1 font-semibold text-slate-950">
                      C {request.leavePolicy.casual} · S {request.leavePolicy.sick} · E {request.leavePolicy.earned}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white p-3 text-sm">
                    <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Submitted</p>
                    <p className="mt-1 font-semibold text-slate-950">{formatDate(request.submittedAt)}</p>
                  </div>
                </div>
                {request.status === "submitted" ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-5">
                    <form action={reviewHiringRequestAction.bind(null, request.id)} className="contents">
                      <input type="hidden" name="decision" value="approved" />
                      <Input name="leaveCasual" defaultValue={request.leavePolicy.casual} />
                      <Input name="leaveSick" defaultValue={request.leavePolicy.sick} />
                      <Input name="leaveEarned" defaultValue={request.leavePolicy.earned} />
                      <Button type="submit">Approve and open onboarding</Button>
                    </form>
                    <form action={reviewHiringRequestAction.bind(null, request.id)}>
                      <input type="hidden" name="decision" value="rejected" />
                      <input type="hidden" name="leaveCasual" value={String(request.leavePolicy.casual)} />
                      <input type="hidden" name="leaveSick" value={String(request.leavePolicy.sick)} />
                      <input type="hidden" name="leaveEarned" value={String(request.leavePolicy.earned)} />
                      <Button type="submit" variant="ghost" className="w-full border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100">
                        Reject
                      </Button>
                    </form>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </Panel>

        <Panel title="Leave governance" description="Admin can review leave status and see paid versus loss-of-pay outcomes.">
          <DataTable
            rows={filteredLeaves}
            emptyTitle="No leave requests match the current filters"
            emptyDescription="Employee leave requests will appear here."
            columns={[
              {
                key: "employee",
                header: "Employee",
                render: (row) => state.employees.find((entry) => entry.id === row.employeeId)?.fullName ?? "-",
              },
              { key: "leaveType", header: "Leave Type", sortable: true },
              { key: "requestedDays", header: "Days" },
              {
                key: "paidDays",
                header: "Paid vs LOP",
                render: (row) => `${row.paidDays} paid · ${row.lossOfPayDays} LOP`,
              },
              {
                key: "status",
                header: "Status",
                render: (row) => <StatusBadge status={row.status} />,
              },
              {
                key: "actions",
                header: "Actions",
                render: (row) =>
                  row.status === "pending" ? (
                    <div className="flex gap-2">
                      <form action={reviewLeaveRequestAction.bind(null, row.id, "approved")}>
                        <Button type="submit" variant="secondary">Approve</Button>
                      </form>
                      <form action={reviewLeaveRequestAction.bind(null, row.id, "rejected")}>
                        <Button type="submit" variant="ghost">Reject</Button>
                      </form>
                    </div>
                  ) : (
                    <span className="text-sm text-slate-400">Resolved</span>
                  ),
              },
            ]}
          />
        </Panel>

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <Panel title="Payroll engine" description="Generate payroll for active, payroll-ready employees and create new payslips.">
            <form action={runPayrollAction} className="flex flex-wrap gap-3">
              <Input type="month" name="month" defaultValue="2026-04" className="max-w-xs" />
              <Button type="submit">Run payroll</Button>
            </form>

            <div className="mt-5 space-y-3">
              {state.payrolls.slice(0, 6).map((payroll) => {
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

          <Panel title="Documents and offboarding" description="Compliance artifacts and exit workflows remain visible here.">
            <div className="space-y-4">
              {state.documents.slice(0, 5).map((document) => {
                const employee = state.employees.find((entry) => entry.id === document.employeeId);
                return (
                  <div key={document.id} className="rounded-[1.35rem] border border-slate-100 bg-white p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-950">{document.type}</p>
                        <p className="text-sm text-slate-500">{employee?.fullName ?? "-"}</p>
                      </div>
                      <StatusBadge status={document.status} />
                    </div>
                  </div>
                );
              })}

              {filteredOffboarding.map((entry) => {
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
                      <form action={updateOffboardingStatusAction.bind(null, entry.id, "in_progress")}>
                        <Button type="submit" variant="secondary">Mark in progress</Button>
                      </form>
                      <form action={updateOffboardingStatusAction.bind(null, entry.id, "completed")}>
                        <Button type="submit">Complete</Button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>

        <Panel title="Resignation queue" description="Admin can see and resolve resignation approvals before offboarding completion.">
          <DataTable
            rows={state.resignations}
            emptyTitle="No resignations yet"
            emptyDescription="Employee resignation requests will appear here."
            columns={[
              {
                key: "employee",
                header: "Employee",
                render: (row) => state.employees.find((entry) => entry.id === row.employeeId)?.fullName ?? "-",
              },
              { key: "lastWorkingDate", header: "Last working day" },
              {
                key: "status",
                header: "Status",
                render: (row) => <StatusBadge status={row.status} />,
              },
              {
                key: "actions",
                header: "Actions",
                render: (row) =>
                  row.status === "pending" ? (
                    <div className="flex gap-2">
                      <form action={reviewResignationAction.bind(null, row.id, "approved")}>
                        <Button type="submit" variant="secondary">Approve</Button>
                      </form>
                      <form action={reviewResignationAction.bind(null, row.id, "rejected")}>
                        <Button type="submit" variant="ghost">Reject</Button>
                      </form>
                    </div>
                  ) : (
                    <span className="text-sm text-slate-400">Resolved</span>
                  ),
              },
            ]}
          />
        </Panel>
      </PortalPage>

      <DetailModal
        title={selectedEmployee ? selectedEmployee.fullName : "Employee details"}
        open={Boolean(selectedEmployee)}
        onClose={() => setSelectedEmployeeId(null)}
      >
        {selectedEmployee ? (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50/70 p-4">
              <h4 className="font-semibold text-slate-950">Profile</h4>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-4"><dt>Name</dt><dd>{selectedEmployee.fullName}</dd></div>
                <div className="flex justify-between gap-4"><dt>Email</dt><dd>{selectedEmployee.workEmail}</dd></div>
                <div className="flex justify-between gap-4"><dt>Designation</dt><dd>{selectedEmployee.designation}</dd></div>
                <div className="flex justify-between gap-4"><dt>Company</dt><dd>{companyById[selectedEmployee.companyId]?.name ?? "-"}</dd></div>
                <div className="flex justify-between gap-4"><dt>Status</dt><dd><StatusBadge status={selectedEmployee.status} /></dd></div>
                <div className="flex justify-between gap-4"><dt>Joining Date</dt><dd>{selectedEmployee.joiningDate}</dd></div>
              </dl>
              {selectedEmployee.status === "pending_verification" ? (
                <form action={approveEmployeeAction.bind(null, selectedEmployee.id)} className="mt-4">
                  <Button type="submit">Approve onboarding and activate</Button>
                </form>
              ) : null}
            </div>
            <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50/70 p-4">
              <h4 className="font-semibold text-slate-950">Leave and documents</h4>
              <div className="mt-4 space-y-3">
                {state.leaveBalances
                  .filter((entry) => entry.employeeId === selectedEmployee.id)
                  .map((entry) => (
                    <div key={entry.leaveType} className="rounded-2xl bg-white p-3 text-sm">
                      <p className="font-semibold text-slate-950">{entry.leaveType}</p>
                      <p className="text-slate-500">
                        Allocated {entry.allocated} · Used {entry.used} · Remaining {entry.remaining}
                      </p>
                    </div>
                  ))}
                {state.documents
                  .filter((entry) => entry.employeeId === selectedEmployee.id)
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
        ) : null}
      </DetailModal>

      <DetailModal
        title={selectedEmployer ? selectedEmployer.name : "Employer details"}
        open={Boolean(selectedEmployer)}
        onClose={() => setSelectedEmployerId(null)}
      >
        {selectedEmployer ? (
          <div className="grid gap-4">
            <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50/70 p-4">
              <h4 className="font-semibold text-slate-950">Employer profile</h4>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-4"><dt>Name</dt><dd>{selectedEmployer.name}</dd></div>
                <div className="flex justify-between gap-4"><dt>Title</dt><dd>{selectedEmployer.title}</dd></div>
                <div className="flex justify-between gap-4"><dt>Phone</dt><dd>{selectedEmployer.phone}</dd></div>
                <div className="flex justify-between gap-4"><dt>Company</dt><dd>{companyById[selectedEmployer.companyId]?.name ?? "-"}</dd></div>
                <div className="flex justify-between gap-4"><dt>Status</dt><dd><StatusBadge status={selectedEmployer.status} /></dd></div>
              </dl>
            </div>
          </div>
        ) : null}
      </DetailModal>
    </>
  );
}
