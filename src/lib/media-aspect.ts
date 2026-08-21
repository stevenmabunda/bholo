/**
 * How tall a piece of media is allowed to be in a feed.
 *
 * A feed is a list. Media that runs to the full height of the screen stops
 * being an item in that list and becomes a page of its own — everything below
 * it is pushed out of reach, and scrolling turns into work. Every platform
 * that shows user media in a timeline clamps it for this reason, and shows the
 * uncropped original when you tap through.
 *
 * Post media and ad creatives share these bounds deliberately: a paid slot
 * that is taller than the posts around it reads as an intrusion, and one that
 * is shorter looks like a mistake.
 */

/** Widest anything gets. Past this it reads as a banner rather than an item. */
export const MAX_ASPECT = 1.91;

/** Tallest a still image gets: 4:5, the portrait bound Meta and X settled on. */
export const MIN_ASPECT_IMAGE = 0.8;

/**
 * Video keeps its real shape all the way down to 9:16.
 *
 * Cropping a photo is recoverable — you tap it and see the original. Cropping
 * video is not: the feed is where it gets watched. Phone video is shot at 9:16,
 * and a clip framed for that loses its subject when squeezed to 4:5.
 *
 * Height is controlled a different way instead, the way X does it: a portrait
 * video is given a capped height on desktop, which makes it narrower and leaves
 * it sitting against the left of the column rather than cropped or letterboxed.
 * On a phone it runs full width and properly vertical, because that is the
 * shape the screen already is.
 */
export const MIN_ASPECT_VIDEO = 9 / 16;

/** Below this a video is portrait, and gets the capped-height treatment. */
export const PORTRAIT_THRESHOLD = 1;

/**
 * The aspect a feed slot should use, given what the file actually is.
 *
 * Returns null when the dimensions are unknown, which is the caller's signal to
 * fall back to a bounded, uncropped box rather than guess a shape and crop
 * something important out of it.
 */
export function feedAspect(
  width: number | null | undefined,
  height: number | null | undefined,
  kind: 'image' | 'video' = 'image'
): number | null {
  if (!width || !height) return null;
  const min = kind === 'video' ? MIN_ASPECT_VIDEO : MIN_ASPECT_IMAGE;
  return Math.min(MAX_ASPECT, Math.max(min, width / height));
}

/** True when clamping will actually crop, i.e. the original is out of bounds. */
export function willCrop(
  width: number | null | undefined,
  height: number | null | undefined,
  kind: 'image' | 'video' = 'image'
): boolean {
  if (!width || !height) return false;
  const aspect = width / height;
  const min = kind === 'video' ? MIN_ASPECT_VIDEO : MIN_ASPECT_IMAGE;
  return aspect < min || aspect > MAX_ASPECT;
}
