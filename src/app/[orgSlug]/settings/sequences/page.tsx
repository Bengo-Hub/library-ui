'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Hash, Loader2 } from 'lucide-react';
import { PageHeader, Skeleton } from '@/components/ui/page';
import { Card, Button } from '@/components/ui/base';
import { Field, Select } from '@/components/ui/form';
import { sequencesApi, renderSequence, RESET_PERIODS, type DocumentSequence, type SequenceUpdate } from '@/lib/api/sequences';
import { apiErrorMessage } from '@/lib/api/error-message';

const inputCls =
  'w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none';

export default function SequencesSettingsPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const qc = useQueryClient();

  const { data: sequences = [], isLoading } = useQuery({
    queryKey: ['sequences', orgSlug],
    queryFn: () => sequencesApi.list(orgSlug),
  });

  const update = useMutation({
    mutationFn: ({ kind, data }: { kind: string; data: SequenceUpdate }) => sequencesApi.update(orgSlug, kind, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sequences', orgSlug] });
      toast.success('Numbering saved');
    },
    onError: async (e) => toast.error(await apiErrorMessage(e, 'Failed to save')),
  });

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader title="Numbering & Sequences" subtitle="Membership, accession & loan number formats" icon={<Hash className="h-5 w-5" />} />
      <p className="mb-4 text-sm text-muted-foreground">
        Build the format with tokens: <code className="rounded bg-muted px-1">{'{prefix}'}</code>{' '}
        <code className="rounded bg-muted px-1">{'{seq}'}</code>{' '}
        <code className="rounded bg-muted px-1">{'{yy}'}</code>{' '}
        <code className="rounded bg-muted px-1">{'{yyyy}'}</code>{' '}
        <code className="rounded bg-muted px-1">{'{mm}'}</code>. The counter restarts per the reset period.
      </p>

      {isLoading ? (
        <div className="space-y-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-44" />)}</div>
      ) : (
        <div className="space-y-4">
          {sequences.map((s) => (
            <SequenceCard key={s.id} seq={s} saving={update.isPending} onSave={(data) => update.mutate({ kind: s.kind, data })} />
          ))}
        </div>
      )}
    </div>
  );
}

function SequenceCard({ seq, saving, onSave }: { seq: DocumentSequence; saving: boolean; onSave: (data: SequenceUpdate) => void }) {
  const [prefix, setPrefix] = useState(seq.prefix);
  const [format, setFormat] = useState(seq.format);
  const [padWidth, setPadWidth] = useState(seq.pad_width);
  const [reset, setReset] = useState<string>(seq.reset_period);

  useEffect(() => {
    setPrefix(seq.prefix); setFormat(seq.format); setPadWidth(seq.pad_width); setReset(seq.reset_period);
  }, [seq]);

  const preview = renderSequence(format, prefix, padWidth, seq.next_value || 1);
  const dirty = prefix !== seq.prefix || format !== seq.format || padWidth !== seq.pad_width || reset !== seq.reset_period;

  return (
    <Card>
      <div className="p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <p className="font-semibold">{seq.label}</p>
            <p className="text-xs text-muted-foreground">Next number preview: <span className="font-mono font-semibold text-foreground">{preview}</span></p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Prefix">
            <input value={prefix} onChange={(e) => setPrefix(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Format">
            <input value={format} onChange={(e) => setFormat(e.target.value)} className={inputCls} placeholder="{prefix}/{seq}/{yy}" />
          </Field>
          <Field label="Number padding (digits)">
            <input type="number" min={1} max={12} value={padWidth} onChange={(e) => setPadWidth(Number(e.target.value) || 1)} className={inputCls} />
          </Field>
          <Field label="Reset counter">
            <Select value={reset} onChange={(e) => setReset(e.target.value)}>
              {RESET_PERIODS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </Select>
          </Field>
        </div>
        <div className="mt-4 flex justify-end">
          <Button disabled={!dirty || saving} onClick={() => onSave({ prefix, format, pad_width: padWidth, reset_period: reset })} className="gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save
          </Button>
        </div>
      </div>
    </Card>
  );
}
