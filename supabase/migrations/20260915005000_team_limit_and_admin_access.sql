-- Keep the beta marketplace healthy: no more than five active/pending RL rosters per school.
create or replace function public.enforce_school_game_team_limit()
returns trigger language plpgsql set search_path = public as $$
declare
  active_team_count integer;
begin
  if new.game = 'Rocket League' and new.verification_status in ('pending', 'approved') then
    select count(*) into active_team_count
    from public.teams
    where school_id = new.school_id
      and game = new.game
      and verification_status in ('pending', 'approved');
    if active_team_count >= 5 then
      raise exception 'This school already has the maximum of five Rocket League teams.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_school_game_team_limit on public.teams;
create trigger enforce_school_game_team_limit
before insert on public.teams
for each row execute procedure public.enforce_school_game_team_limit();

-- Enables the admin queue UI. RLS remains responsible for which rows can be read/updated.
grant select, update on table public.profiles to authenticated;
