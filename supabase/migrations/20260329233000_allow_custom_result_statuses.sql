alter table public.scholarship_results
drop constraint if exists scholarship_results_status_check;

alter table public.scholarship_results
add constraint scholarship_results_status_check
check (
  char_length(trim(status)) between 2 and 40
  and status !~* '(https?://|www\.)'
);
