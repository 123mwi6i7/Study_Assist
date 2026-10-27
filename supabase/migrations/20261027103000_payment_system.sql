create table public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  accepted_quotation_id uuid references public.quotations (id) on delete set null,
  provider text not null,
  provider_transaction_reference text not null,
  internal_reference text not null unique,
  amount_minor bigint not null,
  currency text not null,
  status text not null default 'pending',
  provider_response jsonb,
  redirect_url text,
  return_url text,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  verified_at timestamptz,

  constraint payment_attempts_provider_values
    check (provider in ('local_sandbox', 'm_pesa', 'flutterwave')),
  constraint payment_attempts_amount_range
    check (amount_minor between 1 and 999999999999999),
  constraint payment_attempts_currency_values
    check (currency in (
      'KES', 'USD', 'EUR', 'GBP', 'NGN', 'ZAR', 'UGX', 'TZS', 'GHS',
      'INR', 'CAD', 'AUD', 'SGD', 'AED', 'SAR', 'KWD', 'JPY'
    )),
  constraint payment_attempts_status_values
    check (status in ('pending', 'initiated', 'processing', 'paid', 'failed', 'cancelled', 'expired', 'refunded')),
  constraint payment_attempts_reference_lengths
    check (char_length(btrim(provider_transaction_reference)) between 6 and 200),
  constraint payment_attempts_redirects
    check (redirect_url is null or char_length(btrim(redirect_url)) between 6 and 2000),
  constraint payment_attempts_return_urls
    check (return_url is null or char_length(btrim(return_url)) between 6 and 2000)
);

create unique index payment_attempts_assignment_active_idx
  on public.payment_attempts (assignment_id)
  where status in ('pending', 'initiated', 'processing');

create index payment_attempts_student_created_idx
  on public.payment_attempts (student_id, created_at desc);

create index payment_attempts_provider_reference_idx
  on public.payment_attempts (provider, provider_transaction_reference);

create table public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  payment_attempt_id uuid not null unique references public.payment_attempts (id) on delete cascade,
  provider_name text not null,
  provider_reference text not null,
  internal_reference text not null,
  amount_minor bigint not null,
  currency text not null,
  status text not null default 'pending',
  response_code text,
  response_message text,
  provider_payload jsonb,
  created_at timestamptz not null default now(),
  verified_at timestamptz,
  updated_at timestamptz not null default now(),

  constraint payment_transactions_provider_values
    check (provider_name in ('local_sandbox', 'm_pesa', 'flutterwave')),
  constraint payment_transactions_status_values
    check (status in ('pending', 'paid', 'failed', 'cancelled', 'expired', 'refunded'))
);

create table public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  payment_attempt_id uuid references public.payment_attempts (id) on delete cascade,
  provider_name text not null,
  event_type text not null,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  constraint payment_webhook_events_provider_values
    check (provider_name in ('local_sandbox', 'm_pesa', 'flutterwave'))
);

create index payment_webhook_events_provider_received_idx
  on public.payment_webhook_events (provider_name, received_at desc);

alter table public.payment_attempts enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.payment_webhook_events enable row level security;

revoke all on table public.payment_attempts from public, anon, authenticated;
revoke all on table public.payment_transactions from public, anon, authenticated;
revoke all on table public.payment_webhook_events from public, anon, authenticated;

grant usage on schema public to authenticated;
grant select on table public.payment_attempts to authenticated;
grant select on table public.payment_transactions to authenticated;

grant all on table public.payment_attempts to service_role;
grant all on table public.payment_transactions to service_role;
grant all on table public.payment_webhook_events to service_role;

create policy "Students can read their own payment attempts"
  on public.payment_attempts
  for select
  to authenticated
  using ((select auth.uid()) = student_id);

create policy "Students can read their own payment transactions"
  on public.payment_transactions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.payment_attempts as attempt
      where attempt.id = payment_attempt_id
        and attempt.student_id = (select auth.uid())
    )
  );

create or replace function public.create_payment_attempt(
  p_assignment_id uuid,
  p_provider text,
  p_return_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_student uuid := auth.uid();
  assignment_record public.assignments%rowtype;
  accepted_quote public.quotations%rowtype;
  provider_name text := lower(btrim(p_provider));
  attempt_id uuid;
  internal_ref text;
  provider_ref text;
begin
  if current_student is null then
    raise exception using errcode = '42501', message = 'Sign in to pay for an accepted quotation.';
  end if;

  if provider_name not in ('local_sandbox', 'm_pesa', 'flutterwave') then
    raise exception using errcode = '22023', message = 'Choose a supported payment provider.';
  end if;

  select *
    into assignment_record
    from public.assignments as assignment
    where assignment.id = p_assignment_id
      and assignment.student_id = current_student
      and assignment.status = 'awaiting_payment';

  if not found then
    raise exception using errcode = '42501', message = 'Only your own assignment in awaiting-payment status can be paid.';
  end if;

  select *
    into accepted_quote
    from public.quotations as quotation
    where quotation.assignment_id = p_assignment_id
      and quotation.status = 'accepted';

  if not found then
    raise exception using errcode = '22023', message = 'The assignment does not have an accepted quotation.';
  end if;

  if exists (
    select 1
    from public.payment_attempts as attempt
    where attempt.assignment_id = p_assignment_id
      and attempt.status in ('pending', 'initiated', 'processing')
  ) then
    raise exception using errcode = '23505', message = 'A payment is already in progress for this assignment.';
  end if;

  internal_ref := 'pay_' || replace(gen_random_uuid()::text, '-', '');
  provider_ref := provider_name || '_' || replace(gen_random_uuid()::text, '-', '');

  insert into public.payment_attempts (
    assignment_id,
    student_id,
    accepted_quotation_id,
    provider,
    provider_transaction_reference,
    internal_reference,
    amount_minor,
    currency,
    status,
    redirect_url,
    return_url
  )
  values (
    p_assignment_id,
    current_student,
    accepted_quote.id,
    provider_name,
    provider_ref,
    internal_ref,
    accepted_quote.price_amount_minor,
    accepted_quote.currency,
    'initiated',
    null,
    p_return_url
  )
  returning id into attempt_id;

  return attempt_id;
end;
$function$;

revoke all on function public.create_payment_attempt(uuid, text, text) from public, anon, authenticated;
grant execute on function public.create_payment_attempt(uuid, text, text) to authenticated;

create or replace function private.update_payment_attempt_timestamps()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

revoke all on function private.update_payment_attempt_timestamps() from public, anon, authenticated;

create trigger set_payment_attempt_updated_at
  before update on public.payment_attempts
  for each row execute function private.update_payment_attempt_timestamps();

create trigger set_payment_transaction_updated_atransaction_updated_at  before update on public.payment_transactions
  for each row execute function private.update_payment_attempt_timestamps();
