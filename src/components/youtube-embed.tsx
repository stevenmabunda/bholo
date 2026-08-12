'use client';

export function YoutubeEmbed({ videoId }: { videoId: string }) {
  return (
    <div
      className="mt-3 rounded-2xl overflow-hidden border aspect-video bg-black"
      onClick={(e) => e.stopPropagation()}
    >
      <iframe
        className="w-full h-full"
        src={`https://www.youtube.com/embed/${videoId}`}
        title="Embedded YouTube video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
