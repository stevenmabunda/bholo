
import { getPost } from './actions';
import type { Metadata, ResolvingMetadata } from 'next';
import type { PostType } from '@/lib/data';
import { findFirstYoutubeVideoId } from '@/lib/youtube';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { makeServerQueryClient } from '@/lib/query-client-server';
import { queryKeys } from '@/lib/query-keys';
import { PostPageView } from '@/components/post-page-view';

// Next 15: params is a Promise and must be awaited.
type Props = {
  params: Promise<{ id: string }>
}

type Thumbnail = { url: string; width?: number; height?: number };

/**
 * Picks the picture that represents a post in a link preview.
 *
 * Previously only `type: 'image'` was considered, so a post carrying a GIF, a
 * sticker, a video or a YouTube link shared as bare text. Videos uploaded
 * before poster capture existed have no still to offer and still fall through
 * to the branded card.
 */
function getPostThumbnail(post: PostType): Thumbnail | null {
  const media = post.media?.find(m =>
    m.type === 'image' || m.type === 'gif' || m.type === 'sticker'
  );
  if (media?.url) {
    return { url: media.url, width: media.width, height: media.height };
  }

  // A video's own URL is useless to a crawler, but its captured poster is not.
  const videoPoster = post.media?.find(m => m.type === 'video' && m.posterUrl)?.posterUrl;
  if (videoPoster) {
    return { url: videoPoster };
  }

  const youtubeId = findFirstYoutubeVideoId(post.content);
  if (youtubeId) {
    // hqdefault always exists; maxresdefault 404s on plenty of videos and a
    // broken image URL costs the card entirely.
    return {
      url: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
      width: 480,
      height: 360,
    };
  }

  return null;
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { id } = await params;
  const post = await getPost(id);

  if (!post) {
    return {
      title: 'Post not found',
    };
  }

  const description = post.content.substring(0, 155);
  const thumbnail = getPostThumbnail(post);
  const title = `${post.authorName} (@${post.authorHandle}) on BHOLO`;

  // Returning an openGraph object here replaces the root's file-based
  // opengraph-image entirely — it is not merged in — so a post with no media of
  // its own has to name the branded card explicitly or it ships with no picture
  // at all. metadataBase turns this relative path into the absolute URL that
  // crawlers require.
  const images = thumbnail
    ? [{
        url: thumbnail.url,
        ...(thumbnail.width && thumbnail.height
          ? { width: thumbnail.width, height: thumbnail.height }
          : {}),
        alt: description || title,
      }]
    : [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'BHOLO' }];

  return {
    // The root layout's template already appends "| BHOLO".
    title: `Post by @${post.authorHandle}`,
    description: description,
    openGraph: {
      type: 'article',
      title,
      description: description,
      url: `/post/${id}`,
      publishedTime: post.createdAt,
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: description,
      images,
    },
  };
}


export default async function PostPage({ params }: Props) {
  // generateMetadata already fetches this post for the link preview, and
  // Next dedupes the two calls within a request — so shipping the post
  // in the HTML costs nothing extra here. Opening a post from outside
  // the app (a shared link, a notification) no longer starts from a
  // skeleton; when it's opened from a feed, the client cache is seeded
  // from the feed and this is just a correctness backstop.
  const { id } = await params;
  const queryClient = makeServerQueryClient();

  await queryClient.prefetchQuery({
    queryKey: queryKeys.post(id),
    queryFn: () => getPost(id),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PostPageView postId={id} />
    </HydrationBoundary>
  );
}
