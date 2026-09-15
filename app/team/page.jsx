'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, LoaderCircle, ShieldCheck, UsersRound } from 'lucide-react';
import { supabase } from '../../lib/supabase/client';

const statusCopy = {
  pending: ['Verification pending', 'Your team is under manual review. You can set up your roster, but marketplace access starts after approval.'],
  approved: ['Collegiate Verified', 'Your team is approved and can post or request Rocket League scrims.'],
  rejected: ['Verification not approved', 'Review the submitted school information, then contact an administrator if you need to resubmit.'],
  revoked: ['Verification revoked', 'This team is currently unable to access the marketplace. Contact an administrator for details.'],
};

function Initials({ name }) { return <div className="live-team-mark">{name.slice(0, 2).toUpperCase()}</div>; }

export default function TeamPage() {
  const [state, setState] = useState('loading'); const [team, setTeam] = useState(null); const [members, setMembers] = useState([]); const [error, setError] = useState('');
  useEffect(() => { async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.assign('/auth'); return; }
    const { data: membership, error: membershipError } = await supabase.from('team_members').select('team_id,role').eq('user_id', user.id).order('joined_at').limit(1).maybeSingle();
    if (membershipError) { setError(membershipError.message); setState('error'); return; }
    if (!membership) { setState('empty'); return; }
    const { data: currentTeam, error: teamError } = await supabase.from('teams').select('id,name,rank,region,game,verification_status,created_at,schools(name)').eq('id', membership.team_id).single();
    if (teamError) { setError(teamError.message); setState('error'); return; }
    const { data: roster, error: rosterError } = await supabase.from('team_members').select('role,joined_at,profiles(username)').eq('team_id', membership.team_id).order('joined_at');
    if (rosterError) { setError(rosterError.message); setState('error'); return; }
    setTeam({ ...currentTeam, myRole: membership.role }); setMembers(roster || []); setState('ready');
  } load(); }, []);
  if (state === 'loading') return <main className="live-team-page centered"><LoaderCircle className="spin" size={24}/></main>;
  if (state === 'empty') return <main className="live-team-page centered"><section className="team-empty"><UsersRound size={36}/><p className="eyebrow">NO TEAM YET</p><h1>Start your collegiate roster.</h1><p>Create a Rocket League team and submit it for verification before using the marketplace.</p><Link href="/teams/new" className="primary">Create a team</Link></section></main>;
  if (state === 'error') return <main className="live-team-page centered"><section className="team-empty"><h1>Couldn’t load your team</h1><p>{error}</p><Link href="/" className="primary">Back to Scrimnet</Link></section></main>;
  const [statusTitle, statusDescription] = statusCopy[team.verification_status];
  return <main className="live-team-page"><header className="team-header"><Link href="/" className="back"><ArrowLeft size={15}/> Back to Scrimnet</Link><span>{team.myRole}</span></header><section className="live-team-content"><div className="live-team-title"><Initials name={team.name}/><div><p className="eyebrow">YOUR TEAM</p><h1>{team.name} Rocket League</h1><p>{team.schools?.name}</p></div></div><section className={`verification-panel ${team.verification_status}`}><ShieldCheck size={24}/><div><strong>{statusTitle}</strong><p>{statusDescription}</p></div>{team.verification_status === 'approved' && <CheckCircle2 size={20}/>}</section><div className="live-team-grid"><article className="live-profile"><h2>Team profile</h2><dl><div><dt>Game</dt><dd>{team.game}</dd></div><div><dt>Region</dt><dd>{team.region}</dd></div><div><dt>Typical level</dt><dd>{team.rank}</dd></div><div><dt>Team role</dt><dd className="role-capitalize">{team.myRole}</dd></div></dl></article><article className="live-roster"><div className="live-roster-head"><h2>Roster <small>{members.length}</small></h2><span>Roster tools coming next</span></div>{members.map((member, index) => <div className="live-member" key={`${member.profiles?.username}-${index}`}><div>{member.profiles?.username?.slice(0,2).toUpperCase()}</div><strong>{member.profiles?.username}</strong><span className="role-capitalize">{member.role}</span></div>)}</article></div></section></main>;
}
