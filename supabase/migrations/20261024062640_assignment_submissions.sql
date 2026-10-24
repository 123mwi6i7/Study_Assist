-- Student assignment requests and private supporting documents.
-- Authenticated users can read only their own records. All writes are performed
-- by the submit-assignment Edge Function after it verifies the student's session.

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  subject text not null,
  course_name text,
  description text not null,
  academic_level text,
  institution_name text,
  assistance_type text not null,
  preferred_language text,
  deadline_at timestamptz not null,
  deadline_timezone text not null,
  budget_amount_minor bigint,
  budget_currency text,
  additional_notes text,
  status text not null default 'draft',
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint assignments_title_length
    check (char_length(btrim(title)) between 3 and 140),
  constraint assignments_subject_values
    check (subject in (
      'mathematics_statistics',
      'computer_science_programming',
      'business_management',
      'accounting_finance',
      'economics',
      'research_methodology',
      'academic_writing_guidance',
      'referencing_citation_support',
      'proofreading_draft_feedback',
      'presentation_report_feedback',
      'other_subjects'
    )),
  constraint assignments_description_length
    check (char_length(btrim(description)) between 20 and 4000),
  constraint assignments_assistance_values
    check (assistance_type in (
      'explain_instructions',
      'one_to_one_tutoring',
      'explain_concepts_calculations',
      'programming_guidance',
      'research_guidance',
      'review_student_draft',
      'proofreading_referencing',
      'feedback_structure_arguments',
      'other_permitted_support'
    )),
  constraint assignments_academic_level_values
    check (academic_level is null or academic_level in (
      'secondary', 'certificate', 'diploma', 'undergraduate',
      'postgraduate', 'doctoral', 'other'
    )),
  constraint assignments_text_lengths
    check (
      (course_name is null or char_length(btrim(course_name)) between 1 and 120)
      and (institution_name is null or char_length(btrim(institution_name)) between 1 and 160)
      and (preferred_language is null or char_length(btrim(preferred_language)) between 1 and 80)
      and (deadline_timezone is not null and char_length(btrim(deadline_timezone)) between 1 and 100)
      and (additional_notes is null or char_length(btrim(additional_notes)) between 1 and 2000)
    ),
  constraint assignments_budget_range
    check (budget_amount_minor is null or budget_amount_minor between 0 and 999999999999999),
  constraint assignments_budget_currency_values
    check (budget_currency is null or budget_currency in (
      'KES', 'USD', 'EUR', 'GBP', 'NGN', 'ZAR', 'UGX', 'TZS', 'GHS',
      'INR', 'CAD', 'AUD', 'SGD', 'AED', 'SAR', 'KWD', 'JPY'
    )),
  constraint assignments_budget_pair
    check ((budget_amount_minor is null) = (budget_currency is null)),
  constraint assignments_status_values
    check (status in ('draft', 'submitted')),
  constraint assignments_submission_timestamp
    check ((status = 'draft' and submitted_at is null) or (status = 'submitted' and submitted_at is not null))
);

create table public.assignment_files (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  uploaded_by uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null unique,
  original_filename text not null,
  file_size_bytes bigint not null,
  content_type text not null,
  created_at timestamptz not null default now(),

  constraint assignment_files_filename_length
    check (char_length(btrim(original_filename)) between 1 and 180),
  constraint assignment_files_size_range
    check (file_size_bytes between 1 and 10485760),
  constraint assignment_files_content_type
    check (content_type in (
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'image/jpeg',
      'image/png'
    )),
  constraint assignment_files_storage_path_format
    check (storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(pdf|docx|pptx|txt|jpg|jpeg|png)$')
);

create index assignments_student_created_idx
  on public.assignments (student_id, created_at desc);

create index assignments_status_deadline_idx
  on public.assignments (status, deadline_at);

create index assignment_files_assignment_created_idx
  on public.assignment_files (assignment_id, created_at);

alter table public.assignments enable row level security;
alter table public.assignment_files enable row level security;

revoke all on table public.assignments from public, anon, authenticated;
revoke all on table public.assignment_files from public, anon, authenticated;
grant usage on schema public to authenticated;
grant select on table public.assignments to authenticated;
grant select on table public.assignment_files to authenticated;
grant all on table public.assignments to service_role;
grant all on table public.assignment_files to service_role;

create policy "Students can read their own assignments"
  on public.assignments
  for select
  to authenticated
  using ((select auth.uid()) = student_id);

create policy "Students can read their own assignment file records"
  on public.assignment_files
  for select
  to authenticated
  using (
    (select auth.uid()) = uploaded_by
    and exists (
      select 1
      from public.assignments as assignment
      where assignment.id = assignment_id
        and assignment.student_id = (select auth.uid())
        and assignment.status = 'submitted'
    )
  );

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.update_assignment_timestamps()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if old.status = 'submitted' and new.status <> 'submitted' then
    raise exception using errcode = '22023', message = 'Submitted assignments cannot be reopened.';
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
  else
    new.submitted_at := old.submitted_at;
  end if;

  new.updated_at := now();
  return new;
end;
$function$;

revoke all on function private.update_assignment_timestamps() from public, anon, authenticated;

create trigger update_assignment_timestamps
  before update on public.assignments
  for each row execute function private.update_assignment_timestamps();

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'assignment-files',
  'assignment-files',
  false,
  10485760,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'image/jpeg',
    'image/png'
  ]::text[]
);

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
        and assignment.status = 'submitted'
    )
  );

-- Authenticated users intentionally receive no INSERT, UPDATE, or DELETE policy
-- on Storage or the assignment tables. The Edge Function validates files, checks
-- the student's role, and uses its server-side secret key for writes.
