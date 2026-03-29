alter table public.scholarship_results
  add column if not exists cycle_year text,
  add column if not exists host_university text,
  add column if not exists program_name text,
  add column if not exists application_round text,
  add column if not exists applied_date date,
  add column if not exists interview_date date,
  add column if not exists final_decision_date date;

alter table public.scholarship_results
  drop constraint if exists scholarship_results_cycle_year_check,
  add constraint scholarship_results_cycle_year_check
    check (cycle_year is null or char_length(trim(cycle_year)) between 2 and 32),
  drop constraint if exists scholarship_results_host_university_check,
  add constraint scholarship_results_host_university_check
    check (host_university is null or char_length(trim(host_university)) <= 160),
  drop constraint if exists scholarship_results_program_name_check,
  add constraint scholarship_results_program_name_check
    check (program_name is null or char_length(trim(program_name)) <= 160),
  drop constraint if exists scholarship_results_application_round_check,
  add constraint scholarship_results_application_round_check
    check (application_round is null or char_length(trim(application_round)) <= 80);

update public.scholarship_results
set
  applied_date = case
    when applied_date is null and status = 'Applied' then decision_date
    else applied_date
  end,
  interview_date = case
    when interview_date is null and status = 'Interview' then decision_date
    else interview_date
  end,
  final_decision_date = case
    when final_decision_date is null and status in ('Accepted', 'Rejected', 'Waitlisted') then decision_date
    else final_decision_date
  end;
