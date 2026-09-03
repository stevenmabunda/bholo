/**
 * The 16 Betway Premiership clubs, for the onboarding team picker and for
 * matching posts to a viewer's team in the feed (see getRecentPosts).
 *
 * Crests are downloaded into /public/teams rather than hot-linked from
 * TheSportsDB — onboarding is the first screen a new user hits after
 * confirming their email, so it can't depend on a third-party API being up.
 * Re-run the fetch in the same session's history if a badge ever needs
 * refreshing (TheSportsDB's free key, via eventsseason.php — team lookup
 * endpoints don't return badges on the free tier, but season fixtures do).
 *
 * `aliases` back the feed's team-first matching (ILIKE against post
 * content) — deliberately conservative. Short/generic words are left out
 * even where a real nickname exists (e.g. "Downs" for Sundowns) because
 * they'd match unrelated posts too often; better to under-match than to
 * surface a post that has nothing to do with the club.
 */
export type PslTeam = {
  slug: string;
  name: string;
  badge: string;
  aliases: string[];
};

export const PSL_TEAMS: PslTeam[] = [
  { slug: 'amazulu', name: 'AmaZulu', badge: '/teams/amazulu.png', aliases: ['AmaZulu', 'Usuthu'] },
  { slug: 'chippa-united', name: 'Chippa United', badge: '/teams/chippa-united.png', aliases: ['Chippa United', 'Chippa'] },
  { slug: 'durban-city', name: 'Durban City', badge: '/teams/durban-city.png', aliases: ['Durban City'] },
  { slug: 'golden-arrows', name: 'Golden Arrows', badge: '/teams/golden-arrows.png', aliases: ['Golden Arrows', "Abafana Bes'thende"] },
  { slug: 'kaizer-chiefs', name: 'Kaizer Chiefs', badge: '/teams/kaizer-chiefs.png', aliases: ['Kaizer Chiefs', 'Amakhosi'] },
  { slug: 'kruger-united', name: 'Kruger United', badge: '/teams/kruger-united.png', aliases: ['Kruger United'] },
  { slug: 'mamelodi-sundowns', name: 'Mamelodi Sundowns', badge: '/teams/mamelodi-sundowns.png', aliases: ['Mamelodi Sundowns', 'Sundowns', 'Masandawana'] },
  { slug: 'marumo-gallants', name: 'Marumo Gallants', badge: '/teams/marumo-gallants.png', aliases: ['Marumo Gallants', 'Gallants'] },
  { slug: 'milford', name: 'Milford', badge: '/teams/milford.png', aliases: ['Milford'] },
  { slug: 'orlando-pirates', name: 'Orlando Pirates', badge: '/teams/orlando-pirates.png', aliases: ['Orlando Pirates', 'Bucs', 'Buccaneers'] },
  { slug: 'polokwane-city', name: 'Polokwane City', badge: '/teams/polokwane-city.png', aliases: ['Polokwane City'] },
  { slug: 'richards-bay', name: 'Richards Bay', badge: '/teams/richards-bay.png', aliases: ['Richards Bay'] },
  { slug: 'sekhukhune-united', name: 'Sekhukhune United', badge: '/teams/sekhukhune-united.png', aliases: ['Sekhukhune United', 'Sekhukhune', 'Babina Noko'] },
  { slug: 'siwelele', name: 'Siwelele', badge: '/teams/siwelele.png', aliases: ['Siwelele'] },
  { slug: 'stellenbosch', name: 'Stellenbosch', badge: '/teams/stellenbosch.png', aliases: ['Stellenbosch', 'Stellies'] },
  { slug: 'ts-galaxy', name: 'TS Galaxy', badge: '/teams/ts-galaxy.png', aliases: ['TS Galaxy'] },
];

/** Case-sensitivity is handled by the caller (Postgres ILIKE); this just
 *  looks the team up by its stored profiles.favourite_club value. */
export function getTeamByName(name: string | null | undefined): PslTeam | undefined {
  if (!name) return undefined;
  return PSL_TEAMS.find((t) => t.name === name);
}
