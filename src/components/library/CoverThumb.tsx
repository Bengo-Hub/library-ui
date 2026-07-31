'use client';

import { useEffect, useState } from 'react';
import { BookText } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Derives the server-generated thumbnail path for a cover URL (see library-api's UploadCover,
 * which writes "{bibID}_{side}_thumb.{ext}" alongside the full-resolution original at
 * "{bibID}_{side}.{ext}"). Only applies to real /media/ URLs — local blob:/data: object URLs
 * (used for an unsaved cover picked in BibForm) have no server-side thumbnail and must be
 * rendered as-is.
 */
function thumbUrl(url: string): string | null {
  if (!url.includes('/media/covers/')) return null;
  const idx = url.lastIndexOf('.');
  if (idx === -1) return null;
  return `${url.slice(0, idx)}_thumb${url.slice(idx)}`;
}

/**
 * Book-cover thumbnail with a typed fallback placeholder.
 *
 * Requests the small server-generated thumbnail first (a fraction of the full-resolution
 * original's size — the previous plain <img src={url}> always fetched the original, which is
 * the main reason catalog grid pages felt slow) and falls back to the full-resolution original
 * on load error, then to the placeholder icon if that also fails. Covers uploaded before
 * thumbnailing shipped, and webp sources (no server-side webp encoder), have no _thumb file on
 * disk, so this fallback chain matters in practice, not just for edge cases.
 */
export function CoverThumb({ url, title, className }: { url?: string | null; title?: string; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    setSrc(url ? thumbUrl(url) ?? url : null);
  }, [url]);

  if (url && src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={title ?? 'cover'}
        loading="lazy"
        decoding="async"
        className={cn('object-cover rounded-lg bg-muted', className)}
        onError={() => setSrc((cur) => (cur === url ? null : url))}
      />
    );
  }
  return (
    <div className={cn('flex items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 text-primary/50', className)}>
      <BookText className="h-1/3 w-1/3" />
    </div>
  );
}
