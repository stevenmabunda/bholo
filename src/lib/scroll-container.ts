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
  return column.querySelector<HTMLElement>('[data-radix-scroll-area-viewport]') ?? column;
}
