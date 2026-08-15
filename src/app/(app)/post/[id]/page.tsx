
import { getPost } from './actions';
import type { Metadata, ResolvingMetadata } from 'next';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { makeServerQueryClient } from '@/lib/query-client-server';
import { queryKeys } from '@/lib/query-keys';
import { PostPageView } from '@/components/post-page-view';

// Next 15: params is a Promise and must be awaited.
type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { id } = await params;
  const post = await getPost(id);

  if (!post) {
    return {
      title: 'Post not found | BHOLO',
    };
  }

  const description = post.content.substring(0, 155);
  const postImage = post.media?.find(m => m.type === 'image')?.url;
  
  const openGraphImages = postImage ? [{ url: postImage }] : [];
  
  return {
    title: `Post by @${post.authorHandle} | BHOLO`,
    description: description,
    openGraph: {
      title: `${post.authorName} (@${post.authorHandle}) on BHOLO`,
      description: description,
      url: `/post/${id}`,
      images: openGraphImages,
    },
     twitter: {
      card: postImage ? 'summary_large_image' : 'summary',
      title: `${post.authorName} (@${post.authorHandle}) on BHOLO`,
      description: description,
      images: openGraphImages, // Corrected this line
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
