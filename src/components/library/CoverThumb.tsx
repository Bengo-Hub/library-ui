'use client';

import { BookText } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Book-cover thumbnail with a typed fallback placeholder. */
export function CoverThumb({ url, title, className }: { url?: string | null; title?: string; className?: string }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={title ?? 'cover'} className={cn('object-cover rounded-lg bg-muted', className)} />;
  }
  return (
    <div className={cn('flex items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 text-primary/50', className)}>
      <BookText className="h-1/3 w-1/3" />
    </div>
  );
}
