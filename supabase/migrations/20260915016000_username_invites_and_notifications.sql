alter table public.team_invites
  add column if not exists invited_user_id uuid references public.profiles(id) on delete cascade;

alter table public.team_invites
  alter column email drop not null;

alter table public.team_invites
  add constraint team_invites_recipient_check
  check (email is not null or invited_user_id is not null);

create unique index team_invites_pending_user_unique
on public.team_invites (team_id, invited_user_id)
where status = 'pending' and invited_user_id is not null;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;
grant select, update on public.notifications to authenticated;

create policy "users read own notifications"
on public.notifications for select to authenticated
using (user_id = auth.uid());

create policy "users update own notifications"
on public.notifications for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create or replace function public.create_team_invite(
  target_team uuid,
  recipient_email text default null,
  recipient_username text default null,
  invite_role public.team_role default 'member'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_team_name text;
  recipient_user uuid;
  normalized_email text;
  invite_token uuid;
begin
  if not public.can_manage_team(target_team) then
    raise exception 'Only a captain or manager can invite teammates.';
  end if;
  if invite_role not in ('manager', 'member') then
    raise exception 'Invites can only assign the manager or member role.';
  end if;
  if nullif(trim(coalesce(recipient_email, '')), '') is null
    and nullif(trim(coalesce(recipient_username, '')), '') is null then
    raise exception 'Enter an email address or Scrimnet username.';
  end if;
  if nullif(trim(coalesce(recipient_email, '')), '') is not null
    and nullif(trim(coalesce(recipient_username, '')), '') is not null then
    raise exception 'Use either an email address or a username, not both.';
  end if;

  select name into target_team_name from public.teams where id = target_team;
  if target_team_name is null then
    raise exception 'Team not found.';
  end if;

  if nullif(trim(coalesce(recipient_username, '')), '') is not null then
    select id into recipient_user
    from public.profiles
    where lower(username) = lower(trim(recipient_username));
    if recipient_user is null then
      raise exception 'No Scrimnet user was found with that username.';
    end if;
    if exists (
      select 1 from public.team_members where team_id = target_team and user_id = recipient_user
    ) then
      raise exception 'That user is already on this team.';
    end if;
    if exists (
      select 1 from public.team_invites
      where team_id = target_team and invited_user_id = recipient_user and status = 'pending'
    ) then
      raise exception 'That user already has a pending invite to this team.';
    end if;
  else
    normalized_email := lower(trim(recipient_email));
    if position('@' in normalized_email) = 0 then
      raise exception 'Enter a valid email address.';
    end if;
    if exists (
      select 1 from public.team_invites
      where team_id = target_team and lower(email) = normalized_email and status = 'pending'
    ) then
      raise exception 'That email already has a pending invite to this team.';
    end if;
  end if;

  insert into public.team_invites (team_id, email, invited_user_id, role, invited_by)
  values (target_team, normalized_email, recipient_user, invite_role, auth.uid())
  returning token into invite_token;

  if recipient_user is not null then
    insert into public.notifications (user_id, kind, title, body, link)
    values (
      recipient_user,
      'team_invite',
      'Team invitation',
      format('You were invited to join %s Rocket League.', target_team_name),
      format('/invites/%s', invite_token)
    );
  end if;

  return invite_token;
end;
$$;

create or replace function public.accept_team_invite(invite_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation public.team_invites;
  recipient_email text;
begin
  recipient_email := lower(coalesce(auth.jwt()->>'email', ''));
  select * into invitation from public.team_invites where token = invite_token for update;
  if invitation.id is null then raise exception 'Invite not found.'; end if;
  if invitation.status <> 'pending' then raise exception 'This invite is no longer available.'; end if;
  if invitation.expires_at < now() then
    update public.team_invites set status = 'expired' where id = invitation.id;
    raise exception 'This invite has expired.';
  end if;
  if invitation.invited_user_id is not null and invitation.invited_user_id <> auth.uid() then
    raise exception 'This invite was sent to another Scrimnet account.';
  end if;
  if invitation.invited_user_id is null and lower(invitation.email) <> recipient_email then
    raise exception 'Sign in with the email address that received this invite.';
  end if;
  if exists(select 1 from public.team_members where team_id = invitation.team_id and user_id = auth.uid()) then
    raise exception 'You are already on this team.';
  end if;
  insert into public.team_members(team_id, user_id, role)
  values(invitation.team_id, auth.uid(), invitation.role);
  update public.team_invites set status = 'accepted' where id = invitation.id;
  return invitation.team_id;
end;
$$;

grant execute on function public.create_team_invite(uuid, text, text, public.team_role) to authenticated;
grant execute on function public.accept_team_invite(uuid) to authenticated;
