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
// scanners historically read as a static fallback without running page JS.
// Left in since it costs nothing; the real registration is the inline
// script in layout.tsx's <head>.
type ManifestWithLegacyFields = MetadataRoute.Manifest & {
  serviceworker?: { src: string; scope?: string };
};

export default function manifest(): ManifestWithLegacyFields {
  return {
    id: '/',
    name: "BHOLO — South Africa's Football-Exclusive Social Network",
    short_name: 'BHOLO',
    description:
      "Join Mzansi's official football timeline. Betway Premiership banter, PSL fixtures and standings, and every club from Chiefs to Pirates to Sundowns — no noise, just football.",
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
      // Android masks the launcher icon into whatever shape the OEM uses.
      // These have the mark inset to 70% on a #0A0A0A field so the crest is
      // never cropped by a circle, squircle or teardrop.
      { src: '/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    // Long-press shortcuts on the installed Android app. All three stay inside
    // the TWA scope, so they never hand off to browser chrome.
    shortcuts: [
      {
        name: 'Fixtures',
        short_name: 'Fixtures',
        description: 'This gameweek in the Betway Premiership',
        url: '/fixtures',
        icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'Standings',
        short_name: 'Standings',
        description: 'The PSL table',
        url: '/standings',
        icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'My Club',
        short_name: 'My Club',
        description: 'Your profile and club',
        url: '/profile',
        icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
    ],
    // Android's share sheet can hand a link or some text straight to a post.
    // The POST lands on /share, which turns the fields into a pre-filled
    // composer (see src/app/share/route.ts).
    share_target: {
      action: '/api/share',
      method: 'POST',
      enctype: 'multipart/form-data',
      params: { title: 'title', text: 'text', url: 'url' },
    },
    // Chrome's richer install prompt and the Play Store listing both read
    // these. Narrow form factor is what a phone will actually show.
    screenshots: [
      {
        src: '/screenshots/bholo-home.png',
        sizes: '1080x1920',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'Football, uninterrupted',
      },
      {
        src: '/screenshots/bholo-welcome.png',
        sizes: '1080x1620',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'Welcome to the banter app',
      },
      {
        src: '/screenshots/bholo-offline.png',
        sizes: '1080x1920',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'A real offline page, not a browser error',
      },
    ],
    serviceworker: { src: '/sw.js', scope: '/' },
  };
}
