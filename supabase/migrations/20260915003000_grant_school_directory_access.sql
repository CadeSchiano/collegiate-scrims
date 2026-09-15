-- The project intentionally does not auto-expose new tables.
-- Grant only the public school directory the minimum read permission it needs.
grant usage on schema public to anon, authenticated;
grant select on table public.schools to anon, authenticated;
