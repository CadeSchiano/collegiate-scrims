grant select, insert, update on public.scrim_reschedules to authenticated;
grant select, insert on public.scrim_cancellations to authenticated;

create policy "participants read reschedules" on public.scrim_reschedules for select to authenticated using(exists(select 1 from public.scrims s where s.id=scrim_id and (public.is_team_member(s.posting_team_id) or public.is_team_member(s.opponent_team_id))) or public.is_admin());

create or replace function public.request_scrim_reschedule(target_scrim uuid, proposed_time timestamptz, note text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare target public.scrims; caller_team uuid; result_id uuid;
begin
  select * into target from public.scrims where id=target_scrim for update;
  if target.id is null or target.status <> 'confirmed' then raise exception 'Only confirmed scrims can be rescheduled.'; end if;
  select team_id into caller_team from public.team_members where user_id=auth.uid() and team_id in(target.posting_team_id,target.opponent_team_id) and role in('captain','manager') limit 1;
  if caller_team is null then raise exception 'Only a captain or manager can request a reschedule.'; end if;
  if proposed_time <= now() then raise exception 'Choose a future time.'; end if;
  insert into public.scrim_reschedules(scrim_id,requested_by_team_id,old_time,proposed_time,message,status) values(target_scrim,caller_team,target.scheduled_at,proposed_time,note,'pending') returning id into result_id;
  return result_id;
end; $$;

create or replace function public.respond_to_scrim_reschedule(target_reschedule uuid, accept_request boolean)
returns uuid language plpgsql security definer set search_path=public as $$
declare proposal public.scrim_reschedules; target public.scrims; caller_team uuid;
begin
  select * into proposal from public.scrim_reschedules where id=target_reschedule for update;
  if proposal.id is null or proposal.status <> 'pending' then raise exception 'This reschedule request is no longer pending.'; end if;
  select * into target from public.scrims where id=proposal.scrim_id for update;
  select team_id into caller_team from public.team_members where user_id=auth.uid() and team_id in(target.posting_team_id,target.opponent_team_id) and role in('captain','manager') limit 1;
  if caller_team is null or caller_team=proposal.requested_by_team_id then raise exception 'Only the other team can respond to this request.'; end if;
  update public.scrim_reschedules set status=case when accept_request then 'accepted' else 'declined' end where id=proposal.id;
  if accept_request then update public.scrims set scheduled_at=proposal.proposed_time where id=target.id; end if;
  return target.id;
end; $$;

create or replace function public.cancel_confirmed_scrim(target_scrim uuid)
returns boolean language plpgsql security definer set search_path=public as $$
declare target public.scrims; caller_team uuid; is_late boolean;
begin
  select * into target from public.scrims where id=target_scrim for update;
  if target.id is null or target.status <> 'confirmed' then raise exception 'Only confirmed scrims can be cancelled.'; end if;
  select team_id into caller_team from public.team_members where user_id=auth.uid() and team_id in(target.posting_team_id,target.opponent_team_id) and role in('captain','manager') limit 1;
  if caller_team is null then raise exception 'Only a captain or manager can cancel this scrim.'; end if;
  is_late := now() >= target.scheduled_at - interval '6 hours';
  insert into public.scrim_cancellations(scrim_id,canceled_by_team_id,late_cancel) values(target.id,caller_team,is_late);
  if caller_team=target.opponent_team_id then
    update public.scrims set opponent_team_id=null,status='posted',replacement_needed=true where id=target.id;
    return true;
  end if;
  update public.scrims set status='cancelled' where id=target.id;
  return false;
end; $$;

grant execute on function public.request_scrim_reschedule(uuid,timestamptz,text) to authenticated;
grant execute on function public.respond_to_scrim_reschedule(uuid,boolean) to authenticated;
grant execute on function public.cancel_confirmed_scrim(uuid) to authenticated;
