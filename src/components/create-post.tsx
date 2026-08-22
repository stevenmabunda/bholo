'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Image as ImageIcon, X, Smile, MapPin, Loader2, Trash2, Clapperboard, CalendarClock } from "lucide-react";
import React, { useState, useRef } from "react";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { Input } from "./ui/input";
import type { PostType } from "@/lib/data";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { SchedulePicker } from "./schedule-picker";
import { reverseGeocode } from "@/lib/geocode";
import dynamic from 'next/dynamic';

// Fetched the first time the picker opens rather than shipped to everyone on
// first paint. ssr:false because it measures the DOM to size its grid.
const GiphyPanel = dynamic(() => import('@/components/giphy-panel'), {
  ssr: false,
  loading: () => (
    <div className="flex h-40 w-[550px] max-w-full items-center justify-center text-sm text-muted-foreground">
      Loading…
    </div>
  ),
});

export type Media = {
  file: File;
  previewUrl: string;
  type: 'image' | 'video' | 'gif' | 'sticker';
  url?: string;
  width?: number;
  height?: number;
};

const EMOJI_GROUPS = [
  {
    label: 'Football',
    emojis: ['⚽️', '🥅', '🏆', '🥇', '🎽', '🧤', '🟨', '🟥', '🚩', '📣', '🏟️', '🎯', '🔔', '⏱️', '🤾', '🏃'],
  },
  {
    label: 'Reactions',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '🙂', '😉', '😊', '😍', '🥰', '😘', '😜', '🤪',
             '🤩', '🥳', '😎', '🤓', '🤔', '🤨', '😐', '😴', '😮', '😱', '😭', '😤', '😡', '🤬', '🥶', '🤝'],
  },
  {
    label: 'Banter',
    emojis: ['🔥', '💯', '👏', '🙌', '👍', '👎', '🙏', '💪', '🤡', '🐐', '👀', '🫡', '🤷', '🤦', '💀', '☠️',
             '🧢', '🗣️', '📢', '⚡️', '💥', '✨', '🎉', '🎊', '🚀', '📈', '📉', '🥱', '🫠', '😬', '🙈', '🍿'],
  },
  {
    label: 'Hearts & symbols',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '❣️', '✅', '❌', '⭐️', '🌟', '‼️', '❓'],
  },
];


/** Images and video together, up to this many, at most one of them a video. */
const MAX_MEDIA_PER_POST = 4;

