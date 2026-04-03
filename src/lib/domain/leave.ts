import type { LeaveBalance, LeavePolicy, LeaveType } from "@/lib/domain/types";

const leaveTypes: LeaveType[] = ["casual", "sick", "earned"];

export interface BuildEmployeeLeaveBalancesInput {
  employeeId: string;
  policy: LeavePolicy;
}

export interface LeaveRequestEvaluation {
  requestedDays: number;
  paidDays: number;
  lossOfPayDays: number;
  classification: "paid" | "partial_loss_of_pay" | "loss_of_pay";
}

export function buildEmployeeLeaveBalances(
  input: BuildEmployeeLeaveBalancesInput,
): LeaveBalance[] {
  return leaveTypes.map((leaveType) => ({
    employeeId: input.employeeId,
    leaveType,
    allocated: input.policy[leaveType],
    used: 0,
    remaining: input.policy[leaveType],
  }));
}

export function evaluateLeaveRequest(input: {
  balances: LeaveBalance[];
  leaveType: LeaveType;
  requestedDays: number;
}): LeaveRequestEvaluation {
  const balance = input.balances.find((entry) => entry.leaveType === input.leaveType);
  const remaining = balance?.remaining ?? 0;
  const paidDays = Math.min(remaining, input.requestedDays);
  const lossOfPayDays = Math.max(0, input.requestedDays - paidDays);

  return {
    requestedDays: input.requestedDays,
    paidDays,
    lossOfPayDays,
    classification:
      paidDays === input.requestedDays
        ? "paid"
        : paidDays === 0
          ? "loss_of_pay"
          : "partial_loss_of_pay",
  };
}

export function settleApprovedLeave(input: {
  balances: LeaveBalance[];
  leaveType: LeaveType;
  requestedDays: number;
}): LeaveBalance[] {
  const evaluation = evaluateLeaveRequest(input);

  return input.balances.map((balance) =>
    balance.leaveType === input.leaveType
      ? {
          ...balance,
          used: balance.used + evaluation.paidDays,
          remaining: Math.max(0, balance.remaining - evaluation.paidDays),
        }
      : balance,
  );
}
