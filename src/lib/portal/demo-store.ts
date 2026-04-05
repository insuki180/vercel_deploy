import { buildEmployeeLeaveBalances } from "@/lib/domain/leave";
import type { PortalState } from "@/lib/portal/types";

const now = "2026-04-03T09:00:00.000Z";

function createInitialState(): PortalState {
  const acmeLeavePolicy = { casual: 6, sick: 8, earned: 12 } as const;

  return {
    users: [
      {
        id: "user_admin_1",
        email: "admin@eor.com",
        password: "Admin@123",
        name: "Aarav Admin",
        role: "admin",
        mustChangePassword: false,
      },
      {
        id: "user_employer_1",
        email: "employer@globex.com",
        password: "Employer@123",
        name: "Morgan Employer",
        role: "employer",
        companyId: "company_1",
        mustChangePassword: false,
      },
      {
        id: "user_employee_1",
        email: "employee@globex.com",
        password: "Employee@123",
        name: "Priya Sharma",
        role: "employee",
        companyId: "company_1",
        employeeId: "employee_1",
        mustChangePassword: false,
      },
    ],
    companies: [
      {
        id: "company_1",
        name: "Globex Remote Labs",
        country: "India",
        clientCountry: "United States",
        status: "active",
        createdAt: now,
        primaryContactName: "Morgan Employer",
        primaryContactEmail: "employer@globex.com",
      },
      {
        id: "company_2",
        name: "Dormant Client Co",
        country: "India",
        clientCountry: "United Kingdom",
        status: "inactive",
        createdAt: now,
        primaryContactName: "Legacy Contact",
        primaryContactEmail: "legacy@client.co",
      },
    ],
    employers: [
      {
        id: "employer_1",
        companyId: "company_1",
        userId: "user_employer_1",
        name: "Morgan Employer",
        title: "People Operations Lead",
        phone: "+1 555 0188",
        status: "active",
      },
    ],
    employees: [
      {
        id: "employee_1",
        companyId: "company_1",
        userId: "user_employee_1",
        workEmail: "employee@globex.com",
        personalEmail: "priya.personal@example.com",
        fullName: "Priya Sharma",
        phone: "+91 9876543210",
        designation: "Senior Operations Analyst",
        contractType: "Full-time",
        workLocation: "Bengaluru",
        country: "India",
        salary: 95000,
        currency: "INR",
        joiningDate: "2026-02-10",
        status: "active",
        payrollReady: true,
        leavePolicy: { ...acmeLeavePolicy },
      },
      {
        id: "employee_2",
        companyId: "company_1",
        workEmail: "candidate@globex.com",
        fullName: "Riya Patel",
        phone: "+91 9000001111",
        designation: "People Coordinator",
        contractType: "Fixed-term",
        workLocation: "Pune",
        country: "India",
        salary: 72000,
        currency: "INR",
        joiningDate: "2026-05-01",
        status: "pending_onboarding",
        payrollReady: false,
        leavePolicy: { casual: 5, sick: 7, earned: 10 },
      },
    ],
    hiringRequests: [
      {
        id: "hire_1",
        companyId: "company_1",
        submittedByUserId: "user_employer_1",
        candidateName: "Riya Patel",
        candidateEmail: "candidate@globex.com",
        candidatePhone: "+91 9000001111",
        designation: "People Coordinator",
        contractType: "Fixed-term",
        workLocation: "Pune",
        targetJoiningDate: "2026-05-01",
        proposedSalary: 72000,
        currency: "INR",
        leavePolicy: { casual: 5, sick: 7, earned: 10 },
        status: "onboarding_open",
        notes: "Urgent hire for support expansion.",
        submittedAt: now,
        reviewedAt: now,
      },
      {
        id: "hire_2",
        companyId: "company_1",
        submittedByUserId: "user_employer_1",
        candidateName: "Kabir Mehta",
        candidateEmail: "kabir@candidate.com",
        candidatePhone: "+91 9888800000",
        designation: "Payroll Specialist",
        contractType: "Full-time",
        workLocation: "Remote",
        targetJoiningDate: "2026-05-15",
        proposedSalary: 88000,
        currency: "INR",
        leavePolicy: { casual: 6, sick: 8, earned: 12 },
        status: "submitted",
        notes: "Need payroll experience with India operations.",
        submittedAt: now,
      },
    ],
    onboardingRequests: [
      {
        id: "onboard_1",
        hiringRequestId: "hire_1",
        employeeId: "employee_2",
        companyId: "company_1",
        token: "invite-riya-2026",
        status: "pending",
        expiresAt: "2026-05-20T00:00:00.000Z",
        invitedAt: now,
      },
    ],
    bankDetails: [
      {
        employeeId: "employee_1",
        bankName: "HDFC Bank",
        accountNumber: "XXXXXX4567",
        ifscCode: "HDFC0001234",
        pan: "ABCDE1234F",
        aadhaarLast4: "1122",
        uan: "100200300400",
        esiNumber: "ESI1029384",
      },
    ],
    documents: [
      {
        id: "doc_1",
        employeeId: "employee_1",
        type: "PAN",
        fileName: "pan-card.pdf",
        fileUrl: "/demo/pan-card.pdf",
        status: "approved",
        uploadedAt: now,
      },
      {
        id: "doc_2",
        employeeId: "employee_1",
        type: "Aadhaar",
        fileName: "aadhaar.pdf",
        fileUrl: "/demo/aadhaar.pdf",
        status: "approved",
        uploadedAt: now,
      },
      {
        id: "doc_3",
        employeeId: "employee_2",
        type: "Bank Proof",
        fileName: "bank-proof.pdf",
        fileUrl: "/demo/bank-proof.pdf",
        status: "pending",
        uploadedAt: now,
      },
    ],
    lifecycleEvents: [
      {
        id: "life_1",
        employeeId: "employee_1",
        type: "onboarding",
        status: "approved",
        createdAt: now,
        detail: "Employee verified and activated.",
      },
      {
        id: "life_2",
        employeeId: "employee_2",
        type: "onboarding",
        status: "pending",
        createdAt: now,
        detail: "Onboarding invite sent to employee.",
      },
    ],
    leaveBalances: [
      ...buildEmployeeLeaveBalances({
        employeeId: "employee_1",
        policy: { ...acmeLeavePolicy },
      }).map((entry) =>
        entry.leaveType === "casual"
          ? { ...entry, used: 2, remaining: 4 }
          : entry.leaveType === "sick"
            ? { ...entry, used: 1, remaining: 7 }
            : entry,
      ),
      ...buildEmployeeLeaveBalances({
        employeeId: "employee_2",
        policy: { casual: 5, sick: 7, earned: 10 },
      }),
    ],
    leaveRequests: [
      {
        id: "leave_1",
        employeeId: "employee_1",
        companyId: "company_1",
        leaveType: "casual",
        requestedDays: 2,
        paidDays: 2,
        lossOfPayDays: 0,
        status: "approved",
        reason: "Family travel",
        startDate: "2026-03-12",
        endDate: "2026-03-13",
        submittedAt: now,
        reviewedAt: now,
      },
      {
        id: "leave_2",
        employeeId: "employee_1",
        companyId: "company_1",
        leaveType: "sick",
        requestedDays: 1,
        paidDays: 1,
        lossOfPayDays: 0,
        status: "pending",
        reason: "Medical rest",
        startDate: "2026-04-09",
        endDate: "2026-04-09",
        submittedAt: now,
      },
    ],
    resignations: [
      {
        id: "resign_1",
        employeeId: "employee_1",
        companyId: "company_1",
        reason: "Relocating cities",
        status: "pending",
        submittedAt: now,
        lastWorkingDate: "2026-05-15",
      },
    ],
    offboardingCases: [
      {
        id: "off_1",
        employeeId: "employee_1",
        companyId: "company_1",
        status: "in_progress",
        checklistSummary: "F&F draft, asset recovery pending",
        finalSettlementStatus: "pending",
        createdAt: now,
      },
    ],
    payrolls: [
      {
        id: "pay_1",
        employeeId: "employee_1",
        companyId: "company_1",
        month: "2026-03",
        baseSalary: 95000,
        tax: 9500,
        lossOfPayDeduction: 0,
        netSalary: 85500,
        status: "generated",
        createdAt: now,
      },
    ],
    payslips: [
      {
        id: "slip_1",
        payrollId: "pay_1",
        employeeId: "employee_1",
        month: "2026-03",
        fileName: "priya-sharma-2026-03.pdf",
        createdAt: now,
      },
    ],
  };
}

declare global {
  var __portalState__: PortalState | undefined;
}

export function getPortalState() {
  if (!globalThis.__portalState__) {
    globalThis.__portalState__ = createInitialState();
  }

  return globalThis.__portalState__;
}

export function mutatePortalState(mutator: (state: PortalState) => void) {
  const state = getPortalState();
  mutator(state);
  return state;
}
