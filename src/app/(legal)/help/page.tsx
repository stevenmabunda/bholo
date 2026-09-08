import type { Metadata } from 'next';
import { siteUrl } from '@/lib/site';

// Without this, this page inherited the root layout's default title and
// description verbatim — byte-identical to the homepage's, and to every
// other page in this same (legal) group. Google saw duplicate metadata
// across the site and had to guess which page was the real one to surface
// for a given query, which is exactly how a search for "bholofootball"
// ended up citing/linking the Help Center instead of the homepage.
export const metadata: Metadata = {
  title: 'Help Center',
  description:
    "Get help with your BHOLO account — creating a profile, posting content, following your favourite PSL clubs, and more.",
  alternates: { canonical: `${siteUrl}/help` },
};

export default function HelpPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <h1>Welcome to the BHOLO SPORTS Help Center</h1>
      <p>
        Here you’ll find answers to common questions about using our Platform.
      </p>
      <h2>Popular Topics:</h2>
      <ul>
        <li>
          <strong>Getting Started:</strong> Learn how to create an account and
          customize your profile.
        </li>
        <li>
          <strong>Posting Content:</strong> Tips for uploading photos, videos,
          and posts.
        </li>
        <li>
          <strong>Following Teams &amp; Players:</strong> How to follow your
          favorite sports content.
        </li>
        <li>
          <strong>Account Issues:</strong> Resetting your password, updating
          profile details.
        </li>
        <li>
          <strong>Community Guidelines:</strong> Understanding our rules to keep
          the platform safe and fun.
        </li>
      </ul>
      <p>
        If you can’t find your answer here, reach out to us at [Insert support
        email].
      </p>
    </div>
  );
}
