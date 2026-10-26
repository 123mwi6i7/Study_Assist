-- Tutor marketplace, approval workflow, quotations, and unpaid engagements.

alter table public.profiles
  add column tutor_professional_name text,
  add column tutor_qualifications text,
  add column tutor_experience text,
  add column tutor_timezone text not null default 'Africa/Nairobi',
  add column tutor_availability text,
  add column tutor_min_price_minor bigint,
  add column tutor_max_price_minor bigint,
  add column tutor_price_currency text,
  add column tutor_is_active boolean not null default false,
  add column tutor_review_reason text,
  add column tutor_reviewed_at timestamptz,
  add column tutor_reviewed_by uuid references public.profiles (id) on delete set null;

update public.profiles
set tutor_professional_name = full_name,
    tutor_application_status = case
      when tutor_application_status = 'approved' then 'pending_review'
      else tutor_application_status
    end,
    tutor_is_active = false
where role = 'tutor';

update public.profiles
set tutor_subjects = array(
  select case subject
    when 'Mathematics' then 'mathematics_statistics'
    when 'Business' then 'business_management'
    when 'Accounting' then 'accounting_finance'
    when 'Computer Science' then 'computer_science_programming'
    when 'Research Guidance' then 'research_methodology'
    when 'Academic Writing' then 'academic_writing_guidance'
    when 'Proofreading' then 'proofreading_draft_feedback'
    when 'Referencing' then 'referencing_citation_support'
    else subject
  end
  from unnest(tutor_subjects) as selected(subject)
)
where role = 'tutor';

create or replace function private.set_tutor_profile_defaults()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if new.role = 'tutor' then
    new.tutor_professional_name := coalesce(nullif(btrim(new.tutor_professional_name), ''), new.full_name);
  end if;
  return new;
end;
$function$;

revoke all on function private.set_tutor_profile_defaults() from public, anon, authenticated;
create trigger set_tutor_profile_defaults
  before insert on public.profiles
  for each row execute function private.set_tutor_profile_defaults();

alter table public.profiles
  alter column tutor_timezone set not null,
  drop constraint profiles_tutor_status_by_role,
  add constraint profiles_tutor_status_by_role
    check (
      (
        role = 'tutor'
        and tutor_application_status is not null
        and tutor_application_status in ('pending_review', 'approved', 'rejected', 'suspended')
      )
      or (role in ('student', 'admin') and tutor_application_status is null)
    ),
  add constraint profiles_tutor_marketplace_fields
    check (
      (
        role = 'tutor'
        and tutor_professional_name is not null
        and char_length(btrim(tutor_professional_name)) between 2 and 120
        and (tutor_qualifications is null or char_length(btrim(tutor_qualifications)) between 2 and 2000)
        and (tutor_experience is null or char_length(btrim(tutor_experience)) between 2 and 2000)
        and char_length(btrim(tutor_timezone)) between 1 and 100
        and tutor_is_active = (tutor_application_status = 'approved')
        and (tutor_availability is null or char_length(btrim(tutor_availability)) between 2 and 1000)
        and (
          (tutor_min_price_minor is null and tutor_max_price_minor is null and tutor_price_currency is null)
          or (
            tutor_min_price_minor is not null
            and tutor_max_price_minor is not null
            and tutor_min_price_minor between 0 and 999999999999999
            and tutor_max_price_minor between tutor_min_price_minor and 999999999999999
            and tutor_price_currency is not null
            and tutor_price_currency in (
              'KES', 'USD', 'EUR', 'GBP', 'NGN', 'ZAR', 'UGX', 'TZS', 'GHS',
              'INR', 'CAD', 'AUD', 'SGD', 'AED', 'SAR', 'KWD', 'JPY'
            )
          )
        )
      )
      or (
        role in ('student', 'admin')
        and tutor_professional_name is null
        and tutor_qualifications is null
        and tutor_experience is null
        and tutor_availability is null
        and tutor_min_price_minor is null
        and tutor_max_price_minor is null
        and tutor_price_currency is null
        and not tutor_is_active
        and tutor_review_reason is null
        and tutor_reviewed_at is null
        and tutor_reviewed_by is null
      )
    );

create index profiles_approved_tutors_idx
  on public.profiles (country, tutor_application_status, tutor_is_active)
  where role = 'tutor';

