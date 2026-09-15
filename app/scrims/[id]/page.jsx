'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, CalendarDays, Check, LoaderCircle, Send, ShieldCheck } from 'lucide-react';
import { supabase } from '../../../lib/supabase/client';

export default function ScrimWorkspace() {
  const { id } = useParams();
  const [state, setState] = useState('loading');
  const [scrim, setScrim] = useState(null);
  const [user, setUser] = useState(null);
  const [myTeamId, setMyTeamId] = useState(null);
  const [checkins, setCheckins] = useState([]);
  const [messages, setMessages] = useState([]);
  const [reschedules, setReschedules] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  async function load() {
    const {
      data: { user: activeUser },
    } = await supabase.auth.getUser();
    if (!activeUser) {
      location.assign('/auth');
      return;
    }
    setUser(activeUser);
    const { data: match, error: matchError } = await supabase
      .from('scrims')
      .select(
        'id,scheduled_at,time_zone,region,format,duration_minutes,notes,status,posting_team_id,opponent_team_id,posting:teams!scrims_posting_team_id_fkey(name,schools(name)),opponent:teams!scrims_opponent_team_id_fkey(name,schools(name))'
      )
      .eq('id', id)
      .single();
    if (matchError || match.status !== 'confirmed') {
      setError(matchError?.message || 'This scrim is not an active confirmed match.');
      setState('error');
      return;
    }
    const [
      { data: checkinRows, error: checkinError },
      { data: chatRows, error: chatError },
      { data: membership, error: membershipError },
      { data: proposals, error: proposalError },
    ] = await Promise.all([
      supabase
        .from('scrim_checkins')
        .select('team_id,checked_in_at,checked_in_by')
        .eq('scrim_id', id),
      supabase
        .from('messages')
        .select('id,body,created_at,user_id,profiles(username)')
        .eq('scrim_id', id)
        .is('deleted_at', null)
        .order('created_at'),
      supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', activeUser.id)
        .in('team_id', [match.posting_team_id, match.opponent_team_id])
        .maybeSingle(),
      supabase
        .from('scrim_reschedules')
        .select('id,requested_by_team_id,proposed_time,message')
        .eq('scrim_id', id)
        .eq('status', 'pending')
        .order('created_at'),
    ]);
    if (checkinError || chatError || membershipError || proposalError || !membership) {
      setError(
        (checkinError || chatError || membershipError || proposalError)?.message ||
          'You are not on a participating team.'
      );
      setState('error');
      return;
    }
    setScrim(match);
    setMyTeamId(membership.team_id);
    setCheckins(checkinRows || []);
    setMessages(chatRows || []);
    setReschedules(proposals || []);
    setState('ready');
  }

  useEffect(() => {
    load();
  }, [id]);
  useEffect(() => {
    if (state !== 'ready') return;
    const channel = supabase
      .channel(`scrim-workspace-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `scrim_id=eq.${id}` },
        load
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scrim_checkins',
          filter: `scrim_id=eq.${id}`,
        },
        load
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [state, id]);

  async function checkIn() {
    setSending(true);
    setError('');
    const { error: checkinError } = await supabase.rpc('check_in_team', { target_scrim: scrim.id });
    setSending(false);
    if (checkinError) {
      setError(checkinError.message);
      return;
    }
    await load();
  }

  async function sendMessage(event) {
    event.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    setError('');
    const { error: sendError } = await supabase
      .from('messages')
      .insert({ scrim_id: scrim.id, user_id: user.id, body: message.trim() });
    setSending(false);
    if (sendError) {
      setError(sendError.message);
      return;
    }
    setMessage('');
    await load();
  }

  async function requestReschedule() {
    const value = window.prompt('New date and time (example: 2026-09-15 21:00):');
    if (!value) return;
    const proposed = new Date(value);
    if (Number.isNaN(proposed.valueOf())) {
      setError('Enter a valid future date and time.');
      return;
    }
    setSending(true);
    setError('');
    const { error: rescheduleError } = await supabase.rpc('request_scrim_reschedule', {
      target_scrim: scrim.id,
      proposed_time: proposed.toISOString(),
      note: null,
    });
    setSending(false);
    if (rescheduleError) {
      setError(rescheduleError.message);
      return;
    }
    window.alert(
      'Reschedule request sent. The other team must accept before the match time changes.'
    );
  }

  async function cancelScrim() {
    if (!window.confirm('Cancel this confirmed scrim? This cannot be undone.')) return;
    setSending(true);
    setError('');
    const { data: reopened, error: cancelError } = await supabase.rpc('cancel_confirmed_scrim', {
      target_scrim: scrim.id,
    });
    setSending(false);
    if (cancelError) {
      setError(cancelError.message);
      return;
    }
    window.alert(
      reopened
        ? 'Scrim canceled. Your original listing reopened as Replacement opponent needed.'
        : 'Scrim canceled.'
    );
    location.assign(reopened ? '/marketplace' : '/scrims/manage');
  }

  async function respondToReschedule(proposalId, accept) {
    setSending(true);
    setError('');
    const { error: responseError } = await supabase.rpc('respond_to_scrim_reschedule', {
      target_reschedule: proposalId,
      accept_request: accept,
    });
    setSending(false);
    if (responseError) {
      setError(responseError.message);
      return;
    }
    await load();
  }

  if (state === 'loading')
    return (
      <main className="workspace-page centered">
        <LoaderCircle className="spin" />
      </main>
    );
  if (state === 'error')
    return (
      <main className="workspace-page centered">
        <section className="market-empty">
          <h1>Couldn’t open this scrim</h1>
          <p>{error}</p>
          <Link href="/scrims/manage" className="primary">
            Back to scrims
          </Link>
        </section>
      </main>
    );

  const postingCheckin = checkins.find((checkin) => checkin.team_id === scrim.posting_team_id);
  const opponentCheckin = checkins.find((checkin) => checkin.team_id === scrim.opponent_team_id);
  const myCheckedIn = checkins.some((checkin) => checkin.team_id === myTeamId);
  const incomingProposal = reschedules.find(
    (proposal) => proposal.requested_by_team_id !== myTeamId
  );
  const outgoingProposal = reschedules.find(
    (proposal) => proposal.requested_by_team_id === myTeamId
  );

  return (
    <main className="workspace-page">
      <header className="workspace-header">
        <Link href="/scrims/manage" className="back">
          <ArrowLeft size={15} /> My scrims
        </Link>
        <span>
          <ShieldCheck size={16} /> Confirmed
        </span>
      </header>
      <section className="workspace-content">
        <p className="eyebrow">CONFIRMED SCRIM</p>
        <div className="workspace-actions">
          <button onClick={requestReschedule} disabled={sending}>
            Request reschedule
          </button>
          <button className="cancel-action" onClick={cancelScrim} disabled={sending}>
            Cancel scrim
          </button>
        </div>
        {incomingProposal && (
          <section className="reschedule-panel">
            <div>
              <strong>Reschedule requested</strong>
              <p>
                The other team proposes{' '}
                {new Intl.DateTimeFormat('en-US', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                  timeZone: scrim.time_zone,
                }).format(new Date(incomingProposal.proposed_time))}
                .
              </p>
            </div>
            <button
              className="decline"
              disabled={sending}
              onClick={() => respondToReschedule(incomingProposal.id, false)}
            >
              Decline
            </button>
            <button
              className="approve"
              disabled={sending}
              onClick={() => respondToReschedule(incomingProposal.id, true)}
            >
              Accept new time
            </button>
          </section>
        )}
        {outgoingProposal && (
          <section className="reschedule-panel waiting">
            <div>
              <strong>Reschedule request sent</strong>
              <p>Waiting for the other team to respond to your proposed time.</p>
            </div>
          </section>
        )}
        {error && <div className="auth-error">{error}</div>}
        <div className="matchup">
          <div>
            <div className="match-mark">{scrim.posting?.name?.slice(0, 2).toUpperCase()}</div>
            <h1>{scrim.posting?.name}</h1>
            <p>{scrim.posting?.schools?.name}</p>
          </div>
          <section>
            <strong>VS</strong>
            <span>
              {new Intl.DateTimeFormat('en-US', {
                dateStyle: 'medium',
                timeStyle: 'short',
                timeZone: scrim.time_zone,
              }).format(new Date(scrim.scheduled_at))}
            </span>
            <small>
              {scrim.time_zone.replace('_', ' ')} · {scrim.format} · {scrim.region}
            </small>
          </section>
          <div>
            <div className="match-mark orange">
              {scrim.opponent?.name?.slice(0, 2).toUpperCase()}
            </div>
            <h1>{scrim.opponent?.name}</h1>
            <p>{scrim.opponent?.schools?.name}</p>
          </div>
        </div>
        <section className="checkin-panel">
          <div>
            <span className={postingCheckin ? 'check-dot ready' : 'check-dot'} />
            <strong>{scrim.posting?.name}</strong>
            <small>
              {postingCheckin
                ? `Checked in ${new Date(postingCheckin.checked_in_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
                : 'Waiting for check-in'}
            </small>
          </div>
          <div>
            <span className={opponentCheckin ? 'check-dot ready' : 'check-dot'} />
            <strong>{scrim.opponent?.name}</strong>
            <small>
              {opponentCheckin
                ? `Checked in ${new Date(opponentCheckin.checked_in_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
                : 'Waiting for check-in'}
            </small>
          </div>
          <button
            className={myCheckedIn ? 'checked-in' : 'primary'}
            disabled={sending || myCheckedIn}
            onClick={checkIn}
          >
            {myCheckedIn ? (
              <>
                <Check size={16} /> Team checked in
              </>
            ) : (
              'Check my team in'
            )}
          </button>
        </section>
        <div className="workspace-details">
          <CalendarDays size={20} />
          <div>
            <strong>{scrim.duration_minutes} minute scrim</strong>
            <p>{scrim.notes || 'No additional notes.'}</p>
          </div>
        </div>
        <section className="match-chat">
          <header>
            <strong>Match chat</strong>
            <span>Private to both teams</span>
          </header>
          <div className="chat-messages">
            {messages.length === 0 ? (
              <p className="chat-empty">Coordinate servers, lobby settings, and timing here.</p>
            ) : (
              messages.map((item) => (
                <article className={item.user_id === user.id ? 'mine' : ''} key={item.id}>
                  <b>{item.profiles?.username}</b>
                  <small>
                    {new Date(item.created_at).toLocaleTimeString([], {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </small>
                  <p>{item.body}</p>
                </article>
              ))
            )}
          </div>
          <form onSubmit={sendMessage}>
            <input
              value={message}
              maxLength="1000"
              onChange={(event) => setMessage(event.target.value)}
              placeholder={`Message ${scrim.opponent?.name}…`}
            />
            <button className="primary" disabled={sending}>
              <Send size={15} /> Send
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}
