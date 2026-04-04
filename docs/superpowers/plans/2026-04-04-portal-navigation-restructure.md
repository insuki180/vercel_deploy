# Portal Navigation Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the portal into a route-based production workspace for admin, employer, and employee roles with loading states, cleaned-up copy, and admin account management.

**Architecture:** Replace single-page role dashboards with nested section routes backed by shared role layouts and reusable section components. Keep the current Supabase-backed workflow logic, add the minimum backend support for admin creation, and introduce route-level plus action-level loading feedback.

**Tech Stack:** Next.js App Router, React Server Components, Next.js Server Actions, Supabase Auth/DB, Tailwind CSS, Vitest, Playwright

---

## File Structure

- Create: `src/app/admin/layout.tsx`
- Create: `src/app/admin/page.tsx`
- Create: `src/app/admin/loading.tsx`
- Create: `src/app/admin/[section]/page.tsx`
- Create: `src/app/admin/[section]/loading.tsx`
- Create: `src/app/employer/layout.tsx`
- Create: `src/app/employer/page.tsx`
- Create: `src/app/employer/loading.tsx`
- Create: `src/app/employer/[section]/page.tsx`
- Create: `src/app/employer/[section]/loading.tsx`
- Create: `src/app/employee/layout.tsx`
- Create: `src/app/employee/page.tsx`
- Create: `src/app/employee/loading.tsx`
- Create: `src/app/employee/[section]/page.tsx`
- Create: `src/app/employee/[section]/loading.tsx`
- Create: `src/components/portal/loading-skeleton.tsx`
- Create: `src/components/portal/route-section.tsx`
- Create: `src/components/portal/section-pages.tsx`
- Modify: `src/components/portal/sidebar.tsx`
- Modify: `src/components/portal/shell.tsx`
- Modify: `src/components/portal/admin-dashboard.tsx`
- Modify: `src/components/portal/employer-dashboard.tsx`
- Modify: `src/components/portal/employee-dashboard.tsx`
- Modify: `src/components/ui/portal-kit.tsx`
- Modify: `src/lib/portal/actions.ts`
- Modify: `src/lib/portal/backend.ts`
- Modify: `tests/e2e/portal.spec.ts`
- Modify: `tests/portal-actions-supabase.test.ts`

### Task 1: Add route config and navigation primitives

**Files:**
- Create: `src/components/portal/route-section.tsx`
- Modify: `src/components/portal/sidebar.tsx`
- Modify: `src/components/portal/shell.tsx`
- Test: `tests/portal-actions-supabase.test.ts`

- [ ] **Step 1: Write the failing test**

Add assertions covering role navigation config and active route matching.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/portal-actions-supabase.test.ts`
Expected: FAIL because route config/behavior does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create a central route-section config for admin/employer/employee and refactor the sidebar to render grouped links from it. Update the shell to support route titles and page framing without demo/control-room copy.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/portal-actions-supabase.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/portal/route-section.tsx src/components/portal/sidebar.tsx src/components/portal/shell.tsx tests/portal-actions-supabase.test.ts
git commit -m "feat: add route-based portal navigation config"
```

### Task 2: Add role layouts, redirects, and loading screens

**Files:**
- Create: `src/app/admin/layout.tsx`
- Create: `src/app/admin/page.tsx`
- Create: `src/app/admin/loading.tsx`
- Create: `src/app/admin/[section]/page.tsx`
- Create: `src/app/admin/[section]/loading.tsx`
- Create: `src/app/employer/layout.tsx`
- Create: `src/app/employer/page.tsx`
- Create: `src/app/employer/loading.tsx`
- Create: `src/app/employer/[section]/page.tsx`
- Create: `src/app/employer/[section]/loading.tsx`
- Create: `src/app/employee/layout.tsx`
- Create: `src/app/employee/page.tsx`
- Create: `src/app/employee/loading.tsx`
- Create: `src/app/employee/[section]/page.tsx`
- Create: `src/app/employee/[section]/loading.tsx`
- Create: `src/components/portal/loading-skeleton.tsx`
- Modify: `src/app/login/page.tsx`
- Test: `tests/e2e/portal.spec.ts`

