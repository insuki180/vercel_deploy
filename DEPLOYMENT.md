# Deployment

This project is ready to deploy as a standard Next.js application on Vercel or Netlify.

## Required environment variables

Set these in the hosting dashboard:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Supabase preparation

Run these SQL files in Supabase SQL Editor:

1. [`portal-ready-upgrade.sql`](/E:/eor%20test/deploy/supabase/portal-ready-upgrade.sql)
2. [`live-adapter-followup.sql`](/E:/eor%20test/deploy/supabase/live-adapter-followup.sql)
3. [`rls-recursion-fix.sql`](/E:/eor%20test/deploy/supabase/rls-recursion-fix.sql)

Then seed the project once:

```bash
npm run seed:supabase
```

## Vercel

1. Import [`deploy`](/E:/eor%20test/deploy) as a Next.js project.
2. Add the three environment variables.
3. Deploy.

Recommended smoke checks after deploy:

- `GET /api/health`
- login as admin, employer, and employee
- open an employee modal
- create a hiring request
- open a payslip PDF

## Netlify

1. Import [`deploy`](/E:/eor%20test/deploy) as a Next.js project.
2. Build command: `npm run build`
3. Add the three environment variables.
4. Deploy.

Use the same smoke checks as Vercel after the first deploy.
