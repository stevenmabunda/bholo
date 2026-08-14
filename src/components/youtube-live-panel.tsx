'use client';

import { useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { extractYoutubeVideoId } from "@/lib/youtube";

// Admin-controlled: set NEXT_PUBLIC_YOUTUBE_LIVE_URL to a YouTube video/
// livestream link to fill the sidebar slot. Left unset, this renders
// nothing rather than a broken embed.
//
// Native YouTube controls are all-or-nothing (controls=0/1) - there's no
// "just show mute" param - so this hides them entirely and drives a
// custom mute/unmute button via postMessage to the embed's JS API
// (enablejsapi=1), which YouTube's player accepts without needing the
// full iframe_api script loaded.
export function YoutubeLivePanel() {
  const url = process.env.NEXT_PUBLIC_YOUTUBE_LIVE_URL;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [muted, setMuted] = useState(true);

  if (!url) return null;

  const videoId = extractYoutubeVideoId(url);
  if (!videoId) return null;

  const toggleMute = () => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: muted ? 'unMute' : 'mute', args: [] }),
      '*'
    );
    setMuted((prev) => !prev);
  };

  return (
    <div className="px-2 pt-4 group-data-[collapsible=icon]:hidden">
      <div className="relative rounded-lg overflow-hidden border border-border aspect-video">
        <iframe
          ref={iframeRef}
          className="w-full h-full"
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&disablekb=1&rel=0&enablejsapi=1`}
          title="BHOLO Live"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? 'Unmute' : 'Mute'}
          className="absolute bottom-2 right-2 h-8 w-8 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
