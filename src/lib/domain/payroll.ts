export interface PayrollCalculationInput {
  baseSalary: number;
  taxRate: number;
  workingDaysInMonth: number;
  approvedLossOfPayDays: number;
}

export interface PayrollCalculationResult {
  baseSalary: number;
  tax: number;
  lossOfPayDeduction: number;
  netSalary: number;
}

export function calculatePayrollRecord(
  input: PayrollCalculationInput,
): PayrollCalculationResult {
  const perDayRate =
    input.workingDaysInMonth > 0
      ? input.baseSalary / input.workingDaysInMonth
      : 0;
  const lossOfPayDeduction = Math.round(perDayRate * input.approvedLossOfPayDays);
  const taxableBase = Math.max(0, input.baseSalary - lossOfPayDeduction);
  const tax = Math.round(input.baseSalary * input.taxRate);
  const netSalary = Math.max(0, taxableBase - tax);

  return {
    baseSalary: input.baseSalary,
    tax,
    lossOfPayDeduction,
    netSalary,
  };
}
