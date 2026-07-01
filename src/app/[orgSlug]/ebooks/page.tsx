'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { Tablet, Plus, Search, Upload, Loader2, BookOpen, ShoppingCart, Download } from 'lucide-react';
import { useEbooks, useUploadEbook, usePurchaseEbook, useDownloadEbook } from '@/hooks/useEbooks';
import { useDebounce } from '@/hooks/useDebounce';
import { PageHeader, EmptyState, Skeleton } from '@/components/ui/page';
import { Button, Badge, Card } from '@/components/ui/base';
import { CapsuleTabs } from '@/components/ui/tabs';
import { Pagination } from '@/components/ui/pagination';
import { Dialog } from '@/components/ui/dialog';
import { Field, Select } from '@/components/ui/form';
import { CoverThumb } from '@/components/library/CoverThumb';
import { MembershipPaymentModal, type PaymentIntent } from '@/components/library/MembershipPaymentModal';
import { type EbookFormat } from '@/lib/api/ebooks';
import { apiErrorMessage } from '@/lib/api/error-message';
import { FeatureGate } from '@bengo-hub/shared-ui-lib/subscription';

const PAGE_SIZE = 18;

export default function EbooksPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;

  const [q, setQ] = useState('');
  const [format, setFormat] = useState<EbookFormat | ''>('');
  const [page, setPage] = useState(1);
  const debouncedQ = useDebounce(q, 300);

  const { data, isLoading } = useEbooks(orgSlug, { q: debouncedQ || undefined, format: format || undefined, page, limit: PAGE_SIZE });
  const upload = useUploadEbook(orgSlug);
  const purchase = usePurchaseEbook(orgSlug);
  const downloadMutation = useDownloadEbook(orgSlug);

  const [payIntent, setPayIntent] = useState<PaymentIntent | null>(null);
  const [pendingDownload, setPendingDownload] = useState<{ id: string; token: string } | null>(null);

  async function handleBuy(id: string) {
    try {
      const res = await purchase.mutateAsync({ id, memberId: '' });
      if (res?.intent_id) {
        setPendingDownload({ id, token: res.download_token });
        setPayIntent(res);
      } else toast.success('Purchase started');
    } catch (e) { toast.error(await apiErrorMessage(e, 'Purchase failed')); }
  }

  async function handleDownload(id: string, token: string) {
    try {
      const blob = await downloadMutation.mutateAsync({ id, token });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `ebook-${id}`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { toast.error(await apiErrorMessage(e, 'Download failed')); }
  }

  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [meta, setMeta] = useState<{ title: string; author: string; format: EbookFormat; total_licenses: number }>({ title: '', author: '', format: 'pdf', total_licenses: 1 });

  const ebooks = data?.data ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  async function doUpload() {
    if (!file) { toast.error('Choose a file'); return; }
    if (!meta.title.trim()) { toast.error('Title is required'); return; }
    try {
      await upload.mutateAsync({ file, meta });
      toast.success('eBook uploaded');
      setUploadOpen(false); setFile(null); setMeta({ title: '', author: '', format: 'pdf', total_licenses: 1 });
    } catch (e) { toast.error(await apiErrorMessage(e, 'Upload failed')); }
  }

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="eBooks"
        subtitle="Digital lending shelf"
        icon={<Tablet className="h-5 w-5" />}
        actions={<FeatureGate feature="library_ebooks"><Button className="gap-1.5" onClick={() => setUploadOpen(true)}><Plus className="h-4 w-4" /> Upload eBook</Button></FeatureGate>}
      />

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search eBooks…" className="w-full h-11 rounded-xl border border-input bg-card pl-10 pr-4 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
      </div>

      <CapsuleTabs
        className="mb-6"
        value={format || 'all'}
        onChange={(v) => { setFormat(v === 'all' ? '' : (v as EbookFormat)); setPage(1); }}
        options={[{ value: 'all', label: 'All' }, { value: 'pdf', label: 'PDF' }, { value: 'epub', label: 'EPUB' }]}
      />

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-64" />)}
        </div>
      ) : ebooks.length === 0 ? (
        <EmptyState icon={<Tablet className="h-12 w-12" />} title="No eBooks" description="Upload your first digital title for lending." action={<FeatureGate feature="library_ebooks"><Button className="gap-1.5" onClick={() => setUploadOpen(true)}><Plus className="h-4 w-4" /> Upload eBook</Button></FeatureGate>} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {ebooks.map((e) => (
            <div key={e.id} className="group rounded-2xl border border-border bg-card overflow-hidden shadow-sm hover:border-primary/40 hover:shadow-md transition-all flex flex-col">
              <CoverThumb url={e.cover_url} title={e.title} className="aspect-[3/4] w-full" />
              <div className="p-3 space-y-1.5 flex-1 flex flex-col">
                <p className="text-sm font-semibold leading-tight line-clamp-2">{e.title}</p>
                {e.author && <p className="text-xs text-muted-foreground truncate">{e.author}</p>}
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline">{e.format.toUpperCase()}</Badge>
                  {typeof e.available_licenses === 'number' && (
                    <Badge variant={e.available_licenses > 0 ? 'success' : 'error'}>{e.available_licenses} avail.</Badge>
                  )}
                </div>
                <div className="mt-auto space-y-1.5">
                  <Link href={`/${orgSlug}/ebooks/${e.id}/read`}>
                    <Button size="sm" className="w-full gap-1.5"><BookOpen className="h-4 w-4" /> Read</Button>
                  </Link>
                  {e.is_purchasable && (
                    <Button size="sm" variant="outline" className="w-full gap-1.5" disabled={purchase.isPending} onClick={() => handleBuy(e.id)}>
                      {purchase.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
                      Buy{e.price ? ` · ${e.price}` : ''}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <Dialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Upload eBook"
        footer={<><Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button><Button onClick={doUpload} disabled={upload.isPending} className="gap-1.5">{upload.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Upload</Button></>}
      >
        <div className="space-y-4">
          <label className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-6 text-sm cursor-pointer hover:bg-accent/40 transition-colors">
            <Upload className="h-4 w-4" /> {file ? file.name : 'Choose a PDF or EPUB file'}
            <input type="file" accept=".pdf,.epub,application/pdf,application/epub+zip" className="hidden" onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setFile(f);
              if (f) setMeta((m) => ({ ...m, format: f.name.toLowerCase().endsWith('.epub') ? 'epub' : 'pdf', title: m.title || f.name.replace(/\.(pdf|epub)$/i, '') }));
            }} />
          </label>
          <Field label="Title" required>
            <input value={meta.title} onChange={(e) => setMeta((m) => ({ ...m, title: e.target.value }))} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
          </Field>
          <Field label="Author">
            <input value={meta.author} onChange={(e) => setMeta((m) => ({ ...m, author: e.target.value }))} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Format">
              <Select value={meta.format} onChange={(e) => setMeta((m) => ({ ...m, format: e.target.value as EbookFormat }))}>
                <option value="pdf">PDF</option>
                <option value="epub">EPUB</option>
              </Select>
            </Field>
            <Field label="Concurrent licenses">
              <input type="number" min={1} value={meta.total_licenses} onChange={(e) => setMeta((m) => ({ ...m, total_licenses: Number(e.target.value) }))} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
            </Field>
          </div>
        </div>
      </Dialog>

      <MembershipPaymentModal
        open={!!payIntent}
        orgSlug={orgSlug}
        intent={payIntent}
        description="E-book purchase"
        referenceType="ebook_sale"
        onClose={() => { setPayIntent(null); setPendingDownload(null); }}
        onPaid={() => {
          toast.success('E-book purchased!');
          if (pendingDownload) handleDownload(pendingDownload.id, pendingDownload.token);
          setPayIntent(null); setPendingDownload(null);
        }}
      />
    </div>
  );
}
