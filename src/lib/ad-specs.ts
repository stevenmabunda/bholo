/**
 * What a feed creative is allowed to look like.
 *
 * One definition, used by the uploader to tell someone their artwork is wrong
 * and by the slot to decide how much space to give it — so the advice and the
 * rendering can never disagree.
 *
 * The accepted range follows what Meta and X settled on for feeds, and for the
 * same reason: 4:5 is as tall as a unit can be before it dominates the screen
 * and starts to read as a takeover, and 1.91:1 is as wide as it can be before
 * it looks like a banner rather than a post.
 */

export const AD_FORMATS = [
  { name: 'Square', ratio: '1:1', pixels: '1080 × 1080', value: 1 / 1, note: 'Safest. Works in every slot.' },
  { name: 'Portrait', ratio: '4:5', pixels: '1080 × 1350', value: 4 / 5, note: 'Most space on a phone.' },
  { name: 'Landscape', ratio: '1.91:1', pixels: '1200 × 628', value: 1.91, note: 'Link-style, least prominent.' },
] as const;

/** Tallest and widest a creative may render. Outside this it gets cropped. */
export const MIN_ASPECT = 0.8;   // 4:5
export const MAX_ASPECT = 1.91;  // 1.91:1

/** Below this, artwork visibly softens on a modern phone. */
export const MIN_WIDTH = 600;

export type SpecCheck = {
  ok: boolean;
  aspect: number;
  /** The closest named format, for telling someone what they uploaded. */
  closest: string;
  problems: string[];
};

export function checkCreative(width: number, height: number): SpecCheck {
  const aspect = width / height;
  const problems: string[] = [];

  if (width < MIN_WIDTH) {
    problems.push(`Only ${width}px wide — use at least ${MIN_WIDTH}px or it will look soft.`);
  }
  if (aspect < MIN_ASPECT) {
    problems.push(`Taller than 4:5, so the top and bottom will be cropped.`);
  }
  if (aspect > MAX_ASPECT) {
    problems.push(`Wider than 1.91:1, so the sides will be cropped.`);
  }

  const closest = AD_FORMATS.reduce((best, format) =>
    Math.abs(format.value - aspect) < Math.abs(best.value - aspect) ? format : best
  );

  return {
    ok: problems.length === 0,
    aspect,
    closest: Math.abs(closest.value - aspect) < 0.04 ? closest.ratio : `${aspect.toFixed(2)}:1`,
    problems,
  };
}

/**
 * The aspect the slot should actually use: the asset's own, held inside the
 * accepted range so one oversized file cannot stretch the feed.
 */
export function renderAspect(width?: number | null, height?: number | null): number {
  if (!width || !height) return 1; // Unknown: assume square, the safe default.
  return Math.min(MAX_ASPECT, Math.max(MIN_ASPECT, width / height));
}

/** Whether a creative's media URL points at a video rather than a still. */
export function isVideoMedia(url: string | null | undefined): boolean {
  if (!url) return false;
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
}
