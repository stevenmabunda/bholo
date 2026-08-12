'use client';

import { extractYoutubeVideoId } from "@/lib/youtube";

// Admin-controlled: set NEXT_PUBLIC_YOUTUBE_LIVE_URL to a YouTube video/
// livestream link to fill the sidebar slot. Left unset, this renders
// nothing rather than a broken embed.
export function YoutubeLivePanel() {
  const url = process.env.NEXT_PUBLIC_YOUTUBE_LIVE_URL;
  if (!url) return null;

  const videoId = extractYoutubeVideoId(url);
  if (!videoId) return null;

  return (
    <div className="px-2 pt-4 group-data-[collapsible=icon]:hidden">
      <div className="rounded-lg overflow-hidden border border-border aspect-video">
        <iframe
          className="w-full h-full"
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1`}
          title="BHOLO Live"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
}