create table public.tutor_application_reviews (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.profiles (id) on delete cascade,
  reviewed_by uuid not null references public.profiles (id),
  decision text not null,
  reason text,
  created_at timestamptz not null default now(),

  constraint tutor_application_reviews_decision_values
    check (decision in ('approved', 'rejected', 'suspended')),
  constraint tutor_application_reviews_reason
    check (
      (decision = 'approved' and (reason is null or char_length(btrim(reason)) between 5 and 1000))
      or (
        decision in ('rejected', 'suspended')
        and reason is not null
        and char_length(btrim(reason)) between 5 and 1000
      )
    )
);

create index tutor_application_reviews_history_idx
  on public.tutor_application_reviews (tutor_id, created_at desc);

alter table public.tutor_application_reviews enable row level security;
revoke all on table public.tutor_application_reviews from public, anon, authenticated;
grant select on table public.tutor_application_reviews to authenticated;

create policy "Tutors and administrators can read tutor application reviews"
  on public.tutor_application_reviews
  for select
  to authenticated
  using (
    tutor_id = (select auth.uid())
    or exists (
      select 1 from public.profiles as administrator
      where administrator.id = (select auth.uid())
        and administrator.role = 'admin'
    )
  );

create table public.quotations (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  tutor_id uuid not null references public.profiles (id) on delete cascade,
  price_amount_minor bigint not null,
  currency text not null,
  service_description text not null,
  estimated_delivery_hours integer not null,
  revision_terms text not null,
  additional_notes text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint quotations_price_range
    check (price_amount_minor between 1 and 999999999999999),
  constraint quotations_currency_values
    check (currency in (
      'KES', 'USD', 'EUR', 'GBP', 'NGN', 'ZAR', 'UGX', 'TZS', 'GHS',
      'INR', 'CAD', 'AUD', 'SGD', 'AED', 'SAR', 'KWD', 'JPY'
    )),
  constraint quotations_description_length
    check (char_length(btrim(service_description)) between 20 and 2000),
  constraint quotations_delivery_range
    check (estimated_delivery_hours between 1 and 8760),
  constraint quotations_revision_terms_length
    check (char_length(btrim(revision_terms)) between 2 and 1000),
  constraint quotations_notes_length
    check (additional_notes is null or char_length(btrim(additional_notes)) between 2 and 2000),
  constraint quotations_status_values
    check (status in ('pending', 'accepted', 'not_selected', 'withdrawn'))
);

create unique index quotations_one_active_per_tutor_assignment_idx
  on public.quotations (assignment_id, tutor_id)
  where status in ('pending', 'accepted');

create unique index quotations_one_accepted_per_assignment_idx
  on public.quotations (assignment_id)
  where status = 'accepted';

create index quotations_assignment_created_idx
  on public.quotations (assignment_id, created_at);

create index quotations_tutor_created_idx
  on public.quotations (tutor_id, created_at desc);

alter table public.assignments
  drop constraint assignments_status_values,
  drop constraint assignments_submission_timestamp,
  add column accepted_quotation_id uuid references public.quotations (id),
  add column accepted_at timestamptz,
  add column accepted_terms jsonb,
  add constraint assignments_status_values
    check (status in ('draft', 'submitted', 'awaiting_payment')),
  add constraint assignments_submission_timestamp
    check (
      (status = 'draft' and submitted_at is null)
      or (status in ('submitted', 'awaiting_payment') and submitted_at is not null)
    ),
  add constraint assignments_acceptance_fields
    check (
      (
        status = 'awaiting_payment'
        and accepted_quotation_id is not null
        and accepted_at is not null
        and accepted_terms is not null
      )
      or (
        status <> 'awaiting_payment'
        and accepted_quotation_id is null
        and accepted_at is null
        and accepted_terms is null
      )
    );

alter table public.quotations enable row level security;
revoke all on table public.quotations from public, anon, authenticated;
grant select on table public.quotations to authenticated;

create policy "Students and quoting tutors can read relevant quotations"
  on public.quotations
  for select
  to authenticated
  using (
    tutor_id = (select auth.uid())
    or exists (
      select 1
      from public.assignments as assignment
      where assignment.id = assignment_id
        and assignment.student_id = (select auth.uid())
    )
  );

