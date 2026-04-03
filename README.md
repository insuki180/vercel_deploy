# India-Focused EOR Portal

This repository contains a deployable Next.js portal in `E:\eor test\deploy` for an India-focused employer-of-record workflow:

- Admin control room
- Employer hiring and workforce operations
- Employee onboarding, leave, documents, payslips, and resignation
- PDF payslip generation
- Demo-state workflow engine plus Supabase live adapter wiring and seed tooling

## Demo accounts

- Admin: `admin@eor.com` / `Admin@123`
- Employer: `employer@globex.com` / `Employer@123`
- Employee: `employee@globex.com` / `Employee@123`

Sample onboarding link:

- `/onboarding/invite-riya-2026`

## Scripts

```bash
npm run dev
npm run lint
npm test
npm run build
npm run test:e2e
npm run seed:supabase
```

## Supabase setup

1. Copy `.env.example` to `.env.local`.
2. Fill in the real `SUPABASE_SERVICE_ROLE_KEY` when you are ready to connect live workflows.
3. Apply [`portal-ready-upgrade.sql`](/E:/eor%20test/deploy/supabase/portal-ready-upgrade.sql) in your Supabase SQL editor.
4. If you already applied an earlier version of the portal upgrade, also apply [`live-adapter-followup.sql`](/E:/eor%20test/deploy/supabase/live-adapter-followup.sql).
5. Apply [`rls-recursion-fix.sql`](/E:/eor%20test/deploy/supabase/rls-recursion-fix.sql) to remove recursive policy lookups.
6. Run `npm run seed:supabase` once to create the starter admin, employer, employee, and sample records.

## Notes

- If `.env.local` is present with Supabase values, the app will use the live Supabase-backed path.
- The seed script is intentionally non-destructive and refuses to run against a non-empty project.
- Demo fallback still exists, so the portal can be exercised even before live Supabase seeding.
- [`DEPLOYMENT.md`](/E:/eor%20test/deploy/DEPLOYMENT.md) contains Vercel/Netlify deployment steps and smoke checks.
