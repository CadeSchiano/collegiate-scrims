grant select, insert, update on public.scrim_requests to authenticated;

create or replace function public.request_scrim(target_scrim uuid, requesting_team uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare target public.scrims; request_id uuid;
begin
  select * into target from public.scrims where id = target_scrim for update;
  if target.id is null or target.status <> 'posted' then raise exception 'This scrim is no longer available.'; end if;
  if target.posting_team_id = requesting_team then raise exception 'A team cannot request its own scrim.'; end if;
  if not public.can_manage_team(requesting_team) then raise exception 'Only a captain or manager can request a scrim.'; end if;
  if not exists(select 1 from public.teams where id=requesting_team and verification_status='approved' and suspended_at is null) then raise exception 'Your team must be verified to request a scrim.'; end if;
  insert into public.scrim_requests(scrim_id,requesting_team_id,status)
  values(target_scrim,requesting_team,'pending')
  on conflict(scrim_id,requesting_team_id) do update set status='pending', created_at=now()
  returning id into request_id;
  return request_id;
end;
$$;

create or replace function public.respond_to_scrim_request(target_request uuid, accept_request boolean)
returns uuid language plpgsql security definer set search_path = public as $$
declare request_row public.scrim_requests; scrim_row public.scrims;
begin
  select * into request_row from public.scrim_requests where id=target_request for update;
  if request_row.id is null or request_row.status <> 'pending' then raise exception 'This request is no longer pending.'; end if;
  select * into scrim_row from public.scrims where id=request_row.scrim_id for update;
  if not public.can_manage_team(scrim_row.posting_team_id) then raise exception 'Only the posting team can respond to this request.'; end if;
  if scrim_row.status <> 'posted' then raise exception 'This scrim is no longer available.'; end if;
  if accept_request then
    update public.scrim_requests set status='accepted' where id=request_row.id;
    update public.scrim_requests set status='declined' where scrim_id=scrim_row.id and id <> request_row.id and status='pending';
    update public.scrims set opponent_team_id=request_row.requesting_team_id,status='confirmed' where id=scrim_row.id;
  else
    update public.scrim_requests set status='declined' where id=request_row.id;
  end if;
  return scrim_row.id;
end;
$$;

grant execute on function public.request_scrim(uuid,uuid) to authenticated;
grant execute on function public.respond_to_scrim_request(uuid,boolean) to authenticated;
