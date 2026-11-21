'use server';

import {
  addDays,
  fixturesRevalidateSeconds,
  getFixturesBetween,
  getNextLeagueFixtures,
  getPastLeagueFixtures,
  getSastDateString,
  type FixtureEvent,
} from '@/services/thesportsdb-service';

export type FixtureGroup = {
  /** YYYY-MM-DD in SAST. */
  date: string;
  /** Human label, e.g. "Tue, 24 Nov". */
  label: string;
  /**
   * True for the provider's "next"/"past" edge fixtures that fall outside
   * the selected week. They are still shown (the free key returns very few
   * rows), but grouped after the week and labelled as recent.
   */
  outsideWindow: boolean;
  fixtures: FixtureEvent[];
};

export type GameweekFixtures = {
  groups: FixtureGroup[];
  hasLive: boolean;
  offsetWeeks: number;
  round: number | null;
  rangeLabel: string;
  /** ISO timestamp of the request, so the UI can say how fresh it is. */
  fetchedAt: string;
};

function formatDate(isoDate: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('en-ZA', {
    timeZone: 'UTC',
    ...options,
  }).format(new Date(`${isoDate}T00:00:00Z`));
}

function groupLabel(isoDate: string): string {
  return formatDate(isoDate, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function compareFixtures(a: FixtureEvent, b: FixtureEvent): number {
  if (a.date !== b.date) return a.date.localeCompare(b.date);
  if (a.kickoff !== b.kickoff) return (a.kickoff || '99:99').localeCompare(b.kickoff || '99:99');
  return a.home.name.localeCompare(b.home.name);
}

function mostCommonRound(fixtures: FixtureEvent[]): number | null {
  const counts = new Map<number, number>();
  for (const fixture of fixtures) {
    if (fixture.round === null) continue;
    counts.set(fixture.round, (counts.get(fixture.round) ?? 0) + 1);
  }
  let best: number | null = null;
  let bestCount = 0;
  for (const [round, count] of counts) {
    if (count > bestCount || (count === bestCount && best !== null && round > best)) {
      best = round;
      bestCount = count;
    }
  }
  return best;
}

/**
 * One week of PSL fixtures, centred on today (or a neighbouring week).
 *
 * TheSportsDB's free key has no "gameweek" endpoint: eventsday answers a
 * specific date, while eventsnextleague/eventspastleague answer "next" and
 * "most recent". The first tab uses all three, which is what makes the
 * upcoming fixture and a recent result both visible on the free tier; a
 * Premium key simply returns more rows from the same calls.
 */
export async function getGameweekFixtures(offsetWeeks = 0): Promise<GameweekFixtures> {
  const safeOffset = Number.isFinite(offsetWeeks) ? Math.trunc(offsetWeeks) : 0;
  const today = getSastDateString();
  const centre = addDays(today, safeOffset * 7);
  const start = addDays(centre, -3);
  const end = addDays(centre, 3);
  const revalidate = fixturesRevalidateSeconds();

  const [windowFixtures, nextFixtures, pastFixtures] = await Promise.all([
    getFixturesBetween(start, end, revalidate),
    safeOffset === 0 ? getNextLeagueFixtures(revalidate) : Promise.resolve([]),
    safeOffset === 0 ? getPastLeagueFixtures(revalidate) : Promise.resolve([]),
  ]);

  // The same fixture can be returned by eventsday, eventsnextleague and
  // eventspastleague; idEvent is stable, so first write wins.
  const byId = new Map<string, FixtureEvent>();
  for (const fixture of [...windowFixtures, ...nextFixtures, ...pastFixtures]) {
    byId.set(fixture.id, fixture);
  }

  const fixtures = [...byId.values()].sort(compareFixtures);

  const groupsByDate = new Map<string, FixtureEvent[]>();
  for (const fixture of fixtures) {
    if (!fixture.date) continue;
    const list = groupsByDate.get(fixture.date) ?? [];
    list.push(fixture);
    groupsByDate.set(fixture.date, list);
  }

  const groups: FixtureGroup[] = [...groupsByDate.entries()]
    .sort(([a], [b]) => {
      const aOutside = a < start || a > end ? 1 : 0;
      const bOutside = b < start || b > end ? 1 : 0;
      return aOutside - bOutside || a.localeCompare(b);
    })
    .map(([date, list]) => ({
      date,
      label: groupLabel(date),
      outsideWindow: date < start || date > end,
      fixtures: list.sort(compareFixtures),
    }));

  return {
    groups,
    hasLive: fixtures.some((fixture) => fixture.status === 'live'),
    offsetWeeks: safeOffset,
    // The next round is the useful label; fall back to whichever round most
    // of the window belongs to (e.g. when browsing an older week).
    round: nextFixtures[0]?.round ?? mostCommonRound(fixtures),
    rangeLabel: `${groupLabel(start)} – ${groupLabel(end)}`,
    fetchedAt: new Date().toISOString(),
  };
}
