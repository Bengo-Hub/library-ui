'use client';

import { useEffect, useState } from 'react';
import { BookText } from 'lucide-react';
import { MediaImage } from '@bengo-hub/shared-ui-lib/media';
import { cn } from '@/lib/utils';

/**
 * Book-cover thumbnail with a typed fallback placeholder.
 *
 * Uploaded covers are resized at the edge (Cloudflare Image Transformations through
 * shared-ui-lib's MediaImage), so a grid fetches a small cover instead of the full-resolution
 * original. Open Library links and local blob:/data: previews (an unsaved cover picked in BibForm)
 * are shown as they are. If the cover cannot be loaded at all, the placeholder icon is shown.
 */
export function CoverThumb({
  url,
  title,
  className,
  displayWidth = 256,
}: {
  url?: string | null;
  title?: string;
  className?: string;
  /** The widest the cover is shown, in CSS pixels. */
  displayWidth?: number;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);

  if (url && !failed) {
    return (
      <MediaImage
        src={url}
        alt={title ?? 'cover'}
        displayWidth={displayWidth}
        fit="cover"
        aspect={4 / 3}
        className={cn('object-cover rounded-lg bg-muted', className)}
        onError={(e) => {
          // MediaImage retries the original after a resized cover fails; show the placeholder
          // only when the original fails too.
          if (e.currentTarget.src === url) setFailed(true);
        }}
      />
    );
  }
  return (
    <div className={cn('flex items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 text-primary/50', className)}>
      <BookText className="h-1/3 w-1/3" />
    </div>
  );
}
