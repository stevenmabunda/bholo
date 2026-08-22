import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPost } from '../../actions';
import { PhotoViewer } from '@/components/photo-viewer';
import { viewableMedia } from '@/lib/viewable-media';

type Props = { params: Promise<{ id: string; index: string }> };

/**
 * A single photo, at its own address.
 *
 * Reached cold — a shared link, a refresh, a new tab. Navigating here from
 * inside the app hits the intercepting route beside this one instead, which
 * overlays the same view on whatever the person was already looking at.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, index } = await params;
  const post = await getPost(id);
  // The root layout's template appends the site name; saying it here too got
  // '… | BHOLO | BHOLO'.
  if (!post) return { title: 'Photo' };

  const slides = viewableMedia(post.media);
  const slide = slides[Number(index)] ?? slides[0];
  // A crawler cannot use a video URL, but it can use the still we captured
  // when the video was uploaded.
  const preview = slide?.type === 'video' ? slide.posterUrl : slide?.url;

  return {
    title: `Photo by @${post.authorHandle}`,
    description: post.content?.slice(0, 200),
    openGraph: {
      title: `Photo by @${post.authorHandle}`,
      description: post.content?.slice(0, 200),
      images: preview ? [{ url: preview, width: slide?.width, height: slide?.height }] : undefined,
    },
  };
}

export default async function PhotoPage({ params }: Props) {
  const { id, index } = await params;
  const post = await getPost(id);
  if (!post) notFound();

  const slides = viewableMedia(post.media);
  const start = Number(index);
  // A made-up index would leave the carousel on a blank slide.
  if (!slides.length || !Number.isInteger(start) || start < 0 || start >= slides.length) {
    notFound();
  }

  return <PhotoViewer post={post} startIndex={start} />;
}
