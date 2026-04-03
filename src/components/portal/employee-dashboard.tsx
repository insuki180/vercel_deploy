"use client";

import Link from "next/link";
import type { DashboardSummaryCard, PortalState } from "@/lib/portal/types";
import { submitLeaveRequestAction, submitResignationAction, uploadEmployeeDocumentAction } from "@/lib/portal/actions";
import { Badge, Button, Input, MetricCard, Panel, PortalPage, Select, StatusBadge, TextArea } from "@/components/ui/portal-kit";

export function EmployeeDashboard({
  state,
  employeeId,
  metrics,
}: {
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

  if (!employee) {
    return null;
  }

  return (
    <PortalPage
      eyebrow="Employee Self Service"
      title={`Welcome back, ${employee.fullName}.`}
      description="Track your onboarding and profile status, leave balances, documents, payslips, and resignation workflow in one workspace."
      sourceLabel={employee.payrollReady ? "Payroll ready" : "Awaiting admin verification"}
      metrics={metrics.map((metric) => (
        <MetricCard key={metric.label} label={metric.label} value={metric.value} hint={metric.hint} tone={metric.tone} />
      ))}
    >
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel title="Profile snapshot" description="Core employment details and approved leave policy.">
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
              <h3 className="font-semibold text-slate-950">Leave balances</h3>
              <div className="mt-4 space-y-3">
                {balances.map((entry) => (
                  <div key={entry.leaveType} className="rounded-2xl bg-white p-3 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-semibold text-slate-950">{entry.leaveType}</p>
                      <Badge tone={entry.remaining > 0 ? "emerald" : "rose"}>{entry.remaining} remaining</Badge>
                    </div>
                    <p className="mt-1 text-slate-500">
                      Allocated {entry.allocated} · Used {entry.used}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Apply leave" description="See whether the next request will be paid leave or loss of pay based on your remaining balance.">
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
            <Button type="submit">Submit leave request</Button>
          </form>

          <div className="mt-5 space-y-3">
            {leaveRequests.map((request) => (
              <div key={request.id} className="rounded-[1.35rem] border border-slate-100 bg-slate-50/70 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-950">{request.leaveType}</p>
                    <p className="text-sm text-slate-500">{request.startDate} to {request.endDate}</p>
                  </div>
                  <StatusBadge status={request.status} />
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  {request.paidDays} paid · {request.lossOfPayDays} loss of pay
                </p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Documents" description="Upload document names for admin review and verification.">
          <form action={uploadEmployeeDocumentAction.bind(null, employeeId)} className="grid gap-4">
            <Select name="type" defaultValue="Address Proof">
              <option value="Address Proof">Address Proof</option>
              <option value="Signed Agreement">Signed Agreement</option>
              <option value="Education Proof">Education Proof</option>
              <option value="General">General</option>
            </Select>
            <Input name="fileName" placeholder="File name to track in this demo build" />
            <Button type="submit">Add document</Button>
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
      </div>

      <Panel title="Resignation" description="Employees can submit a resignation request for employer and admin review.">
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <form action={submitResignationAction.bind(null, employeeId)} className="grid gap-4">
            <Input type="date" name="lastWorkingDate" />
            <TextArea name="reason" placeholder="Reason for resignation" />
            <Button type="submit">Submit resignation request</Button>
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
    </PortalPage>
  );
}
