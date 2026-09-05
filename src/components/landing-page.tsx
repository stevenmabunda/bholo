import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PSL_TEAMS } from '@/lib/psl-teams';
import { absoluteUrl } from '@/lib/site';

/**
 * The public homepage — what a logged-out visitor and every search crawler
 * land on. Before this existed, "/" redirected straight to /login, whose
 * entire visible content was ~40 characters ("BHOLO — South African Football
 * Banter"), and Google had nothing to index the site under. This page exists
 * to give it something real: the actual copy the Play Store listing uses,
 * restructured with proper headings and internal links rather than one wall
 * of promotional text.
 *
 * Deliberately a plain server component — no 'use client' — so the full
 * content is in the initial HTML response, not something a crawler has to
 * execute JS to see.
 */
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
    <div className="min-h-screen bg-background text-foreground">
      {/* JSON-LD structured data — helps Google understand this is a named
          app/organization ("BHOLO") rather than generic text, which is what
          lets a brand search for "bholo" or "bholofootball" surface a
          knowledge-panel-style result instead of just a blue link. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="flex items-center justify-between border-b px-4 py-4 sm:px-8">
        <Link href="/" aria-label="BHOLO home" className="block w-28 sm:w-32">
          <Image src="/bholo_logo.png" alt="BHOLO" width={150} height={60} priority />
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3">
          <Button asChild variant="ghost">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Create account</Link>
          </Button>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b">
          <div className="absolute inset-0 -z-10">
            <Image
              src="/og-stadium-bg.png"
              alt=""
              fill
              priority
              className="object-cover opacity-25"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40" />
          </div>
          <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-8 sm:py-28">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl">
              Football, Uninterrupted.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
              South Africa&apos;s football-exclusive social network. Come for the
              football, stay for the banter.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/signup">Join BHOLO free</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                <Link href="/login">Log in</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* What it is */}
        <section className="mx-auto max-w-3xl px-4 py-16 sm:px-8">
          <h2 className="text-2xl font-bold sm:text-3xl">
            South Africa&apos;s home for football banter
          </h2>
          <p className="mt-4 text-muted-foreground">
            BHOLO is a football-exclusive social network built ground-up for
            fans who live, breathe and bleed the beautiful game. No unrelated
            trending topics, no algorithm burying the sport you actually
            came for — every post on your timeline is about the match, the
            players, the managers and the fans. Track live{' '}
            <strong className="text-foreground">Betway Premiership</strong>{' '}
            fixtures and standings, follow the biggest European leagues, and
            drop your own match analysis alongside a community that gets it.
          </p>
        </section>

        {/* Features */}
        <section className="border-y bg-muted/30">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-8">
            <div className="grid gap-8 sm:grid-cols-2">
              <div>
                <h2 className="text-xl font-bold">Instant matchday reactions</h2>
                <p className="mt-2 text-muted-foreground">
                  Catch every raw emotion as the goals hit the back of the
                  net, live as it happens.
                </p>
              </div>
              <div>
                <h2 className="text-xl font-bold">Transfer gossip &amp; breaking news</h2>
                <p className="mt-2 text-muted-foreground">
                  Every rumour, confirmed signing and tactical breakdown, in
                  real time.
                </p>
              </div>
              <div>
                <h2 className="text-xl font-bold">Pure Diski culture</h2>
                <p className="mt-2 text-muted-foreground">
                  Local derby drama, tavern debates, and the biggest European
                  leagues — all covered.
                </p>
              </div>
              <div>
                <h2 className="text-xl font-bold">Unfiltered fan banter</h2>
                <p className="mt-2 text-muted-foreground">
                  Hot takes, legendary post-match reactions, and fans who
                  actually understand the assignment.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Built for SA football / clubs */}
        <section className="mx-auto max-w-5xl px-4 py-16 sm:px-8">
          <h2 className="text-2xl font-bold sm:text-3xl">
            Built for the heart of South African football
          </h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            From the roar in the stands eKasi to the heated arguments in
            local taverns and living rooms, BHOLO is designed around the way
            South Africans talk, celebrate and argue about football —
            whether that&apos;s the Soweto derby, a Betway Premiership squad
            selection, or a South African star shining abroad.
          </p>
          <ul className="mt-8 grid grid-cols-4 gap-4 sm:grid-cols-8" aria-label="Betway Premiership clubs covered on BHOLO">
            {PSL_TEAMS.map((team) => (
              <li key={team.slug} className="flex flex-col items-center gap-1.5 text-center">
                <div className="relative h-10 w-10 sm:h-12 sm:w-12">
                  <Image src={team.badge} alt={team.name} fill sizes="48px" className="object-contain" />
                </div>
                <span className="text-[10px] text-muted-foreground sm:text-xs">{team.name}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* CTA */}
        <section className="border-t bg-muted/30">
          <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-8">
            <h2 className="text-2xl font-bold sm:text-3xl">
              This is your football destination.
            </h2>
            <p className="mt-3 text-muted-foreground">
              Come for the football. Stay for the banter. Never leave the
              timeline.
            </p>
            <div className="mt-8">
              <Button asChild size="lg">
                <Link href="/signup">Join BHOLO free</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t px-4 py-8 text-center text-sm text-muted-foreground sm:px-8">
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <Link href="/privacy" className="hover:underline">Privacy</Link>
          <Link href="/terms" className="hover:underline">Terms</Link>
          <Link href="/help" className="hover:underline">Help</Link>
          <Link href="/feedback" className="hover:underline">Feedback</Link>
          <Link href="/delete-account" className="hover:underline">Delete account</Link>
        </nav>
        <p className="mt-4">&copy; {new Date().getFullYear()} BHOLO. Made for South African football fans.</p>
      </footer>
    </div>
  );
}
