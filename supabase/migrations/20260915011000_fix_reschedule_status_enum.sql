create or replace function public.respond_to_scrim_reschedule(target_reschedule uuid, accept_request boolean)
returns uuid language plpgsql security definer set search_path=public as $$
declare proposal public.scrim_reschedules; target public.scrims; caller_team uuid;
begin
  select * into proposal from public.scrim_reschedules where id=target_reschedule for update;
  if proposal.id is null or proposal.status <> 'pending' then raise exception 'This reschedule request is no longer pending.'; end if;
  select * into target from public.scrims where id=proposal.scrim_id for update;
  select team_id into caller_team from public.team_members where user_id=auth.uid() and team_id in(target.posting_team_id,target.opponent_team_id) and role in('captain','manager') limit 1;
  if caller_team is null or caller_team=proposal.requested_by_team_id then raise exception 'Only the other team can respond to this request.'; end if;
  if accept_request then
    update public.scrim_reschedules set status='accepted'::public.request_status where id=proposal.id;
    update public.scrims set scheduled_at=proposal.proposed_time where id=target.id;
  else
    update public.scrim_reschedules set status='declined'::public.request_status where id=proposal.id;
  end if;
  return target.id;
end; $$;
