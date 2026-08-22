import type { PostType } from '@/lib/data';

type Media = NonNullable<PostType['media']>[number];

/**
 * What the photo viewer can show.
 *
 * Images and video. It used to be images alone, so a post carrying both had a
 * video that could not be opened at all — and the indexes handed to the viewer
 * counted pictures only, which meant they stopped matching the moment a video
 * sat among them.
 *
 * GIFs and stickers stay out. They are decoration on a post rather than
 * something anyone opens full screen, and they animate on their own where they
 * are.
 */
export function viewableMedia(media: PostType['media']): Media[] {
  return (media ?? []).filter(m => m.type === 'image' || m.type === 'video');
}

/** Where an item in `media` sits among the viewable ones. */
export function viewableIndexOf(media: PostType['media'], mediaIndex: number): number {
  return viewableMedia((media ?? []).slice(0, mediaIndex)).length;
}
