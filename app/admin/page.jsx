'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, Check, LoaderCircle, ShieldCheck, X } from 'lucide-react';
import { supabase } from '../../lib/supabase/client';

function TeamMark({ team }) {
  return <div className="admin-mark">{team.name.slice(0, 2).toUpperCase()}</div>;
}

export default function AdminPage() {
  const [state, setState] = useState('loading');
  const [teams, setTeams] = useState([]);
  const [error, setError] = useState('');
  const [working, setWorking] = useState('');
  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      window.location.assign('/auth');
      return;
    }
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();
    if (profileError) {
      setError(profileError.message);
      setState('error');
      return;
    }
    if (!profile.is_admin) {
      setState('denied');
      return;
    }
    const { data, error: teamError } = await supabase
      .from('teams')
      .select(
        'id,name,rank,region,school_email,supporting_url,created_at,schools(name),profiles!teams_captain_id_fkey(username)'
      )
      .eq('verification_status', 'pending')
      .order('created_at', { ascending: true });
    if (teamError) {
      setError(teamError.message);
      setState('error');
      return;
    }
    setTeams(data || []);
    setState('ready');
  }
  useEffect(() => {
    load();
  }, []);
  async function decide(id, verification_status) {
    setWorking(id);
    setError('');
    const { error: updateError } = await supabase
      .from('teams')
      .update({ verification_status })
      .eq('id', id);
    if (updateError) setError(updateError.message);
    else setTeams((current) => current.filter((team) => team.id !== id));
    setWorking('');
  }
  if (state === 'loading')
    return (
      <main className="admin-page centered">
        <LoaderCircle className="spin" size={24} />
      </main>
    );
  if (state === 'denied')
    return (
      <main className="admin-page centered">
        <section className="admin-empty">
          <ShieldCheck size={34} />
          <h1>Admin access required</h1>
          <p>Your account is not an administrator yet.</p>
          <Link href="/" className="primary">
            Back to Scrimnet
          </Link>
        </section>
      </main>
    );
  if (state === 'error')
    return (
      <main className="admin-page centered">
        <section className="admin-empty">
          <h1>Couldn’t load the queue</h1>
          <p>{error}</p>
          <button className="primary" onClick={load}>
            Try again
          </button>
        </section>
      </main>
    );
  return (
    <main className="admin-page">
      <header className="admin-header">
        <Link href="/" className="back">
          <ArrowLeft size={15} /> Back to Scrimnet
        </Link>
        <span>
          <ShieldCheck size={17} /> Admin
        </span>
      </header>
      <section className="admin-content">
        <p className="eyebrow">TEAM VERIFICATION</p>
        <h1>
          Pending teams <small>{teams.length}</small>
        </h1>
        <p className="admin-subtitle">
          Approve legitimate collegiate Rocket League rosters before they can use the marketplace.
        </p>
        {error && <div className="auth-error">{error}</div>}
        {teams.length === 0 ? (
          <div className="admin-empty">
            <Check size={35} />
            <h2>You’re all caught up.</h2>
            <p>New verification requests will appear here.</p>
          </div>
        ) : (
          <div className="queue">
            {teams.map((team) => (
              <article className="queue-card" key={team.id}>
                <TeamMark team={team} />
                <div className="queue-details">
                  <h2>{team.name} Rocket League</h2>
                  <p>
                    {team.schools?.name} · submitted by @{team.profiles?.username || 'captain'}
                  </p>
                  <div>
                    <span>{team.rank}</span>
                    <span>{team.region}</span>
                    <span>{team.school_email}</span>
                  </div>
                  {team.supporting_url && (
                    <a href={team.supporting_url} target="_blank">
                      Open supporting link ↗
                    </a>
                  )}
                </div>
                <div className="queue-actions">
                  <button
                    className="reject"
                    disabled={working === team.id}
                    onClick={() => decide(team.id, 'rejected')}
                  >
                    <X size={16} /> Reject
                  </button>
                  <button
                    className="approve"
                    disabled={working === team.id}
                    onClick={() => decide(team.id, 'approved')}
                  >
                    {working === team.id ? (
                      <LoaderCircle className="spin" size={16} />
                    ) : (
                      <Check size={16} />
                    )}{' '}
                    Approve
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
