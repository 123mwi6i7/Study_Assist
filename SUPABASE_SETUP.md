# StudyAssist authentication setup

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

Tutor status defaults to `pending_review`. There is no application route or database table for accepting paid assignments in this stage. Future paid-assignment policies must require both `role = 'tutor'` and `tutor_application_status = 'approved'`.

## 4. Configure email authentication and redirects

In the Supabase project:

1. Open **Authentication → Sign In / Providers** and make sure Email is enabled.
2. Keep email confirmation enabled so a new account must verify its address before logging in.
3. Open **Authentication → URL Configuration**. Set the local Site URL to `http://localhost:3000` and add `http://localhost:3000/auth/callback` to the allowed redirect URLs.
4. When deploying, set the production Site URL to your HTTPS domain and add `https://your-domain.example/auth/callback` to the allowed redirect URLs. Also set `NEXT_PUBLIC_SITE_URL` to that same production origin in your hosting provider.
5. For production email delivery, configure a trusted SMTP provider in Supabase Auth. The signup and password-reset messages need working delivery.

The app uses Supabase’s PKCE flow. The callback exchanges the email link’s code (or verifies a token hash if your email template uses one), then sends users to the dashboard matching their database profile role. Password-reset links return to `/update-password`.

## 5. Assign an administrator safely

There is no administrator registration option. A project owner can promote a known, verified account from the Supabase SQL Editor after checking its user ID:

```sql
update public.profiles
set role = 'admin'
where id = 'verified-auth-user-uuid'
  and role = 'student';
```

Only trusted database access can change the role or tutor application status; application users have no profile update grant. For tutor approval, use the same trusted process after reviewing the application:

```sql
update public.profiles
set tutor_application_status = 'approved'
where id = 'reviewed-tutor-user-uuid'
  and role = 'tutor'
  and tutor_application_status = 'pending_review';
```

The `/admin/dashboard` page checks the verified session and the profile’s database role on the server. It does not expose administrative actions yet.

## 6. Test locally

1. Start the site with `npm run dev` and open `http://localhost:3000/register`.
2. Register a student, open the verification email, and confirm the redirect to `/student/dashboard`.
3. Log out, log in again, and try the forgot-password link. Open the reset email, set a new password, then log in with it.
4. Register a tutor and verify that `/tutor/dashboard` displays `pending review`. The tutor cannot change that status from the app.
5. While signed in as a student, visit `/tutor/dashboard` and `/admin/dashboard`; the server should send you to your own role’s dashboard. An unconfigured app sends protected routes to the setup page instead.

The Terms and Privacy links on registration still lead to homepage draft notices. Have those policies reviewed and published before using the registration flow with real users in production.
