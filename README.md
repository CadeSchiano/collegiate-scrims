# Scrimnet

> The collegiate Rocket League scrim network.

Scrimnet is a practice-first platform for legitimate collegiate Rocket League teams to find opponents, schedule scrims, coordinate privately, and build a reliable practice community—without hunting through Discord.

## What it does

- Creates individual user accounts and collegiate team rosters
- Manually verifies teams before marketplace access
- Lets verified captains and managers post Rocket League scrims
- Lets verified teams request, accept, or decline scrims
- Provides a private confirmed-match workspace
- Supports team-level check-in and private realtime chat
- Handles reschedule requests and cancellation/replacement flows
- Gives admins a verification queue and moderation foundation

## Product principle

Scrimnet is for practice, not competitive status.

It intentionally does **not** include rankings, ladders, tournaments, public W/L records, match scores, or player/team performance stats. The only team behavior data tracked is reliability: check-ins, completed scrims, late cancellations, no-shows, and show-up rate.

See [PRODUCT_GUARDRAILS.md](PRODUCT_GUARDRAILS.md) for the full scope policy.

## Stack

- **Next.js** — web app
- **React** — interface
- **Supabase** — PostgreSQL, authentication, Row Level Security, and realtime chat
- **CSS** — responsive UI styling

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
```

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
```

Then start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database setup

Run the SQL files in `supabase/migrations/` in filename order through the Supabase SQL Editor. They create the core schema, security policies, school directory, admin/verification flow, team limits, marketplace, match lifecycle, realtime chat, check-ins, rescheduling, and cancellation handling.

Never commit `.env.local`, Supabase secret keys, database passwords, or email-provider credentials.

## Main routes

| Route | Purpose |
| --- | --- |
| `/auth` | Account sign-up and sign-in |
| `/team` | Live team profile and roster |
| `/teams/new` | Team creation and verification submission |
| `/marketplace` | Verified-team scrim marketplace |
| `/scrims/new` | Post a new scrim |
| `/scrims/manage` | Incoming requests and confirmed scrims |
| `/scrims/[id]` | Private match workspace, check-in, and chat |
| `/admin` | Admin-only verification queue |

## Status

The core marketplace flow is working:

```text
Create account
→ Create team
→ Admin verifies team
→ Post scrim
→ Request scrim
→ Accept
→ Check in and coordinate
```

Before public beta, remaining work includes scrim completion/history, reliability displays, email notifications, reports/moderation, production deployment, and final mobile QA.

## License

Private project — all rights reserved.
