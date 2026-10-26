# StudyAssist setup and marketplace guide

The StudyAssist Supabase project has been created and connected to this local app. Its project URL and publishable key are in `.env.local`, which is ignored by Git.

## 1. Connected Supabase project

The project is named **StudyAssist** and is hosted in the Mumbai region (`ap-south-1`). Its URL is `https://cphotwtevdoxzivkoxzi.supabase.co`.

## 2. Local environment values

The root `.env.local` is already configured for this workspace. If you set up a fresh checkout, copy `.env.example` to `.env.local` and replace the sample values with the project URL and active publishable key from the Supabase dashboard:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-real-key
```

Restart `npm run dev` after changing `.env.local`. The root `.gitignore` ignores `.env.local` and allows `.env.example` to be committed. Never add a Supabase secret or service-role key to this app.

## 3. Profile migration

The migration in `supabase/migrations/20261023110908_user_profiles_auth.sql` has been applied to the StudyAssist project. It creates `public.profiles`, enables Row Level Security, grants authenticated users read access only to their own profile, and creates a profile from the Auth signup trigger. It does not grant profile insert or update access to application users. Passwords remain in Supabase Auth and are not copied into the profile table.

The assignment migrations in `supabase/migrations/20261024062640_assignment_submissions.sql` and `supabase/migrations/20261024062908_assignment_file_owner_index.sql` provide the existing private upload flow.

For another Supabase project, apply this migration once using either the CLI or SQL Editor. Do not run it again on StudyAssist.

### Supabase CLI (recommended for ongoing work)

This repository has a Supabase CLI `config.toml`, but the CLI is not an application dependency. From the project root, install the CLI as a pinned development tool, then link the project and push the migration:

```bash
npm install --save-dev --save-exact supabase
npx supabase login
npx supabase link --project-ref your-project-ref
npx supabase db push
```

The CLI will ask you to authenticate and may ask for the database password you chose when creating the project. Keep that password private. `db push` records the migration and applies it to the linked project.

### Supabase SQL Editor

Alternatively, open **SQL Editor** in the Supabase dashboard, paste the complete contents of the migration file, and run it once. If you use this method, do not later push the same migration with the CLI unless you first reconcile the remote migration history.

Tutor applications start as `pending_review`. The marketplace migration described below adds administrator review and quotation-based selection; it does not add payment processing.

## 4. Tutor marketplace migration

Apply `supabase/migrations/20261026170000_tutor_marketplace_quotations.sql` once to the connected Supabase project. It adds tutor marketplace profile fields, administrator review functions, quotations, a transaction-safe selection function, assignment engagement fields, RLS policies, and private-file access for approved subject-matched tutors. It also converts existing tutor subject labels to the assignment subject keys used by matching. Do not apply this migration twice.

Use the Supabase CLI instructions above (`npx supabase db push`) or run the complete migration file once in the Supabase SQL Editor. The migration is present in this repository but must be applied to the target Supabase database before the marketplace routes can use it. Never put a service-role key in browser or application code.

When a tutor edits their public details after approval, their profile returns to `pending_review` and is hidden from searches until an administrator reviews it again. Rejection and suspension reasons are shown privately to that tutor and administrators.

## 5. Configure email authentication and redirects

In the Supabase project:

1. Open **Authentication → Sign In / Providers** and make sure Email is enabled.
2. Keep email confirmation enabled so a new account must verify its address before logging in.
3. Open **Authentication → URL Configuration**. Set the local Site URL to `http://localhost:3000` and add `http://localhost:3000/auth/callback` to the allowed redirect URLs.
4. When deploying, set the production Site URL to your HTTPS domain and add `https://your-domain.example/auth/callback` to the allowed redirect URLs. Also set `NEXT_PUBLIC_SITE_URL` to that same production origin in your hosting provider.
5. For production email delivery, configure a trusted SMTP provider in Supabase Auth. The signup and password-reset messages need working delivery.

The app uses Supabase’s PKCE flow. The callback exchanges the email link’s code (or verifies a token hash if your email template uses one), then sends users to the dashboard matching their database profile role. Password-reset links return to `/update-password`.

## 6. Assign an administrator safely

There is no administrator registration option. A project owner can promote a known, verified account from the Supabase SQL Editor after checking its user ID:

```sql
update public.profiles
set role = 'admin'
where id = 'verified-auth-user-uuid'
  and role = 'student';
```

Only trusted database access can promote a known account to `admin`; ordinary users cannot change their role. After promotion, sign in with that account and use `/admin/dashboard` to review, approve, reject, or suspend tutor applications. The database review function independently checks the signed-in administrator role, records who reviewed the application and when, and prevents tutors from approving themselves.

## 7. Test the marketplace locally

Use separate student, tutor, and administrator accounts. Separate browser profiles or private windows help keep sessions distinct.

1. Apply the marketplace migration and start the site with `npm run dev`.
2. Register a tutor, verify the email, and finish the profile at `/tutor/profile`. Add subjects, qualifications and experience summaries, languages, time zone, availability, and optional price preferences.
3. Promote a separate verified account to administrator using the SQL above. Sign in as that administrator at `/admin/dashboard`, review the application, and approve the tutor.
4. Open `/tutors` in a signed-out or student session. Confirm only approved profiles appear and try the filters. Contact information is not displayed.
5. Register a student, verify the email, sign in, and submit an assignment with a supported file at `/student/assignments/new`.
6. Sign in as the approved tutor. At `/tutor/opportunities`, confirm only requests matching approved subjects appear, download a private supporting file, and submit a quotation.
7. Return to the student session and open the submitted assignment. Compare the quotation and tutor profile, then select one. The assignment becomes `awaiting_payment`, competing quotations become `not_selected`, and the tutor can see the engagement at `/tutor/quotations`. No payment is taken.
8. Confirm a pending tutor cannot browse opportunities, a tutor cannot quote outside their subject permissions, and a student cannot access another student's assignment or quotations.

Run `npm test`, `npm run lint`, and `npm run build` for local checks. The automated tests cover currency conversion and price bounds; they do not connect to Supabase. Approval, RLS, private storage permissions, quotation mutations, and concurrent acceptance still require end-to-end verification against the configured project.

The Terms and Privacy links on registration still lead to homepage draft notices. Have those policies reviewed and published before using the registration flow with real users in production.
