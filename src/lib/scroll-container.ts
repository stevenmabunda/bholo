/**
 * The element that actually scrolls the main column.
 *
 * On desktop that is the bounded centre column; on a phone the page itself
 * scrolls and there is no separate container. Callers that save or restore a
 * scroll position need the real one, and hardcoding a selector for it has
 * already broken once when the layout changed underneath.
 */
export function getFeedScroller(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  const column = document.getElementById('desktop-scroll-area');
  if (!column) return null;
  // Tolerates the column being wrapped in a Radix ScrollArea, which scrolls an
  // inner viewport rather than the element itself.
  const target = column.querySelector<HTMLElement>('[data-radix-scroll-area-viewport]') ?? column;

  // The column is in the markup at every width, but it only scrolls from md up
  // — below that the page scrolls and the column's overflow is visible, so its
  // scrollTop is pinned at 0. Returning it anyway is what broke restoring a
  // position on a phone: the save wrote a 0, the restore read that 0, scrolled
  // nothing, and stopped before it ever looked at the window. Callers treat
  // null as "the window is the scroller", which on mobile it is.
  const overflowY = getComputedStyle(target).overflowY;
  const scrolls = overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay';
  return scrolls ? target : null;
}
