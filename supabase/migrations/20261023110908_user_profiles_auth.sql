-- StudyAssist account profiles.
-- Supabase Auth keeps password hashes in auth.users. This table never stores passwords.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  country text not null,
  phone_e164 text not null,
  role text not null,
  tutor_application_status text,
  tutor_subjects text[] not null default array[]::text[],
  tutor_languages text[] not null default array[]::text[],
  tutor_bio text,
  terms_accepted_at timestamptz not null,
  privacy_accepted_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profiles_full_name_length
    check (char_length(btrim(full_name)) between 2 and 120),
  constraint profiles_country_length
    check (char_length(btrim(country)) between 2 and 100),
  constraint profiles_phone_e164_format
    check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  constraint profiles_role_values
    check (role in ('student', 'tutor', 'admin')),
  constraint profiles_tutor_status_by_role
    check (
      (role = 'tutor' and tutor_application_status in ('pending_review', 'approved', 'rejected'))
      or (role in ('student', 'admin') and tutor_application_status is null)
    ),
  constraint profiles_tutor_details_by_role
    check (
      (
        role = 'tutor'
        and cardinality(tutor_subjects) between 1 and 8
        and cardinality(tutor_languages) between 1 and 8
        and tutor_bio is not null
        and char_length(btrim(tutor_bio)) between 20 and 1000
      )
      or (
        role in ('student', 'admin')
        and cardinality(tutor_subjects) = 0
        and cardinality(tutor_languages) = 0
        and tutor_bio is null
      )
    )
);

comment on table public.profiles is
  'Private StudyAssist profiles. Authorization fields are only changed through trusted database administration.';

create index profiles_tutor_review_idx
  on public.profiles (tutor_application_status, created_at)
  where role = 'tutor';

create index profiles_role_created_idx
  on public.profiles (role, created_at);

alter table public.profiles enable row level security;

revoke all on table public.profiles from public, anon, authenticated;
grant usage on schema public to authenticated;
grant select on table public.profiles to authenticated;

create policy "Users can read their own profile"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

-- Profile creation runs as the database owner so signup is atomic with auth.users.
-- Metadata comes from the signup request and is untrusted, so validate it here and
-- never accept an admin role or a client-supplied tutor approval status.
create or replace function private.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  selected_role text := metadata ->> 'role';
  profile_name text := nullif(btrim(metadata ->> 'full_name'), '');
  profile_country text := nullif(btrim(metadata ->> 'country'), '');
  profile_phone text := metadata ->> 'phone_e164';
  profile_subjects text[] := array[]::text[];
  profile_languages text[] := array[]::text[];
  profile_bio text;
begin
  if selected_role is null or selected_role not in ('student', 'tutor') then
    raise exception using errcode = '22023', message = 'Choose a student or tutor account.';
  end if;

  if profile_name is null or char_length(profile_name) not between 2 and 120 then
    raise exception using errcode = '22023', message = 'Enter a valid full name.';
  end if;

  if profile_country is null or char_length(profile_country) not between 2 and 100 then
    raise exception using errcode = '22023', message = 'Enter a valid country of residence.';
  end if;

  if profile_phone is null or profile_phone !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception using errcode = '22023', message = 'Enter a valid international phone number.';
  end if;

  if metadata ->> 'terms_accepted' is distinct from 'true'
    or metadata ->> 'privacy_accepted' is distinct from 'true' then
    raise exception using errcode = '22023', message = 'Accept the Terms and Privacy Policy to register.';
  end if;

  if selected_role = 'tutor' then
    if jsonb_typeof(metadata -> 'tutor_subjects') is distinct from 'array' then
      raise exception using errcode = '22023', message = 'Choose valid tutor subjects.';
    end if;
    if jsonb_array_length(metadata -> 'tutor_subjects') not between 1 and 8 then
      raise exception using errcode = '22023', message = 'Choose between one and eight tutor subjects.';
    end if;

    if exists (
      select 1
      from jsonb_array_elements_text(metadata -> 'tutor_subjects') as item(value)
      where coalesce(char_length(btrim(item.value)), 0) not between 2 and 80
    ) then
      raise exception using errcode = '22023', message = 'Enter valid tutor subjects.';
    end if;

    select coalesce(array_agg(btrim(item.value) order by item.ordinality), array[]::text[])
      into profile_subjects
      from jsonb_array_elements_text(metadata -> 'tutor_subjects')
        with ordinality as item(value, ordinality);

    if jsonb_typeof(metadata -> 'tutor_languages') is distinct from 'array' then
      raise exception using errcode = '22023', message = 'Enter valid spoken languages.';
    end if;
    if jsonb_array_length(metadata -> 'tutor_languages') not between 1 and 8 then
      raise exception using errcode = '22023', message = 'Enter one to eight spoken languages.';
    end if;

    if exists (
      select 1
      from jsonb_array_elements_text(metadata -> 'tutor_languages') as item(value)
      where coalesce(char_length(btrim(item.value)), 0) not between 2 and 40
    ) then
      raise exception using errcode = '22023', message = 'Enter valid spoken languages.';
    end if;

    select coalesce(array_agg(btrim(item.value) order by item.ordinality), array[]::text[])
      into profile_languages
      from jsonb_array_elements_text(metadata -> 'tutor_languages')
        with ordinality as item(value, ordinality);

    profile_bio := nullif(btrim(metadata ->> 'tutor_bio'), '');
    if profile_bio is null or char_length(profile_bio) not between 20 and 1000 then
      raise exception using errcode = '22023', message = 'Enter a short tutor biography.';
    end if;
  end if;

  insert into public.profiles (
    id,
    full_name,
    country,
    phone_e164,
    role,
    tutor_application_status,
    tutor_subjects,
    tutor_languages,
    tutor_bio,
    terms_accepted_at,
    privacy_accepted_at
  )
  values (
    new.id,
    profile_name,
    profile_country,
    profile_phone,
    selected_role,
    case when selected_role = 'tutor' then 'pending_review' else null end,
    profile_subjects,
    profile_languages,
    profile_bio,
    now(),
    now()
  )
  on conflict (id) do nothing;

  return new;
end;
$function$;

revoke all on function private.create_profile_for_auth_user() from public, anon, authenticated;

create trigger create_profile_after_auth_signup
  after insert on auth.users
  for each row execute function private.create_profile_for_auth_user();

create or replace function private.update_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

revoke all on function private.update_profile_updated_at() from public, anon, authenticated;

create trigger set_profile_updated_at
  before update on public.profiles
  for each row execute function private.update_profile_updated_at();
