'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, Check, Flag, LoaderCircle, ShieldCheck, X } from 'lucide-react';
import { supabase } from '../../lib/supabase/client';

function TeamMark({ team }) {
  return <div className="admin-mark">{team.name.slice(0, 2).toUpperCase()}</div>;
}

export default function AdminPage() {
  const [state, setState] = useState('loading');
  const [teams, setTeams] = useState([]);
  const [reports, setReports] = useState([]);
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
    const [{ data, error: teamError }, { data: reportRows, error: reportError }] =
      await Promise.all([
        supabase
          .from('teams')
          .select(
            'id,name,rank,region,school_email,supporting_url,created_at,schools(name),profiles!teams_captain_id_fkey(username)'
          )
          .eq('verification_status', 'pending')
          .order('created_at', { ascending: true }),
        supabase
          .from('reports')
          .select(
            'id,reason,status,created_at,reported_team:teams!reports_reported_team_id_fkey(name,schools(name)),reporter:profiles!reports_reporter_id_fkey(username)'
          )
          .in('status', ['open', 'reviewing'])
          .order('created_at', { ascending: true }),
      ]);
    if (teamError || reportError) {
      setError((teamError || reportError).message);
      setState('error');
      return;
    }
    setTeams(data || []);
    setReports(reportRows || []);
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
  async function updateReport(id, status) {
    setWorking(id);
    setError('');
    const { error: updateError } = await supabase.from('reports').update({ status }).eq('id', id);
    if (updateError) setError(updateError.message);
    else setReports((current) => current.filter((report) => report.id !== id));
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
        <div className="admin-section-heading">
          <p className="eyebrow">MATCH MODERATION</p>
          <h1>
            Open reports <small>{reports.length}</small>
          </h1>
          <p className="admin-subtitle">Review reports submitted privately by teams in a match.</p>
        </div>
        {reports.length === 0 ? (
          <div className="admin-empty compact">
            <Check size={25} />
            <h2>No open reports.</h2>
          </div>
        ) : (
          <div className="report-queue">
            {reports.map((report) => (
              <article key={report.id}>
                <Flag size={18} />
                <div>
                  <strong>{report.reported_team?.name || 'Team'} was reported</strong>
                  <small>
                    Submitted by @{report.reporter?.username || 'team member'} ·{' '}
                    {new Date(report.created_at).toLocaleString()}
                  </small>
                  <p>{report.reason}</p>
                </div>
                <button
                  className="reject"
                  disabled={working === report.id}
                  onClick={() => updateReport(report.id, 'dismissed')}
                >
                  Dismiss
                </button>
                <button
                  className="approve"
                  disabled={working === report.id}
                  onClick={() => updateReport(report.id, 'resolved')}
                >
                  {working === report.id ? (
                    <LoaderCircle className="spin" size={15} />
                  ) : (
                    <Check size={15} />
                  )}
                  Resolve
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
