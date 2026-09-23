'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Crown,
  LoaderCircle,
  Plus,
  ShieldCheck,
  UserMinus,
  UsersRound,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase/client';
import BackButton from '../../components/BackButton';
const copy = {
  pending: ['Verification pending', 'Your team is under manual review.'],
  approved: ['Collegiate Verified', 'Your team can post or request Rocket League scrims.'],
  rejected: ['Verification not approved', 'Contact an administrator if you need to resubmit.'],
  revoked: ['Verification revoked', 'Contact an administrator for details.'],
};
export default function TeamPage() {
  const [state, setState] = useState('loading'),
    [team, setTeam] = useState(),
    [members, setMembers] = useState([]),
    [reliability, setReliability] = useState(),
    [user, setUser] = useState(),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [invite, setInvite] = useState(false),
    [recipient, setRecipient] = useState(''),
    [matches, setMatches] = useState([]),
    [selectedMatch, setSelectedMatch] = useState(),
    [role, setRole] = useState('member'),
    [working, setWorking] = useState(false);
  async function load() {
    const {
      data: { user: u },
    } = await supabase.auth.getUser();
    if (!u) {
      location.assign('/auth');
      return;
    }
    setUser(u);
    const { data: m, error: e } = await supabase
      .from('team_members')
      .select('team_id,role')
      .eq('user_id', u.id)
      .limit(1)
      .maybeSingle();
    if (e) {
      setError(e.message);
      setState('error');
      return;
    }
    if (!m) {
      setState('empty');
      return;
    }
    const { data: t, error: te } = await supabase
      .from('teams')
      .select('id,name,rank,region,game,verification_status,schools(name)')
      .eq('id', m.team_id)
      .single();
    const [{ data: r, error: re }, { data: reliabilityRows, error: reliabilityError }] =
      await Promise.all([
        supabase
          .from('team_members')
          .select('user_id,role,profiles(username)')
          .eq('team_id', m.team_id),
        supabase.rpc('get_team_reliability', { target_team: m.team_id }),
      ]);
    if (te || re || reliabilityError) {
      setError((te || re || reliabilityError).message);
      setState('error');
      return;
    }
    setTeam({ ...t, myRole: m.role });
    setMembers(r);
    setReliability(reliabilityRows?.[0]);
    setState('ready');
  }
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    const query = recipient.trim();
    if (query.length < 2 || query.includes('@')) {
      setMatches([]);
      return undefined;
    }
    const timeout = window.setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id,username')
        .ilike('username', `${query}%`)
        .neq('id', user?.id || '')
        .limit(5);
      setMatches(data || []);
    }, 200);
    return () => window.clearTimeout(timeout);
  }, [recipient, user?.id]);
  async function act(fn, msg) {
    setWorking(true);
    setError('');
    const { error: e } = await fn();
    setWorking(false);
    if (e) {
      setError(e.message);
      return;
    }
    setNotice(msg);
    load();
  }
  async function sendInvite(e) {
    e.preventDefault();
    setWorking(true);
    setError('');
    const isEmail = recipient.includes('@');
    const { data: token, error: inviteError } = await supabase.rpc('create_team_invite', {
      target_team: team.id,
      recipient_email: isEmail ? recipient.trim() : null,
      recipient_username: isEmail ? null : selectedMatch?.username || recipient.trim(),
      invite_role: role,
    });
    setWorking(false);
    if (inviteError) {
      setError(inviteError.message);
      return;
    }
    if (isEmail) {
      await navigator.clipboard.writeText(`${location.origin}/invites/${token}`);
      setNotice(`Invite link copied for ${recipient.trim()}.`);
    } else {
      setNotice(`In-app invite sent to @${selectedMatch?.username || recipient.trim()}.`);
    }
    setInvite(false);
    setRecipient('');
    setSelectedMatch(undefined);
  }
  if (state === 'loading')
    return (
      <main className="live-team-page centered">
        <BackButton fallback="/" />
        <LoaderCircle className="spin" />
      </main>
    );
  if (state === 'empty')
    return (
      <main className="live-team-page centered">
        <section className="team-empty">
          <BackButton fallback="/" />
          <UsersRound />
          <h1>Start your collegiate roster.</h1>
          <Link href="/teams/new" className="primary">
            Create a team
          </Link>
        </section>
      </main>
    );
  if (state === 'error')
    return (
      <main className="live-team-page centered">
        <section className="team-empty">
          <BackButton fallback="/" />
          <h1>Couldn’t load your team</h1>
          <p>{error}</p>
        </section>
      </main>
    );
  const captain = team.myRole === 'captain',
    manages = captain || team.myRole === 'manager',
    [title, desc] = copy[team.verification_status];
  return (
    <main className="live-team-page">
      <header className="team-header">
        <BackButton fallback="/" label="Back" />
        <span>{team.myRole}</span>
      </header>
      <section className="live-team-content">
        <div className="live-team-title">
          <div className="live-team-mark">{team.name.slice(0, 2).toUpperCase()}</div>
          <div>
            <p className="eyebrow">YOUR TEAM</p>
            <h1>{team.name} Rocket League</h1>
            <p>{team.schools?.name}</p>
          </div>
        </div>
        {notice && (
          <div className="team-notice">
            <Check size={16} />
            {notice}
          </div>
        )}
        {error && <div className="auth-error">{error}</div>}
        <section className={`verification-panel ${team.verification_status}`}>
          <ShieldCheck size={24} />
          <div>
            <strong>{title}</strong>
            <p>{desc}</p>
          </div>
          {team.verification_status === 'approved' && <CheckCircle2 size={20} />}
        </section>
        <div className="live-team-grid">
          <article className="live-profile">
            <h2>Team profile</h2>
            <dl>
              <div>
                <dt>Game</dt>
                <dd>{team.game}</dd>
              </div>
              <div>
                <dt>Region</dt>
                <dd>{team.region}</dd>
              </div>
              <div>
                <dt>Typical level</dt>
                <dd>{team.rank}</dd>
              </div>
              <div>
                <dt>Your role</dt>
                <dd>{team.myRole}</dd>
              </div>
            </dl>
          </article>
          <article className="live-roster">
            <div className="live-roster-head">
              <h2>
                Roster <small>{members.length}</small>
              </h2>
              {manages && (
                <button className="roster-add" onClick={() => setInvite(true)}>
                  <Plus size={14} /> Invite
                </button>
              )}
            </div>
            {members.map((member) => (
              <div className="live-member" key={member.user_id}>
                <div>{member.profiles?.username?.slice(0, 2).toUpperCase()}</div>
                <strong>
                  {member.profiles?.username}
                  {member.user_id === user.id && <small> You</small>}
                </strong>
                <span>{member.role}</span>
                {captain && member.user_id !== user.id && (
                  <div className="member-actions">
                    <button
                      title="Manager"
                      onClick={() =>
                        act(
                          () =>
                            supabase.rpc('set_team_member_role', {
                              target_team: team.id,
                              target_user: member.user_id,
                              new_role: 'manager',
                            }),
                          'Role updated.'
                        )
                      }
                    >
                      M
                    </button>
                    <button
                      title="Member"
                      onClick={() =>
                        act(
                          () =>
                            supabase.rpc('set_team_member_role', {
                              target_team: team.id,
                              target_user: member.user_id,
                              new_role: 'member',
                            }),
                          'Role updated.'
                        )
                      }
                    >
                      m
                    </button>
                    <button
                      title="Transfer captain"
                      onClick={() =>
                        confirm(`Make ${member.profiles?.username} captain?`) &&
                        act(
                          () =>
                            supabase.rpc('transfer_team_captain', {
                              target_team: team.id,
                              new_captain: member.user_id,
                            }),
                          'Captaincy transferred.'
                        )
                      }
                    >
                      <Crown size={13} />
                    </button>
                    <button
                      title="Remove"
                      onClick={() =>
                        confirm(`Remove ${member.profiles?.username}?`) &&
                        act(
                          () =>
                            supabase.rpc('remove_team_member', {
                              target_team: team.id,
                              target_user: member.user_id,
                            }),
                          'Member removed.'
                        )
                      }
                    >
                      <UserMinus size={13} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </article>
        </div>
        <section className="reliability-summary">
          <div>
            <p className="eyebrow">PRACTICE RELIABILITY</p>
            <h2>Team reliability</h2>
            <p>
              Private team history for dependable scheduling. This is not a ranking or a performance
              score.
            </p>
          </div>
          <dl>
            <div>
              <dt>{reliability?.completed_scrims ?? 0}</dt>
              <dd>Completed scrims</dd>
            </div>
            <div>
              <dt>{reliability?.late_cancellations ?? 0}</dt>
              <dd>Late cancellations</dd>
            </div>
            <div>
              <dt>{reliability?.no_shows ?? 0}</dt>
              <dd>No-shows</dd>
            </div>
          </dl>
        </section>
      </section>
      {invite && (
        <div className="overlay">
          <form className="modal" onSubmit={sendInvite}>
            <button type="button" className="close" onClick={() => setInvite(false)}>
              <X size={20} />
            </button>
            <p className="eyebrow">INVITE TEAMMATE</p>
            <h2>Invite to {team.name}</h2>
            <label className="invite-recipient">
              Email or username
              <input
                required
                value={recipient}
                onChange={(e) => {
                  setRecipient(e.target.value);
                  setSelectedMatch(undefined);
                }}
                placeholder="teammate@school.edu or username"
              />
              {matches.length > 0 && !selectedMatch && (
                <div className="invite-matches">
                  {matches.map((match) => (
                    <button
                      type="button"
                      key={match.id}
                      onClick={() => {
                        setRecipient(match.username);
                        setSelectedMatch(match);
                        setMatches([]);
                      }}
                    >
                      <span>{match.username.slice(0, 2).toUpperCase()}</span>@{match.username}
                    </button>
                  ))}
                </div>
              )}
              <small>
                Username invites appear in the player’s Scrimnet notification bell. Email invites
                copy a private link for you to send.
              </small>
            </label>
            <label>
              Role
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="member">Member</option>
                {captain && <option value="manager">Manager</option>}
              </select>
            </label>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setInvite(false)}>
                Cancel
              </button>
              <button className="primary" disabled={working}>
                {working && <LoaderCircle className="spin" size={16} />} Create invite
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
