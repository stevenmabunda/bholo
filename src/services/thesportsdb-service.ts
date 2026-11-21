// IMPORTANT: This file should not be marked with 'use server'
// as it is a pure data-fetching utility and doesn't need to be
// directly callable from the client. It will be used by server actions.
//
// Provider: TheSportsDB (thesportsdb.com), using the shared free test key.
// South Africa Premier Soccer League = league id 4802.
//
// Free-key note: unlike API-Football, the free key returns *current* season
// data with no season lock — confirmed live: today's actual fixtures and a
// standings table updated within the last few weeks. The trade-off is a
// row cap, not a season cap: lookuptable.php caps at 5 rows, eventsday.php at
// ~3 events per call, and eventsnextleague/eventspastleague at 1 event per
// call (vs 20 / 100 / 1500 on the Premium key). There is no live in-play score
// endpoint on the free key at all — getLiveMatches() approximates it by
// pulling today's fixtures and filtering to in-progress status codes, which
// only works on a matchday and won't show elapsed-minute detail. Upgrading to
// Premium removes the row caps and unlocks a real livescore endpoint; no code
// changes are needed beyond setting THESPORTSDB_KEY.
//
// Crests: TheSportsDB's community badges are sometimes wrong or stale for
// renamed or newly promoted clubs, so every PSL name is resolved through
// getClubCrest() to the local file in /public/teams. The API badge is only a
// fallback for non-PSL opposition (cups/friendlies).

import type { MatchType } from "@/lib/data";
import { getClubCrest } from "@/lib/psl-teams";

const PSL_LEAGUE_ID = "4802";
const FREE_KEY = "123";
const API_KEY = process.env.THESPORTSDB_KEY || FREE_KEY;

/** South Africa has no daylight saving; SAST is UTC+2 all year. */
const SAST_OFFSET_MS = 2 * 60 * 60 * 1000;

interface TsdbEvent {
  idEvent: string;
  strTimestamp: string | null;
  dateEvent: string | null;
  strTime: string | null; // UTC kickoff — do not display directly
  strTimeLocal: string | null; // venue-local kickoff; often null on this API
  strStatus: string | null; // 'NS' | 'FT' | 'PST' | live codes like '1H' | 'HT' | '2H'
  strHomeTeam: string;
  strAwayTeam: string;
  strHomeTeamBadge: string | null;
  strAwayTeamBadge: string | null;
  intHomeScore: string | null;
  intAwayScore: string | null;
  intRound: string | null;
  strVenue: string | null;
  strLeague: string;
  strSeason: string | null;
}

interface TsdbStandingRow {
  intRank: string;
  idTeam: string;
  strTeam: string;
  strBadge: string | null;
  strForm: string | null;
  intPlayed: string;
  intWin: string;
  intDraw: string;
  intLoss: string;
  intGoalDifference: string;
  intPoints: string;
}

export interface LeagueStanding {
  rank: number;
  team: { id: string; name: string; logo: string };
  points: number;
  goalsDiff: number;
  form: string;
  all: { played: number; win: number; draw: number; lose: number };
}

export type FixtureStatus =
  | 'scheduled'
  | 'live'
  | 'finished'
  | 'postponed'
  | 'cancelled';

export type FixtureTeam = {
  name: string;
  crest: string;
  score: number | null;
};

export type FixtureEvent = {
  id: string;
  /** YYYY-MM-DD, already shifted to SAST. */
  date: string;
  /** HH:mm in SAST, or empty when the provider has no kickoff time. */
  kickoff: string;
  status: FixtureStatus;
  statusLabel: string;
  home: FixtureTeam;
  away: FixtureTeam;
  venue: string | null;
  round: number | null;
  league: string;
  season: string | null;
};

const LIVE_STATUSES = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE']);
const FINISHED_STATUSES = new Set([
  'FT',
  'AET',
  'PEN',
  'MATCH FINISHED',
  'AFTER EXTRA TIME',
  'AFTER PENALTIES',
]);
const POSTPONED_STATUSES = new Set(['PST', 'POSTP', 'POSTPONED']);
const CANCELLED_STATUSES = new Set(['CANC', 'ABD', 'AWD', 'WO']);

