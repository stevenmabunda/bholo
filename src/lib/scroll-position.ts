/**
 * Remembering where someone was in a list before they opened something from it.
 *
 * Keyed by the page you are leaving, so every feed keeps its own place and one
 * does not overwrite another: leaving /home and leaving /profile/abc are
 * different positions, and so are two different profiles.
 *
 * Positions are stored per tab and consumed on use — a restore is for coming
 * back from a post, not for reopening the app an hour later on a feed that has
 * moved on underneath.
 */
import { getFeedScroller } from './scroll-container';

const PREFIX = 'scrollY:';

/**
 * How long a saved position stays worth honouring.
 *
 * The browser sometimes restores a back navigation itself, which leaves ours
 * unread. Without a limit that leftover sits there until the tab closes, and
 * the next visit to the same page — from a link, minutes later — jumps to a
 * position the person did not put there. This is sized for going and coming
 * back, which is the only thing it is for.
 */
const MAX_AGE_MS = 5 * 60 * 1000;

/** Identifies the list being left. Includes the query so /search?q=a and ?q=b differ. */
export function currentScrollKey(): string {
  if (typeof window === 'undefined') return '';
  return window.location.pathname + window.location.search;
}

export function saveScrollPosition(key: string = currentScrollKey()): void {
  if (!key) return;
  try {
    // Null means the column is not the scroller at this width and the window
    // is — see getFeedScroller. Reading the column regardless is what used to
    // save a 0 from every phone.
    const scroller = getFeedScroller();
    const y = scroller ? scroller.scrollTop : window.scrollY;
    sessionStorage.setItem(PREFIX + key, JSON.stringify({ y: Math.round(y), t: Date.now() }));
  } catch {
    // Private mode, or storage full. Losing a scroll position is not worth
    // breaking the navigation that was about to happen.
  }
}

/**
 * Puts the page back if there is a position saved for it, and forgets it.
 * Returns whether anything was restored.
 */
export function restoreScrollPosition(key: string = currentScrollKey()): boolean {
  if (!key) return false;
  try {
    const stored = sessionStorage.getItem(PREFIX + key);
    if (stored === null) return false;
    sessionStorage.removeItem(PREFIX + key);

    const { y, t } = JSON.parse(stored) as { y: number; t: number };
    if (!Number.isFinite(y) || y <= 0) return false;
    if (!Number.isFinite(t) || Date.now() - t > MAX_AGE_MS) return false;

    const scroller = getFeedScroller();
    if (scroller) scroller.scrollTo(0, y);
    else window.scrollTo(0, y);
    return true;
  } catch {
    return false;
  }
}
