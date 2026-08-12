
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from '@/contexts/auth-context';
import { PostProvider } from '@/contexts/post-context';
import { SidebarProvider } from '@/components/ui/sidebar';
import { TabProvider } from '@/contexts/tab-context';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'BHOLO',
  description: 'The football banter app.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <title>BHOLO</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <AuthProvider>
          <PostProvider>
            <SidebarProvider>
              <TabProvider>
                  {children}
              </TabProvider>
            </SidebarProvider>
          </PostProvider>
        </AuthProvider>
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
