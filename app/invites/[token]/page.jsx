'use client';
import Link from 'next/link';
import { useState } from 'react';
import { CheckCircle2, LoaderCircle, UsersRound } from 'lucide-react';
import { supabase } from '../../../lib/supabase/client';
import BackButton from '../../../components/BackButton';
export default function InvitePage({ params }) {
  const [state, setState] = useState('ready'),
    [error, setError] = useState('');
  async function accept() {
    setState('loading');
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      location.assign('/auth');
      return;
    }
    const { error: e } = await supabase.rpc('accept_team_invite', { invite_token: params.token });
    if (e) {
      setError(e.message);
      setState('ready');
      return;
    }
    setState('done');
  }
  return (
    <main className="invite-page">
      <BackButton className="invite-back" />
      <section className="invite-card">
        {state === 'done' ? (
          <>
            <CheckCircle2 size={38} />
            <p className="eyebrow">YOU’RE ON THE ROSTER</p>
            <h1>Invite accepted.</h1>
            <Link className="primary" href="/team">
              Open my team
            </Link>
          </>
        ) : (
          <>
            <UsersRound size={35} />
            <p className="eyebrow">TEAM INVITATION</p>
            <h1>Join this team?</h1>
            <p>Sign in with the email address that received this invitation.</p>
            {error && <div className="auth-error">{error}</div>}
            <button className="primary" onClick={accept} disabled={state === 'loading'}>
              {state === 'loading' && <LoaderCircle className="spin" size={16} />} Accept invitation
            </button>
          </>
        )}
      </section>
    </main>
  );
}
