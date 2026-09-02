'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, BookText } from 'lucide-react';
import { BibForm } from '@/components/library/BibForm';
import { PageHeader, Skeleton } from '@/components/ui/page';
import { Card } from '@/components/ui/base';
import { useBib, useCreateBib, useUpdateBib, useUploadCover } from '@/hooks/useCatalog';
import type { BibInput } from '@/lib/api/catalog';
import { apiErrorMessage } from '@/lib/api/error-message';

function CatalogingContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgSlug = params?.orgSlug as string;
  const editId = searchParams?.get('id') ?? '';

  const { data: existing, isLoading } = useBib(orgSlug, editId);
  const createBib = useCreateBib(orgSlug);
  const updateBib = useUpdateBib(orgSlug);
  const uploadCover = useUploadCover(orgSlug);

  const saving = createBib.isPending || updateBib.isPending || uploadCover.isPending;

  async function handleSubmit(data: BibInput, covers?: { front?: File; back?: File }) {
    try {
      let bibId = editId;
      if (editId) {
        await updateBib.mutateAsync({ id: editId, data });
        toast.success('Title updated');
      } else {
        const created = await createBib.mutateAsync(data);
        bibId = created.id;
        toast.success('Title created');
      }
      if (bibId && covers?.front) {
        await uploadCover.mutateAsync({ id: bibId, file: covers.front, side: 'front' });
      }
      if (bibId && covers?.back) {
        await uploadCover.mutateAsync({ id: bibId, file: covers.back, side: 'back' });
      }
      router.push(`/${orgSlug}/catalog/${bibId}`);
    } catch (e) {
      toast.error(await apiErrorMessage(e, 'Failed to save title'));
      // Rethrow so BibForm's submit wrapper knows the save failed and keeps the autosave draft
      // instead of clearing it — a dropped connection mid-submit shouldn't lose the title twice.
      throw e;
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Link href={`/${orgSlug}/catalog`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to catalog
      </Link>
      <PageHeader
        title={editId ? 'Edit Title' : 'Cataloging'}
        subtitle={editId ? 'Update the bibliographic record' : 'Add a new title to the catalog'}
        icon={<BookText className="h-5 w-5" />}
      />
      <Card>
        <div className="p-6">
          {editId && isLoading ? (
            <div className="space-y-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : (
            <BibForm orgSlug={orgSlug} initial={editId ? existing : undefined} saving={saving} onSubmit={handleSubmit} />
          )}
        </div>
      </Card>
    </div>
  );
}

export default function CatalogingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading…</div>}>
      <CatalogingContent />
    </Suspense>
  );
}
