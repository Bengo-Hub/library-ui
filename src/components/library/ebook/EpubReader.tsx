'use client';

import { useState } from 'react';
import { ReactReader } from 'react-reader';

export function EpubReader({
  url, initialLocation, onLocationChange,
}: {
  url: string;
  initialLocation?: string;
  onLocationChange?: (cfi: string) => void;
}) {
  const [location, setLocation] = useState<string | number | null>(initialLocation ?? null);

  return (
    <div className="h-full">
      <ReactReader
        url={url}
        location={location}
        locationChanged={(loc: string) => {
          setLocation(loc);
          onLocationChange?.(loc);
        }}
        epubOptions={{ flow: 'scrolled', manager: 'continuous' }}
      />
    </div>
  );
}