export function CreatePost({ onPost }: { onPost: (data: { text: string; media: Media[], poll?: PostType['poll'], location?: string | null, scheduledFor?: string | null }) => Promise<any> }) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [text, setText] = useState("");
  const [media, setMedia] = useState<Media[]>([]);
  const [posting, setPosting] = useState(false);
  const [isGifPopoverOpen, setIsGifPopoverOpen] = useState(false);
  const [giphyTab, setGiphyTab] = useState<'gifs' | 'stickers'>('gifs');
  
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [showPoll, setShowPoll] = useState(false);
  const [pollChoices, setPollChoices] = useState<string[]>(['', '']);
  const [location, setLocation] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [scheduledFor, setScheduledFor] = useState<string>('');

  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    // Each file is judged on its own. The whole selection used to take its type
    // from files[0], so picking a video first refused the lot as "one video per
    // post", and picking an image first labelled the video an image and posted
    // it as one.
    const picked = files.map(file => ({
      file,
      previewUrl: URL.createObjectURL(file),
      type: (file.type.startsWith('video/') ? 'video' : 'image') as 'video' | 'image',
    }));

    const combined = [...media, ...picked];
    const videos = combined.filter(m => m.type === 'video').length;

    const reject = (why: string) => {
      picked.forEach(m => URL.revokeObjectURL(m.previewUrl));
      toast({ variant: 'destructive', description: why });
      if (imageInputRef.current) imageInputRef.current.value = '';
    };

    if (videos > 1) return reject('One video per post. The rest can be images.');
    if (combined.length > MAX_MEDIA_PER_POST) {
      return reject(`Up to ${MAX_MEDIA_PER_POST} items per post — you picked ${combined.length}.`);
    }

    // Appended, not replaced. Choosing again used to throw away what was
    // already attached, so images and a video could never be added in two goes.
    setShowPoll(false);
    setMedia(combined);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const removeMedia = (index: number) => {
    setMedia(prevMedia => {
        const newMedia = [...prevMedia];
        const removed = newMedia.splice(index, 1);
        if (removed[0]) {
            URL.revokeObjectURL(removed[0].previewUrl);
        }
        return newMedia;
    });
    if (imageInputRef.current) imageInputRef.current.value = "";
  }

  const handlePost = async () => {
    if (!isPostable || posting) return;
    setPosting(true);

    let pollData: PostType['poll'] | undefined = undefined;
    if (showPoll) {
        const validChoices = pollChoices.map(c => c.trim()).filter(Boolean);
        if (validChoices.length < 2) {
            toast({ variant: 'destructive', description: "A poll must have at least 2 choices." });
            setPosting(false);
            return;
        }
        pollData = {
            choices: validChoices.map(choiceText => ({ text: choiceText, votes: 0 }))
        };
    }
    

    if (scheduledFor && new Date(scheduledFor).getTime() <= Date.now()) {
        toast({ variant: 'destructive', description: "Pick a time in the future to schedule this post." });
        setPosting(false);
        return;
    }

    try {
        await onPost({
            text,
            media,
            poll: pollData,
            location,
            // datetime-local has no timezone; convert from the user's wall
            // clock to an absolute instant before it hits the database.
            scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : null,
        });

        media.forEach(m => URL.revokeObjectURL(m.previewUrl));

        if (scheduledFor) {
            toast({ description: `Scheduled for ${new Date(scheduledFor).toLocaleString()}.` });
        }

        setText("");
        setMedia([]);
        setShowPoll(false);
        setPollChoices(['', '']);
        setLocation(null);
        setScheduledFor('');
        if (imageInputRef.current) imageInputRef.current.value = "";
    } catch (error) {
        console.error("Failed to create post:", error);
        toast({ variant: 'destructive', description: "Failed to create post. Please try again." });
    } finally {
        setPosting(false);
    }
  };
  
  const handlePollChoiceChange = (index: number, value: string) => {
    const newChoices = [...pollChoices];
    newChoices[index] = value;
    setPollChoices(newChoices);
  };

  const addPollChoice = () => {
    if (pollChoices.length < 3) {
      setPollChoices([...pollChoices, '']);
    }
  };

  const removePollChoice = (index: number) => {
    if (pollChoices.length > 2) {
      setPollChoices(pollChoices.filter((_, i) => i !== index));
    }
  };

  const togglePoll = () => {
    if (!showPoll) {
        media.forEach(m => URL.revokeObjectURL(m.previewUrl));
        setMedia([]);
    }
    setShowPoll(!showPoll);
  };

  const handleLocationClick = () => {
    if (location) {
        setLocation(null);
        toast({ description: "Location removed." });
        return;
    }

    if (navigator.geolocation) {
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                // Coordinates are what the browser gives us, but "Lat: -26.20,
                // Lon: 28.04" is not a place — resolve it to a name before it
                // goes anywhere near a post.
                const result = await reverseGeocode(latitude, longitude);
                setLocating(false);

                if ('error' in result) {
                    toast({ variant: 'destructive', description: result.error });
                    return;
                }

                setLocation(result.place);
                toast({ description: `Location set to ${result.place}.` });
            },
            () => {
                setLocating(false);
                toast({
                    variant: "destructive",
                    description: "Could not get location. Please enable browser permissions.",
                });
            }
        );
    } else {
        toast({
            variant: "destructive",
            description: "Geolocation is not supported by your browser.",
        });
    }
  };

  const handleEmojiClick = (emoji: string) => {
    setText(prevText => prevText + emoji);
  };
  
  const onGifClick = (gif: any, e: React.SyntheticEvent<HTMLElement, Event>) => {
    e.preventDefault();
    if (media.length > 0) {
      toast({ variant: 'destructive', description: "You can only attach one media item to a post." });
      return;
    }
    setMedia([{
      file: new File([], ''),
      previewUrl: gif.images.original.url,
      type: 'gif',
      url: gif.images.original.url,
      width: parseInt(gif.images.original.width),
      height: parseInt(gif.images.original.height)
    }]);
    setShowPoll(false);
    setIsGifPopoverOpen(false);
  }

  const onStickerClick = (sticker: any, e: React.SyntheticEvent<HTMLElement, Event>) => {
    e.preventDefault();
     if (media.length > 0) {
      toast({ variant: 'destructive', description: "You can only attach one media item to a post." });
      return;
    }
    setMedia([{
      file: new File([], ''),
      previewUrl: sticker.images.original.url,
      type: 'sticker',
      url: sticker.images.original.url,
      width: parseInt(sticker.images.original.width),
      height: parseInt(sticker.images.original.height)
    }]);
    setShowPoll(false);
    setIsGifPopoverOpen(false);
  };

  const isPostable = text.trim().length > 0 || media.length > 0 || (showPoll && pollChoices.some(c => c.trim()));
  // Asked of the whole selection, not of media[0]. A mixed post begins with
  // whichever file was picked first, so reading only the first item decided the
  // shape of everything from an accident of ordering.
  const hasGif = media.some(m => m.type === 'gif');
  const hasSticker = media.some(m => m.type === 'sticker');
  const videoCount = media.filter(m => m.type === 'video').length;
  const hasVideo = videoCount > 0;
  const hasImages = media.some(m => m.type === 'image');

  // A poll or a Giphy pick still owns the post; photos and video no longer do,
  // so more can be added until the limit is reached.
  const hasContent = showPoll || hasGif || hasSticker;
  const mediaFull = media.length >= MAX_MEDIA_PER_POST;

  const singleImage = hasImages && !hasVideo && media.length === 1;
  const singleVideo = hasVideo && media.length === 1;

  const gridClasses = {
    2: 'grid-cols-2 grid-rows-1',
    3: 'grid-cols-2 grid-rows-2',
    4: 'grid-cols-2 grid-rows-2',
  }[media.length] || '';

  return (
    <div className="p-3 md:p-4 border-b flex flex-col h-full">
      <div className="flex space-x-3 md:space-x-4 flex-1 min-h-0">
        <div className="hidden md:block">
            <Avatar>
            <AvatarImage src={profile?.photo_url || "https://placehold.co/40x40.png"} alt={profile?.display_name || "User"} data-ai-hint="user avatar" />
            <AvatarFallback>{profile?.display_name?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
        </div>
        <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto min-h-0 space-y-3">
          <Textarea
            placeholder="What is happening?!"
            className="w-full resize-none border-0 bg-transparent px-0 text-lg focus-visible:ring-0 focus-visible:ring-offset-0"
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          {showPoll && (
            <div className="space-y-2 border p-4 rounded-lg">
                <div className="space-y-3">
                    {pollChoices.map((choice, index) => (
                        <div key={index} className="flex items-center gap-2">
                             <Input 
                                placeholder={`Choice ${index + 1}`} 
                                value={choice} 
                                onChange={(e) => handlePollChoiceChange(index, e.target.value)}
                                maxLength={25}
                             />
                             {index > 1 && (
                                <Button variant="ghost" size="icon" onClick={() => removePollChoice(index)}>
                                    <X className="h-4 w-4" />
                                </Button>
                             )}
                        </div>
                    ))}
                </div>
                <div className="flex justify-between items-center pt-2">
                    <Button variant="outline" size="sm" onClick={addPollChoice} disabled={pollChoices.length >= 3}>Add choice</Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setShowPoll(false)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Remove poll
                    </Button>
                </div>
            </div>
          )}

          {media.length > 0 && (
            <div className="mt-3 rounded-2xl overflow-hidden border max-h-[50vh] overflow-y-auto">
                {singleVideo ? (
                    <div className="relative">
                        <video src={media[0].previewUrl} controls className="w-full h-auto max-h-96 object-contain" />
                        <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/50 hover:bg-black/75 text-white hover:text-white" onClick={() => removeMedia(0)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                ) : singleImage || hasGif || hasSticker ? (
                    <div className="relative">
                        <Image src={media[0].previewUrl} alt="Preview 1" width={500} height={500} className="w-full h-auto object-contain bg-black" />
                        <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/50 hover:bg-black/75 text-white hover:text-white" onClick={() => removeMedia(0)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                ) : (
                    /* Mixed selections live here too, so a cell renders whatever
                       it holds rather than assuming every one is a picture. */
                    <div className={cn("grid aspect-video gap-0.5", gridClasses)}>
                        {media.map((item, index) => (
                            <div key={index} className={cn("relative bg-black", media.length === 3 && index === 0 && 'row-span-2')}>
                                {item.type === 'video' ? (
                                    <video src={item.previewUrl} muted playsInline className="h-full w-full object-cover" />
                                ) : (
                                    <Image src={item.previewUrl} alt={`Preview ${index + 1}`} fill className="object-cover" />
                                )}
                                <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/50 hover:bg-black/75 text-white hover:text-white" onClick={() => removeMedia(index)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
          )}

          {location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground border-t pt-3">
              <MapPin className="h-4 w-4 text-primary" />
              <span>{location}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto -mr-2" onClick={() => setLocation(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          </div>
          <div className="flex items-center justify-between pt-3 flex-shrink-0">
            <div className="flex items-center -ml-2">
              {/* One input for both images and video — handleFileChange
                  already branches on the file's MIME type, so two separate
                  buttons were only ever extra UI. */}
              <input
                type="file"
                accept="image/*,video/*"
                ref={imageInputRef}
                onChange={handleFileChange}
                className="hidden"
                multiple
                disabled={posting}
              />
              <Button variant="ghost" size="icon" title="Add photos or video" onClick={() => imageInputRef.current?.click()} disabled={!!hasContent || mediaFull || posting}>
                <ImageIcon className="h-5 w-5 text-primary" />
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" title="Emoji" disabled={posting}>
                        <Smile className="h-5 w-5 text-primary" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] p-2 border-none bg-background/95 backdrop-blur-sm shadow-lg">
                    <div className="max-h-64 overflow-y-auto pr-1">
                        {EMOJI_GROUPS.map((group) => (
                            <div key={group.label} className="mb-2">
                                <p className="px-1 pb-1 text-xs font-semibold text-muted-foreground">{group.label}</p>
                                <div className="grid grid-cols-8 gap-0.5">
                                    {group.emojis.map((emoji) => (
                                        <button
                                            key={emoji}
                                            type="button"
                                            className="text-xl rounded-md p-1 hover:bg-accent"
                                            onClick={() => handleEmojiClick(emoji)}
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </PopoverContent>
              </Popover>
              {/* GIFs and stickers share one button; they're the same
                  Giphy search with a different asset type. */}
              <Popover open={isGifPopoverOpen} onOpenChange={setIsGifPopoverOpen}>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" title="GIFs and stickers" disabled={!!hasContent || media.length > 0 || posting}>
                        <Clapperboard className="h-5 w-5 text-primary" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    // Bounded by the space Radix says is actually there, so
                    // the panel cannot open taller than the gap it is
                    // opening into. Unbounded, a picker sitting near the
                    // bottom of a desktop window opened upwards past the top
                    // of the screen and took its search bar with it — the one
                    // control the picker exists for.
                    collisionPadding={12}
                    className="flex w-auto max-h-[min(60vh,var(--radix-popover-content-available-height))] flex-col overflow-hidden p-2 border-none bg-background/95 backdrop-blur-sm shadow-lg"
                      >
                    <div className="mb-2 flex gap-1">
                        <Button
                            type="button"
                            size="sm"
                            variant={giphyTab === 'gifs' ? 'default' : 'ghost'}
                            className="rounded-full h-7 px-3 text-xs"
                            onClick={() => setGiphyTab('gifs')}
                        >
                            GIFs
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant={giphyTab === 'stickers' ? 'default' : 'ghost'}
                            className="rounded-full h-7 px-3 text-xs"
                            onClick={() => setGiphyTab('stickers')}
                        >
                            Stickers
                        </Button>
                    </div>
                    <GiphyPanel
                        type={giphyTab === 'gifs' ? 'gifs' : 'stickers'}
                        onSelect={giphyTab === 'gifs' ? onGifClick : onStickerClick}
                        maxWidth={550}
                    />
                </PopoverContent>
              </Popover>
              {/* Location was fully implemented (handler, state, DB column,
                  chip) but had no button to trigger it. */}
              <Button
                variant="ghost"
                size="icon"
                title={location ? 'Remove location' : 'Tag location'}
                onClick={handleLocationClick}
                disabled={posting || locating}
              >
                {locating ? (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                ) : (
                  <MapPin className={cn("h-5 w-5", location ? "text-primary fill-primary/20" : "text-primary")} />
                )}
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" title="Schedule post" disabled={posting}>
                        <CalendarClock className={cn("h-5 w-5", scheduledFor ? "text-primary fill-primary/20" : "text-primary")} />
                    </Button>
                </PopoverTrigger>
                {/* Radix measures the space it actually has and exposes it as
                    this variable — a fixed vh cap doesn't know how far down the
                    trigger sits, which left the clear button off the bottom. */}
                <PopoverContent
                    align="end"
                    collisionPadding={12}
                    className="w-auto max-h-[var(--radix-popover-content-available-height)] overflow-y-auto p-3 border-none bg-background/95 backdrop-blur-sm shadow-lg"
                >
                    <SchedulePicker value={scheduledFor} onChange={setScheduledFor} />
                </PopoverContent>
              </Popover>
            </div>
            <Button size="sm" className="rounded-full" disabled={!isPostable || posting} onClick={handlePost}>
                {posting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {posting ? 'Posting...' : scheduledFor ? 'Schedule' : 'Kick-It!'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
