alter table public.scholarship_results
  add column if not exists review_state text not null default 'approved' check (review_state in ('approved', 'pending', 'rejected')),
  add column if not exists moderation_reason text,
  add column if not exists fingerprint_hash text;

alter table public.scholarship_comments
  add column if not exists review_state text not null default 'approved' check (review_state in ('approved', 'pending', 'rejected')),
  add column if not exists moderation_reason text,
  add column if not exists fingerprint_hash text;

alter table public.verified_scholarships
  add column if not exists source text not null default 'manual' check (source in ('database', 'manual'));

create index if not exists scholarship_results_review_state_idx on public.scholarship_results (review_state);
create index if not exists scholarship_results_fingerprint_hash_idx on public.scholarship_results (fingerprint_hash);
create index if not exists scholarship_comments_review_state_idx on public.scholarship_comments (review_state);
create index if not exists scholarship_comments_fingerprint_hash_idx on public.scholarship_comments (fingerprint_hash);

create table if not exists public.admin_users (
  email text primary key check (char_length(trim(email)) between 6 and 160),
  created_at timestamptz not null default timezone('utc', now())
);

insert into public.admin_users (email)
values ('admin@awaited.local')
on conflict (email) do nothing;

alter table public.admin_users enable row level security;

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

grant execute on function public.current_user_is_admin() to anon, authenticated;

drop policy if exists "public can read scholarship results" on public.scholarship_results;
create policy "public can read scholarship results"
on public.scholarship_results
for select
to anon, authenticated
using (
  public.current_user_is_admin()
  or (
    review_state = 'approved'
    and not hidden
  )
);

drop policy if exists "public can submit scholarship results" on public.scholarship_results;

drop policy if exists "public can read scholarship comments" on public.scholarship_comments;
create policy "public can read scholarship comments"
on public.scholarship_comments
for select
to anon, authenticated
using (
  public.current_user_is_admin()
  or review_state = 'approved'
);

drop policy if exists "public can submit scholarship comments" on public.scholarship_comments;

drop policy if exists "admins can read admin users" on public.admin_users;
create policy "admins can read admin users"
on public.admin_users
for select
to authenticated
using (public.current_user_is_admin());

insert into public.verified_scholarships (name, source)
values
  ('Chevening Scholarship', 'database'),
  ('Fulbright Scholarship', 'database'),
  ('DAAD EPOS Scholarship', 'database'),
  ('Gates Cambridge Scholarship', 'database'),
  ('Erasmus Mundus Joint Masters', 'database'),
  ('Rhodes Scholarship', 'database'),
  ('Commonwealth Scholarship', 'database'),
  ('Australia Awards Scholarship', 'database'),
  ('MEXT Scholarship (Monbukagakusho)', 'database'),
  ('Türkiye Bursları (Turkey Scholarships)', 'database'),
  ('Korean Government Scholarship (KGSP/GKS)', 'database'),
  ('Chinese Government Scholarship (CSC)', 'database'),
  ('Swedish Institute Scholarship (SISS)', 'database'),
  ('New Zealand Scholarships (Manaaki)', 'database'),
  ('Aga Khan Foundation Scholarship', 'database'),
  ('Clarendon Scholarship', 'database'),
  ('Marshall Scholarship', 'database'),
  ('Schwarzman Scholars', 'database'),
  ('Mastercard Foundation Scholars Program', 'database'),
  ('Denys Holland Scholarship', 'database'),
  ('Stipendium Hungaricum', 'database'),
  ('Italian Government Scholarship', 'database'),
  ('Swiss Government Excellence Scholarship (ESKAS)', 'database'),
  ('Vanier Canada Graduate Scholarship', 'database'),
  ('Joint Japan/World Bank Graduate Scholarship (JJ/WBGSP)', 'database'),
  ('VLIR-UOS Scholarship', 'database'),
  ('DAAD Study Scholarship (General)', 'database'),
  ('Orange Knowledge Programme (OKP/Nuffic)', 'database'),
  ('Rotary Peace Fellowship', 'database'),
  ('Destination Australia Scholarship', 'database'),
  ('Organisation of American States (OAS) Scholarship', 'database'),
  ('African Union Mwalimu Nyerere Scholarship', 'database'),
  ('Adelaide Global Academic Excellence Scholarship', 'database'),
  ('Émile Boutmy Scholarship', 'database'),
  ('Eiffel Excellence Scholarship', 'database')
on conflict (name) do update
set source = case
  when public.verified_scholarships.source = 'manual' then public.verified_scholarships.source
  else excluded.source
end;
