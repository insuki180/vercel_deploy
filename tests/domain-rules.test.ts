import {
  buildEmployeeLeaveBalances,
  evaluateLeaveRequest,
  settleApprovedLeave,
} from "@/lib/domain/leave";
import { calculatePayrollRecord } from "@/lib/domain/payroll";
import {
  canAccessCompanyRecords,
  canRunOperationalActionsForCompany,
  getRoleHomePath,
} from "@/lib/domain/access";

describe("calculatePayrollRecord", () => {
  it("calculates tax, loss-of-pay deduction, and net salary for active payroll-ready employees", () => {
    const result = calculatePayrollRecord({
      baseSalary: 100000,
      taxRate: 0.1,
      workingDaysInMonth: 30,
      approvedLossOfPayDays: 2,
    });

    expect(result.lossOfPayDeduction).toBe(6667);
    expect(result.tax).toBe(10000);
    expect(result.netSalary).toBe(83333);
  });
});

describe("leave policy and balances", () => {
  it("builds employee balances from the approved company policy", () => {
    const balances = buildEmployeeLeaveBalances({
      employeeId: "emp_1",
      policy: {
        casual: 6,
        sick: 8,
        earned: 12,
      },
    });

    expect(balances).toEqual([
      { employeeId: "emp_1", leaveType: "casual", allocated: 6, used: 0, remaining: 6 },
      { employeeId: "emp_1", leaveType: "sick", allocated: 8, used: 0, remaining: 8 },
      { employeeId: "emp_1", leaveType: "earned", allocated: 12, used: 0, remaining: 12 },
    ]);
  });

  it("classifies leave requests as fully paid, partially paid, or loss of pay", () => {
    const balances = buildEmployeeLeaveBalances({
      employeeId: "emp_1",
      policy: {
        casual: 2,
        sick: 1,
        earned: 0,
      },
    });

    expect(evaluateLeaveRequest({ balances, leaveType: "casual", requestedDays: 2 })).toMatchObject({
      paidDays: 2,
      lossOfPayDays: 0,
      classification: "paid",
    });

    expect(evaluateLeaveRequest({ balances, leaveType: "sick", requestedDays: 2 })).toMatchObject({
      paidDays: 1,
      lossOfPayDays: 1,
      classification: "partial_loss_of_pay",
    });

    expect(evaluateLeaveRequest({ balances, leaveType: "earned", requestedDays: 2 })).toMatchObject({
      paidDays: 0,
      lossOfPayDays: 2,
      classification: "loss_of_pay",
    });
  });

  it("reduces the remaining balance only when an approved leave request is settled", () => {
    const balances = buildEmployeeLeaveBalances({
      employeeId: "emp_1",
      policy: {
        casual: 5,
        sick: 8,
        earned: 10,
      },
    });

    const settled = settleApprovedLeave({
      balances,
      leaveType: "casual",
      requestedDays: 3,
    });

    expect(settled.find((entry) => entry.leaveType === "casual")).toEqual({
      employeeId: "emp_1",
      leaveType: "casual",
      allocated: 5,
      used: 3,
      remaining: 2,
    });
  });
});

describe("access and company status rules", () => {
  it("derives the correct role home path", () => {
    expect(getRoleHomePath("admin")).toBe("/admin");
    expect(getRoleHomePath("employer")).toBe("/employer");
    expect(getRoleHomePath("employee")).toBe("/employee");
  });

  it("lets admins inspect deactivated companies but blocks operational actions for employer and employee sessions", () => {
    expect(canAccessCompanyRecords({ role: "admin", companyStatus: "inactive" })).toBe(true);
    expect(canAccessCompanyRecords({ role: "employer", companyStatus: "inactive" })).toBe(true);
    expect(canRunOperationalActionsForCompany({ role: "admin", companyStatus: "inactive" })).toBe(true);
    expect(canRunOperationalActionsForCompany({ role: "employer", companyStatus: "inactive" })).toBe(false);
    expect(canRunOperationalActionsForCompany({ role: "employee", companyStatus: "inactive" })).toBe(false);
  });
});
