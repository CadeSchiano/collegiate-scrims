-- The UI needs public usernames for rosters and username invite lookup.
-- Keep account role, suspension, and notification-preference fields private.

revoke select on public.profiles from authenticated;
grant select (id, username) on public.profiles to authenticated;
grant execute on function public.is_admin() to authenticated;
