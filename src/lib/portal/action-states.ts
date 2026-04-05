export type CreateCompanyActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  credentials?: {
    employerName: string;
    employerEmail: string;
    employerPassword: string;
  };
};

export const initialCreateCompanyActionState: CreateCompanyActionState = {
  status: "idle",
};

export type ReviewHiringActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  credentials?: {
    employeeName: string;
    employeeEmail: string;
    employeePassword: string;
  };
};

export const initialReviewHiringActionState: ReviewHiringActionState = {
  status: "idle",
};

export type PasswordResetActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  credentials?: {
    accountRole: "admin" | "employer" | "employee";
    accountName: string;
    accountEmail: string;
    temporaryPassword: string;
  };
};

export const initialPasswordResetActionState: PasswordResetActionState = {
  status: "idle",
};

export type PasswordChangeActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export const initialPasswordChangeActionState: PasswordChangeActionState = {
  status: "idle",
};
