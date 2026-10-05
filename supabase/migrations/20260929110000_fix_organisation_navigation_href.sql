-- The first applied check was escaped twice, so "./" links were rejected.
alter table public.organisation_navigation
  drop constraint if exists organisation_navigation_href_check;

alter table public.organisation_navigation
  add constraint organisation_navigation_href_check
  check (href ~ '^(#|\./|games/)');
