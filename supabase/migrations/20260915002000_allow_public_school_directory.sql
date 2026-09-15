-- School names/domains are a public directory used by the team-creation form.
-- This changes only read access; admins remain the only users allowed to modify schools.
drop policy if exists "schools readable" on public.schools;
create policy "public school directory is readable"
on public.schools for select
to anon, authenticated
using (true);
