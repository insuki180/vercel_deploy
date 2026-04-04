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
