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
// row cap, not a season cap: lookuptable.php caps at 5 rows and
// eventsday.php at ~3 events per call (vs 100 / 1500 on the $9/mo Premium
// key). There is no live in-play score endpoint on the free key at all —
// getLiveMatches() approximates it by pulling today's fixtures and
// filtering to in-progress status codes, which only works on a matchday
// and won't show elapsed-minute detail. Upgrading to Premium removes the
// row caps and unlocks a real livescore endpoint, no code changes needed
// beyond swapping the key and endpoint.

import type { MatchType } from "@/lib/data";

const PSL_LEAGUE_ID = "4802";
const FREE_KEY = "123";

interface TsdbEvent {
  idEvent: string;
  dateEvent: string;
  strTime: string;
  strStatus: string; // 'NS' | 'FT' | live codes like '1H' | 'HT' | '2H' etc.
  strHomeTeam: string;
  strAwayTeam: string;
  strHomeTeamBadge: string | null;
  strAwayTeamBadge: string | null;
  intHomeScore: string | null;
  intAwayScore: string | null;
  strLeague: string;
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

async function fetchFromTheSportsDb<T>(endpoint: string, params: Record<string, string>): Promise<T | null> {
  const url = `https://www.thesportsdb.com/api/v1/json/${FREE_KEY}/${endpoint}?${new URLSearchParams(params).toString()}`;

  try {
    const response = await fetch(url, {
      // Next.js Data Cache — persists across serverless invocations on
      // Vercel, unlike an in-memory Map. Keeps us well under the shared
      // free key's 30 req/min limit under normal traffic.
      next: { revalidate: 300 },
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

function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** South African PSL season runs Aug-May; lookuptable.php wants "YYYY-YYYY". */
function getCurrentSeasonString(date = new Date()): string {
  const month = date.getMonth() + 1; // 1-12
  const startYear = month >= 7 ? date.getFullYear() : date.getFullYear() - 1;
  return `${startYear}-${startYear + 1}`;
}

function mapEventToMatchType(event: TsdbEvent): MatchType {
  const isLive = ['1H', 'HT', '2H', 'ET', 'BT', 'P'].includes(event.strStatus);
  const isUpcoming = event.strStatus === 'NS' || event.strStatus === 'TBD' || event.strStatus === '';

  let timeDisplay: string;
  if (isLive) {
    timeDisplay = 'Live';
  } else if (isUpcoming) {
    timeDisplay = event.strTime.slice(0, 5);
  } else {
    timeDisplay = 'FT';
  }

  const home = event.intHomeScore !== null ? Number(event.intHomeScore) : null;
  const away = event.intAwayScore !== null ? Number(event.intAwayScore) : null;

  return {
    id: Number(event.idEvent),
    team1: { name: event.strHomeTeam, logo: event.strHomeTeamBadge ?? '' },
    team2: { name: event.strAwayTeam, logo: event.strAwayTeamBadge ?? '' },
    score: (home !== null && away !== null) ? `${home} - ${away}` : undefined,
    time: timeDisplay,
    league: event.strLeague,
    isLive,
    isUpcoming,
  };
}

export async function getFixturesByDateFromApi(): Promise<MatchType[]> {
  const data = await fetchFromTheSportsDb<{ events: TsdbEvent[] | null }>('eventsday.php', {
    d: getTodayDateString(),
    l: PSL_LEAGUE_ID,
  });

  return (data?.events ?? []).map(mapEventToMatchType);
}

export async function getLiveMatches(): Promise<MatchType[]> {
  // No live endpoint on the free key — approximate by checking today's
  // fixtures for an in-progress status. See file header note.
  const matches = await getFixturesByDateFromApi();
  return matches.filter(m => m.isLive);
}

export async function getStandings(season: string = getCurrentSeasonString()): Promise<LeagueStanding[]> {
  const data = await fetchFromTheSportsDb<{ table: TsdbStandingRow[] | null }>('lookuptable.php', {
    l: PSL_LEAGUE_ID,
    s: season,
  });

  return (data?.table ?? []).map(row => ({
    rank: Number(row.intRank),
    team: { id: row.idTeam, name: row.strTeam, logo: row.strBadge ?? '' },
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
