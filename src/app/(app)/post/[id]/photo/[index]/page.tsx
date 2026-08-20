import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPost } from '../../actions';
import { PhotoViewer } from '@/components/photo-viewer';

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

  const images = (post.media ?? []).filter(m => m.type === 'image');
  const image = images[Number(index)] ?? images[0];

  return {
    title: `Photo by @${post.authorHandle}`,
    description: post.content?.slice(0, 200),
    openGraph: {
      title: `Photo by @${post.authorHandle}`,
      description: post.content?.slice(0, 200),
      images: image ? [{ url: image.url, width: image.width, height: image.height }] : undefined,
    },
  };
}

export default async function PhotoPage({ params }: Props) {
  const { id, index } = await params;
  const post = await getPost(id);
  if (!post) notFound();

  const images = (post.media ?? []).filter(m => m.type === 'image');
  const start = Number(index);
  // A made-up index would leave the carousel on a blank slide.
  if (!images.length || !Number.isInteger(start) || start < 0 || start >= images.length) {
    notFound();
  }

  return <PhotoViewer post={post} startIndex={start} />;
}