- [ ] **Step 1: Write the failing test**

Update the E2E spec to expect redirects to `/admin/overview`, `/employer/overview`, and `/employee/overview`, plus visible loading state during navigation.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:e2e -- portal.spec.ts`
Expected: FAIL because current role routes are single pages and loading UI is absent.

- [ ] **Step 3: Write minimal implementation**

Add role layouts that resolve the current user, mount the shared shell, redirect base role paths to overview pages, and add route-level skeleton loading files. Add a login pending state.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:e2e -- portal.spec.ts`
Expected: PASS for updated route expectations.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin src/app/employer src/app/employee src/app/login/page.tsx src/components/portal/loading-skeleton.tsx tests/e2e/portal.spec.ts
git commit -m "feat: add section routes and loading states"
```

### Task 3: Split dashboard content into dedicated section pages

**Files:**
- Create: `src/components/portal/section-pages.tsx`
- Modify: `src/components/portal/admin-dashboard.tsx`
- Modify: `src/components/portal/employer-dashboard.tsx`
- Modify: `src/components/portal/employee-dashboard.tsx`
- Modify: `src/components/ui/portal-kit.tsx`
- Test: `tests/e2e/portal.spec.ts`

- [ ] **Step 1: Write the failing test**

Extend E2E coverage to verify that dedicated pages render section-specific content rather than a single combined dashboard dump.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:e2e -- portal.spec.ts`
Expected: FAIL because all sections still render inline.

- [ ] **Step 3: Write minimal implementation**

Extract reusable section components from current dashboards. Keep overview pages for summaries and render focused list/queue pages for companies, employers, employees, hiring, leave, payroll, documents, resignations, offboarding, profile, documents, payslips, and settings.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:e2e -- portal.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/portal/section-pages.tsx src/components/portal/admin-dashboard.tsx src/components/portal/employer-dashboard.tsx src/components/portal/employee-dashboard.tsx src/components/ui/portal-kit.tsx tests/e2e/portal.spec.ts
git commit -m "feat: split portal dashboards into section pages"
```

### Task 4: Add admin account management

**Files:**
- Modify: `src/lib/portal/actions.ts`
- Modify: `src/lib/portal/backend.ts`
- Modify: `src/components/portal/section-pages.tsx`
- Test: `tests/portal-actions-supabase.test.ts`

- [ ] **Step 1: Write the failing test**

Add a server-action/backend test covering creation of a new admin account/profile.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/portal-actions-supabase.test.ts`
Expected: FAIL because admin creation action does not exist.

- [ ] **Step 3: Write minimal implementation**

Add the backend helper and server action to create admin auth users and upsert admin profiles. Surface the workflow on `/admin/admins`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/portal-actions-supabase.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/portal/actions.ts src/lib/portal/backend.ts src/components/portal/section-pages.tsx tests/portal-actions-supabase.test.ts
git commit -m "feat: add admin account management"
```

### Task 5: Final verification and polish

**Files:**
- Modify: any touched files as needed for cleanup
- Test: `tests/e2e/portal.spec.ts`

- [ ] **Step 1: Run unit and integration tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 3: Run production build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Run end-to-end tests**

Run: `npm run test:e2e`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: finalize routed portal workspace refresh"
```

## Self-Review

- Spec coverage:
  - route-based admin/employer/employee pages covered by Tasks 1-3
  - loading states covered by Task 2
  - copy cleanup covered by Tasks 1-3
  - admin management covered by Task 4
  - verification covered by Task 5
- Placeholder scan: no `TODO` or unresolved placeholders remain in plan steps.
- Type consistency: route config, section pages, backend admin creation, and tests are referenced consistently.
