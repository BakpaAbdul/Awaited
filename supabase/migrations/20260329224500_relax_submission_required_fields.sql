alter table public.scholarship_results
  alter column study_level drop not null,
  alter column field_of_study drop not null;

alter table public.scholarship_results
  drop constraint if exists scholarship_results_field_of_study_check,
  add constraint scholarship_results_field_of_study_check
    check (field_of_study is null or char_length(trim(field_of_study)) between 2 and 160);
