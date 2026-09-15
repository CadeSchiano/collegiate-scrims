'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase/client';
import {
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Flame,
  GraduationCap,
  LayoutGrid,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UsersRound,
  X,
} from 'lucide-react';

const scrims = [
  {
    id: 1,
    team: 'BGSU',
    school: 'Bowling Green State University',
    initials: 'BG',
    color: '#f37021',
    rank: 'GC2 – SSL',
    time: 'Tonight · 8:00 PM ET',
    date: 'Sep 20',
    region: 'NA East',
    format: 'BO7',
    note: 'CRL-level preferred. US-East servers.',
    replacement: true,
  },
  {
    id: 2,
    team: 'Ohio State',
    school: 'The Ohio State University',
    initials: 'OS',
    color: '#bb0f32',
    rank: 'GC1 – GC3',
    time: 'Tomorrow · 7:30 PM ET',
    date: 'Sep 21',
    region: 'NA East',
    format: 'BO5',
    note: 'Looking for a steady, competitive series.',
  },
  {
    id: 3,
    team: 'Kent State',
    school: 'Kent State University',
    initials: 'KS',
    color: '#e8a700',
    rank: 'C3 – GC2',
    time: 'Sun · 6:00 PM ET',
    date: 'Sep 22',
    region: 'NA East',
    format: '60 min',
    note: 'Open to trying a few different lineups.',
  },
  {
    id: 4,
    team: 'Michigan Tech',
    school: 'Michigan Technological University',
    initials: 'MT',
    color: '#ffc107',
    rank: 'GC2 – SSL',
    time: 'Mon · 9:00 PM ET',
    date: 'Sep 23',
    region: 'NA Central',
    format: 'BO7',
    note: 'Please be ready for a prompt start.',
  },
];

function Avatar({ initials, color, size = 'normal' }) {
  return (
    <div className={`avatar ${size}`} style={{ background: color }}>
      {initials}
    </div>
  );
}
function Badge({ children }) {
  return (
    <span className="verified">
      <ShieldCheck size={13} />
      {children}
    </span>
  );
}

