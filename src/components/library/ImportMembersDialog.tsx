'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Download, FileDown, Loader2, Upload } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/base';
import { membersApi } from '@/lib/api/members';
import { useImportMembers, useImportStatus } from '@/hooks/useMembers';
import { apiErrorMessage } from '@/lib/api/error-message';

/** Trigger a browser download for a Blob (same pattern as catalog[id]/page.tsx's downloadMarc). */
function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * "Import members" dialog — download the CSV template, pick a filled-in CSV, kick off the
 * background import job, then poll for progress until it's done. Surfaces a per-row error
 * summary (and a downloadable error CSV) when some rows fail.
 */
export function ImportMembersDialog({
  open, orgSlug, onClose,
}: {
  open: boolean;
  orgSlug: string;
  onClose: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [errorsLoading, setErrorsLoading] = useState(false);

  const importMembers = useImportMembers(orgSlug);
  const { data: job } = useImportStatus(orgSlug, jobId);

  // Reset local state whenever the dialog is (re)opened.
  useEffect(() => {
    if (open) { setFile(null); setJobId(null); }
  }, [open]);

  useEffect(() => {
    if (job?.status === 'done') {
      if (job.errors.length > 0) toast.warning(`Import finished with ${job.errors.length} error(s)`);
      else toast.success(`Imported ${job.imported} member(s)`);
    }
  }, [job?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  async function downloadTemplate() {
    setTemplateLoading(true);
    try {
      downloadBlob(await membersApi.downloadImportTemplate(orgSlug), 'members-import-template.csv');
    } catch (e) {
      toast.error(await apiErrorMessage(e, 'Failed to download template'));
    } finally {
      setTemplateLoading(false);
    }
  }

  async function downloadErrors() {
    if (!jobId) return;
    setErrorsLoading(true);
    try {
      downloadBlob(await membersApi.getImportErrors(orgSlug, jobId), `members-import-errors-${jobId}.csv`);
    } catch (e) {
      toast.error(await apiErrorMessage(e, 'Failed to download error report'));
    } finally {
      setErrorsLoading(false);
    }
  }

  async function startImport() {
    if (!file) { toast.error('Choose a CSV file'); return; }
    try {
      const res = await importMembers.mutateAsync(file);
      setJobId(res.job_id);
    } catch (e) {
      toast.error(await apiErrorMessage(e, 'Failed to start import'));
    }
  }

  function handleClose() {
    onClose();
  }

  const running = job?.status === 'running';
  const done = job?.status === 'done';
  const progressPct = job && job.total > 0 ? Math.round((job.imported / job.total) * 100) : 0;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Import members"
      description="Bulk-add members from a CSV file."
      footer={
        <>
          <Button variant="outline" onClick={handleClose}>{done ? 'Close' : 'Cancel'}</Button>
          {!jobId && (
            <Button className="gap-1.5" disabled={!file || importMembers.isPending} onClick={startImport}>
              {importMembers.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Import
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        <button
          type="button"
          onClick={downloadTemplate}
          disabled={templateLoading}
          className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline disabled:opacity-60"
        >
          {templateLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Download CSV template
        </button>

        {!jobId ? (
          <label className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-6 text-sm cursor-pointer hover:bg-accent/40 transition-colors">
            <Upload className="h-4 w-4" /> {file ? file.name : 'Choose a CSV file'}
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
        ) : (
          <div className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{running ? 'Importing…' : 'Import complete'}</span>
              <span className="text-muted-foreground">{job?.imported ?? 0} / {job?.total ?? 0}</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${job?.total ? progressPct : running ? 10 : 0}%` }}
              />
            </div>
            {running && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> This can take a moment for large files…
              </p>
            )}
            {done && job && job.errors.length > 0 && (
              <div className="space-y-2 border-t border-border pt-3">
                <p className="text-sm text-destructive font-medium">{job.errors.length} row(s) failed</p>
                <ul className="max-h-32 overflow-y-auto text-xs text-muted-foreground space-y-1">
                  {job.errors.slice(0, 10).map((err, i) => (
                    <li key={i}>Row {err.row} · {err.field}: {err.message}</li>
                  ))}
                  {job.errors.length > 10 && <li>…and {job.errors.length - 10} more</li>}
                </ul>
                <Button variant="outline" size="sm" className="gap-1.5" disabled={errorsLoading} onClick={downloadErrors}>
                  {errorsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                  Download error report
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
}
