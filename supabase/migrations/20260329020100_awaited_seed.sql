insert into public.scholarship_results (
  scholarship_name,
  country,
  study_level,
  field_of_study,
  status,
  decision_date,
  nationality,
  gpa,
  note,
  hidden,
  created_at
)
select *
from (
  values
    ('Chevening Scholarship', 'United Kingdom', 'Masters', 'Public Policy', 'Accepted', '2026-02-15'::date, 'Nigerian', '3.7', 'Interview was about leadership and networking plan. Got the email 3 weeks after interview.', false, '2026-02-15T10:00:00Z'::timestamptz),
    ('Chevening Scholarship', 'United Kingdom', 'Masters', 'Economics', 'Rejected', '2026-02-20'::date, 'Ghanaian', '3.5', 'No interview invitation. Applied for LSE. Second attempt.', false, '2026-02-20T08:00:00Z'::timestamptz),
    ('DAAD EPOS Scholarship', 'Germany', 'Masters', 'Development Economics', 'Interview', '2026-01-10'::date, 'Kenyan', '3.4', 'Got interview invite via email. Panel of 3 professors. Very academic questions.', false, '2026-01-10T14:00:00Z'::timestamptz),
    ('Fulbright Scholarship', 'United States', 'PhD', 'Political Science', 'Accepted', '2025-12-05'::date, 'Colombian', '3.9', 'Applied through the Colombian Fulbright commission. Long process - 6 months total.', false, '2025-12-05T09:00:00Z'::timestamptz),
    ('Fulbright Scholarship', 'United States', 'Masters', 'Computer Science', 'Waitlisted', '2026-01-20'::date, 'Indonesian', '3.6', 'Still waiting. Anyone else in the same boat?', false, '2026-01-20T11:00:00Z'::timestamptz),
    ('Gates Cambridge Scholarship', 'United Kingdom', 'PhD', 'Neuroscience', 'Accepted', '2026-03-01'::date, 'Indian', '3.95', 'The interview was conversational. They care a lot about your why Cambridge answer.', false, '2026-03-01T16:00:00Z'::timestamptz),
    ('Erasmus Mundus Joint Masters', 'Europe (Multiple)', 'Masters', 'Data Science', 'Rejected', '2026-02-28'::date, 'Pakistani', '3.3', 'Second year applying. Didn''t make it past the consortium ranking.', false, '2026-02-28T12:00:00Z'::timestamptz),
    ('Rhodes Scholarship', 'United Kingdom', 'Masters', 'Philosophy', 'Interview', '2026-01-15'::date, 'American', '3.88', 'State-level interview done. Waiting for national results.', false, '2026-01-15T13:00:00Z'::timestamptz),
    ('Australia Awards Scholarship', 'Australia', 'Masters', 'Environmental Science', 'Accepted', '2025-11-30'::date, 'Vietnamese', '3.5', 'Took almost 8 months from application to final result. Worth the wait!', false, '2025-11-30T07:00:00Z'::timestamptz),
    ('MEXT Scholarship (Monbukagakusho)', 'Japan', 'PhD', 'Electrical Engineering', 'Applied', '2026-03-10'::date, 'Bangladeshi', '3.65', 'Embassy track. Submitted documents last week. The wait begins.', false, '2026-03-10T15:00:00Z'::timestamptz),
    ('Chevening Scholarship', 'United Kingdom', 'Masters', 'International Relations', 'Waitlisted', '2026-02-22'::date, 'Ethiopian', '3.6', 'Waitlisted after interview. Anyone know how likely it is to get off the waitlist?', false, '2026-02-22T10:00:00Z'::timestamptz),
    ('Türkiye Bursları (Turkey Scholarships)', 'Turkey', 'Undergrad', 'Medicine', 'Interview', '2026-03-05'::date, 'Somali', '3.8', 'Online interview scheduled. Anyone have tips for the Turkey scholarship interview?', false, '2026-03-05T09:00:00Z'::timestamptz)
) as seed (
  scholarship_name,
  country,
  study_level,
  field_of_study,
  status,
  decision_date,
  nationality,
  gpa,
  note,
  hidden,
  created_at
)
where not exists (
  select 1
  from public.scholarship_results existing
  where existing.scholarship_name = seed.scholarship_name
    and existing.country = seed.country
    and existing.study_level = seed.study_level
    and existing.field_of_study = seed.field_of_study
    and existing.status = seed.status
    and existing.decision_date = seed.decision_date
);