create or replace function private.guard_assignment_marketplace_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  accepted_quote public.quotations%rowtype;
begin
  if old.status = 'submitted' and new.status not in ('submitted', 'awaiting_payment') then
    raise exception using errcode = '22023', message = 'Submitted assignments cannot be reopened.';
  end if;

  if old.status = 'awaiting_payment'
    and (
      new.status <> old.status
      or new.accepted_quotation_id is distinct from old.accepted_quotation_id
      or new.accepted_terms is distinct from old.accepted_terms
    ) then
    raise exception using errcode = '22023', message = 'An accepted engagement cannot be changed through this workflow.';
  end if;

  if old.status = 'draft' and new.status = 'submitted' then
    if not exists (
      select 1
      from public.assignment_files as file_record
      where file_record.assignment_id = new.id
        and file_record.uploaded_by = new.student_id
    ) then
      raise exception using errcode = '22023', message = 'Attach at least one file before submitting.';
    end if;
    new.submitted_at := now();
  elsif new.status = 'awaiting_payment' and old.status <> 'awaiting_payment' then
    select * into accepted_quote
    from public.quotations as quotation
    where quotation.id = new.accepted_quotation_id
      and quotation.assignment_id = new.id
      and quotation.status = 'accepted';

    if not found then
      raise exception using errcode = '22023', message = 'Accept a valid quotation before selecting a tutor.';
    end if;

    new.accepted_at := now();
    new.accepted_terms := jsonb_build_object(
      'quotation_id', accepted_quote.id,
      'tutor_id', accepted_quote.tutor_id,
      'price_amount_minor', accepted_quote.price_amount_minor,
      'currency', accepted_quote.currency,
      'service_description', accepted_quote.service_description,
      'estimated_delivery_hours', accepted_quote.estimated_delivery_hours,
      'revision_terms', accepted_quote.revision_terms,
      'additional_notes', accepted_quote.additional_notes
    );
  else
    new.submitted_at := old.submitted_at;
    new.accepted_at := old.accepted_at;
    new.accepted_terms := old.accepted_terms;
  end if;

  new.updated_at := now();
  return new;
end;
$function$;

drop trigger update_assignment_timestamps on public.assignments;
create trigger update_assignment_timestamps
  before update on public.assignments
  for each row execute function private.guard_assignment_marketplace_status();

revoke all on function private.guard_assignment_marketplace_status() from public, anon, authenticated;

create or replace function private.guard_quotation_updates()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if old.status = 'accepted' then
    raise exception using errcode = '22023', message = 'Accepted quotation terms are immutable.';
  end if;

  if new.assignment_id is distinct from old.assignment_id
    or new.tutor_id is distinct from old.tutor_id
    or new.price_amount_minor is distinct from old.price_amount_minor
    or new.currency is distinct from old.currency
    or new.service_description is distinct from old.service_description
    or new.estimated_delivery_hours is distinct from old.estimated_delivery_hours
    or new.revision_terms is distinct from old.revision_terms
    or new.additional_notes is distinct from old.additional_notes then
    raise exception using errcode = '22023', message = 'Quotation terms cannot be edited; submit a new quotation after withdrawal.';
  end if;

  new.updated_at := now();
  return new;
end;
$function$;

revoke all on function private.guard_quotation_updates() from public, anon, authenticated;
create trigger guard_quotation_updates
  before update on public.quotations
  for each row execute function private.guard_quotation_updates();

