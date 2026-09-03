
import type {Metadata} from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from '@/contexts/auth-context';
import { PostProvider } from '@/contexts/post-context';
import { SidebarProvider } from '@/components/ui/sidebar';
import { TabProvider } from '@/contexts/tab-context';
import { AppQueryProvider } from '@/lib/query-provider';
import { createClient } from '@/lib/supabase/server';
import { siteUrl } from '@/lib/site';
import Script from 'next/script';

const siteDescription =
  'BHOLO is South Africa\'s home for football banter — where Chiefs, Pirates, Sundowns and Betway Premiership fans clash, roast and hype every matchday. Post your hot takes, react with GIFs, track live PSL fixtures and standings, and join the conversation South African football deserves.';

export const metadata: Metadata = {
  // Without this, relative image and canonical paths never resolve to absolute
  // URLs, and every shared link degrades to plain text with no card.
  metadataBase: new URL(siteUrl),
  title: {
    default: 'BHOLO — South African Football Banter',
    template: '%s | BHOLO',
  },
  description: siteDescription,
  keywords: [
    'South African football',
    'PSL banter',
    'Betway Premiership',
    'Kaizer Chiefs',
    'Orlando Pirates',
    'Mamelodi Sundowns',
    'football fan app',
    'soccer banter South Africa',
  ],
  openGraph: {
    title: 'BHOLO — South African Football Banter',
    description: siteDescription,
    siteName: 'BHOLO',
    locale: 'en_ZA',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BHOLO — South African Football Banter',
    description: siteDescription,
  },
};

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-inter',
  display: 'swap',
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Resolve the session server-side from cookies and hand it to the
  // client provider, so the app knows who the user is on first render
  // instead of blocking the whole tree on a client-side auth round trip.
  // Middleware already refreshes this cookie on every request.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <head>
        {/* Registers before React ever hydrates — a plain inline script
            runs the instant the HTML parser reaches it, independent of
            bundle download/parse/hydrate time. A prior useEffect-based
            registration worked for real visitors but was too slow for
            PWABuilder's installability scanner, which checks shortly after
            navigation and doesn't wait for a JS-heavy app (five context
            providers deep) to finish hydrating first. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `if ('serviceWorker' in navigator) { navigator.serviceWorker.register('/sw.js'); }`,
          }}
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        {/* Matches manifest.ts's theme_color/background_color — this is what
            colors the Android status bar and task-switcher card once this
            is wrapped as a Trusted Web Activity, and the browser chrome on
            mobile Chrome/Safari before that. */}
        <meta name="theme-color" content="#0A0A0A" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="font-body antialiased">
        <AppQueryProvider>
          <AuthProvider initialUser={user}>
            <PostProvider>
              <SidebarProvider>
                <TabProvider>
                    {children}
                </TabProvider>
              </SidebarProvider>
            </PostProvider>
          </AuthProvider>
        </AppQueryProvider>
        <Toaster />
        
        {/* <!-- Google tag (gtag.js) --> */}
        <Script async src="https://www.googletagmanager.com/gtag/js?id=G-WBBKJGCV3P"></Script>
        <Script id="google-analytics" dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-WBBKJGCV3P');
          `
        }} />
      </body>
    </html>
  );
}