export default function Home() {
  const [tab, setTab] = useState('marketplace');
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('All regions');
  const [request, setRequest] = useState(null);
  const [showPost, setShowPost] = useState(false);
  const [toast, setToast] = useState('');
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    async function loadSession() {
      const {
        data: { user: activeUser },
      } = await supabase.auth.getUser();
      setUser(activeUser);
      if (activeUser) {
        const { data } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', activeUser.id)
          .single();
        setIsAdmin(data?.is_admin === true);
      }
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
  const filtered = useMemo(
    () =>
      scrims.filter(
        (s) =>
          (region === 'All regions' || s.region === region) &&
          `${s.team} ${s.school} ${s.rank}`.toLowerCase().includes(query.toLowerCase())
      ),
    [query, region]
  );
  const notify = (text) => {
    setToast(text);
    setTimeout(() => setToast(''), 3400);
  };
  return (
    <main>
      <header>
        <a className="brand" onClick={() => setTab('marketplace')}>
          <span className="brand-mark">
            <span />
          </span>
          <span>
            scrim<span>net</span>
          </span>
        </a>
        <nav>
          <button
            className={tab === 'marketplace' ? 'active' : ''}
            onClick={() => setTab('marketplace')}
          >
            Marketplace
          </button>
          <button
            className={tab === 'my-scrims' ? 'active' : ''}
            onClick={() => setTab('my-scrims')}
          >
            My Scrims <i>1</i>
          </button>
          <Link href="/team" className="team-nav">
            My Team
          </Link>
          {isAdmin && (
            <Link href="/admin" className="admin-nav">
              Admin
            </Link>
          )}
        </nav>
        <div className="header-actions">
          <button className="icon-button">
            <Bell size={19} />
            <b />
          </button>
          {user ? (
            <div className="profile">
              <Avatar
                initials={(user.user_metadata.username || user.email).slice(0, 2).toUpperCase()}
                color="#263c77"
                size="small"
              />
              <span>{user.user_metadata.username || user.email}</span>
              <button className="sign-out" onClick={() => supabase.auth.signOut()}>
                Sign out
              </button>
            </div>
          ) : (
            <Link href="/auth" className="sign-in">
              Sign in
            </Link>
          )}
          <button className="mobile-menu">
            <Menu size={22} />
          </button>
        </div>
      </header>
      {tab === 'marketplace' && (
        <Marketplace
          {...{ query, setQuery, region, setRegion, filtered, setRequest, setShowPost }}
        />
      )}
      {tab === 'my-scrims' && <MyScrims notify={notify} />}
      {tab === 'team' && <Team notify={notify} />}
      {request && (
        <RequestModal
          scrim={request}
          close={() => setRequest(null)}
          submit={() => {
            setRequest(null);
            notify(`Request sent to ${request.team} Rocket League.`);
          }}
        />
      )}
      {showPost && (
        <PostModal
          close={() => setShowPost(false)}
          submit={() => {
            setShowPost(false);
            notify('Your scrim has been posted to the marketplace.');
          }}
        />
      )}
      {toast && (
        <div className="toast">
          <CheckCircle2 size={18} />
          {toast}
        </div>
      )}
    </main>
  );
}

function Marketplace({ query, setQuery, region, setRegion, filtered, setRequest, setShowPost }) {
  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">COLLEGIATE ROCKET LEAGUE</p>
          <h1>
            Find your next
            <br />
            <em>great scrim.</em>
          </h1>
          <p className="hero-copy">
            Practice against verified college teams — without hunting through Discord.
          </p>
        </div>
        <button className="primary post" onClick={() => setShowPost(true)}>
          <Plus size={19} /> Post a scrim
        </button>
      </section>
      <section className="content">
        <div className="market-head">
          <div>
            <h2>
              Available scrims <span>{filtered.length}</span>
            </h2>
            <p>Verified collegiate teams looking to play.</p>
          </div>
          <button className="filter-mobile">
            <SlidersHorizontal size={18} /> Filters
          </button>
        </div>
        <div className="filter-row">
          <label className="search">
            <Search size={18} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search teams or schools"
            />
          </label>
          <Filter label="Date" value="Any date" />
          <select value={region} onChange={(e) => setRegion(e.target.value)}>
            <option>All regions</option>
            <option>NA East</option>
            <option>NA Central</option>
            <option>NA West</option>
            <option>EU</option>
          </select>
          <Filter label="Rank" value="Any rank" />
          <Filter label="Format" value="Any format" />
          <button
            className="clear"
            onClick={() => {
              setQuery('');
              setRegion('All regions');
            }}
          >
            Clear filters
          </button>
        </div>
        <div className="layout">
          <div className="cards">
            {filtered.map((s) => (
              <ScrimCard key={s.id} s={s} onRequest={() => setRequest(s)} />
            ))}
          </div>
          <aside>
            <div className="side-card">
              <div className="side-icon">
                <GraduationCap size={21} />
              </div>
              <h3>Only real college teams.</h3>
              <p>
                Every team on Scrimnet is manually verified before they can post or request scrims.
              </p>
              <a>
                How verification works <span>→</span>
              </a>
            </div>
            <div className="side-stat">
              <div>
                <strong>87%</strong>
                <span>show-up rate</span>
              </div>
              <p>
                Across verified teams
                <br />
                this month
              </p>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
function Filter({ label, value }) {
  return (
    <button className="filter">
      <span>{label}</span>
      {value}
      <ChevronDown size={15} />
    </button>
  );
}
function ScrimCard({ s, onRequest }) {
  return (
    <article className={`scrim-card ${s.replacement ? 'replacement' : ''}`}>
      {s.replacement && (
        <div className="replacement-label">
          <Flame size={15} /> REPLACEMENT OPPONENT NEEDED <span>Opponent canceled</span>
        </div>
      )}
      <div className="card-main">
        <div className="team-row">
          <Avatar initials={s.initials} color={s.color} />
          <div>
            <h3>
              {s.team} <Badge>Verified</Badge>
            </h3>
            <p>{s.school}</p>
          </div>
          <button className="more">
            <MoreHorizontal size={20} />
          </button>
        </div>
        <div className="scrim-info">
          <div>
            <span>RANK</span>
            <strong>{s.rank}</strong>
          </div>
          <div>
            <span>REGION</span>
            <strong>{s.region}</strong>
          </div>
          <div>
            <span>FORMAT</span>
            <strong>{s.format}</strong>
          </div>
        </div>
        <p className="note">“{s.note}”</p>
      </div>
      <div className="card-footer">
        <div className="when">
          <CalendarDays size={17} />
          <div>
            <strong>{s.time}</strong>
            <span>{s.date}</span>
          </div>
        </div>
        <button className="request" onClick={onRequest}>
          Request scrim <span>→</span>
        </button>
      </div>
    </article>
  );
}
function MyScrims({ notify }) {
  const [checked, setChecked] = useState(false);
  const [chat, setChat] = useState(['US East work for you?', 'Yep! We’ll be ready around 7:55.']);
  const [message, setMessage] = useState('');
  return (
    <section className="content page">
      <p className="eyebrow">YOUR SCHEDULE</p>
      <h1>Upcoming scrims</h1>
      <article className="workspace">
        <div className="workspace-top">
          <div>
            <span className="live-dot" /> CONFIRMED · SATURDAY, SEP 20
          </div>
          <button className="text-button" onClick={() => notify('Reschedule request opened.')}>
            Request reschedule
          </button>
        </div>
        <div className="match">
          <div className="match-team">
            <Avatar initials="BG" color="#f37021" />
            <strong>BGSU</strong>
            <small>Bowling Green State</small>
          </div>
          <div className="match-mid">
            <strong>8:00 PM</strong>
            <span>ET · BO7 · NA East</span>
            <b>VS</b>
          </div>
          <div className="match-team">
            <Avatar initials="OS" color="#bb0f32" />
            <strong>Ohio State</strong>
            <small>The Ohio State University</small>
          </div>
        </div>
        <div className="checkins">
          <div>
            <span className={checked ? 'status ready' : 'status'} />
            <strong>BGSU Rocket League</strong>
            <small>{checked ? 'Checked in at 7:42 PM' : 'Waiting for check-in'}</small>
          </div>
          <div>
            <span className="status" />
            <strong>Ohio State Rocket League</strong>
            <small>Waiting for check-in</small>
          </div>
          <button
            className={checked ? 'checked primary' : 'primary'}
            onClick={() => {
              setChecked(!checked);
              notify(checked ? 'Team check-in cleared.' : 'Your team is checked in.');
            }}
          >
            {checked ? (
              <>
                <Check size={17} /> Team checked in
              </>
            ) : (
              'Check my team in'
            )}
          </button>
        </div>
      </article>
      <div className="chat-panel">
        <div className="chat-header">
          <div>
            <MessageCircle size={19} />
            <strong>Match chat</strong>
          </div>
          <span>Private to both teams</span>
        </div>
        <div className="messages">
          <p>
            <b>Casey M.</b>
            <span>7:36 PM</span>
            <br />
            {chat[0]}
          </p>
          <p className="other">
            <b>Jordan R.</b>
            <span>7:38 PM</span>
            <br />
            {chat[1]}
          </p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (message) {
              setChat([chat[0], message]);
              setMessage('');
            }
          }}
        >
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Message Ohio State…"
          />
          <button className="primary">Send</button>
        </form>
      </div>
    </section>
  );
}
function Team({ notify }) {
  return (
    <section className="content page">
      <p className="eyebrow">YOUR TEAM</p>
      <div className="team-title">
        <div>
          <Avatar initials="BG" color="#f37021" size="large" />
        </div>
        <div>
          <h1>BGSU Rocket League</h1>
          <p>
            Bowling Green State University <Badge>Collegiate Verified</Badge>
          </p>
        </div>
        <Link href="/teams/new" className="primary">
          Create your team
        </Link>
      </div>
      <div className="team-grid">
        <article className="team-overview">
          <h2>Team profile</h2>
          <dl>
            <div>
              <dt>Region</dt>
              <dd>NA East</dd>
            </div>
            <div>
              <dt>Level</dt>
              <dd>GC3 – SSL</dd>
            </div>
            <div>
              <dt>Completed scrims</dt>
              <dd>42</dd>
            </div>
            <div>
              <dt>Show-up rate</dt>
              <dd className="good">95%</dd>
            </div>
          </dl>
        </article>
        <article className="roster">
          <div className="roster-head">
            <h2>
              Roster <span>6</span>
            </h2>
            <button
              className="text-button"
              onClick={() => notify('Invite link copied to clipboard.')}
            >
              Invite member
            </button>
          </div>
          {[
            ['CM', 'Casey Miller', 'Captain', '#263c77'],
            ['AL', 'Alex Lee', 'Manager', '#7658a8'],
            ['JP', 'Jordan Patel', 'Member', '#278c83'],
            ['RM', 'Riley Morgan', 'Member', '#b55172'],
          ].map((x, i) => (
            <div className="member" key={x[1] + i}>
              <Avatar initials={x[0]} color={x[3]} size="small" />
              <strong>{x[1]}</strong>
              <span>{x[2]}</span>
              <MoreHorizontal size={18} />
            </div>
          ))}
        </article>
      </div>
    </section>
  );
}
function RequestModal({ scrim, close, submit }) {
  const [note, setNote] = useState('Hey! We’re available and would love to play.');
  return (
    <div className="overlay">
      <div className="modal">
        <button className="close" onClick={close}>
          <X size={20} />
        </button>
        <p className="eyebrow">REQUEST SCRIM</p>
        <h2>Play {scrim.team}?</h2>
        <div className="mini-match">
          <Avatar initials="BG" color="#f37021" />
          <span>vs</span>
          <Avatar initials={scrim.initials} color={scrim.color} />
          <div>
            <strong>{scrim.time}</strong>
            <small>
              {scrim.format} · {scrim.region}
            </small>
          </div>
        </div>
        <label>
          Message <small>Optional</small>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <p className="hint">
          Your captain and managers will be able to coordinate once they accept.
        </p>
        <div className="modal-actions">
          <button className="secondary" onClick={close}>
            Cancel
          </button>
          <button className="primary" onClick={submit}>
            Send request <span>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
function PostModal({ close, submit }) {
  return (
    <div className="overlay">
      <div className="modal post-modal">
        <button className="close" onClick={close}>
          <X size={20} />
        </button>
        <p className="eyebrow">NEW SCRIM</p>
        <h2>Post a scrim</h2>
        <div className="form-grid">
          <label>
            Rank range
            <select>
              <option>GC2 – SSL</option>
              <option>GC1 – GC3</option>
            </select>
          </label>
          <label>
            Region
            <select>
              <option>NA East</option>
              <option>NA Central</option>
            </select>
          </label>
          <label>
            Date
            <input type="date" defaultValue="2026-09-20" />
          </label>
          <label>
            Start time
            <input type="time" defaultValue="20:00" />
          </label>
          <label>
            Format
            <select>
              <option>BO7</option>
              <option>BO5</option>
              <option>60 minutes</option>
            </select>
          </label>
          <label>
            Time zone
            <select>
              <option>Eastern</option>
            </select>
          </label>
        </div>
        <label>
          Notes <small>Optional</small>
          <textarea placeholder="CRL-level preferred. US-East servers." />
        </label>
        <div className="modal-actions">
          <button className="secondary" onClick={close}>
            Cancel
          </button>
          <button className="primary" onClick={submit}>
            <Plus size={17} /> Post scrim
          </button>
        </div>
      </div>
    </div>
  );
}
