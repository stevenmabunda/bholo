// IMPORTANT: This file should not be marked with 'use server'
// as it is a pure data-fetching utility and doesn't need to be
// directly callable from the client. It will be used by server actions.
//
// Provider: API-Football (v3.football.api-sports.io).
// South Africa Premier Soccer League = league id 288 (confirmed via the
// account dashboard's Football Leagues ids table — this is not published
// in their docs, only discoverable per-account).
//
// Free-plan note: the free tier includes every league (PSL included) but
// only seasons 2022-2024 — the current season and live scores are blocked
// with a 200 response carrying an `errors.plan` message rather than an
// HTTP error. fetchFromApiFootball() treats that the same as "no data"
// (logs it, returns null) so the UI degrades to empty state instead of
// crashing. Upgrading to the Pro plan ($19/mo) removes the season limit
// with no code changes needed here.

import type { MatchType } from "@/lib/data";

const PSL_LEAGUE_ID = 288;

interface ApiFootballResponse<T> {
  get: string;
  parameters: Record<string, string>;
  errors: string[] | Record<string, string>;
  results: number;
  response: T;
}

interface ApiFootballTeam {
  id: number;
  name: string;
  logo: string;
  winner?: boolean | null;
}

interface ApiFootballFixture {
  fixture: {
    id: number;
    date: string;
    status: {
      long: string;
      short: string; // 'NS' | '1H' | 'HT' | '2H' | 'FT' | ...
      elapsed: number | null;
    };
  };
  league: {
    id: number;
    name: string;
    round: string;
  };
  teams: {
    home: ApiFootballTeam;
    away: ApiFootballTeam;
  };
  goals: {
    home: number | null;
    away: number | null;
  };
}

export interface LeagueStanding {
  rank: number;
  team: ApiFootballTeam;
  points: number;
  goalsDiff: number;
  form: string;
  all: {
    played: number;
    win: number;
    draw: number;
    lose: number;
  };
}

interface ApiFootballStandingsResponse {
  league: {
    id: number;
    name: string;
    season: number;
    standings: LeagueStanding[][];
  };
}

/** South African PSL season runs Aug-May; the "season" query param is the
 * year the season started in (e.g. Aug 2025-May 2026 is season=2025). */
function getCurrentSeasonYear(date = new Date()): number {
  const month = date.getMonth() + 1; // 1-12
  return month >= 7 ? date.getFullYear() : date.getFullYear() - 1;
}

function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function fetchFromApiFootball<T>(endpoint: string, params: Record<string, string>): Promise<T | null> {
  const apiKey = process.env.API_FOOTBALL_KEY;

  if (!apiKey) {
    console.error("API-Football key is missing. Please add API_FOOTBALL_KEY to your .env file.");
    return null;
  }

  const url = `https://v3.football.api-sports.io/${endpoint}?${new URLSearchParams(params).toString()}`;

  try {
    const response = await fetch(url, {
      headers: { 'x-apisports-key': apiKey },
      // Next.js Data Cache — persists across serverless invocations on
      // Vercel, unlike an in-memory Map. Keeps us well under the 100/day
      // free-tier quota for normal traffic.
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      console.error(`API-Football request failed with status ${response.status}`);
      return null;
    }

    const data: ApiFootballResponse<T> = await response.json();

    if (data.errors && (Array.isArray(data.errors) ? data.errors.length > 0 : Object.keys(data.errors).length > 0)) {
      console.error("API-Football returned an error:", data.errors);
      return null;
    }

    return data.response;
  } catch (error) {
    console.error("Failed to fetch from API-Football:", error);
    return null;
  }
}

function mapFixtureToMatchType(fixture: ApiFootballFixture): MatchType {
  const { status } = fixture.fixture;
  const isLive = ['1H', 'HT', '2H', 'ET', 'BT', 'P'].includes(status.short);
  const isUpcoming = status.short === 'NS' || status.short === 'TBD';

  let timeDisplay: string;
  if (isLive) {
    timeDisplay = status.elapsed ? `${status.elapsed}'` : 'Live';
  } else if (isUpcoming) {
    timeDisplay = new Date(fixture.fixture.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  } else {
    timeDisplay = 'FT';
  }

  const { home, away } = fixture.goals;

  return {
    id: fixture.fixture.id,
    team1: { name: fixture.teams.home.name, logo: fixture.teams.home.logo },
    team2: { name: fixture.teams.away.name, logo: fixture.teams.away.logo },
    score: (home !== null && away !== null) ? `${home} - ${away}` : undefined,
    time: timeDisplay,
    league: fixture.league.name,
    isLive,
    isUpcoming,
  };
}

export async function getFixturesByDateFromApi(): Promise<MatchType[]> {
  const fixtures = await fetchFromApiFootball<ApiFootballFixture[]>('fixtures', {
    league: String(PSL_LEAGUE_ID),
    season: String(getCurrentSeasonYear()),
    date: getTodayDateString(),
  });

  return fixtures ? fixtures.map(mapFixtureToMatchType) : [];
}

export async function getLiveMatches(): Promise<MatchType[]> {
  const fixtures = await fetchFromApiFootball<ApiFootballFixture[]>('fixtures', {
    live: String(PSL_LEAGUE_ID),
  });

  return fixtures ? fixtures.map(mapFixtureToMatchType) : [];
}

export async function getStandings(season: number = getCurrentSeasonYear()): Promise<LeagueStanding[]> {
  const data = await fetchFromApiFootball<ApiFootballStandingsResponse[]>('standings', {
    league: String(PSL_LEAGUE_ID),
    season: String(season),
  });

  // standings is an array of groups (PSL has one group); flatten it.
  return data?.[0]?.league?.standings?.flat() ?? [];
}
