import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PSL_TEAMS } from '@/lib/psl-teams';
import { absoluteUrl } from '@/lib/site';
import { Zap, FileText, Users, MessageCircle, Twitter, Instagram, Facebook, Youtube } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * The public homepage — what a logged-out visitor and every search crawler
 * land on. Before this existed, "/" redirected straight to /login, whose
 * entire visible content was ~40 characters, and Google had nothing to
 * index the site under. Rebuilt to match the approved marketing mockup —
 * see the PR/commit this shipped in for the reference image.
 *
 * The three hero/section photos (a Kaizer Chiefs supporter, an Orlando
 * Pirates fan with a "Soweto is football" banner, someone blowing a
 * vuvuzela at sunset) aren't in this repo — /public has no matching
 * photography, and fabricating stand-ins of real people or specific club
 * imagery isn't something to do quietly. All three currently fall back to
 * the existing stadium-crowd photo already licensed for this site (it's
 * the OG-image background). Drop the real three into /public and swap the
 * `src` on each <HeroPhoto> below to finish this exactly as designed.
 *
 * Deliberately a plain server component — no 'use client' — so the full
 * content is in the initial HTML response, not something a crawler has to
 * execute JS to see.
 */

const FALLBACK_PHOTO = '/og-stadium-bg.png';

function HeroPhoto({
  src,
  alt,
  caption,
  className,
}: {
  src: string;
  alt: string;
  caption: string;
  className?: string;
}) {
  return (
    <div className={cn('relative', className)}>
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl lg:aspect-auto lg:h-[560px] lg:rounded-none">
        {/* The slanted left edge separating photo from text column — only
            past the point content stacks, so mobile keeps a plain rounded
            photo instead of a tight, ugly crop. */}
        <div className="h-full w-full lg:[clip-path:polygon(12%_0,100%_0,100%_100%,0_100%)]">
          <Image src={src} alt={alt} fill priority className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent lg:bg-gradient-to-l lg:from-transparent lg:via-transparent lg:to-black/10" />
        </div>
      </div>
      <p className="absolute bottom-4 right-4 max-w-[10rem] -rotate-3 text-right text-sm font-bold uppercase leading-tight text-white drop-shadow-lg sm:bottom-6 sm:right-6">
        {caption.split('\n').map((line, i) => (
          <span key={i} className="block">
            {line}
          </span>
        ))}
        <span className="mt-1 block h-1 w-12 rounded-full bg-primary" aria-hidden />
      </p>
    </div>
  );
}

const FEATURES = [
  {
    icon: Zap,
    title: 'Instant matchday reactions',
    body: 'Catch every raw emotion as the goals hit the back of the net, live as it happens.',
  },
  {
    icon: FileText,
    title: 'Transfer gossip & breaking news',
    body: 'Every rumour, confirmed signing and tactical breakdown, in real time.',
  },
  {
    icon: Users,
    title: 'Pure Diski culture',
    body: 'Local derby drama, tavern debates, and the biggest European leagues — all covered.',
  },
  {
    icon: MessageCircle,
    title: 'Unfiltered fan banter',
    body: 'Hot takes, legendary post-match reactions, and fans who actually understand the assignment.',
  },
];

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '#features', label: 'Features' },
  { href: '#clubs', label: 'Leagues' },
  { href: '#community', label: 'Community' },
];

const FOOTER_LINKS = [
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
  { href: '/help', label: 'Help' },
  { href: '/feedback', label: 'Feedback' },
  { href: '/delete-account', label: 'Delete account' },
];

// No confirmed handles exist for BHOLO yet — these link nowhere until real
// profiles do. Rendered anyway because the mark of social presence matters
// for a marketing page even before the accounts are live; swap the hrefs in
// the moment they exist.
const SOCIAL_LINKS = [
  { icon: Twitter, label: 'X (Twitter)', href: '#' },
  { icon: Instagram, label: 'Instagram', href: '#' },
  { icon: Facebook, label: 'Facebook', href: '#' },
  { icon: Youtube, label: 'YouTube', href: '#' },
];

