import { notFound } from 'next/navigation';
import { getPost } from '@/app/(app)/post/[id]/actions';
import { PhotoViewer } from '@/components/photo-viewer';

type Props = { params: Promise<{ id: string; index: string }> };

/**
 * The same photo view, overlaid on whatever the person was looking at.
 *
 * Next only intercepts client-side navigations, which is exactly the split we
 * want: tapping a photo in the feed lands here and leaves the feed mounted
 * behind it, so closing is a step back rather than a re-fetch. A cold link has
 * nothing to intercept and renders the page next door.
 */
export default async function PhotoModal({ params }: Props) {
  const { id, index } = await params;
  const post = await getPost(id);
  if (!post) notFound();

  const images = (post.media ?? []).filter(m => m.type === 'image');
  const start = Number(index);
  if (!images.length || !Number.isInteger(start) || start < 0 || start >= images.length) {
    notFound();
  }

  return <PhotoViewer post={post} startIndex={start} />;
}
