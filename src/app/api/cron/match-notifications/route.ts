import { NextResponse } from 'next/server';
import * as webPushModule from 'web-push';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { getFixturesByDateFromApi } from '@/services/thesportsdb-service';
import type { MatchType } from '@/lib/data';

// web-push is CommonJS (`export =`). A default import type-checks but bundlers
// disagree about whether it lands on module.exports or on a `.default`
// wrapper — in the Vercel build it was undefined. Read both shapes.
const webpush = ((webPushModule as unknown as { default?: typeof webPushModule }).default
  ?? webPushModule);

/**
 * Match notifications for the clubs a person follows.
 *
 * Vercel Cron calls this every minute on matchdays. Each fixture's last-seen
 * state is kept in match_notification_state, so "kick-off", "goal" and "full
 * time" are transitions, not things inferred from the current score alone —
 * without that, every poll would re-announce the same goal.
 *
 * Web Push rather than FCM so there is no Firebase project to own. PWABuilder
 * still enables Android notification delegation in the TWA.
 */

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:hello@bholofootball.co.za';

type MatchState = {
  event_id: string;
  status: 'NS' | 'LIVE' | 'FT';
  home_score: number | null;
  away_score: number | null;
  kickoff_notified: boolean;
  fulltime_notified: boolean;
};

function scores(score: string | undefined): { home: number | null; away: number | null } {
  const match = score?.match(/(\d+)\s*-\s*(\d+)/);
  return match
    ? { home: Number(match[1]), away: Number(match[2]) }
    : { home: null, away: null };
}

function stateFor(match: MatchType): MatchState['status'] {
  if (match.isLive) return 'LIVE';
  // No score means the fixture never kicked off (postponed, cancelled, or a
  // TBD that TheSportsDB hasn't resolved). Treat it as not-started rather
  // than as a 0-0 full-time result.
  if (match.isUpcoming || !match.score) return 'NS';
  return 'FT';
}

function audienceClub(match: MatchType): string[] {
  return [match.team1.name, match.team2.name];
}

function goalScorer(match: MatchType, previous: MatchState, home: number, away: number): string {
  const prevHome = previous.home_score ?? 0;
  const prevAway = previous.away_score ?? 0;
  if (home > prevHome && away <= prevAway) return match.team1.name;
  if (away > prevAway && home <= prevHome) return match.team2.name;
  return `${match.team1.name} or ${match.team2.name}`;
}

type PushRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
  user_id: string;
};

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authorization = request.headers.get('authorization');
    if (authorization !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });
    }
  }

  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return NextResponse.json({ error: 'VAPID keys are not configured.' }, { status: 500 });
  }

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
  const supabase = createServiceRoleClient();

  const fixtures = await getFixturesByDateFromApi({ fresh: true });
  if (fixtures.length === 0) {
    return NextResponse.json({ ok: true, fixtures: 0, sent: 0 });
  }

  const ids = fixtures.map((match) => String(match.id));
  const { data: existingRows, error: stateError } = await supabase
    .from('match_notification_state')
    .select('*')
    .in('event_id', ids);

  if (stateError) {
    // Almost always 029_push_notifications.sql not having been run. Failing
    // loudly is better than a 200 with sent: 0 every five minutes.
    console.error('[push] could not read match_notification_state', stateError);
    return NextResponse.json(
      { error: 'match_notification_state is unavailable — run supabase/sql/029_push_notifications.sql.' },
      { status: 500 }
    );
  }

  const previous = new Map<string, MatchState>(
    ((existingRows ?? []) as MatchState[]).map((row) => [row.event_id, row])
  );

  type Pending = { match: MatchType; kind: 'kickoff' | 'goal' | 'fulltime'; title: string; body: string };
  const pending: Pending[] = [];

  for (const match of fixtures) {
    const eventId = String(match.id);
    const status = stateFor(match);
    const { home, away } = scores(match.score);
    const before = previous.get(eventId);

    // First time we see a match: record a baseline, announce nothing. A cold
    // deploy must not fire a full-time notification for every game already
    // finished today.
    if (!before) {
      await supabase.from('match_notification_state').upsert({
        event_id: eventId,
        status,
        home_score: home,
        away_score: away,
        kickoff_notified: status !== 'NS',
        fulltime_notified: status === 'FT',
        updated_at: new Date().toISOString(),
      });
      continue;
    }

    if (status === 'LIVE' && before.status !== 'LIVE' && !before.kickoff_notified) {
      pending.push({
        match,
        kind: 'kickoff',
        title: `${match.team1.name} vs ${match.team2.name}`,
        body: 'Kick-off in the Betway Premiership.',
      });
    }

    if (
      status === 'LIVE'
      && before.status === 'LIVE'
      && home !== null
      && away !== null
      && ((before.home_score ?? 0) < home || (before.away_score ?? 0) < away)
    ) {
      const scorer = goalScorer(match, before, home, away);
      pending.push({
        match,
        kind: 'goal',
        title: `GOAL! ${match.team1.name} ${home}-${away} ${match.team2.name}`,
        body: `${scorer} scored.`,
      });
    }

    if (status === 'FT' && before.status === 'LIVE' && !before.fulltime_notified) {
      pending.push({
        match,
        kind: 'fulltime',
        title: `Full time: ${match.team1.name} ${match.score ?? ''} ${match.team2.name}`.replace(/\s+/g, ' ').trim(),
        body: "That's the final whistle.",
      });
    }

    await supabase.from('match_notification_state').upsert({
      event_id: eventId,
      status,
      home_score: home,
      away_score: away,
      kickoff_notified: before.kickoff_notified || status === 'LIVE' || status === 'FT',
      fulltime_notified: before.fulltime_notified || status === 'FT',
      updated_at: new Date().toISOString(),
    });
  }

  if (pending.length === 0) {
    return NextResponse.json({ ok: true, fixtures: fixtures.length, sent: 0 });
  }

  const { data: subscriptions, error: subscriptionError } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth, user_id');

  if (subscriptionError) {
    console.error('[push] could not read push_subscriptions', subscriptionError);
    return NextResponse.json(
      { error: 'push_subscriptions is unavailable — run supabase/sql/029_push_notifications.sql.' },
      { status: 500 }
    );
  }

  const rows = (subscriptions ?? []) as PushRow[];
  if (rows.length === 0) {
    return NextResponse.json({ ok: true, fixtures: fixtures.length, sent: 0 });
  }

  const userIds = [...new Set(rows.map((row) => row.user_id))];
  const [{ data: profiles }, { data: preferences }] = await Promise.all([
    supabase.from('profiles').select('id, favourite_club').in('id', userIds),
    supabase.from('push_preferences').select('user_id, goals, kickoff, fulltime').in('user_id', userIds),
  ]);

  const clubByUser = new Map<string, string | null>(
    (profiles ?? []).map((profile: { id: string; favourite_club: string | null }) => [profile.id, profile.favourite_club])
  );
  const prefsByUser = new Map<string, { goals: boolean; kickoff: boolean; fulltime: boolean }>(
    (preferences ?? []).map((pref: { user_id: string; goals: boolean; kickoff: boolean; fulltime: boolean }) => [
      pref.user_id,
      { goals: pref.goals, kickoff: pref.kickoff, fulltime: pref.fulltime },
    ])
  );

  let sent = 0;
  const stale: string[] = [];

  await Promise.allSettled(
    pending.flatMap((item) =>
      rows
        .filter((row) => {
          const club = clubByUser.get(row.user_id);
          if (!club || !audienceClub(item.match).includes(club)) return false;
          const pref = prefsByUser.get(row.user_id);
          if (!pref) return true;
          return item.kind === 'goal' ? pref.goals : pref[item.kind];
        })
        .map(async (row) => {
          const payload = JSON.stringify({
            title: item.title,
            body: item.body,
            url: `/live/${item.match.id}`,
            tag: `match-${item.match.id}-${item.kind}`,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
          });

          try {
            await webpush.sendNotification(
              { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
              payload
            );
            sent += 1;
          } catch (error) {
            const statusCode = (error as { statusCode?: number }).statusCode;
            if (statusCode === 404 || statusCode === 410) {
              stale.push(row.endpoint);
            } else {
              console.error('[push] send failed', statusCode, error);
            }
          }
        })
    )
  );

  if (stale.length > 0) {
    await supabase.from('push_subscriptions').delete().in('endpoint', stale);
  }

  return NextResponse.json({ ok: true, fixtures: fixtures.length, sent, removed: stale.length });
}

// Vercel Cron issues GET requests.
export async function GET(request: Request) {
  return POST(request);
}
