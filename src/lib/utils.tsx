import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import * as React from "react"
import Link from "next/link"
import { format } from 'date-fns';


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Turns URLs and #hashtags in post text into links. URLs are matched
// first in the alternation so a link's own #fragment isn't mistaken for
// a hashtag. Unicode-aware so tags like #Amakhosi or non-Latin tags work.
// The lookbehind keeps a '#' that's attached to a preceding word from
// counting (e.g. "a#b"), matching how X treats hashtags.
const LINKIFY_REGEX = /((?:https?:\/\/|www\.)[^\s]+)|((?<![\p{L}\p{N}_])#[\p{L}\p{N}_]+)/gu;

export function linkify(text: string) {
  if (!text) return text;

  const matches = [...text.matchAll(LINKIFY_REGEX)];

  if (matches.length === 0) {
    return text;
  }

  const result: (string | JSX.Element)[] = [];
  let lastIndex = 0;

  matches.forEach((match, i) => {
    const token = match[0];
    const index = match.index!;

    // Add text before the link
    if (index > lastIndex) {
      result.push(text.substring(lastIndex, index));
    }

    if (match[2]) {
      // Hashtag. Search on the bare term (no '#') so it also matches
      // posts that mention it as plain text, not just tagged ones.
      const tag = token.slice(1);
      result.push(
        <Link
          key={`tag-${i}`}
          href={`/search?q=${encodeURIComponent(tag)}`}
          className="text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {token}
        </Link>
      );
    } else {
      const href = token.startsWith('www.') ? `http://${token}` : token;
      result.push(
        <a
          key={`link-${i}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {token}
        </a>
      );
    }

    lastIndex = index + token.length;
  });

  // Add remaining text after the last link
  if (lastIndex < text.length) {
    result.push(text.substring(lastIndex));
  }

  return result;
}

export function formatTimestamp(date: Date): string {
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 5) return 'now';
    if (seconds < 60) return `${seconds}s`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    
    // Format as date for anything older than a week
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatDetailedTimestamp(date: Date): string {
    if (!date || isNaN(date.getTime())) {
        return '';
    }
    // "8:26 AM · Sep 20, 2025"
    return format(date, "h:mm a · MMM d, yyyy");
}
