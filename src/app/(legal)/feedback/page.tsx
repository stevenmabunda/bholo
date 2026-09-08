import type { Metadata } from 'next';
import { siteUrl } from '@/lib/site';

// See help/page.tsx for why this needs its own metadata.
export const metadata: Metadata = {
  title: 'Feedback',
  description: 'Share feedback or report an issue with BHOLO.',
  alternates: { canonical: `${siteUrl}/feedback` },
};

export default function FeedbackPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <h1>We Value Your Feedback</h1>
      <p>
        At BHOLO SPORTS, we’re always working to make your experience better.
        Tell us what’s working, what’s not, and what you’d like to see next.
      </p>
      <h2>How to Send Feedback:</h2>
      <ul>
        <li>Email us at feedback@bholo.app</li>
        <li>Use the in-app “Send Feedback” option</li>
      </ul>
      <p>Your ideas help shape the future of BHOLO SPORTS.</p>
    </div>
  );
}
