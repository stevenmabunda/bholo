/**
 * The 16 Betway Premiership clubs, for the onboarding team picker.
 *
 * Crests are downloaded into /public/teams rather than hot-linked from
 * TheSportsDB — onboarding is the first screen a new user hits after
 * confirming their email, so it can't depend on a third-party API being up.
 * Re-run the fetch in the same session's history if a badge ever needs
 * refreshing (TheSportsDB's free key, via eventsseason.php — team lookup
 * endpoints don't return badges on the free tier, but season fixtures do).
 */
export type PslTeam = {
  slug: string;
  name: string;
  badge: string;
};

export const PSL_TEAMS: PslTeam[] = [
  { slug: 'amazulu', name: 'AmaZulu', badge: '/teams/amazulu.png' },
  { slug: 'chippa-united', name: 'Chippa United', badge: '/teams/chippa-united.png' },
  { slug: 'durban-city', name: 'Durban City', badge: '/teams/durban-city.png' },
  { slug: 'golden-arrows', name: 'Golden Arrows', badge: '/teams/golden-arrows.png' },
  { slug: 'kaizer-chiefs', name: 'Kaizer Chiefs', badge: '/teams/kaizer-chiefs.png' },
  { slug: 'kruger-united', name: 'Kruger United', badge: '/teams/kruger-united.png' },
  { slug: 'mamelodi-sundowns', name: 'Mamelodi Sundowns', badge: '/teams/mamelodi-sundowns.png' },
  { slug: 'marumo-gallants', name: 'Marumo Gallants', badge: '/teams/marumo-gallants.png' },
  { slug: 'milford', name: 'Milford', badge: '/teams/milford.png' },
  { slug: 'orlando-pirates', name: 'Orlando Pirates', badge: '/teams/orlando-pirates.png' },
  { slug: 'polokwane-city', name: 'Polokwane City', badge: '/teams/polokwane-city.png' },
  { slug: 'richards-bay', name: 'Richards Bay', badge: '/teams/richards-bay.png' },
  { slug: 'sekhukhune-united', name: 'Sekhukhune United', badge: '/teams/sekhukhune-united.png' },
  { slug: 'siwelele', name: 'Siwelele', badge: '/teams/siwelele.png' },
  { slug: 'stellenbosch', name: 'Stellenbosch', badge: '/teams/stellenbosch.png' },
  { slug: 'ts-galaxy', name: 'TS Galaxy', badge: '/teams/ts-galaxy.png' },
];
