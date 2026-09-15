create type public.invite_status as enum ('pending', 'accepted', 'revoked', 'expired');

create table public.team_invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  email text not null,
  role public.team_role not null default 'member' check (role in ('manager', 'member')),
  token uuid not null unique default gen_random_uuid(),
  invited_by uuid not null references public.profiles(id),
  status public.invite_status not null default 'pending',
  expires_at timestamptz not null default now() + interval '7 days',
  created_at timestamptz not null default now(),
  unique(team_id, email, status)
);

alter table public.team_invites enable row level security;
grant select, insert, update, delete on public.team_invites to authenticated;
create policy "team managers read invites" on public.team_invites for select to authenticated using(public.can_manage_team(team_id) or lower(email) = lower(coalesce(auth.jwt()->>'email', '')) or public.is_admin());
create policy "team managers create invites" on public.team_invites for insert to authenticated with check(public.can_manage_team(team_id) and invited_by = auth.uid());
create policy "team managers revoke invites" on public.team_invites for update to authenticated using(public.can_manage_team(team_id) or public.is_admin());

create or replace function public.accept_team_invite(invite_token uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare invitation public.team_invites; recipient_email text;
begin
  recipient_email := lower(coalesce(auth.jwt()->>'email', ''));
  select * into invitation from public.team_invites where token = invite_token for update;
  if invitation.id is null then raise exception 'Invite not found.'; end if;
  if invitation.status <> 'pending' then raise exception 'This invite is no longer available.'; end if;
  if invitation.expires_at < now() then
    update public.team_invites set status = 'expired' where id = invitation.id;
    raise exception 'This invite has expired.';
  end if;
  if lower(invitation.email) <> recipient_email then raise exception 'Sign in with the email address that received this invite.'; end if;
  if exists(select 1 from public.team_members where team_id = invitation.team_id and user_id = auth.uid()) then raise exception 'You are already on this team.'; end if;
  insert into public.team_members(team_id, user_id, role) values(invitation.team_id, auth.uid(), invitation.role);
  update public.team_invites set status = 'accepted' where id = invitation.id;
  return invitation.team_id;
end;
$$;

create or replace function public.set_team_member_role(target_team uuid, target_user uuid, new_role public.team_role)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists(select 1 from public.team_members where team_id=target_team and user_id=auth.uid() and role='captain') then raise exception 'Only the captain can change roles.'; end if;
  if new_role = 'captain' then raise exception 'Use captain transfer to assign a new captain.'; end if;
  if not exists(select 1 from public.team_members where team_id=target_team and user_id=target_user) then raise exception 'Team member not found.'; end if;
  update public.team_members set role=new_role where team_id=target_team and user_id=target_user;
end;
$$;

create or replace function public.remove_team_member(target_team uuid, target_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare caller_role public.team_role; target_role public.team_role;
begin
  select role into caller_role from public.team_members where team_id=target_team and user_id=auth.uid();
  select role into target_role from public.team_members where team_id=target_team and user_id=target_user;
  if caller_role is null or target_role is null then raise exception 'Team member not found.'; end if;
  if target_role='captain' then raise exception 'Transfer captaincy before removing the captain.'; end if;
  if caller_role not in ('captain','manager') then raise exception 'You cannot remove team members.'; end if;
  if caller_role='manager' and target_role <> 'member' then raise exception 'Managers can only remove members.'; end if;
  delete from public.team_members where team_id=target_team and user_id=target_user;
end;
$$;

create or replace function public.transfer_team_captain(target_team uuid, new_captain uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists(select 1 from public.team_members where team_id=target_team and user_id=auth.uid() and role='captain') then raise exception 'Only the captain can transfer captaincy.'; end if;
  if not exists(select 1 from public.team_members where team_id=target_team and user_id=new_captain) then raise exception 'New captain must already be a team member.'; end if;
  update public.team_members set role='member' where team_id=target_team and user_id=auth.uid();
  update public.team_members set role='captain' where team_id=target_team and user_id=new_captain;
  update public.teams set captain_id=new_captain where id=target_team;
end;
$$;

grant execute on function public.accept_team_invite(uuid) to authenticated;
grant execute on function public.set_team_member_role(uuid,uuid,public.team_role) to authenticated;
grant execute on function public.remove_team_member(uuid,uuid) to authenticated;
grant execute on function public.transfer_team_captain(uuid,uuid) to authenticated;