export function LandingPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        name: 'BHOLO',
        alternateName: 'BHOLO Football',
        url: absoluteUrl('/'),
        description:
          "South Africa's football-exclusive social network. Come for the football, stay for the banter.",
        inLanguage: 'en-ZA',
      },
      {
        '@type': 'MobileApplication',
        name: 'BHOLO: Football, Uninterrupted',
        applicationCategory: 'SocialNetworkingApplication',
        operatingSystem: 'Android, Web',
        description:
          "South Africa's premier football-exclusive social network — Betway Premiership fixtures, transfer news, and matchday banter for Kaizer Chiefs, Orlando Pirates, Mamelodi Sundowns and every PSL club.",
        url: absoluteUrl('/'),
      },
      {
        '@type': 'Organization',
        name: 'BHOLO',
        url: absoluteUrl('/'),
        logo: absoluteUrl('/bholo_logo.png'),
      },
    ],
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-8">
          <Link href="/" aria-label="BHOLO home" className="flex items-center gap-2">
            <span className="h-6 w-1.5 shrink-0 -skew-x-12 rounded-sm bg-primary" aria-hidden />
            <span className="flex flex-col leading-none">
              <span className="text-xl font-extrabold tracking-tight">BHOLO</span>
              <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Football lives here
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-semibold md:flex">
            {NAV_LINKS.map((link, i) => (
              <a
                key={link.href}
                href={link.href}
                className={cn(
                  'transition-colors hover:text-primary',
                  i === 0 ? 'text-primary' : 'text-foreground/90'
                )}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild className="rounded-full">
              <Link href="/signup">Create account</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="border-b border-white/10">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-8 sm:py-16 lg:grid-cols-2 lg:items-center lg:gap-0 lg:py-0">
            <div className="lg:py-16">
              <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
                Football,
                <br />
                <span className="text-primary">Uninterrupted.</span>
              </h1>
              <p className="mt-6 max-w-md text-lg text-muted-foreground">
                South Africa&apos;s football-exclusive social network. Come for
                the football, stay for the banter.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="rounded-full">
                  <Link href="/signup">Join BHOLO free</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-full">
                  <Link href="/login">Log in</Link>
                </Button>
              </div>

              <dl className="mt-12 flex max-w-lg items-start gap-6 border-t border-white/10 pt-8">
                {[
                  { value: '20M+', label: 'Fans' },
                  { value: 'All Leagues', label: 'Local & International' },
                  { value: 'One Community', label: 'Football Lives Here' },
                ].map((stat, i) => (
                  <div key={stat.label} className={cn('flex-1', i > 0 && 'border-l border-white/10 pl-6')}>
                    <dt className="text-xl font-extrabold sm:text-2xl">{stat.value}</dt>
                    <dd className="mt-0.5 text-xs text-muted-foreground">{stat.label}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <HeroPhoto
              src="/homepage/homepage_01.jpg"
              alt="A group of BHOLO fans in branded jerseys on the stadium steps"
              caption={'More than\na game'}
            />
          </div>
        </section>

        {/* Features / Banter */}
        <section id="features" className="relative overflow-hidden border-b border-white/10 bg-secondary/40">
          <span
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 -z-0 -translate-x-1/2 -translate-y-1/2 select-none whitespace-nowrap text-[18vw] font-extrabold uppercase leading-none tracking-tight text-white/5 sm:text-[12rem]"
          >
            Banter
          </span>

          <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-8 sm:py-24">
            <div className="grid gap-x-16 gap-y-10 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
              <div className="grid gap-x-16 gap-y-10 sm:col-span-2 sm:grid-cols-2 lg:col-span-2">
                {FEATURES.map(({ icon: Icon, title, body }) => (
                  <div key={title}>
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-primary text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h2 className="mt-4 text-xl font-bold">{title}</h2>
                    <p className="mt-2 text-muted-foreground">{body}</p>
                  </div>
                ))}
              </div>

              <p className="hidden self-center justify-self-end rotate-3 text-right text-2xl font-bold uppercase leading-tight lg:block">
                Fans talk
                <br />
                different
                <br />
                here
                <span className="mt-2 block h-1 w-16 rounded-full bg-primary" aria-hidden />
              </p>
            </div>
          </div>
        </section>

        {/* Clubs / culture */}
        <section id="clubs" className="border-b border-white/10">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-8 sm:py-24 lg:grid-cols-2 lg:items-center lg:gap-0">
            <div className="lg:pr-16">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">
                Clubs. Cities. Culture.
              </p>
              <h2 className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl">
                Built for the heart of South African football
              </h2>
              <p className="mt-4 text-muted-foreground">
                South African football has a rhythm, a banter, and a pride
                that belongs entirely to us. BHOLO puts the{' '}
                <strong className="text-foreground">PSL</strong> and local
                teams where they truly belong — right at the very center.
              </p>
              <p className="mt-4 text-muted-foreground">
                From the high-stakes drama of the{' '}
                <strong className="text-foreground">Soweto Derby</strong> to
                the knockout magic of the{' '}
                <strong className="text-foreground">
                  MTN8, Carling Knockout, and Nedbank Cup
                </strong>
                , this is where we celebrate what makes our game special. No
                foreign noise — just pure local pride, tavern debates, and
                fans who love the local game as much as you do. Rep your
                club, stand your ground, and reclaim the narrative.
              </p>
            </div>

            <HeroPhoto
              src={FALLBACK_PHOTO}
              alt="Fans in the stands at a South African derby"
              caption={'Soweto is\nfootball'}
            />
          </div>

          <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-8 sm:pb-24">
            <ul
              className="grid grid-cols-4 gap-x-4 gap-y-8 sm:grid-cols-8"
              aria-label="Betway Premiership clubs covered on BHOLO"
            >
              {PSL_TEAMS.map((team) => (
                <li key={team.slug} className="flex flex-col items-center gap-2 text-center">
                  <div className="relative h-12 w-12 sm:h-14 sm:w-14">
                    <Image src={team.badge} alt={team.name} fill sizes="56px" className="object-contain" />
                  </div>
                  <span className="text-[11px] leading-tight text-muted-foreground sm:text-xs">
                    {team.name}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Join / CTA */}
        <section id="community">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-8 sm:py-24 lg:grid-cols-2 lg:items-center lg:gap-0">
            <div className="lg:pr-16">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">
                Join the movement
              </p>
              <h2 className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl">
                South Africa&apos;s home for <span className="text-primary">football banter</span>
              </h2>
              <p className="mt-4 text-muted-foreground">
                BHOLO is a football-exclusive social network built ground-up
                for fans who live, breathe and bleed the beautiful game. No
                unrelated trending topics, no algorithm burying the sport you
                actually came for — every post on your timeline is about the
                match, the players, the managers and the fans.{' '}
                <strong className="text-foreground">
                  Track live Betway Premiership
                </strong>{' '}
                fixtures and standings, follow the biggest European leagues,
                and drop your own match analysis alongside a community that
                gets it.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="rounded-full">
                  <Link href="/signup">Join BHOLO free</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-full">
                  <Link href="/login">Log in</Link>
                </Button>
              </div>
            </div>

            <HeroPhoto
              src={FALLBACK_PHOTO}
              alt="A fan celebrating at sunset with the South African flag"
              caption={'Same passion.\nBigger conversations.'}
            />
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-8">
          <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
            <Link href="/" className="flex items-center gap-2">
              <span className="h-5 w-1.5 shrink-0 -skew-x-12 rounded-sm bg-primary" aria-hidden />
              <span className="flex flex-col leading-none">
                <span className="text-lg font-extrabold tracking-tight">BHOLO</span>
                <span className="text-[8px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Football lives here
                </span>
              </span>
            </Link>

            <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              {FOOTER_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="hover:text-foreground hover:underline">
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-4">
              {SOCIAL_LINKS.map(({ icon: Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  <Icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          <p className="mt-8 border-t border-white/10 pt-6 text-center text-xs text-muted-foreground sm:text-left">
            &copy; {new Date().getFullYear()} BHOLO. Made for South African football fans.
          </p>
        </div>
      </footer>
    </div>
  );
}
