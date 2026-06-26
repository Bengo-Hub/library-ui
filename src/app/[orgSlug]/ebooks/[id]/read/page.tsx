'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useEbook, useLendEbook, useSaveReadPosition } from '@/hooks/useEbooks';
import { ebooksApi, type EbookLendResult } from '@/lib/api/ebooks';
import { useAuthStore } from '@/store/auth';
import { apiErrorMessage } from '@/lib/api/error-message';

// Readers are client-only (pdf.js / epub.js touch window) — never SSR them.
const PdfReader = dynamic(() => import('@/components/library/ebook/PdfReader').then((m) => m.PdfReader), {
  ssr: false,
  loading: () => <ReaderLoading />,
});
const EpubReader = dynamic(() => import('@/components/library/ebook/EpubReader').then((m) => m.EpubReader), {
  ssr: false,
  loading: () => <ReaderLoading />,
});

function ReaderLoading() {
  return <div className="flex flex-1 items-center justify-center text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>;
}

/** Per-page watermark overlay: deters screenshots / redistribution by stamping the borrower id + time. */
function Watermark({ label }: { label: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden select-none">
      <div className="absolute inset-0 flex flex-wrap content-center justify-center gap-x-24 gap-y-32 opacity-[0.06] -rotate-30">
        {Array.from({ length: 24 }).map((_, i) => (
          <span key={i} className="text-sm font-bold uppercase tracking-widest whitespace-nowrap">{label}</span>
        ))}
      </div>
    </div>
  );
}

export default function EbookReaderPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const id = params?.id as string;

  const user = useAuthStore((s) => s.user);
  const { data: ebook } = useEbook(orgSlug, id);
  const lend = useLendEbook(orgSlug);
  const savePosition = useSaveReadPosition(orgSlug);

  const [lease, setLease] = useState<EbookLendResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);
  const positionRef = useRef<string>('');

  // Borrow a license once on mount → get { loan_id, access_token }.
  useEffect(() => {
    if (startedRef.current || !id || !orgSlug) return;
    startedRef.current = true;
    lend.mutateAsync(id)
      .then(setLease)
      .catch(async (e) => setError(await apiErrorMessage(e, 'This eBook is not available to borrow right now.')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, orgSlug]);

  // Persist the last read position on unmount + every 15s.
  useEffect(() => {
    if (!lease) return;
    const flush = () => {
      if (positionRef.current) savePosition.mutate({ loanId: lease.loan_id, position: positionRef.current });
    };
    const t = setInterval(flush, 15_000);
    return () => { clearInterval(t); flush(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lease]);

  const watermarkLabel = `${user?.email ?? user?.fullName ?? 'Member'} · ${new Date().toLocaleString()}`;
  const format = lease?.format ?? ebook?.format ?? 'pdf';
  const readUrl = lease ? ebooksApi.readUrl(orgSlug, id, lease.access_token) : '';

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-background">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 bg-card">
        <Link href={`/${orgSlug}/ebooks`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Library
        </Link>
        <p className="text-sm font-semibold truncate flex-1 text-center">{ebook?.title ?? 'Reading…'}</p>
        <span className="text-xs text-muted-foreground hidden sm:block truncate max-w-[12rem]">{watermarkLabel}</span>
      </header>

      <div className="relative flex-1 overflow-hidden">
        {error ? (
          <div className="flex h-full items-center justify-center p-8 text-center">
            <div>
              <p className="text-destructive font-medium mb-2">Cannot open eBook</p>
              <p className="text-sm text-muted-foreground max-w-sm">{error}</p>
              <Link href={`/${orgSlug}/ebooks`} className="mt-4 inline-block text-sm text-primary hover:underline">Back to shelf</Link>
            </div>
          </div>
        ) : !lease ? (
          <ReaderLoading />
        ) : (
          <>
            <Watermark label={watermarkLabel} />
            {format === 'epub' ? (
              <EpubReader
                url={readUrl}
                initialLocation={undefined}
                onLocationChange={(cfi) => { positionRef.current = cfi; }}
              />
            ) : (
              <PdfReader
                url={readUrl}
                onPageChange={(p) => { positionRef.current = String(p); }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
