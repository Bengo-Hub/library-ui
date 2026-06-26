'use client';

import { useEffect, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, Loader2, ZoomIn, ZoomOut } from 'lucide-react';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

// Pin the pdf.js worker to the bundled version (no external CDN at runtime).
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export function PdfReader({
  url, initialPage, onPageChange,
}: {
  url: string;
  initialPage?: number;
  onPageChange?: (page: number) => void;
}) {
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(initialPage && initialPage > 0 ? initialPage : 1);
  const [scale, setScale] = useState(1.1);

  useEffect(() => { onPageChange?.(page); }, [page, onPageChange]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-center gap-3 border-b border-border bg-card/80 backdrop-blur px-4 py-2">
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="p-1.5 rounded-lg hover:bg-accent disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
        <span className="text-sm text-muted-foreground min-w-24 text-center">Page {page}{numPages ? ` / ${numPages}` : ''}</span>
        <button onClick={() => setPage((p) => Math.min(numPages || p + 1, p + 1))} disabled={!!numPages && page >= numPages} className="p-1.5 rounded-lg hover:bg-accent disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
        <div className="mx-2 h-5 w-px bg-border" />
        <button onClick={() => setScale((s) => Math.max(0.6, s - 0.15))} className="p-1.5 rounded-lg hover:bg-accent"><ZoomOut className="h-4 w-4" /></button>
        <span className="text-xs text-muted-foreground w-10 text-center">{Math.round(scale * 100)}%</span>
        <button onClick={() => setScale((s) => Math.min(2.5, s + 0.15))} className="p-1.5 rounded-lg hover:bg-accent"><ZoomIn className="h-4 w-4" /></button>
      </div>
      <div className="flex-1 overflow-auto flex justify-center bg-muted/40 py-6">
        <Document
          file={url}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          loading={<div className="flex items-center gap-2 text-muted-foreground p-10"><Loader2 className="h-5 w-5 animate-spin" /> Loading…</div>}
          error={<div className="p-10 text-sm text-destructive">Unable to open this document.</div>}
        >
          <Page pageNumber={page} scale={scale} renderTextLayer renderAnnotationLayer className="shadow-lg rounded overflow-hidden" />
        </Document>
      </div>
    </div>
  );
}
