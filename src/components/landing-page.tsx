import Image from 'next/image';
import Link from 'next/link';
import { PSL_TEAMS } from '@/lib/psl-teams';
import { absoluteUrl } from '@/lib/site';
import { Zap, FileText, Users, MessageCircle, Twitter, Instagram, Facebook, Youtube } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AuthModalProvider } from '@/contexts/auth-modal-context';
import { AuthModal } from '@/components/auth/auth-modal';
import { AuthTriggerButton } from '@/components/auth/auth-trigger-button';

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

function HeroPhoto({
  src,
  alt,
  caption,
  className,
  objectPosition = '50% 50%',
  heading,
  actions,
}: {
  src: string;
  alt: string;
  /** Omit to skip the rotated corner caption entirely (the hero photo has
   *  no room for one once `heading`/`actions` are covering it). */
  caption?: string;
  className?: string;
  /** Where object-cover anchors its crop. The group shot in the hero has
   *  someone right at the edge of frame, and centring the crop cut most of
   *  her out — shifting the anchor right keeps her in view instead. */
  objectPosition?: string;
  /** Mobile only — the hero's own heading + copy rendered on top of the
   *  photo instead of above it. Desktop keeps its own inline copy beside
   *  the photo, so this is hidden from lg up. */
  heading?: React.ReactNode;
  /** Mobile only — pinned to the bottom of the photo instead, e.g. the
   *  hero's CTA buttons. Same lg:hidden treatment as `heading`. */
  actions?: React.ReactNode;
}) {
  return (
    <div className={cn('relative', className)}>
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl lg:aspect-auto lg:h-[560px] lg:rounded-none">
        {/* The slanted left edge separating photo from text column — only
            past the point content stacks, so mobile keeps a plain rounded
            photo instead of a tight, ugly crop. */}
        <div className="h-full w-full lg:[clip-path:polygon(12%_0,100%_0,100%_100%,0_100%)]">
          <Image
            src={src}
            alt={alt}
            fill
            priority
            unoptimized
            className="object-cover"
            style={{ objectPosition }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent lg:bg-gradient-to-l lg:from-transparent lg:via-transparent lg:to-black/10" />
          {heading && (
            <div className="absolute inset-x-0 top-0 h-3/5 bg-gradient-to-b from-black/75 via-black/40 to-transparent lg:hidden" aria-hidden />
          )}
        </div>
      </div>
      {heading && <div className="absolute left-4 right-4 top-4 lg:hidden">{heading}</div>}
      {actions && <div className="absolute inset-x-4 bottom-4 lg:hidden">{actions}</div>}
      {caption && (
        <p className="absolute bottom-4 right-4 max-w-[10rem] -rotate-3 text-right text-sm font-bold uppercase leading-tight text-white drop-shadow-lg sm:bottom-6 sm:right-6">
          {caption.split('\n').map((line, i) => (
            <span key={i} className="block">
              {line}
            </span>
          ))}
          <span className="mt-1 block h-1 w-12 rounded-full bg-primary" aria-hidden />
        </p>
      )}
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
    body: 'Local diski drama, culture defining memes, trolling, soccer jerseys, stats, nerds, die-hards and more — all found here.',
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

// lucide-react has no TikTok glyph — small inline mark, same 24x24 grid and
// stroke conventions as the lucide icons it sits next to in the footer row.
function TikTokIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12.53.02C13.84 0 15.14.01 16.44.02c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  );
}

const SOCIAL_LINKS = [
  { icon: Twitter, label: 'X (Twitter)', href: 'https://x.com/BHOLOapp' },
  { icon: Instagram, label: 'Instagram', href: 'https://www.instagram.com/bholoapp/' },
  { icon: Facebook, label: 'Facebook', href: 'https://www.facebook.com/bholoapp' },
  { icon: Youtube, label: 'YouTube', href: 'https://www.youtube.com/@BHOLOapp' },
  { icon: TikTokIcon, label: 'TikTok', href: 'https://www.tiktok.com/@bholofootball' },
];

/**
 * No live store links yet — App Store and Play Store URLs go here the
 * moment BHOLO's listings exist. Placeholder hrefs until then.
 */
const STORE_LINKS = {
  appStore: '#',
  playStore: '#',
};

// Official Apple/Google badge artwork (sourced from Apple's and Google's own
// badge-generator endpoints) — not a redrawn approximation, so their brand
// guidelines on it staying unmodified hold.
function StoreBadges({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      <a href={STORE_LINKS.appStore} className="transition-opacity hover:opacity-80">
        <Image
          src="/app-store-badge.svg"
          alt="Download on the App Store"
          width={120}
          height={40}
          unoptimized
          className="h-10 w-auto"
        />
      </a>
      <a href={STORE_LINKS.playStore} className="transition-opacity hover:opacity-80">
        <Image
          src="/google-play-badge.png"
          alt="Get it on Google Play"
          width={646}
          height={250}
          unoptimized
          className="h-14 w-auto"
        />
      </a>
    </div>
  );
}

export function LandingPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        name: 'BHOLO',
        alternateName: "Mzansi's Official Football Timeline",
        url: absoluteUrl('/'),
        description:
          "South Africa's football-exclusive social network. You came for football — BHOLO gives you the one thing you actually came for.",
        inLanguage: 'en-ZA',
      },
      {
        '@type': 'MobileApplication',
        name: "BHOLO: It's Football, Uninterrupted",
        applicationCategory: 'SocialNetworkingApplication',
        operatingSystem: 'Android, Web',
        description:
          "South Africa's football-exclusive social network — Betway Premiership banter, PSL fixtures and standings, transfer news, and every club from Kaizer Chiefs to Orlando Pirates to Mamelodi Sundowns, all in one timeline.",
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
    <AuthModalProvider>
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <AuthModal />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-8">
          <Link href="/" aria-label="BHOLO home" className="flex items-center gap-2">
            <span className="h-6 w-1.5 shrink-0 -skew-x-12 rounded-sm bg-primary" aria-hidden />
            <span className="flex flex-col leading-none">
              <Image src="/officialogo.png" alt="BHOLO" width={893} height={272} unoptimized className="h-6 w-auto self-start" />
              <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                South Africa&apos;s Football Timeline
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

          {/* Repeats the hero's own Log in / Create account buttons one
              scroll away — only worth the header space once there's room
              for a nav row alongside it. */}
          <div className="hidden items-center gap-2 sm:gap-3 md:flex">
            <AuthTriggerButton mode="login" variant="outline" className="rounded-full">
              Log in
            </AuthTriggerButton>
            <AuthTriggerButton mode="signup" className="rounded-full">
              Create account
            </AuthTriggerButton>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="border-b border-white/10">
          {/* Mobile only — sits right below the header, above the photo.
              The real H1 now lives inside the photo (HeroPhoto's `heading`
              below); this is just the lead-in line above it. */}
          <p className="px-4 pt-8 text-lg font-semibold text-muted-foreground sm:px-8 lg:hidden">
            Join Mzansi&apos;s football-exclusive social network.
          </p>

          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-4 sm:px-8 sm:py-16 lg:grid-cols-2 lg:items-center lg:gap-0 lg:py-0">
            {/* Below lg, none of this renders here at all — copy and CTAs
                move onto the photo instead (HeroPhoto's `heading`/`actions`
                props below), so mobile doesn't carry a second, hidden copy
                of the same buttons sitting in dead space. */}
            <div className="hidden lg:block lg:py-16">
              <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight lg:text-7xl">
                It&apos;s Football,
                <br />
                <span className="text-primary">Uninterrupted.</span>
              </h1>
              <p className="mt-6 max-w-md text-lg text-muted-foreground">
                Join Mzansi&apos;s football-exclusive social network. Come for
                the football, stay for the banter.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <AuthTriggerButton mode="signup" size="lg" className="rounded-full">
                  Create account
                </AuthTriggerButton>
                <AuthTriggerButton mode="login" size="lg" variant="outline" className="rounded-full">
                  Log in
                </AuthTriggerButton>
              </div>

              <StoreBadges className="mt-12 border-t border-white/10 pt-8" />
            </div>

            <HeroPhoto
              src="/homepage/homepage_01.jpg"
              alt="A group of BHOLO fans in branded jerseys on the stadium steps"
              objectPosition="78% 50%"
              heading={
                <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl">
                  It&apos;s Football,
                  <br />
                  <span className="text-primary">Uninterrupted.</span>
                </h1>
              }
              actions={
                <div className="flex flex-wrap items-center gap-3">
                  <AuthTriggerButton mode="signup" size="lg" className="rounded-full">
                    Create account
                  </AuthTriggerButton>
                  <AuthTriggerButton
                    mode="login"
                    size="lg"
                    variant="outline"
                    className="rounded-full border-white/40 bg-transparent text-white hover:bg-white/10"
                  >
                    Log in
                  </AuthTriggerButton>
                </div>
              }
            />
          </div>

          {/* Mobile only — badges sit below the photo, not on top of it. */}
          <StoreBadges className="justify-center px-4 pb-12 sm:px-8 lg:hidden" />
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
              <h2 className="text-3xl font-extrabold leading-tight text-primary sm:text-4xl">
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
              src="/homepage/homepage_02.jpg"
              alt="BHOLO fans in branded jerseys outside a spaza shop"
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
              <h2 className="text-3xl font-extrabold leading-tight text-primary sm:text-4xl">
                Join Mzansi&apos;s official football timeline.
              </h2>
              <p className="mt-4 text-lg font-semibold text-foreground">
                You came for football. Get the football.
              </p>
              <p className="mt-4 text-muted-foreground">
                Other platforms give you everything. News, celebrities,
                memes, politics, food, whatever the algorithm feels like
                serving you.
              </p>
              <p className="mt-4 text-muted-foreground">
                BHOLO gives you the one thing you actually came for: football.
              </p>
              <p className="mt-4 text-muted-foreground">
                Built for Mzansi&apos;s football community, BHOLO puts South
                African football at the centre — get Betway Premiership
                banter in all its glory. The clubs, players, managers and
                crazy fans who make the game what it is.
              </p>
              <p className="mt-4 text-muted-foreground">
                Follow your teams. Track live fixtures and standings. Share
                your match analysis. Debate the big moments and make us
                laugh. This is the only football timeline that gets it, and
                will proudly tolerate your obsession with the game.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <AuthTriggerButton mode="signup" size="lg" className="rounded-full">
                  Join BHOLO free
                </AuthTriggerButton>
                <AuthTriggerButton mode="login" size="lg" variant="outline" className="rounded-full">
                  Log in
                </AuthTriggerButton>
              </div>
            </div>

            <HeroPhoto
              src="/homepage/homepage_03.jpg"
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
                <Image src="/officialogo.png" alt="BHOLO" width={893} height={272} unoptimized className="h-5 w-auto self-start" />
                <span className="mt-1 text-[8px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  South Africa&apos;s Football Timeline
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
                  target="_blank"
                  rel="noopener noreferrer"
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
    </AuthModalProvider>
  );
}
