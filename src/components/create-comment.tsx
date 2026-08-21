'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import React, { useState, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { Image as ImageIcon, Film, X, Loader2, Smile, Clapperboard, Sticker } from "lucide-react";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { LoginOrSignupDialog } from "./login-or-signup-dialog";
import dynamic from 'next/dynamic';

// Same lazily-loaded picker the composer uses — see giphy-panel.tsx.
const GiphyPanel = dynamic(() => import('@/components/giphy-panel'), {
  ssr: false,
  loading: () => (
    <div className="flex h-40 w-[300px] max-w-full items-center justify-center text-sm text-muted-foreground">
      Loading…
    </div>
  ),
});


export type ReplyMedia = {
  file: File;
  previewUrl: string;
  type: 'image' | 'video' | 'gif' | 'sticker';
  url?: string;
  width?: number;
  height?: number;
};

const EMOJIS = [
    '😀', '😂', '😍', '🤔', '😭', '🙏', '❤️', '🔥', '👍', '⚽️', '🥅', '🏆', '🎉', '👏', '🚀', '💯'
];



export function CreateComment({ onComment, isDialog = false }: { onComment: (data: { text: string; media: ReplyMedia[] }) => Promise<any>, isDialog?: boolean }) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [media, setMedia] = useState<ReplyMedia[]>([]);
  const [posting, setPosting] = useState(false);
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [isGifPopoverOpen, setIsGifPopoverOpen] = useState(false);
  const [isStickerPopoverOpen, setIsStickerPopoverOpen] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const fileType = files[0].type.startsWith('image/') ? 'image' : 'video';

    if (media.length > 0) {
      toast({ variant: 'destructive', description: "You can only attach one media item to a reply." });
      return;
    }
    
    const newMedia = files.slice(0, 1).map(file => ({
      file,
      previewUrl: URL.createObjectURL(file),
      type: fileType as 'image' | 'video',
    }));

    setMedia(newMedia);
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
    if (videoInputRef.current) videoInputRef.current.value = "";
  }

  const handleActionClick = (action: () => void) => () => {
    if (!user) {
      setIsLoginDialogOpen(true);
      return;
    }
    action();
  };

  const handleComment = async () => {
    if (!user) {
        setIsLoginDialogOpen(true);
        return;
    }
    if (!isPostable || posting) return;
    setPosting(true);

    try {
      const result = await onComment({ text, media });
      if (result) {
          media.forEach(m => URL.revokeObjectURL(m.previewUrl));
          setText("");
          setMedia([]);
          if (imageInputRef.current) imageInputRef.current.value = "";
          if (videoInputRef.current) videoInputRef.current.value = "";
      } else {
        toast({ variant: 'destructive', description: 'Could not post reply. Please try again.' });
      }
    } catch (error) {
      console.error("Failed to create comment:", error);
    } finally {
      setPosting(false);
    }
  };

  const handleEmojiClick = (emoji: string) => {
    setText(prevText => prevText + emoji);
  };

  const onGifClick = (gif: any, e: React.SyntheticEvent<HTMLElement, Event>) => {
    e.preventDefault();
    if (media.length > 0) {
        toast({ variant: 'destructive', description: "You can only attach one media item to a reply." });
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
    setIsGifPopoverOpen(false);
  }

  const onStickerClick = (sticker: any, e: React.SyntheticEvent<HTMLElement, Event>) => {
    e.preventDefault();
    if (media.length > 0) {
        toast({ variant: 'destructive', description: "You can only attach one media item to a reply." });
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
    setIsStickerPopoverOpen(false);
  };

  const isPostable = text.trim().length > 0 || media.length > 0;
  const hasMedia = media.length > 0;
  const hasVideo = hasMedia && media[0].type === 'video';
  const hasGif = hasMedia && media[0].type === 'gif';
  const hasSticker = hasMedia && media[0].type === 'sticker';
  const hasImage = hasMedia && media[0].type === 'image';
  
  const guestAvatarSrc = "https://placehold.co/40x40.png";

  return (
    <div className={cn("p-3 md:p-4", !isDialog && "border-t")}>
      <div className="flex space-x-3 md:space-x-4">
        <Avatar>
          <AvatarImage src={profile?.photo_url || guestAvatarSrc} alt={profile?.display_name || "User"} data-ai-hint="user avatar" />
          <AvatarFallback>{profile?.display_name?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-4">
          <Textarea
            placeholder="Post your reply"
            className="w-full resize-none border-0 bg-transparent px-0 text-lg focus-visible:ring-0 focus-visible:ring-offset-0"
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={handleActionClick(() => {})}
          />

          {hasMedia && (
             <div className="mt-3 rounded-2xl overflow-hidden border max-h-[300px] overflow-y-auto">
                <div className="relative">
                    {hasVideo ? (
                        <video src={media[0].previewUrl} controls className="w-full h-auto max-h-96 object-contain" />
                    ) : (hasImage || hasGif || hasSticker) ? (
                         <Image src={media[0].previewUrl} alt="Preview 1" width={500} height={500} className="w-full h-auto object-contain bg-black" />
                    ) : null}
                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/50 hover:bg-black/75 text-white hover:text-white" onClick={() => removeMedia(0)}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>
          )}

          <div className="flex justify-between items-center">
             <div className="flex items-center -ml-2">
                <input
                    type="file"
                    accept="image/*"
                    ref={imageInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={posting || hasMedia}
                />
                <input
                    type="file"
                    accept="video/*"
                    ref={videoInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={posting || hasMedia}
                />
                <Button variant="ghost" size="icon" onClick={handleActionClick(() => imageInputRef.current?.click())} disabled={posting || hasMedia}>
                    <ImageIcon className="h-5 w-5 text-primary" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleActionClick(() => videoInputRef.current?.click())} disabled={posting || hasMedia}>
                    <Film className="h-5 w-5 text-primary" />
                </Button>
                 <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={handleActionClick(() => {})} disabled={posting}>
                            <Smile className="h-5 w-5 text-primary" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2 border-none bg-background/80 backdrop-blur-sm shadow-lg">
                        <div className="grid grid-cols-8 gap-1">
                            {EMOJIS.map((emoji) => (
                                <Button
                                    key={emoji}
                                    variant="ghost"
                                    className="text-xl rounded-full p-2 hover:bg-accent"
                                    onClick={() => handleEmojiClick(emoji)}
                                >
                                    {emoji}
                                </Button>
                            ))}
                        </div>
                    </PopoverContent>
                </Popover>
                <Popover open={isGifPopoverOpen} onOpenChange={(open) => open ? handleActionClick(() => setIsGifPopoverOpen(true))() : setIsGifPopoverOpen(false)}>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={posting || hasMedia}>
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
                        <GiphyPanel type="gifs" onSelect={onGifClick} maxWidth={300} />
                    </PopoverContent>
                </Popover>
                <Popover open={isStickerPopoverOpen} onOpenChange={(open) => open ? handleActionClick(() => setIsStickerPopoverOpen(true))() : setIsStickerPopoverOpen(false)}>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={posting || hasMedia}>
                            <Sticker className="h-5 w-5 text-primary" />
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
                        <GiphyPanel type="stickers" onSelect={onStickerClick} maxWidth={300} />
                    </PopoverContent>
                </Popover>
            </div>
            <Button disabled={!isPostable || posting} onClick={handleComment}>
                {posting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Reply
            </Button>
          </div>
        </div>
      </div>
      <LoginOrSignupDialog isOpen={isLoginDialogOpen} onOpenChange={setIsLoginDialogOpen} />
    </div>
  );
}
