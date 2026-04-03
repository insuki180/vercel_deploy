export type AppRole = "admin" | "employer" | "employee";

export type CompanyStatus = "active" | "inactive";

export type LeaveType = "casual" | "sick" | "earned";

export interface LeavePolicy {
  casual: number;
  sick: number;
  earned: number;
}

export interface LeaveBalance {
  employeeId: string;
  leaveType: LeaveType;
  allocated: number;
  used: number;
  remaining: number;
}
