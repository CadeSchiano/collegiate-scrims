'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CheckCircle2, LoaderCircle, Plus } from 'lucide-react';
import { supabase } from '../../../lib/supabase/client';
import BackButton from '../../../components/BackButton';
import { localDateInputValue } from '../../../lib/scrimScheduling.mjs';

const ranks = [
  'Champion',
  'Grand Champion 1',
  'Grand Champion 2',
  'Grand Champion 3',
  'SSL',
  'CRL-Level',
  'Custom',
];
const regions = ['NA East', 'NA Central', 'NA West', 'EU', 'Other / Custom'];
const formats = [
  ['BO5', 45],
  ['BO7', 60],
  ['30 minutes', 30],
  ['60 minutes', 60],
  ['Custom', 60],
];

export default function NewScrimPage() {
  const [team, setTeam] = useState(null);
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    min_rank: 'Grand Champion 2',
    max_rank: 'SSL',
    region: 'NA East',
    date: '',
    time: '20:00',
    format: 'BO7',
    duration_minutes: 60,
    notes: '',
  });
  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        location.assign('/auth');
        return;
      }
      const { data, error: queryError } = await supabase
        .from('team_members')
        .select('team_id,role,teams(id,name,verification_status,suspended_at)')
        .eq('user_id', user.id)
        .in('role', ['captain', 'manager']);
      if (queryError) {
        setError(queryError.message);
        setState('error');
        return;
      }
      const usable = data?.find(
        (item) => item.teams?.verification_status === 'approved' && !item.teams?.suspended_at
      );
      if (!usable) {
        setState('blocked');
        return;
      }
      setTeam(usable.teams);
      setState('ready');
    }
    load();
  }, []);
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const scheduledDate = new Date(`${form.date}T${form.time}:00`);
    if (Number.isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
      setSaving(false);
      setError('Choose a start time that is still in the future. Same-day scrims are welcome.');
      return;
    }
    const scheduled_at = scheduledDate.toISOString();
    const { error: insertError } = await supabase.from('scrims').insert({
      posting_team_id: team.id,
      min_rank: form.min_rank,
      max_rank: form.max_rank,
      region: form.region,
      scheduled_at,
      time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      duration_minutes: Number(form.duration_minutes),
      format: form.format,
      notes: form.notes || null,
    });
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setSaved(true);
  }
  if (state === 'loading')
    return (
      <main className="scrim-form-page centered">
        <BackButton fallback="/marketplace" />
        <LoaderCircle className="spin" size={24} />
      </main>
    );
  if (state === 'blocked')
    return (
      <main className="scrim-form-page centered">
        <section className="market-empty">
          <BackButton fallback="/marketplace" />
          <h1>Verified captain or manager required.</h1>
          <p>Your team needs approval before posting a marketplace listing.</p>
          <Link href="/team" className="primary">
            View my team
          </Link>
        </section>
      </main>
    );
  if (state === 'error')
    return (
      <main className="scrim-form-page centered">
        <section className="market-empty">
          <BackButton fallback="/marketplace" />
          <h1>Couldn’t prepare your form</h1>
          <p>{error}</p>
        </section>
      </main>
    );
  if (saved)
    return (
      <main className="scrim-form-page centered">
        <section className="market-empty">
          <BackButton fallback="/marketplace" />
          <CheckCircle2 size={36} />
          <h1>Your scrim is live.</h1>
          <p>Verified collegiate teams can now find it in the marketplace.</p>
          <Link href="/marketplace" className="primary">
            View marketplace
          </Link>
        </section>
      </main>
    );
  return (
    <main className="scrim-form-page">
      <section className="scrim-form">
        <BackButton fallback="/marketplace" />
        <p className="eyebrow">NEW SCRIM</p>
        <h1>Post a scrim</h1>
        <p>
          Posting as <strong>{team.name} Rocket League</strong>
        </p>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={submit}>
          <div className="two-fields">
            <label>
              Minimum rank
              <select value={form.min_rank} onChange={(e) => update('min_rank', e.target.value)}>
                {ranks.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label>
              Maximum rank
              <select value={form.max_rank} onChange={(e) => update('max_rank', e.target.value)}>
                {ranks.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="two-fields">
            <label>
              Date
              <input
                required
                type="date"
                min={localDateInputValue()}
                value={form.date}
                onChange={(e) => update('date', e.target.value)}
              />
            </label>
            <label>
              Start time
              <input
                required
                type="time"
                value={form.time}
                onChange={(e) => update('time', e.target.value)}
              />
            </label>
          </div>
          <div className="two-fields">
            <label>
              Region
              <select value={form.region} onChange={(e) => update('region', e.target.value)}>
                {regions.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label>
              Format
              <select
                value={form.format}
                onChange={(e) => {
                  const item = formats.find((x) => x[0] === e.target.value);
                  setForm((current) => ({
                    ...current,
                    format: e.target.value,
                    duration_minutes: item[1],
                  }));
                }}
              >
                {formats.map(([value]) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Duration in minutes
            <input
              required
              type="number"
              min="15"
              max="360"
              value={form.duration_minutes}
              onChange={(e) => update('duration_minutes', e.target.value)}
            />
          </label>
          <label>
            Notes <span>Optional</span>
            <textarea
              value={form.notes}
              maxLength="500"
              onChange={(e) => update('notes', e.target.value)}
              placeholder="CRL-level preferred. US-East servers."
            />
          </label>
          <button className="primary form-submit" disabled={saving}>
            {saving ? <LoaderCircle className="spin" size={17} /> : <Plus size={17} />} Post scrim
          </button>
        </form>
      </section>
    </main>
  );
}
