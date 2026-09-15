'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, CheckCircle2, LoaderCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase/client';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    const response =
      mode === 'signup'
        ? await supabase.auth.signUp({ email, password, options: { data: { username } } })
        : await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (response.error) return setError(response.error.message);
    if (mode === 'signup')
      return setMessage('Check your email to confirm your account, then come back to sign in.');
    window.location.assign('/');
  }
  return (
    <main className="auth-page">
      <Link href="/" className="auth-brand">
        <span className="brand-mark">
          <span />
        </span>
        <span>
          scrim<span>net</span>
        </span>
      </Link>
      <section className="auth-card">
        <p className="eyebrow">COLLEGIATE ROCKET LEAGUE</p>
        <h1>{mode === 'signup' ? 'Join the network.' : 'Welcome back.'}</h1>
        <p className="auth-subtitle">
          {mode === 'signup'
            ? 'Create your account to get your team verified and find scrims.'
            : 'Sign in to manage your team and upcoming scrims.'}
        </p>
        {message && (
          <div className="auth-success">
            <CheckCircle2 size={17} />
            {message}
          </div>
        )}
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={submit}>
          {mode === 'signup' && (
            <label>
              Username
              <input
                required
                minLength="3"
                maxLength="30"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="caseymiller"
              />
            </label>
          )}
          <label>
            Email
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@school.edu"
            />
          </label>
          <label>
            Password
            <input
              required
              type="password"
              minLength="6"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
            />
          </label>
          <button className="primary auth-submit" disabled={loading}>
            {loading && <LoaderCircle className="spin" size={17} />}{' '}
            {mode === 'signup' ? 'Create account' : 'Sign in'}{' '}
            {!loading && <ArrowRight size={17} />}
          </button>
        </form>
        <div className="auth-switch">
          {mode === 'signup' ? 'Already have an account?' : 'New to Scrimnet?'}{' '}
          <button
            onClick={() => {
              setMode(mode === 'signup' ? 'login' : 'signup');
              setError('');
              setMessage('');
            }}
          >
            {mode === 'signup' ? 'Sign in' : 'Create an account'}
          </button>
        </div>
      </section>
      <p className="auth-footer">Strictly for collegiate Rocket League teams.</p>
    </main>
  );
}
