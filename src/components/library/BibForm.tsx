'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ScanLine, Upload, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/base';
import { Field, Select, Textarea } from '@/components/ui/form';
import { Dialog } from '@/components/ui/dialog';
import { Combobox } from '@/components/ui/combobox';
import { TermMultiSelect, TermSelect } from '@/components/ui/term-select';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { CoverThumb } from '@/components/library/CoverThumb';
import { CollectionFormDialog } from '@/components/library/CollectionFormDialog';
import { BIB_FORMATS, type BibInput, type BibRecord, type BibFormat, type LibraryCollection } from '@/lib/api/catalog';
import { useIsbnLookup, useCollections, useUploadCover } from '@/hooks/useCatalog';
import { LANGUAGES } from '@/lib/languages';

export interface BibCovers { front?: File; back?: File }

const EMPTY: BibInput = {
  title: '', author: '', authors: [], publisher: '', isbn: '', format: 'book', language: 'en',
  publication_year: null, edition: '', dewey: '', subjects: [], description: '',
  cover_url: null, cover_back_url: null, publication_place: '', other_isbns: [],
};

const INPUT = 'w-full rounded-lg border border-input bg-transparent px-3 py-2.5 text-sm focus:ring-1 focus:ring-ring focus:outline-none';

export function BibForm({
  orgSlug, initial, saving, onSubmit,
}: {
  orgSlug: string;
  initial?: BibRecord;
  saving?: boolean;
  onSubmit: (data: BibInput, covers?: BibCovers) => void;
}) {
  const [form, setForm] = useState<BibInput>(EMPTY);
  const [secondaryIsbn, setSecondaryIsbn] = useState('');
  const [scanOpen, setScanOpen] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [collectionDialogOpen, setCollectionDialogOpen] = useState(false);
  const [collectionDefaultName, setCollectionDefaultName] = useState('');

  const isbnLookup = useIsbnLookup(orgSlug);
  const { data: collections = [] } = useCollections(orgSlug);

  useEffect(() => {
    if (initial) {
      const authors = initial.authors?.length
        ? initial.authors
        : (initial.author ? initial.author.split(',').map((s) => s.trim()).filter(Boolean) : []);
      setForm({
        title: initial.title, subtitle: initial.subtitle, author: initial.author, authors,
        publisher: initial.publisher, publication_year: initial.publication_year ?? null, edition: initial.edition,
        isbn: initial.isbn, issn: initial.issn, format: initial.format, language: initial.language || 'en',
        dewey: initial.dewey, subjects: initial.subjects ?? [],
        collection_id: initial.collection_id, description: initial.description, cover_url: initial.cover_url,
        cover_back_url: initial.cover_back_url, publication_place: initial.publication_place, other_isbns: initial.other_isbns ?? [],
        pages: initial.pages ?? null,
      });
      setSecondaryIsbn((initial.other_isbns ?? [])[0] ?? '');
      setCoverPreview(initial.cover_url ?? null);
      setBackPreview(initial.cover_back_url ?? null);
    }
  }, [initial]);

  function set<K extends keyof BibInput>(key: K, value: BibInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function runIsbnLookup(isbn: string) {
    const clean = isbn.replace(/[^0-9Xx]/g, '');
    if (!clean) return;
    set('isbn', clean);
    // Non-blocking: fields stay editable, a miss/failure never stops manual entry.
    try {
      const r = await isbnLookup.mutateAsync(clean);
      const found = !!(r.title || r.authors?.length || r.author || r.publisher || r.cover_url);
      if (!found) { toast.info('No match for that ISBN — enter the details manually.'); return; }
      const lookedUpAuthors = r.authors?.length
        ? r.authors
        : (r.author ? r.author.split(',').map((s) => s.trim()).filter(Boolean) : undefined);
      setForm((f) => ({
        ...f,
        isbn: r.isbn ?? clean,
        title: r.title ?? f.title,
        subtitle: r.subtitle ?? f.subtitle,
        authors: lookedUpAuthors?.length ? lookedUpAuthors : f.authors,
        author: undefined,
        publisher: r.publisher ?? f.publisher,
        publication_year: r.publication_year ?? f.publication_year,
        pages: r.pages ?? f.pages,
        language: r.language ?? f.language,
        cover_url: r.cover_url ?? f.cover_url,
        description: r.description || f.description,
        subjects: r.subjects?.length ? r.subjects : f.subjects,
      }));
      if (r.cover_url) setCoverPreview(r.cover_url);
      toast.success('Details auto-filled from ISBN');
    } catch {
      toast.info('Lookup unavailable — enter the details manually.');
    }
  }

  function pickFront(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  }
  function pickBack(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBackFile(file);
    setBackPreview(URL.createObjectURL(file));
  }

  function onCollectionSaved(c: LibraryCollection) {
    set('collection_id', c.id);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    const other = secondaryIsbn.trim() ? [secondaryIsbn.trim()] : [];
    onSubmit(
      { ...form, author: undefined, authors: form.authors ?? [], subjects: form.subjects ?? [], other_isbns: other },
      { front: coverFile ?? undefined, back: backFile ?? undefined },
    );
  }

  const collectionOptions = collections.map((c) => ({ value: c.id, label: c.name, hint: c.is_global ? undefined : 'custom' }));
  const languageOptions = LANGUAGES.map((l) => ({ value: l.code, label: l.name, hint: l.code }));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ISBN scan row */}
      <div className="rounded-2xl border border-border bg-accent/20 p-4">
        <Field label="ISBN" hint="Scan the ISBN to auto-fill title, author, publisher, cover and synopsis — or type it and press Enter. You can always edit or type everything manually.">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                value={form.isbn ?? ''}
                onChange={(e) => set('isbn', e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (e.currentTarget.value) runIsbnLookup(e.currentTarget.value);
                  }
                }}
                inputMode="numeric"
                placeholder="978… (press Enter to look up)"
                className="w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm focus:ring-1 focus:ring-ring focus:outline-none"
              />
              {isbnLookup.isPending && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1 sm:flex-none gap-1.5" onClick={() => setScanOpen(true)}>
                <ScanLine className="h-4 w-4" /> Scan
              </Button>
              <Button type="button" variant="secondary" className="flex-1 sm:flex-none" onClick={() => form.isbn && runIsbnLookup(form.isbn)} disabled={isbnLookup.isPending}>
                {isbnLookup.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Lookup'}
              </Button>
            </div>
          </div>
        </Field>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Covers: front + back */}
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
          <CoverSlot label="Front cover" preview={coverPreview} title={form.title} onPick={pickFront}
            onRemove={() => { setCoverFile(null); setCoverPreview(null); set('cover_url', null); }} />
          <CoverSlot label="Back cover" preview={backPreview} title={form.title} onPick={pickBack}
            onRemove={() => { setBackFile(null); setBackPreview(null); set('cover_back_url', null); }} />
        </div>

        {/* Fields */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Title" required className="sm:col-span-2">
            <input value={form.title} onChange={(e) => set('title', e.target.value)} className={INPUT} />
          </Field>
          <Field label="Subtitle" className="sm:col-span-2">
            <input value={form.subtitle ?? ''} onChange={(e) => set('subtitle', e.target.value)} className={INPUT} />
          </Field>
          <Field label="Author(s)" hint="Search existing or type to add" className="sm:col-span-2">
            <TermMultiSelect
              orgSlug={orgSlug} kind="author"
              values={form.authors ?? []}
              onChange={(v) => set('authors', v)}
              placeholder="Surname, Firstname"
              addLabel="Add author"
            />
          </Field>
          <Field label="Publisher">
            <TermSelect
              orgSlug={orgSlug} kind="publisher"
              value={form.publisher ?? ''}
              onChange={(v) => set('publisher', v)}
              placeholder="Select or add publisher…"
              addLabel="Add publisher"
            />
          </Field>
          <Field label="Place of publication">
            <TermSelect
              orgSlug={orgSlug} kind="place"
              value={form.publication_place ?? ''}
              onChange={(v) => set('publication_place', v)}
              placeholder="Nairobi, Kenya"
              addLabel="Add place"
            />
          </Field>
          <Field label="Format" required>
            <Select value={form.format} onChange={(e) => set('format', e.target.value as BibFormat)}>
              {BIB_FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </Select>
          </Field>
          <Field label="Publication year">
            <input type="number" value={form.publication_year ?? ''} onChange={(e) => set('publication_year', e.target.value ? Number(e.target.value) : null)} className={INPUT} />
          </Field>
          <Field label="Edition">
            <input value={form.edition ?? ''} onChange={(e) => set('edition', e.target.value)} className={INPUT} />
          </Field>
          <Field label="Language">
            <Combobox
              value={form.language ?? ''}
              onChange={(v) => set('language', v)}
              options={languageOptions}
              placeholder="Select language…"
              searchPlaceholder="Search languages…"
            />
          </Field>
          <Field label="Secondary ISBN" hint="Other edition (optional)">
            <input value={secondaryIsbn} onChange={(e) => setSecondaryIsbn(e.target.value)} placeholder="978…" className={INPUT} />
          </Field>
          <Field label="Dewey / classification">
            <input value={form.dewey ?? ''} onChange={(e) => set('dewey', e.target.value)} placeholder="823.914" className={INPUT} />
          </Field>
          <Field label="Collection">
            <Combobox
              value={form.collection_id ?? ''}
              onChange={(v) => set('collection_id', v || undefined)}
              options={collectionOptions}
              placeholder="— None —"
              searchPlaceholder="Search collections…"
              allowClear
              onAddNew={(q) => { setCollectionDefaultName(q); setCollectionDialogOpen(true); }}
              addNewLabel="Add new collection"
            />
          </Field>
          <Field label="Pages">
            <input type="number" value={form.pages ?? ''} onChange={(e) => set('pages', e.target.value ? Number(e.target.value) : null)} className={INPUT} />
          </Field>
          <Field label="Subjects" hint="Search existing or type to add" className="sm:col-span-2">
            <TermMultiSelect
              orgSlug={orgSlug} kind="subject"
              values={form.subjects ?? []}
              onChange={(v) => set('subjects', v)}
              placeholder="Kenyan fiction (English), Women — Kenya — Fiction"
              addLabel="Add subject"
            />
          </Field>
          <Field label="Description / notes" className="sm:col-span-2">
            <Textarea value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} />
          </Field>
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-border pt-4">
        <Button type="submit" disabled={saving} className="gap-1.5 w-full sm:w-auto">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {initial ? 'Save changes' : 'Create title'}
        </Button>
      </div>

      <Dialog open={scanOpen} onClose={() => setScanOpen(false)} title="Scan ISBN barcode">
        <BarcodeScanner hint="Point the camera at the book's ISBN barcode." onScan={(text) => { setScanOpen(false); runIsbnLookup(text); }} />
      </Dialog>

      <CollectionFormDialog
        open={collectionDialogOpen}
        orgSlug={orgSlug}
        defaultName={collectionDefaultName}
        onClose={() => setCollectionDialogOpen(false)}
        onSaved={onCollectionSaved}
      />
    </form>
  );
}

function CoverSlot({ label, preview, title, onPick, onRemove }: {
  label: string; preview: string | null; title?: string; onPick: (e: React.ChangeEvent<HTMLInputElement>) => void; onRemove: () => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <CoverThumb url={preview} title={title} className="aspect-[3/4] w-full" />
      <label className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-xs cursor-pointer hover:bg-accent/40 transition-colors">
        <Upload className="h-3.5 w-3.5" /> Upload
        <input type="file" accept="image/*" className="hidden" onChange={onPick} />
      </label>
      {preview && (
        <button type="button" onClick={onRemove} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive">
          <X className="h-3 w-3" /> Remove
        </button>
      )}
    </div>
  );
}