create or replace function public.update_tutor_marketplace_profile(
  p_professional_name text,
  p_bio text,
  p_country text,
  p_subjects text[],
  p_qualifications text,
  p_experience text,
  p_languages text[],
  p_timezone text,
  p_availability text,
  p_min_price_minor bigint,
  p_max_price_minor bigint,
  p_price_currency text
)
returns text
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_status text;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Sign in as a tutor to update your profile.';
  end if;

  select profile.tutor_application_status into current_status
  from public.profiles as profile
  where profile.id = auth.uid()
    and profile.role = 'tutor'
  for update;

  if not found then
    raise exception using errcode = '42501', message = 'Only tutors can update tutor profiles.';
  end if;

  if char_length(btrim(coalesce(p_professional_name, ''))) not between 2 and 120
    or char_length(btrim(coalesce(p_bio, ''))) not between 20 and 1000
    or char_length(btrim(coalesce(p_country, ''))) not between 2 and 100
    or coalesce(cardinality(p_subjects), 0) not between 1 and 8
    or coalesce(cardinality(p_languages), 0) not between 1 and 8
    or char_length(btrim(coalesce(p_qualifications, ''))) not between 2 and 2000
    or char_length(btrim(coalesce(p_experience, ''))) not between 2 and 2000
    or char_length(btrim(coalesce(p_availability, ''))) not between 2 and 1000
    or char_length(btrim(coalesce(p_timezone, ''))) not between 1 and 100 then
    raise exception using errcode = '22023', message = 'Some profile fields do not meet the required length.';
  end if;

  if exists (
    select 1
    from unnest(p_subjects) as subject(value)
    where char_length(btrim(subject.value)) not between 2 and 80
  ) or exists (
    select 1
    from unnest(p_languages) as language(value)
    where char_length(btrim(language.value)) not between 2 and 40
  ) then
    raise exception using errcode = '22023', message = 'Subjects or languages contain invalid values.';
  end if;

  if not exists (
    select 1 from pg_catalog.pg_timezone_names as zone
    where zone.name = p_timezone
  ) then
    raise exception using errcode = '22023', message = 'Choose a valid time zone.';
  end if;

  if ((p_min_price_minor is null) <> (p_max_price_minor is null))
    or ((p_min_price_minor is null) <> (p_price_currency is null))
    or (p_min_price_minor is not null and (
      p_min_price_minor < 0
      or p_max_price_minor < p_min_price_minor
      or p_max_price_minor > 999999999999999
      or p_price_currency is null
      or p_price_currency not in (
        'KES', 'USD', 'EUR', 'GBP', 'NGN', 'ZAR', 'UGX', 'TZS', 'GHS',
        'INR', 'CAD', 'AUD', 'SGD', 'AED', 'SAR', 'KWD', 'JPY'
      )
    )) then
    raise exception using errcode = '22023', message = 'Enter a valid minimum and maximum price in one supported currency.';
  end if;

  update public.profiles
  set tutor_professional_name = btrim(p_professional_name),
      tutor_bio = btrim(p_bio),
      country = btrim(p_country),
      tutor_subjects = array(select btrim(subject.item) from unnest(p_subjects) as subject(item)),
      tutor_qualifications = btrim(p_qualifications),
      tutor_experience = btrim(p_experience),
      tutor_languages = array(select btrim(language.item) from unnest(p_languages) as language(item)),
      tutor_timezone = btrim(p_timezone),
      tutor_availability = btrim(p_availability),
      tutor_min_price_minor = p_min_price_minor,
      tutor_max_price_minor = p_max_price_minor,
      tutor_price_currency = p_price_currency,
      tutor_is_active = case when current_status in ('approved', 'rejected') then false else tutor_is_active end,
      tutor_application_status = case when current_status in ('approved', 'rejected') then 'pending_review' else tutor_application_status end,
      tutor_review_reason = case when current_status in ('approved', 'rejected') then null else tutor_review_reason end,
      tutor_reviewed_at = case when current_status in ('approved', 'rejected') then null else tutor_reviewed_at end,
      tutor_reviewed_by = case when current_status in ('approved', 'rejected') then null else tutor_reviewed_by end
  where id = auth.uid();

  return case when current_status = 'approved'
    then 'Profile saved and submitted for approval because public profile details changed.'
    when current_status = 'rejected'
    then 'Profile saved and resubmitted for review.'
    else 'Profile saved.'
  end;
end;
$function$;

revoke all on function public.update_tutor_marketplace_profile(text, text, text, text[], text, text, text[], text, text, bigint, bigint, text) from public, anon;
grant execute on function public.update_tutor_marketplace_profile(text, text, text, text[], text, text, text[], text, text, bigint, bigint, text) to authenticated;

