# Portal Navigation Restructure Design

## Summary

Restructure the EOR portal so admin, employer, and employee workspaces behave like production role-based applications instead of single-page dashboards. Remove demo-oriented and "control room" copy, split each role into dedicated route-backed sections, add route-level and action-level loading states, and introduce an admin-account management section.

## Goals

- Remove language that makes the portal feel like a demo or internal mockup.
- Replace the current one-page-per-role structure with real route-based sections.
- Ensure login and sidebar navigation show clear loading feedback.
- Split employer and employee experiences into dedicated pages instead of one long view.
- Add an admin management section where existing admins can add more admin accounts.
- Preserve the current Supabase-backed workflows while improving the information architecture.

## Non-Goals

- Redesign the entire visual identity from scratch.
- Change the underlying business workflows or Supabase schema in this pass unless needed for admin account creation.
- Introduce a new design system or new backend service.

## Route Architecture

### Admin

- `/admin/overview`
- `/admin/companies`
- `/admin/employers`
- `/admin/employees`
- `/admin/hiring`
- `/admin/onboarding`
- `/admin/leave`
- `/admin/payroll`
- `/admin/payslips`
- `/admin/documents`
- `/admin/resignations`
- `/admin/offboarding`
- `/admin/admins`
- `/admin/settings`

### Employer

- `/employer/overview`
- `/employer/hiring`
- `/employer/team`
- `/employer/leave`
- `/employer/payroll`
- `/employer/resignations`
- `/employer/offboarding`
- `/employer/settings`

### Employee

- `/employee/overview`
- `/employee/onboarding`
- `/employee/profile`
- `/employee/documents`
- `/employee/leave`
- `/employee/payslips`
- `/employee/resignation`
- `/employee/settings`

### Routing Behavior

- Existing role entry points should redirect to their overview page.
- Each sidebar item should navigate to a real route, not switch a section on the same page.
- Shared role layouts should enforce auth and role access before rendering section content.

## Content Structure

### Admin

- `Overview`: summary cards, pending approvals, recent activity.
- `Companies`: client companies list with filters and company actions.
- `Employers`: employer list and company assignment visibility.
- `Employees`: employee list, filters, and employee detail modal access.
- `Hiring`: hiring request queue and approval actions.
- `Onboarding`: onboarding request review and activation pipeline.
- `Leave`: leave request queue and leave balance visibility.
- `Payroll`: payroll run controls and current cycle summary.
- `Payslips`: generated payslip list and access links.
- `Documents`: employee document verification queue.
- `Resignations`: resignation review queue.
- `Offboarding`: offboarding case tracker.
- `Admins`: current admin list and create-admin workflow.
- `Settings`: account/workspace settings and logout access.

### Employer

- `Overview`: company summary, pending hiring, leave, and offboarding actions.
- `Hiring`: hiring request creation and tracking.
- `Team`: workforce list and employee detail modal access.
- `Leave`: employee leave requests and leave balance visibility.
- `Payroll`: payroll visibility for the employer's company.
- `Resignations`: company resignation review list.
- `Offboarding`: company offboarding status tracking.
- `Settings`: account settings and logout access.

### Employee

- `Overview`: employment status, leave balance, latest payslip, pending tasks.
- `Onboarding`: onboarding status and remaining steps when relevant.
- `Profile`: personal and employment details.
- `Documents`: uploaded documents and verification status.
- `Leave`: leave balance, paid-vs-loss-of-pay indication, and request form.
- `Payslips`: payslip list and PDF access.
- `Resignation`: resignation submission and status.
- `Settings`: account settings and logout access.

## Copy Changes

- Remove phrases like `Admin Control Room`, `Portal Control`, and `Demo State`.
- Replace them with neutral operational language such as `Overview`, `Operations`, `Workspace`, `People`, and `Payroll`.
- Keep copy concise and production-oriented.

## Loading and Interaction Design

### Route-Level Loading

- Add `loading.tsx` files for login and role section routes.
- Show skeleton headers, cards, and table placeholders during navigation.
- Ensure section navigation feels deliberate rather than blank or abrupt.

### Action-Level Loading

- Sign-in button should show a pending state while authentication completes.
- Forms and queue actions should show disabled/pending states while server actions run.
- Buttons for approval, payroll runs, document actions, and creation flows should provide immediate feedback.

## Shell and Sidebar Design

- Keep a shared portal shell pattern, but move to route-aware navigation.
- Group sidebar links into clear sections per role.
- Highlight the active route.
- Keep logout visible in every role workspace.
- Preserve the current overall visual direction unless a change is needed to support the new structure.

## Admin Account Management

- Add a dedicated `/admin/admins` page.
- Show current admin users with role, email, and status.
- Allow existing admins to add a new admin account.
- Use the existing Supabase auth/admin workflow pattern where possible.
- If additional profile metadata is required for admin creation, extend only the minimum necessary fields.

## Component Refactor Plan

- Break the current role dashboards into reusable section components.
- Keep `overview` pages as summaries built from the same data sources.
- Extract shared list, filter, modal, empty-state, and skeleton components where useful.
- Avoid keeping giant page components that recreate the current all-in-one problem.

## Data and Backend Impact

- Reuse existing Supabase-backed snapshot and workflow actions.
- Add only the backend capability needed to support creating additional admin accounts if it does not already exist.
- Do not change the current data model for navigation-only concerns.

## Error Handling

- Keep auth failures on login clear and specific.
- Show empty states for pages with no records instead of blank layouts.
- Protect role routes from invalid access and redirect appropriately.

## Testing Plan

- Verify login pending state and successful role redirect.
- Verify each sidebar route loads its dedicated page.
- Verify active link highlighting and logout availability.
- Verify admin can open `Admins` page and create an additional admin account.
- Verify employer and employee routes are separated and no longer render all sections on one page.
- Re-run lint, build, unit tests, and end-to-end tests after the route refactor.

## Risks and Mitigations

- Risk: route explosion increases duplication.
  - Mitigation: build shared role layouts and shared section components.
- Risk: current dashboard components may be tightly coupled to one-page rendering.
  - Mitigation: refactor them into smaller page-level modules before wiring routes.
- Risk: loading states can feel inconsistent if added ad hoc.
  - Mitigation: use shared loading primitives and route-level `loading.tsx` files.

## Implementation Boundary

This pass should stop after the portal behaves like a properly sectioned production app with clean language, loading feedback, and admin-account management. Broader visual redesign, permissions expansion, and advanced settings can follow in later iterations.
