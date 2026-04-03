"use client";

import { useMemo, useState } from "react";
import type { DashboardSummaryCard, PortalState, PortalUser } from "@/lib/portal/types";
import { createHiringRequestAction, reviewLeaveRequestAction, reviewResignationAction } from "@/lib/portal/actions";
import { DataTable } from "@/components/ui/data-table";
import { Badge, Button, Input, MetricCard, Panel, PortalPage, StatusBadge, TextArea } from "@/components/ui/portal-kit";
import { DetailModal } from "@/components/portal/detail-modal";

export function EmployerDashboard({
  state,
  user,
  metrics,
}: {
  state: PortalState;
  user: PortalUser;
  metrics: DashboardSummaryCard[];
}) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [teamSearch, setTeamSearch] = useState("");

  const company = state.companies[0];
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

  const selectedEmployee = state.employees.find((employee) => employee.id === selectedEmployeeId);

  return (
    <>
      <PortalPage
        eyebrow="Employer Workspace"
        title="Manage hiring demand, employee records, and approval queues."
        description="Employers can submit hiring requests with leave entitlements, review leave and resignation actions, and keep team visibility in one workspace."
        sourceLabel={company?.status === "inactive" ? "Company inactive" : "Operational workspace"}
        metrics={metrics.map((metric) => (
          <MetricCard key={metric.label} label={metric.label} value={metric.value} hint={metric.hint} tone={metric.tone} />
        ))}
      >
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
              <Button type="submit">Create hiring request</Button>
            </form>
          </Panel>

          <Panel title="Team overview" description="Search the current India workforce and open employee details in a modal.">
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
                {
                  key: "status",
                  header: "Status",
                  render: (row) => <StatusBadge status={row.status} />,
                },
                {
                  key: "salary",
                  header: "Salary",
                  render: (row) => `INR ${row.salary.toLocaleString("en-IN")}`,
                },
              ]}
            />
          </Panel>
        </div>

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
                <p className="mt-3 text-sm text-slate-600">
                  Leave policy: C {request.leavePolicy.casual} · S {request.leavePolicy.sick} · E {request.leavePolicy.earned}
                </p>
              </article>
            ))}
          </div>
        </Panel>

        <div className="grid gap-6 xl:grid-cols-2">
          <Panel title="Leave approval queue" description="Employers can see paid-versus-LOP outcomes before approving.">
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
                    <p className="mt-3 text-sm text-slate-600">
                      {request.paidDays} paid · {request.lossOfPayDays} loss of pay
                    </p>
                    {request.status === "pending" ? (
                      <div className="mt-3 flex gap-2">
                        <form action={reviewLeaveRequestAction.bind(null, request.id, "approved")}>
                          <Button type="submit" variant="secondary">Approve</Button>
                        </form>
                        <form action={reviewLeaveRequestAction.bind(null, request.id, "rejected")}>
                          <Button type="submit" variant="ghost">Reject</Button>
                        </form>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel title="Resignation and payroll visibility" description="See resignation actions and the latest generated payroll rows.">
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
                        <form action={reviewResignationAction.bind(null, request.id, "approved")}>
                          <Button type="submit" variant="secondary">Approve</Button>
                        </form>
                        <form action={reviewResignationAction.bind(null, request.id, "rejected")}>
                          <Button type="submit" variant="ghost">Reject</Button>
                        </form>
                      </div>
                    ) : null}
                  </div>
                );
              })}

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
        </div>
      </PortalPage>

      <DetailModal
        title={selectedEmployee ? selectedEmployee.fullName : "Employee details"}
        open={Boolean(selectedEmployee)}
        onClose={() => setSelectedEmployeeId(null)}
      >
        {selectedEmployee ? (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50/70 p-4">
              <h4 className="font-semibold text-slate-950">Employee details</h4>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-4"><dt>Email</dt><dd>{selectedEmployee.workEmail}</dd></div>
                <div className="flex justify-between gap-4"><dt>Phone</dt><dd>{selectedEmployee.phone}</dd></div>
                <div className="flex justify-between gap-4"><dt>Designation</dt><dd>{selectedEmployee.designation}</dd></div>
                <div className="flex justify-between gap-4"><dt>Status</dt><dd><StatusBadge status={selectedEmployee.status} /></dd></div>
              </dl>
            </div>
            <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50/70 p-4">
              <h4 className="font-semibold text-slate-950">Leave balances</h4>
              <div className="mt-4 space-y-3">
                {state.leaveBalances
                  .filter((entry) => entry.employeeId === selectedEmployee.id)
                  .map((entry) => (
                    <div key={entry.leaveType} className="rounded-2xl bg-white p-3 text-sm">
                      <p className="font-semibold text-slate-950">{entry.leaveType}</p>
                      <p className="text-slate-500">Allocated {entry.allocated} · Remaining {entry.remaining}</p>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ) : null}
      </DetailModal>
    </>
  );
}
