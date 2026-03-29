delete from public.scholarship_results
where fingerprint_hash is null
  and (scholarship_name, country, study_level, field_of_study, status, decision_date, created_at) in (
    values
      ('Chevening Scholarship', 'United Kingdom', 'Masters', 'Public Policy', 'Accepted', '2026-02-15'::date, '2026-02-15T10:00:00Z'::timestamptz),
      ('Chevening Scholarship', 'United Kingdom', 'Masters', 'Economics', 'Rejected', '2026-02-20'::date, '2026-02-20T08:00:00Z'::timestamptz),
      ('DAAD EPOS Scholarship', 'Germany', 'Masters', 'Development Economics', 'Interview', '2026-01-10'::date, '2026-01-10T14:00:00Z'::timestamptz),
      ('Fulbright Scholarship', 'United States', 'PhD', 'Political Science', 'Accepted', '2025-12-05'::date, '2025-12-05T09:00:00Z'::timestamptz),
      ('Fulbright Scholarship', 'United States', 'Masters', 'Computer Science', 'Waitlisted', '2026-01-20'::date, '2026-01-20T11:00:00Z'::timestamptz),
      ('Gates Cambridge Scholarship', 'United Kingdom', 'PhD', 'Neuroscience', 'Accepted', '2026-03-01'::date, '2026-03-01T16:00:00Z'::timestamptz),
      ('Erasmus Mundus Joint Masters', 'Europe (Multiple)', 'Masters', 'Data Science', 'Rejected', '2026-02-28'::date, '2026-02-28T12:00:00Z'::timestamptz),
      ('Rhodes Scholarship', 'United Kingdom', 'Masters', 'Philosophy', 'Interview', '2026-01-15'::date, '2026-01-15T13:00:00Z'::timestamptz),
      ('Australia Awards Scholarship', 'Australia', 'Masters', 'Environmental Science', 'Accepted', '2025-11-30'::date, '2025-11-30T07:00:00Z'::timestamptz),
      ('MEXT Scholarship (Monbukagakusho)', 'Japan', 'PhD', 'Electrical Engineering', 'Applied', '2026-03-10'::date, '2026-03-10T15:00:00Z'::timestamptz),
      ('Chevening Scholarship', 'United Kingdom', 'Masters', 'International Relations', 'Waitlisted', '2026-02-22'::date, '2026-02-22T10:00:00Z'::timestamptz),
      ('Türkiye Bursları (Turkey Scholarships)', 'Turkey', 'Undergrad', 'Medicine', 'Interview', '2026-03-05'::date, '2026-03-05T09:00:00Z'::timestamptz)
  );
