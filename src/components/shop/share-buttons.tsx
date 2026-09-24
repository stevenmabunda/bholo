'use client';

import { useEffect, useState } from 'react';
import { Check, Facebook, Link2, MessageCircle, Share2, Twitter } from 'lucide-react';
import { formatShopPrice, type ShopProduct } from '@/lib/shop-products';
import { cn } from '@/lib/utils';

/**
 * Share-a-jersey row: WhatsApp, Facebook, X, copy-link, and the native
 * OS share sheet where available (mobile).
 *
 * The shared URL is this page's canonical address — its server-rendered
 * <head> already carries og:title/description/image + twitter:card, which
 * is what Facebook/WhatsApp/X turn into the thumbnail preview. No preview
 * without those tags, so this component and [slug]/page.tsx's
 * generateMetadata are two halves of the same feature.
 */
export function ShareButtons({ product }: { product: ShopProduct }) {
  const [url, setUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    setUrl(window.location.href);
    setCanNativeShare(typeof navigator !== 'undefined' && 'share' in navigator);
  }, []);

  if (!url) return null;

  const text = `${product.name} — ${formatShopPrice(product.price)}`;
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);

  const channels = [
    {
      label: 'Share on WhatsApp',
      href: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      Icon: MessageCircle,
    },
    {
      label: 'Share on Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      Icon: Facebook,
    },
    {
      label: 'Share on X',
      href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      Icon: Twitter,
    },
  ];

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard API needs a secure context — fall back to the old
      // select-and-copy so in-app webviews still work.
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const nativeShare = () => {
    navigator
      .share({ title: product.name, text, url })
      .catch(() => {
        // Dismissed the sheet — not an error worth surfacing.
      });
  };

  const buttonClass =
    'flex h-11 w-11 items-center justify-center border border-white/20 text-foreground transition-colors hover:border-foreground';

  return (
    <div className="mt-8">
      <p className="text-xs font-bold uppercase tracking-wide">Share</p>
      <div className="mt-3 flex gap-2">
        {channels.map(({ label, href, Icon }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            title={label}
            className={buttonClass}
          >
            <Icon className="h-4 w-4" />
          </a>
        ))}
        <button
          type="button"
          onClick={copyLink}
          aria-label="Copy product link"
          title="Copy product link"
          className={cn(buttonClass, copied && 'border-foreground')}
        >
          {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
        </button>
        {canNativeShare && (
          <button
            type="button"
            onClick={nativeShare}
            aria-label="More share options"
            title="More share options"
            className={buttonClass}
          >
            <Share2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
