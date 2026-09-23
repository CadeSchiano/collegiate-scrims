'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, ShieldCheck, UsersRound } from 'lucide-react';
import { supabase } from '../lib/supabase/client';
import BackButton from '../components/BackButton';

export default function Home() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function loadSession() {
      const {
        data: { user: activeUser },
      } = await supabase.auth.getUser();
      setUser(activeUser);
      if (!activeUser) return;
      const { data } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', activeUser.id)
        .maybeSingle();
      setIsAdmin(data?.is_admin === true);
    }

    loadSession();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) setIsAdmin(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <main className="home-landing">
      <header className="home-header">
        <div className="home-header-start">
          <BackButton fallback="/" />
          <Link href="/" className="brand">
            <span className="brand-mark">
              <span />
            </span>
            <span>
              scrim<span>net</span>
            </span>
          </Link>
        </div>
        <nav>
          <Link href="/marketplace">Marketplace</Link>
          {user && <Link href="/scrims/manage">My scrims</Link>}
          {user && <Link href="/team">My team</Link>}
          {isAdmin && (
            <Link href="/admin" className="admin-nav">
              Admin
            </Link>
          )}
        </nav>
        {user ? (
          <button className="sign-out" onClick={() => supabase.auth.signOut()}>
            Sign out
          </button>
        ) : (
          <Link href="/auth" className="primary home-sign-in">
            Sign in
          </Link>
        )}
      </header>

      <section className="home-hero">
        <p className="eyebrow">COLLEGIATE ROCKET LEAGUE</p>
        <h1>
          Practice more.
          <br />
          <em>Coordinate less.</em>
        </h1>
        <p>
          Scrimnet connects verified collegiate Rocket League teams for reliable practice
          scrims—without the Discord hunt.
        </p>
        <div>
          <Link href="/marketplace" className="primary">
            Browse scrims <ArrowRight size={17} />
          </Link>
          <Link href={user ? '/teams/new' : '/auth'} className="secondary home-secondary">
            {user ? 'Create a team' : 'Create an account'}
          </Link>
        </div>
      </section>

      <section className="home-steps">
        <article>
          <ShieldCheck size={21} />
          <h2>Verified teams</h2>
          <p>Every team is manually reviewed before it can post or request a scrim.</p>
        </article>
        <article>
          <UsersRound size={21} />
          <h2>Simple coordination</h2>
          <p>Post availability, confirm an opponent, then coordinate in one private workspace.</p>
        </article>
        <article>
          <CheckCircle2 size={21} />
          <h2>Practice reliability</h2>
          <p>
            Check-ins, completed sessions, and accountability—never rankings or performance stats.
          </p>
        </article>
      </section>
    </main>
  );
}
