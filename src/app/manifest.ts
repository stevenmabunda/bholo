import type { MetadataRoute } from 'next';

// Feeds Next's auto-generated /manifest.webmanifest route (no static JSON
// file needed — see middleware.ts's note on this being a crawler-fetched
// root route). This is also what a Trusted Web Activity reads to decide the
// installed app's identity, icons and launch behaviour, so the fields below
// aren't cosmetic: id/start_url/scope are what Play Store checks match the
// Digital Asset Links verification on the Android wrapper.
//
// `serviceworker` isn't part of the current Web App Manifest spec (Next's
// own Manifest type doesn't have it) — it's a legacy field some PWA
// scanners, PWABuilder's report card included, still read to statically
// confirm a service worker exists without running page JS. Costs nothing
// to include alongside the real runtime registration in register-sw.tsx.
type ManifestWithLegacyFields = MetadataRoute.Manifest & {
  serviceworker?: { src: string; scope?: string };
};

export default function manifest(): ManifestWithLegacyFields {
  return {
    id: '/',
    name: 'BHOLO — South African Football Banter',
    short_name: 'BHOLO',
    description:
      "South Africa's home for football banter — Chiefs, Pirates, Sundowns and Betway Premiership fans, live match threads, hot takes and fixtures.",
    start_url: '/home',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui', 'browser'],
    orientation: 'portrait-primary',
    background_color: '#0A0A0A',
    theme_color: '#0A0A0A',
    lang: 'en-ZA',
    dir: 'ltr',
    categories: ['sports', 'social'],
    // No native app to steer users toward yet — this is the honest value
    // until a Play Store listing exists (see related_applications, which
    // stays unset for the same reason).
    prefer_related_applications: false,
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
    serviceworker: { src: '/sw.js', scope: '/' },
  };
}
