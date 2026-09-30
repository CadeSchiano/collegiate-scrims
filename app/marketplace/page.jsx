'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  Clock3,
  Filter,
  LoaderCircle,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { supabase } from '../../lib/supabase/client';
import BackButton from '../../components/BackButton';
import NotificationsBell from '../../components/NotificationsBell';

const regions = ['All regions', 'NA East', 'NA Central', 'NA West', 'EU', 'Other / Custom'];
const formats = ['Any format', 'BO5', 'BO7', '30 minutes', '60 minutes', 'Custom'];

function formatDate(iso, timeZone) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  }).format(new Date(iso));
}

export default function MarketplacePage() {
  const [state, setState] = useState('loading');
  const [scrims, setScrims] = useState([]);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    region: 'All regions',
    format: 'Any format',
    date: '',
  });
  const [verified, setVerified] = useState(false);
  const [requestingTeam, setRequestingTeam] = useState(null);
  const [requestingId, setRequestingId] = useState('');
  const [requestedIds, setRequestedIds] = useState([]);
  const [notice, setNotice] = useState('');
  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setState('signed-out');
      return;
    }
    const { data: memberships, error: membershipError } = await supabase
      .from('team_members')
      .select('team_id,role,teams(id,verification_status,suspended_at)')
      .eq('user_id', user.id);
    if (membershipError) {
      setError(membershipError.message);
      setState('error');
      return;
    }
    const canUseMarketplace = memberships?.some(
      (item) => item.teams?.verification_status === 'approved' && !item.teams?.suspended_at
    );
    setVerified(canUseMarketplace);
    setRequestingTeam(
      memberships?.find(
        (item) =>
          ['captain', 'manager'].includes(item.role) &&
          item.teams?.verification_status === 'approved' &&
          !item.teams?.suspended_at
      )?.teams ?? null
    );
    if (!canUseMarketplace) {
      setState('unverified');
      return;
    }
    const { data, error: scrimError } = await supabase
      .from('scrims')
      .select(
        'id,min_rank,max_rank,region,scheduled_at,time_zone,duration_minutes,format,notes,replacement_needed,teams!scrims_posting_team_id_fkey(id,name,schools(name))'
      )
      .eq('status', 'posted')
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at');
    if (scrimError) {
      setError(scrimError.message);
      setState('error');
      return;
    }
    setScrims(data || []);
    setState('ready');
  }
  useEffect(() => {
    load();
  }, []);
  async function requestScrim(scrimId) {
    if (!requestingTeam) return;
    setRequestingId(scrimId);
    const { error: requestError } = await supabase.rpc('request_scrim', {
      target_scrim: scrimId,
      requesting_team: requestingTeam.id,
    });
    setRequestingId('');
    if (requestError) {
      setError(requestError.message);
      return;
    }
    setRequestedIds((current) => [...current, scrimId]);
    setNotice('Scrim request sent. The posting team can now accept or decline it.');
  }
  const visible = useMemo(
    () =>
      scrims.filter((scrim) => {
        const haystack =
          `${scrim.teams?.name} ${scrim.teams?.schools?.name} ${scrim.min_rank} ${scrim.max_rank}`.toLowerCase();
        return (
          haystack.includes(filters.search.toLowerCase()) &&
          (filters.region === 'All regions' || scrim.region === filters.region) &&
          (filters.format === 'Any format' || scrim.format === filters.format) &&
          (!filters.date || scrim.scheduled_at.slice(0, 10) === filters.date)
        );
      }),
    [scrims, filters]
  );
  if (state === 'loading')
    return (
      <main className="market-page centered">
        <LoaderCircle className="spin" size={24} />
      </main>
    );
  if (state === 'signed-out')
    return (
      <main className="market-page centered">
        <section className="market-empty">
          <BackButton />
          <ShieldCheck size={36} />
          <h1>Sign in to find scrims.</h1>
          <p>Scrimnet is for verified collegiate Rocket League teams.</p>
          <Link href="/auth" className="primary">
            Sign in or create account
          </Link>
        </section>
      </main>
    );
  if (state === 'unverified')
    return (
      <main className="market-page centered">
        <section className="market-empty">
          <BackButton />
          <ShieldCheck size={36} />
          <h1>Team verification required.</h1>
          <p>Once your collegiate team is approved, you can browse, post, and request scrims.</p>
          <Link href="/team" className="primary">
            View my team
          </Link>
        </section>
      </main>
    );
  if (state === 'error')
    return (
      <main className="market-page centered">
        <section className="market-empty">
          <BackButton />
          <h1>Couldn’t load scrims</h1>
          <p>{error}</p>
          <button className="primary" onClick={load}>
            Try again
          </button>
        </section>
      </main>
    );
  return (
    <main className="market-page">
      <header className="market-header">
        <div className="market-header-start">
          <BackButton showHome={false} />
          <Link href="/" className="brand">
            <span className="brand-mark">
              <span />
            </span>
            <span>
              scrim<span>net</span>
            </span>
          </Link>
        </div>
        <div>
          <NotificationsBell />
          <Link href="/team" className="market-link">
            My team
          </Link>
          <Link href="/scrims/manage" className="market-link">
            My scrims
          </Link>
          <Link href="/scrims/new" className="primary">
            <Plus size={17} /> Post a scrim
          </Link>
        </div>
      </header>
      <section className="market-content">
        {notice && (
          <div className="team-notice">
            <ShieldCheck size={16} />
            {notice}
          </div>
        )}
        <div className="market-title">
          <div>
            <p className="eyebrow">COLLEGIATE ROCKET LEAGUE</p>
            <h1>
              Available scrims <small>{visible.length}</small>
            </h1>
            <p>Practice against verified collegiate teams.</p>
          </div>
          <span>
            <ShieldCheck size={16} /> Verified teams only
          </span>
        </div>
        <div className="live-filters">
          <label>
            <Search size={17} />
            <input
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search teams or schools"
            />
          </label>
          <label>
            <CalendarDays size={16} />
            <input
              type="date"
              value={filters.date}
              onChange={(e) => setFilters({ ...filters, date: e.target.value })}
            />
          </label>
          <select
            value={filters.region}
            onChange={(e) => setFilters({ ...filters, region: e.target.value })}
          >
            {regions.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
          <select
            value={filters.format}
            onChange={(e) => setFilters({ ...filters, format: e.target.value })}
          >
            {formats.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </div>
        {visible.length === 0 ? (
          <section className="market-empty wide">
            <Filter size={31} />
            <h2>No matching scrims right now.</h2>
            <p>Try clearing a filter, or post the practice session you’re looking for.</p>
            <Link href="/scrims/new" className="primary">
              Post a scrim
            </Link>
          </section>
        ) : (
          <div className="live-scrim-list">
            {visible.map((scrim) => (
              <article
                className={`live-scrim-card ${scrim.replacement_needed ? 'replacement' : ''}`}
                key={scrim.id}
              >
                {scrim.replacement_needed && (
                  <div className="live-replacement">🔥 Replacement opponent needed</div>
                )}
                <div className="live-scrim-team">
                  <div>{scrim.teams?.name?.slice(0, 2).toUpperCase()}</div>
                  <section>
                    <h2>
                      {scrim.teams?.name} Rocket League{' '}
                      <span>
                        <ShieldCheck size={13} /> Verified
                      </span>
                    </h2>
                    <p>{scrim.teams?.schools?.name}</p>
                  </section>
                </div>
                <div className="live-scrim-details">
                  <span>
                    <strong>Rank</strong>
                    {scrim.min_rank} – {scrim.max_rank}
                  </span>
                  <span>
                    <strong>Region</strong>
                    {scrim.region}
                  </span>
                  <span>
                    <strong>Format</strong>
                    {scrim.format}
                  </span>
                  <span>
                    <strong>Duration</strong>
                    {scrim.duration_minutes} min
                  </span>
                </div>
                <div className="live-scrim-bottom">
                  <div>
                    <CalendarDays size={17} />
                    <strong>{formatDate(scrim.scheduled_at, scrim.time_zone)}</strong>
                    <small>{scrim.time_zone.replace('_', ' ')}</small>
                  </div>
                  <p>{scrim.notes || 'No additional notes.'}</p>
                  <button
                    className="request-next live-request"
                    disabled={
                      !requestingTeam ||
                      scrim.teams?.id === requestingTeam.id ||
                      requestingId === scrim.id ||
                      requestedIds.includes(scrim.id)
                    }
                    onClick={() => requestScrim(scrim.id)}
                  >
                    {requestedIds.includes(scrim.id)
                      ? 'Request sent'
                      : requestingId === scrim.id
                        ? 'Sending…'
                        : 'Request scrim'}{' '}
                    <span>→</span>
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
