'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, LoaderCircle, ShieldCheck } from 'lucide-react';
import { supabase } from '../../../lib/supabase/client';
export default function ScrimWorkspace({ params }) {
  const [state, setState] = useState('loading'),
    [scrim, setScrim] = useState(),
    [error, setError] = useState('');
  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        location.assign('/auth');
        return;
      }
      const { data, error: e } = await supabase
        .from('scrims')
        .select(
          'id,scheduled_at,time_zone,region,format,duration_minutes,notes,status,posting:teams!scrims_posting_team_id_fkey(name,schools(name)),opponent:teams!scrims_opponent_team_id_fkey(name,schools(name))'
        )
        .eq('id', params.id)
        .single();
      if (e) {
        setError(e.message);
        setState('error');
        return;
      }
      if (data.status !== 'confirmed') {
        setError('This scrim is not an active confirmed match.');
        setState('error');
        return;
      }
      setScrim(data);
      setState('ready');
    }
    load();
  }, [params.id]);
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
        <div className="matchup">
          <div>
            <div className="match-mark">{scrim.posting?.name?.slice(0, 2).toUpperCase()}</div>
            <h1>{scrim.posting?.name}</h1>
            <p>{scrim.posting?.schools?.name}</p>
          </div>
          <section>
            <strong>VS</strong>
            <span>{new Date(scrim.scheduled_at).toLocaleString()}</span>
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
        <div className="workspace-details">
          <CalendarDays size={20} />
          <div>
            <strong>{scrim.duration_minutes} minute scrim</strong>
            <p>{scrim.notes || 'No additional notes.'}</p>
          </div>
        </div>
        <div className="workspace-next">
          <h2>Match workspace ready</h2>
          <p>
            Team check-in and private coordination chat are the next steps in the MVP lifecycle.
          </p>
        </div>
      </section>
    </main>
  );
}