async function fetchFromTheSportsDb<T>(
  endpoint: string,
  params: Record<string, string>,
  revalidate = 300
): Promise<T | null> {
  const url = `https://www.thesportsdb.com/api/v1/json/${API_KEY}/${endpoint}?${new URLSearchParams(params).toString()}`;

  try {
    const response = await fetch(url, {
      // Next.js Data Cache — persists across serverless invocations on
      // Vercel, unlike an in-memory Map. Keeps us well under the shared
      // free key's 30 req/min limit under normal traffic. The notification
      // cron passes 0 because a goal that happened four minutes ago is not
      // worth pushing.
      next: { revalidate },
    });

    if (!response.ok) {
      console.error(`TheSportsDB request failed with status ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to fetch from TheSportsDB:", error);
    return null;
  }
}

/** Today's date in SAST, which can differ from the server's UTC date late at night. */
export function getSastDateString(date = new Date()): string {
  return new Date(date.getTime() + SAST_OFFSET_MS).toISOString().slice(0, 10);
}

export function addDays(dateString: string, days: number): string {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** All dates from start to end inclusive, as YYYY-MM-DD strings. */
export function datesBetween(start: string, end: string): string[] {
  const dates: string[] = [];
  let current = start;
  // Guard against an inverted or absurd range turning this into a long loop.
  for (let i = 0; i < 31 && current <= end; i += 1) {
    dates.push(current);
    current = addDays(current, 1);
  }
  return dates;
}

/**
 * Fixtures are cached for five minutes, except during plausible match hours
 * (12:00–23:59 SAST) when a goal four minutes stale is not worth showing.
 * The client additionally refetches every 60s while it knows a match is live.
 */
export function fixturesRevalidateSeconds(now = new Date()): number {
  const sastHour = new Date(now.getTime() + SAST_OFFSET_MS).getUTCHours();
  return sastHour >= 12 && sastHour <= 23 ? 60 : 300;
}

/** South African PSL season runs Aug-May; lookuptable.php wants "YYYY-YYYY". */
export function getCurrentSeasonString(date = new Date()): string {
  const sast = new Date(date.getTime() + SAST_OFFSET_MS);
  const month = sast.getUTCMonth() + 1; // 1-12
  const startYear = month >= 7 ? sast.getUTCFullYear() : sast.getUTCFullYear() - 1;
  return `${startYear}-${startYear + 1}`;
}

/**
 * Kickoff in SAST. strTimeLocal is usually null on this API (the field exists
 * but the PSL rows leave it blank), so fall back to strTimestamp / strTime,
 * which are UTC, and add the fixed two hours. Returns the date too: a 22:30
 * UTC kickoff is already the next day in Johannesburg.
 */
function kickoffInSast(event: TsdbEvent): { date: string; time: string } {
  if (event.strTimeLocal) {
    return {
      date: event.dateEvent ?? '',
      time: event.strTimeLocal.slice(0, 5),
    };
  }

  const timestamp =
    event.strTimestamp ||
    (event.dateEvent && event.strTime ? `${event.dateEvent}T${event.strTime}` : null);

  if (!timestamp) {
    return { date: event.dateEvent ?? '', time: '' };
  }

  const utc = new Date(timestamp.endsWith('Z') ? timestamp : `${timestamp}Z`);
  if (Number.isNaN(utc.getTime())) {
    return { date: event.dateEvent ?? '', time: '' };
  }

  const sast = new Date(utc.getTime() + SAST_OFFSET_MS);
  return {
    date: sast.toISOString().slice(0, 10),
    time: sast.toISOString().slice(11, 16),
  };
}

function fixtureStatus(event: TsdbEvent): FixtureStatus {
  const status = (event.strStatus || '').toUpperCase();
  if (LIVE_STATUSES.has(status)) return 'live';
  if (POSTPONED_STATUSES.has(status)) return 'postponed';
  if (CANCELLED_STATUSES.has(status)) return 'cancelled';
  if (FINISHED_STATUSES.has(status)) return 'finished';
  return 'scheduled';
}

function statusLabel(status: FixtureStatus): string {
  switch (status) {
    case 'live':
      return 'Live';
    case 'finished':
      return 'FT';
    case 'postponed':
      return 'Postponed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'Scheduled';
  }
}

function score(value: string | null): number | null {
  if (value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function mapEventToFixture(event: TsdbEvent): FixtureEvent {
  const status = fixtureStatus(event);
  const kickoff = kickoffInSast(event);
  // A score only means something once the match has started. Postponed and
  // scheduled rows can carry leftover values in the provider's database.
  const showScore = status === 'live' || status === 'finished';

  return {
    id: event.idEvent,
    date: kickoff.date || event.dateEvent || '',
    kickoff: kickoff.time,
    status,
    statusLabel: statusLabel(status),
    home: {
      name: event.strHomeTeam,
      crest: getClubCrest(event.strHomeTeam, event.strHomeTeamBadge),
      score: showScore ? score(event.intHomeScore) : null,
    },
    away: {
      name: event.strAwayTeam,
      crest: getClubCrest(event.strAwayTeam, event.strAwayTeamBadge),
      score: showScore ? score(event.intAwayScore) : null,
    },
    venue: event.strVenue || null,
    round: event.intRound ? Number(event.intRound) : null,
    league: event.strLeague,
    season: event.strSeason,
  };
}

function mapEventToMatchType(event: TsdbEvent): MatchType {
  const fixture = mapEventToFixture(event);

  let timeDisplay: string;
  if (fixture.status === 'live') {
    timeDisplay = 'Live';
  } else if (fixture.status === 'finished') {
    timeDisplay = 'FT';
  } else if (fixture.status === 'postponed') {
    timeDisplay = 'Postponed';
  } else if (fixture.status === 'cancelled') {
    timeDisplay = 'Cancelled';
  } else {
    timeDisplay = fixture.kickoff;
  }

  return {
    id: Number(event.idEvent),
    team1: { name: fixture.home.name, logo: fixture.home.crest },
    team2: { name: fixture.away.name, logo: fixture.away.crest },
    score:
      fixture.home.score !== null && fixture.away.score !== null
        ? `${fixture.home.score} - ${fixture.away.score}`
        : undefined,
    time: timeDisplay,
    league: fixture.league,
    isLive: fixture.status === 'live',
    isUpcoming: fixture.status === 'scheduled',
  };
}

async function fetchEvents(
  endpoint: string,
  params: Record<string, string>,
  revalidate: number
): Promise<TsdbEvent[]> {
  const data = await fetchFromTheSportsDb<{ events: TsdbEvent[] | null }>(
    endpoint,
    params,
    revalidate
  );
  return data?.events ?? [];
}

/** Today's PSL fixtures, as the home/live widgets and the notification cron expect. */
export async function getFixturesByDateFromApi(
  options: { fresh?: boolean } = {}
): Promise<MatchType[]> {
  const events = await fetchEvents(
    'eventsday.php',
    { d: getSastDateString(), l: PSL_LEAGUE_ID },
    options.fresh ? 0 : fixturesRevalidateSeconds()
  );
  return events.map(mapEventToMatchType);
}

export async function getLiveMatches(): Promise<MatchType[]> {
  // No live endpoint on the free key — approximate by checking today's
  // fixtures for an in-progress status. See file header note.
  const matches = await getFixturesByDateFromApi();
  return matches.filter((match) => match.isLive);
}

/** The provider's next PSL fixture(s). One row on the free key, up to 20 on Premium. */
export async function getNextLeagueFixtures(
  revalidate = fixturesRevalidateSeconds()
): Promise<FixtureEvent[]> {
  const events = await fetchEvents(
    'eventsnextleague.php',
    { id: PSL_LEAGUE_ID },
    revalidate
  );
  return events.map(mapEventToFixture);
}

/** The provider's most recent PSL fixture(s). One row on the free key. */
export async function getPastLeagueFixtures(
  revalidate = fixturesRevalidateSeconds()
): Promise<FixtureEvent[]> {
  const events = await fetchEvents(
    'eventspastleague.php',
    { id: PSL_LEAGUE_ID },
    revalidate
  );
  return events.map(mapEventToFixture);
}

/**
 * Every PSL fixture the provider has for a date range.
 *
 * eventsday is the only endpoint that can answer "what happened on this
 * specific day" on the free key, so a week is several small requests. They
 * run in parallel and share the same cached window, which keeps the upstream
 * count comfortably under the key's 30/min limit.
 */
export async function getFixturesBetween(
  start: string,
  end: string,
  revalidate = fixturesRevalidateSeconds()
): Promise<FixtureEvent[]> {
  const dates = datesBetween(start, end);
  const pages = await Promise.all(
    dates.map((date) =>
      fetchEvents('eventsday.php', { d: date, l: PSL_LEAGUE_ID }, revalidate)
    )
  );

  const byId = new Map<string, FixtureEvent>();
  for (const event of pages.flat()) {
    const fixture = mapEventToFixture(event);
    byId.set(fixture.id, fixture);
  }
  return [...byId.values()];
}

export async function getStandings(
  season: string = getCurrentSeasonString()
): Promise<LeagueStanding[]> {
  const data = await fetchFromTheSportsDb<{ table: TsdbStandingRow[] | null }>(
    'lookuptable.php',
    {
      l: PSL_LEAGUE_ID,
      s: season,
    }
  );

  return (data?.table ?? []).map((row) => ({
    rank: Number(row.intRank),
    team: {
      id: row.idTeam,
      name: row.strTeam,
      // Always derived from this row's own name, so a standings badge can
      // never drift onto the wrong club.
      logo: getClubCrest(row.strTeam, row.strBadge),
    },
    points: Number(row.intPoints),
    goalsDiff: Number(row.intGoalDifference),
    form: row.strForm ?? '',
    all: {
      played: Number(row.intPlayed),
      win: Number(row.intWin),
      draw: Number(row.intDraw),
      lose: Number(row.intLoss),
    },
  }));
}
