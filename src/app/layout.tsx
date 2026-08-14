
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
import Script from 'next/script';

const siteDescription =
  'BHOLO is South Africa\'s home for football banter — where Chiefs, Pirates, Sundowns and Betway Premiership fans clash, roast and hype every matchday. Post your hot takes, react with GIFs, track live PSL fixtures and standings, and join the conversation South African football deserves.';

export const metadata: Metadata = {
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
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
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
