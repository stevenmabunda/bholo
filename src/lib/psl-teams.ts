/**
 * The 16 Betway Premiership clubs, for the onboarding team picker and for
 * crest resolution across fixtures, results and the live match thread.
 *
 * Crests live in /public/teams rather than being hot-linked from TheSportsDB.
 * The community badges on the API are sometimes wrong or stale for renamed
 * clubs, and a fixture card that shows the wrong badge is worse than one with
 * no badge at all. `getClubCrest` always maps a PSL team name to the local
 * file, and only falls back to the API badge for non-PSL opposition (cups,
 * friendlies).
 *
 * Aliases exist because TheSportsDB's spelling drifts ("Amazulu" without the
 * capital Z, "Sekhukhune Utd", "Royal AM" before the Siwelele rename). Name
 * matching is deliberately loose: lowercase, punctuation and a trailing "FC"
 * are ignored, so most variants need no alias at all.
 */
export type PslTeam = {
  slug: string;
  name: string;
  badge: string;
  /** Other names TheSportsDB and broadcasters use for the same club. */
  aliases: string[];
};

export const PSL_TEAMS: PslTeam[] = [
  {
    slug: 'amazulu',
    name: 'AmaZulu',
    badge: '/teams/amazulu.png',
    aliases: ['AmaZulu FC', 'Amazulu FC', 'AmaZulu Football Club', 'Usuthu'],
  },
  {
    slug: 'chippa-united',
    name: 'Chippa United',
    badge: '/teams/chippa-united.png',
    aliases: ['Chippa United FC', 'Chippa Utd', 'Chilli Boys'],
  },
  {
    slug: 'durban-city',
    name: 'Durban City',
    badge: '/teams/durban-city.png',
    aliases: ['Durban City FC', 'Durban City Football Club'],
  },
  {
    slug: 'golden-arrows',
    name: 'Golden Arrows',
    badge: '/teams/golden-arrows.png',
    aliases: [
      'Golden Arrows FC',
      'Lamontville Golden Arrows',
      'Lamontville Golden Arrows FC',
      'Abafana Bes\u2019thende',
    ],
  },
  {
    slug: 'kaizer-chiefs',
    name: 'Kaizer Chiefs',
    badge: '/teams/kaizer-chiefs.png',
    aliases: ['Kaizer Chiefs FC', 'Kaizer Chiefs Football Club', 'Chiefs', 'Amakhosi'],
  },
  {
    slug: 'kruger-united',
    name: 'Kruger United',
    badge: '/teams/kruger-united.png',
    aliases: ['Kruger United FC', 'Kruger United Football Club'],
  },
  {
    slug: 'mamelodi-sundowns',
    name: 'Mamelodi Sundowns',
    badge: '/teams/mamelodi-sundowns.png',
    aliases: [
      'Mamelodi Sundowns FC',
      'Mamelodi Sundowns Football Club',
      'Sundowns',
      'Masandawana',
      'The Brazilians',
    ],
  },
  {
    slug: 'marumo-gallants',
    name: 'Marumo Gallants',
    badge: '/teams/marumo-gallants.png',
    aliases: ['Marumo Gallants FC', 'Marumo Gallants Football Club', 'Gallants'],
  },
  {
    slug: 'milford',
    name: 'Milford',
    badge: '/teams/milford.png',
    aliases: ['Milford FC', 'Milford Football Club'],
  },
  {
    slug: 'orlando-pirates',
    name: 'Orlando Pirates',
    badge: '/teams/orlando-pirates.png',
    aliases: [
      'Orlando Pirates FC',
      'Orlando Pirates Football Club',
      'Pirates',
      'Buccaneers',
      'Happy People',
    ],
  },
  {
    slug: 'polokwane-city',
    name: 'Polokwane City',
    badge: '/teams/polokwane-city.png',
    aliases: ['Polokwane City FC', 'Polokwane City Football Club', 'Rise and Shine'],
  },
  {
    slug: 'richards-bay',
    name: 'Richards Bay',
    badge: '/teams/richards-bay.png',
    aliases: ['Richards Bay FC', 'Richards Bay Football Club', 'The Natal Rich Boyz'],
  },
  {
    slug: 'sekhukhune-united',
    name: 'Sekhukhune United',
    badge: '/teams/sekhukhune-united.png',
    aliases: [
      'Sekhukhune United FC',
      'Sekhukhune Utd',
      'Sekhukhune Utd FC',
      'Sekhukhune',
      'Babina Noko',
    ],
  },
  {
    slug: 'siwelele',
    name: 'Siwelele',
    badge: '/teams/siwelele.png',
    aliases: [
      'Siwelele FC',
      'Siwelele Football Club',
      // The club formerly known as Royal AM; older fixtures still carry it.
      'Royal AM',
      'Royal AM FC',
      'Bloemfontein Celtic',
      'Bloemfontein Celtic FC',
    ],
  },
  {
    slug: 'stellenbosch',
    name: 'Stellenbosch',
    badge: '/teams/stellenbosch.png',
    aliases: ['Stellenbosch FC', 'Stellenbosch Football Club', 'Stellies'],
  },
  {
    slug: 'ts-galaxy',
    name: 'TS Galaxy',
    badge: '/teams/ts-galaxy.png',
    aliases: ['TS Galaxy FC', 'TS Galaxy Football Club', 'The Rockets'],
  },
];

export const PLACEHOLDER_CREST = '/teams/placeholder.png';

/**
 * Lowercase, strip accents, punctuation and a trailing "FC"/"Football Club".
 * "Sekhukhune Utd." and "Sekhukhune United FC" are different names, so "Utd"
 * is expanded before matching.
 */
function normaliseClubName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\butd\b/g, 'united')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\bfc\b/g, ' ')
    .replace(/\bfootball club\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const CREST_BY_NAME = new Map<string, string>();
for (const team of PSL_TEAMS) {
  for (const alias of [team.name, team.slug, ...team.aliases]) {
    const key = normaliseClubName(alias);
    // First club wins: names are unique after normalisation, and keeping the
    // first means a shared alias can never silently reassign a crest.
    if (key && !CREST_BY_NAME.has(key)) CREST_BY_NAME.set(key, team.badge);
  }
}

/**
 * Resolve any name for a PSL club to its local crest. Anything else (cup
 * opposition, a club that has since been relegated) keeps the provider's
 * badge, and a missing badge gets a neutral placeholder rather than a broken
 * image.
 */
export function getClubCrest(
  teamName: string | null | undefined,
  fallback?: string | null
): string {
  if (teamName) {
    const crest = CREST_BY_NAME.get(normaliseClubName(teamName));
    if (crest) return crest;
  }
  return fallback || PLACEHOLDER_CREST;
}