create or replace function public.review_tutor_application(
  p_tutor_id uuid,
  p_status text,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles as administrator
    where administrator.id = auth.uid() and administrator.role = 'admin'
  ) then
    raise exception using errcode = '42501', message = 'Only administrators can review tutor applications.';
  end if;

  if p_status is null or p_status not in ('approved', 'rejected', 'suspended') then
    raise exception using errcode = '22023', message = 'Choose a valid tutor status.';
  end if;

  if p_status in ('rejected', 'suspended')
    and char_length(btrim(coalesce(p_reason, ''))) not between 5 and 1000 then
    raise exception using errcode = '22023', message = 'Provide a reason between 5 and 1,000 characters.';
  end if;

  if not exists (
    select 1 from public.profiles as tutor
    where tutor.id = p_tutor_id and tutor.role = 'tutor'
  ) then
    raise exception using errcode = 'P0002', message = 'Tutor application not found.';
  end if;

  if p_status = 'approved' and not exists (
    select 1 from public.profiles as tutor
    where tutor.id = p_tutor_id
      and tutor.role = 'tutor'
      and char_length(btrim(tutor.tutor_professional_name)) between 2 and 120
      and char_length(btrim(tutor.tutor_bio)) between 20 and 1000
      and cardinality(tutor.tutor_subjects) between 1 and 8
      and cardinality(tutor.tutor_languages) between 1 and 8
      and char_length(btrim(coalesce(tutor.tutor_qualifications, ''))) between 2 and 2000
      and char_length(btrim(coalesce(tutor.tutor_experience, ''))) between 2 and 2000
      and char_length(btrim(coalesce(tutor.tutor_availability, ''))) between 2 and 1000
  ) then
    raise exception using errcode = '22023', message = 'The tutor must complete their professional profile before approval.';
  end if;

  update public.profiles
  set tutor_application_status = p_status,
      tutor_is_active = p_status = 'approved',
      tutor_review_reason = case when p_status = 'approved' then null else btrim(p_reason) end,
      tutor_reviewed_at = now(),
      tutor_reviewed_by = auth.uid()
  where id = p_tutor_id
    and role = 'tutor';

  insert into public.tutor_application_reviews (tutor_id, reviewed_by, decision, reason)
  values (
    p_tutor_id,
    auth.uid(),
    p_status,
    case when p_status = 'approved' then null else btrim(p_reason) end
  );
end;
$function$;

revoke all on function public.review_tutor_application(uuid, text, text) from public, anon;
grant execute on function public.review_tutor_application(uuid, text, text) to authenticated;

create or replace function public.get_tutor_applications()
returns table (
  id uuid,
  professional_name text,
  country text,
  application_status text,
  review_reason text,
  subjects text[],
  languages text[],
  bio text,
  qualifications text,
  experience text,
  timezone text,
  availability text,
  min_price_minor bigint,
  max_price_minor bigint,
  price_currency text,
  created_at timestamptz,
  reviewed_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles as administrator
    where administrator.id = auth.uid() and administrator.role = 'admin'
  ) then
    raise exception using errcode = '42501', message = 'Only administrators can review tutor applications.';
  end if;

  return query
  select profile.id, profile.tutor_professional_name, profile.country,
    profile.tutor_application_status, profile.tutor_review_reason,
    profile.tutor_subjects, profile.tutor_languages, profile.tutor_bio,
    profile.tutor_qualifications, profile.tutor_experience, profile.tutor_timezone,
    profile.tutor_availability, profile.tutor_min_price_minor,
    profile.tutor_max_price_minor, profile.tutor_price_currency,
    profile.created_at, profile.tutor_reviewed_at
  from public.profiles as profile
  where profile.role = 'tutor'
  order by (profile.tutor_application_status = 'pending_review') desc, profile.created_at;
end;
$function$;

revoke all on function public.get_tutor_applications() from public, anon;
grant execute on function public.get_tutor_applications() to authenticated;

create or replace function public.search_approved_tutors(
  p_subject text default null,
  p_country text default null,
  p_language text default null,
  p_availability text default null,
  p_expertise text default null,
  p_max_price_minor bigint default null,
  p_price_currency text default null
)
returns table (
  id uuid,
  professional_name text,
  country text,
  bio text,
  subjects text[],
  languages text[],
  qualifications text,
  experience text,
  timezone text,
  availability text,
  min_price_minor bigint,
  max_price_minor bigint,
  price_currency text
)
language sql
stable
security definer
set search_path = ''
as $function$
  select profile.id, profile.tutor_professional_name, profile.country,
    profile.tutor_bio, profile.tutor_subjects, profile.tutor_languages,
    profile.tutor_qualifications, profile.tutor_experience, profile.tutor_timezone,
    profile.tutor_availability, profile.tutor_min_price_minor,
    profile.tutor_max_price_minor, profile.tutor_price_currency
  from public.profiles as profile
  where profile.role = 'tutor'
    and profile.tutor_application_status = 'approved'
    and profile.tutor_is_active
    and (p_subject is null or p_subject = any(profile.tutor_subjects))
    and (p_country is null or lower(profile.country) = lower(p_country))
    and (
      p_language is null
      or exists (
        select 1 from unnest(profile.tutor_languages) as tutor_language(value)
        where lower(tutor_language.value) = lower(p_language)
      )
    )
    and (p_availability is null or profile.tutor_availability ilike '%' || p_availability || '%')
    and (
      p_expertise is null
      or profile.tutor_professional_name ilike '%' || p_expertise || '%'
      or profile.tutor_bio ilike '%' || p_expertise || '%'
      or coalesce(profile.tutor_qualifications, '') ilike '%' || p_expertise || '%'
      or coalesce(profile.tutor_experience, '') ilike '%' || p_expertise || '%'
    )
    and (
      p_max_price_minor is null
      or (
        profile.tutor_price_currency = p_price_currency
        and profile.tutor_min_price_minor is not null
        and profile.tutor_min_price_minor <= p_max_price_minor
      )
    )
  order by profile.tutor_professional_name;
