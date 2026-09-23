'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CalendarDays, Check, LoaderCircle, X } from 'lucide-react';
import { supabase } from '../../../lib/supabase/client';
import BackButton from '../../../components/BackButton';
export default function ManageScrims() {
  const [state, setState] = useState('loading'),
    [requests, setRequests] = useState([]),
    [confirmed, setConfirmed] = useState([]),
    [completed, setCompleted] = useState([]),
    [error, setError] = useState(''),
    [working, setWorking] = useState('');
  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      location.assign('/auth');
      return;
    }
    const { data: members } = await supabase
      .from('team_members')
      .select('team_id,role')
      .eq('user_id', user.id)
      .in('role', ['captain', 'manager']);
    const ids = (members || []).map((m) => m.team_id);
    if (!ids.length) {
      setState('ready');
      return;
    }
    const { data: pending, error: e } = await supabase
      .from('scrim_requests')
      .select(
        'id,created_at,requesting:teams!scrim_requests_requesting_team_id_fkey(name,schools(name)),scrims!inner(id,scheduled_at,format,posting_team_id)'
      )
      .eq('status', 'pending')
      .in('scrims.posting_team_id', ids);
    const { data: matches, error: me } = await supabase
      .from('scrims')
      .select(
        'id,scheduled_at,format,region,posting:teams!scrims_posting_team_id_fkey(name),opponent:teams!scrims_opponent_team_id_fkey(name)'
      )
      .eq('status', 'confirmed')
      .or(`posting_team_id.in.(${ids.join(',')}),opponent_team_id.in.(${ids.join(',')})`)
      .order('scheduled_at');
    const { data: finished, error: finishedError } = await supabase
      .from('scrims')
      .select(
        'id,scheduled_at,format,region,posting_team_id,opponent_team_id,posting:teams!scrims_posting_team_id_fkey(name),opponent:teams!scrims_opponent_team_id_fkey(name),outcome:scrim_outcomes(outcome,no_show_team_id)'
      )
      .eq('status', 'completed')
      .or(`posting_team_id.in.(${ids.join(',')}),opponent_team_id.in.(${ids.join(',')})`)
      .order('scheduled_at', { ascending: false });
    if (e || me || finishedError) {
      setError((e || me || finishedError).message);
      setState('error');
      return;
    }
    setRequests(pending || []);
    setConfirmed(matches || []);
    setCompleted(finished || []);
    setState('ready');
  }
  useEffect(() => {
    load();
  }, []);
  async function respond(id, accept) {
    setWorking(id);
    const { data, error: e } = await supabase.rpc('respond_to_scrim_request', {
      target_request: id,
      accept_request: accept,
    });
    setWorking('');
    if (e) {
      setError(e.message);
      return;
    }
    if (accept) location.assign(`/scrims/${data}`);
    else load();
  }
  if (state === 'loading')
    return (
      <main className="manage-page centered">
        <BackButton fallback="/marketplace" />
        <LoaderCircle className="spin" />
      </main>
    );
  return (
    <main className="manage-page">
      <header className="manage-header">
        <BackButton fallback="/marketplace" />
        <Link href="/scrims/new" className="primary">
          Post a scrim
        </Link>
      </header>
      <section className="manage-content">
        <p className="eyebrow">SCRIM MANAGEMENT</p>
        <h1>
          Incoming requests <small>{requests.length}</small>
        </h1>
        {error && <div className="auth-error">{error}</div>}
        {requests.length === 0 ? (
          <div className="manage-empty">No pending requests yet.</div>
        ) : (
          <div className="request-list">
            {requests.map((r) => (
              <article key={r.id}>
                <div>
                  <h2>{r.requesting?.name} wants to play</h2>
                  <p>
                    {r.requesting?.schools?.name} ·{' '}
                    {new Date(r.scrims?.scheduled_at).toLocaleString()} · {r.scrims?.format}
                  </p>
                </div>
                <button
                  className="decline"
                  disabled={working === r.id}
                  onClick={() => respond(r.id, false)}
                >
                  <X size={15} /> Decline
                </button>
                <button
                  className="approve"
                  disabled={working === r.id}
                  onClick={() => respond(r.id, true)}
                >
                  {working === r.id ? (
                    <LoaderCircle className="spin" size={15} />
                  ) : (
                    <Check size={15} />
                  )}{' '}
                  Accept
                </button>
              </article>
            ))}
          </div>
        )}
        <h1 className="confirmed-title">
          Confirmed scrims <small>{confirmed.length}</small>
        </h1>
        {confirmed.length === 0 ? (
          <div className="manage-empty">Accepted scrims will appear here.</div>
        ) : (
          <div className="confirmed-list">
            {confirmed.map((s) => (
              <Link href={`/scrims/${s.id}`} key={s.id}>
                <CalendarDays size={17} />
                <div>
                  <strong>
                    {s.posting?.name} <span>vs</span> {s.opponent?.name}
                  </strong>
                  <small>
                    {new Date(s.scheduled_at).toLocaleString()} · {s.format} · {s.region}
                  </small>
                </div>
                <span>Open →</span>
              </Link>
            ))}
          </div>
        )}
        <h1 className="confirmed-title">
          Finished scrims <small>{completed.length}</small>
        </h1>
        {completed.length === 0 ? (
          <div className="manage-empty">
            Finished scrims will be kept here for your team’s history.
          </div>
        ) : (
          <div className="confirmed-list completed-list">
            {completed.map((s) => {
              const outcome = s.outcome?.[0];
              const noShowTeam =
                outcome?.no_show_team_id === s.posting_team_id ? s.posting?.name : s.opponent?.name;
              return (
                <Link href={`/scrims/${s.id}`} key={s.id}>
                  <Check size={17} />
                  <div>
                    <strong>
                      {s.posting?.name} <span>vs</span> {s.opponent?.name}
                    </strong>
                    <small>
                      {outcome?.outcome === 'no_show'
                        ? `${noShowTeam} recorded as a no-show`
                        : 'Completed practice scrim'}
                    </small>
                  </div>
                  <span>View →</span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