$function$;

revoke all on function public.search_approved_tutors(text, text, text, text, text, bigint, text) from public;
grant execute on function public.search_approved_tutors(text, text, text, text, text, bigint, text) to anon, authenticated;

create or replace function public.get_quotation_tutors(p_quotation_ids uuid[])
returns table (
  id uuid,
  professional_name text,
  country text,
  bio text,
  subjects text[],
  languages text[],
  qualifications text,
  experience text,
  timezone text,
  availability text,
  min_price_minor bigint,
  max_price_minor bigint,
  price_currency text
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Sign in to view quotation tutor profiles.';
  end if;

  return query
  select distinct profile.id, profile.tutor_professional_name, profile.country,
    profile.tutor_bio, profile.tutor_subjects, profile.tutor_languages,
    profile.tutor_qualifications, profile.tutor_experience, profile.tutor_timezone,
    profile.tutor_availability, profile.tutor_min_price_minor,
    profile.tutor_max_price_minor, profile.tutor_price_currency
  from public.profiles as profile
  join public.quotations as quotation on quotation.tutor_id = profile.id
  join public.assignments as assignment on assignment.id = quotation.assignment_id
  where profile.role = 'tutor'
    and quotation.id = any(coalesce(p_quotation_ids, array[]::uuid[]))
    and assignment.student_id = auth.uid();
end;
$function$;

revoke all on function public.get_quotation_tutors(uuid[]) from public, anon;
grant execute on function public.get_quotation_tutors(uuid[]) to authenticated;

create or replace function public.get_tutor_opportunities()
returns table (
  id uuid,
  title text,
  subject text,
  description text,
  assistance_type text,
  academic_level text,
  preferred_language text,
  deadline_at timestamptz,
  deadline_timezone text,
  budget_amount_minor bigint,
  budget_currency text,
  status text,
  submitted_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  tutor_subject_list text[];
begin
  select profile.tutor_subjects into tutor_subject_list
  from public.profiles as profile
  where profile.id = auth.uid()
    and profile.role = 'tutor'
    and profile.tutor_application_status = 'approved'
    and profile.tutor_is_active;

  if not found then
    raise exception using errcode = '42501', message = 'Only approved active tutors can view assignment opportunities.';
  end if;

  return query
  select assignment.id, assignment.title, assignment.subject,
    assignment.description, assignment.assistance_type, assignment.academic_level,
    assignment.preferred_language, assignment.deadline_at, assignment.deadline_timezone,
    assignment.budget_amount_minor, assignment.budget_currency, assignment.status,
    assignment.submitted_at
  from public.assignments as assignment
  where assignment.status = 'submitted'
    and assignment.subject = any(tutor_subject_list)
    and not exists (
      select 1 from public.quotations as quotation
      where quotation.assignment_id = assignment.id
        and quotation.tutor_id = auth.uid()
        and quotation.status in ('pending', 'accepted')
    )
  order by assignment.deadline_at, assignment.submitted_at desc;
end;
$function$;

revoke all on function public.get_tutor_opportunities() from public, anon;
grant execute on function public.get_tutor_opportunities() to authenticated;

create or replace function public.get_tutor_quotations()
returns table (
  id uuid,
  assignment_id uuid,
  assignment_title text,
  subject text,
  deadline_at timestamptz,
  deadline_timezone text,
  assignment_status text,
  price_amount_minor bigint,
  currency text,
  service_description text,
  estimated_delivery_hours integer,
  revision_terms text,
  additional_notes text,
  quotation_status text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles as tutor
    where tutor.id = auth.uid() and tutor.role = 'tutor'
  ) then
    raise exception using errcode = '42501', message = 'Only tutors can view their quotations.';
  end if;

  return query
  select quotation.id, assignment.id, assignment.title, assignment.subject,
    assignment.deadline_at, assignment.deadline_timezone, assignment.status,
    quotation.price_amount_minor, quotation.currency, quotation.service_description,
    quotation.estimated_delivery_hours, quotation.revision_terms,
    quotation.additional_notes, quotation.status, quotation.created_at
  from public.quotations as quotation
  join public.assignments as assignment on assignment.id = quotation.assignment_id
  where quotation.tutor_id = auth.uid()
  order by quotation.created_at desc;
end;
$function$;

revoke all on function public.get_tutor_quotations() from public, anon;
grant execute on function public.get_tutor_quotations() to authenticated;

create or replace function public.submit_tutor_quotation(
  p_assignment_id uuid,
  p_price_amount_minor bigint,
  p_currency text,
  p_service_description text,
  p_estimated_delivery_hours integer,
  p_revision_terms text,
  p_additional_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  new_quotation_id uuid;
  tutor_subject_list text[];
  assignment_subject text;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Sign in as a tutor to submit a quotation.';
  end if;

  select profile.tutor_subjects into tutor_subject_list
  from public.profiles as profile
  where profile.id = auth.uid()
    and profile.role = 'tutor'
    and profile.tutor_application_status = 'approved'
    and profile.tutor_is_active
  for share;

  if not found then
    raise exception using errcode = '42501', message = 'Only approved active tutors can submit quotations.';
  end if;

  select assignment.subject into assignment_subject
  from public.assignments as assignment
  where assignment.id = p_assignment_id
    and assignment.status = 'submitted'
  for update;

  if not found or not (assignment_subject = any(tutor_subject_list)) then
    raise exception using errcode = '42501', message = 'This assignment is not available to your tutor account.';
  end if;

  if p_price_amount_minor is null
    or p_price_amount_minor not between 1 and 999999999999999
    or p_currency is null
    or p_currency not in (
      'KES', 'USD', 'EUR', 'GBP', 'NGN', 'ZAR', 'UGX', 'TZS', 'GHS',
      'INR', 'CAD', 'AUD', 'SGD', 'AED', 'SAR', 'KWD', 'JPY'
    )
    or char_length(btrim(coalesce(p_service_description, ''))) not between 20 and 2000
    or p_estimated_delivery_hours is null
    or p_estimated_delivery_hours not between 1 and 8760
    or char_length(btrim(coalesce(p_revision_terms, ''))) not between 2 and 1000
    or (p_additional_notes is not null and char_length(btrim(p_additional_notes)) not between 2 and 2000) then
    raise exception using errcode = '22023', message = 'Quotation details are invalid.';
  end if;

  insert into public.quotations (
    assignment_id, tutor_id, price_amount_minor, currency,
    service_description, estimated_delivery_hours, revision_terms, additional_notes
  )
  values (
    p_assignment_id, auth.uid(), p_price_amount_minor, p_currency,
    btrim(p_service_description), p_estimated_delivery_hours, btrim(p_revision_terms),
    nullif(btrim(p_additional_notes), '')
  )
  returning id into new_quotation_id;

  return new_quotation_id;
end;
$function$;

revoke all on function public.submit_tutor_quotation(uuid, bigint, text, text, integer, text, text) from public, anon;
grant execute on function public.submit_tutor_quotation(uuid, bigint, text, text, integer, text, text) to authenticated;

create or replace function public.accept_tutor_quotation(p_quotation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  target_assignment_id uuid;
  assignment_owner uuid;
  assignment_status text;
  quote_tutor_id uuid;
  quote_status text;
  tutor_status text;
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles as student
    where student.id = auth.uid() and student.role = 'student'
  ) then
    raise exception using errcode = '42501', message = 'Only students can accept tutor quotations.';
  end if;

  select assignment.id, assignment.student_id, assignment.status
    into target_assignment_id, assignment_owner, assignment_status
  from public.assignments as assignment
  join public.quotations as quotation on quotation.assignment_id = assignment.id
  where quotation.id = p_quotation_id
  for update of assignment;

  if not found or assignment_owner <> auth.uid() then
    raise exception using errcode = '42501', message = 'You cannot accept a quotation for this assignment.';
  end if;

  if assignment_status <> 'submitted' then
    raise exception using errcode = '22023', message = 'This assignment already has a selected tutor or is unavailable.';
  end if;

  select quotation.tutor_id, quotation.status into quote_tutor_id, quote_status
  from public.quotations as quotation
  where quotation.id = p_quotation_id
    and quotation.assignment_id = target_assignment_id
  for update;

  select tutor.tutor_application_status into tutor_status
  from public.profiles as tutor
  where tutor.id = quote_tutor_id
    and tutor.role = 'tutor'
    and tutor.tutor_is_active
  for share;

  if quote_status is distinct from 'pending' or tutor_status is distinct from 'approved' then
    raise exception using errcode = '22023', message = 'This quotation is no longer selectable.';
  end if;

  update public.quotations
  set status = 'accepted'
  where id = p_quotation_id;

  update public.quotations
  set status = 'not_selected'
  where assignment_id = target_assignment_id
    and id <> p_quotation_id
    and status = 'pending';

  update public.assignments
  set status = 'awaiting_payment',
      accepted_quotation_id = p_quotation_id
  where id = target_assignment_id
    and student_id = auth.uid()
    and status = 'submitted';

  if not found then
    raise exception using errcode = '40001', message = 'The assignment changed while accepting the quotation. Please retry.';
  end if;

  return target_assignment_id;
end;
$function$;

revoke all on function public.accept_tutor_quotation(uuid) from public, anon;
grant execute on function public.accept_tutor_quotation(uuid) to authenticated;

create or replace function public.tutor_can_access_assignment(p_assignment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.assignments as assignment
    join public.profiles as tutor on tutor.id = auth.uid()
    where assignment.id = p_assignment_id
      and tutor.role = 'tutor'
      and tutor.tutor_application_status = 'approved'
      and tutor.tutor_is_active
      and (
        (assignment.status = 'submitted' and assignment.subject = any(tutor.tutor_subjects))
        or (
          assignment.status = 'awaiting_payment'
          and exists (
            select 1 from public.quotations as quotation
            where quotation.id = assignment.accepted_quotation_id
              and quotation.assignment_id = assignment.id
              and quotation.tutor_id = tutor.id
              and quotation.status = 'accepted'
          )
        )
      )
  );
$function$;

revoke all on function public.tutor_can_access_assignment(uuid) from public, anon;
grant execute on function public.tutor_can_access_assignment(uuid) to authenticated;

create or replace function public.tutor_can_access_assignment_file(p_assignment_id text, p_student_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.assignments as assignment
    where assignment.id::text = p_assignment_id
      and assignment.student_id::text = p_student_id
      and public.tutor_can_access_assignment(assignment.id)
  );
$function$;

revoke all on function public.tutor_can_access_assignment_file(text, text) from public, anon;
grant execute on function public.tutor_can_access_assignment_file(text, text) to authenticated;

create policy "Approved tutors can read matching submitted assignment files"
  on public.assignment_files
  for select
  to authenticated
  using (public.tutor_can_access_assignment_file(assignment_id::text, uploaded_by::text));

drop policy "Students can read their own assignment file records" on public.assignment_files;
create policy "Students can read their own submitted assignment file records"
  on public.assignment_files
  for select
  to authenticated
  using (
    (select auth.uid()) = uploaded_by
    and exists (
      select 1 from public.assignments as assignment
      where assignment.id = assignment_id
        and assignment.student_id = (select auth.uid())
        and assignment.status in ('submitted', 'awaiting_payment')
    )
  );

drop policy "Students can read objects for their own submitted assignments" on storage.objects;
create policy "Students can read objects for their own submitted assignments"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'assignment-files'
    and coalesce(array_length(storage.foldername(name), 1), 0) = 2
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1
      from public.assignments as assignment
      where assignment.id::text = (storage.foldername(name))[2]
        and assignment.student_id = (select auth.uid())
        and assignment.status in ('submitted', 'awaiting_payment')
    )
  );

create policy "Approved tutors can download files for matching submitted assignments"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'assignment-files'
    and coalesce(array_length(storage.foldername(name), 1), 0) = 2
    and public.tutor_can_access_assignment_file(
      (storage.foldername(name))[2],
      (storage.foldername(name))[1]
    )
  );
