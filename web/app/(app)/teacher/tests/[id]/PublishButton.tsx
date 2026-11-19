'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';
import { publishResults, regenerateTestCode } from '../actions';
import { CopyButton } from '@/components/CopyButton';
import { RefreshCw } from 'lucide-react';
export function PublishButton({ testId }: { testId: string }) {
  const toast = useToast(); const router = useRouter(); const [ask, setAsk] = useState(false); const [busy, setBusy] = useState(false);
  return (<><button className="btn" disabled={busy} onClick={() => setAsk(true)}>{busy && <Loader2 size={16} className="animate-spin" />}Publish results</button>
    <ConfirmDialog open={ask} title="Publish results to students?" body="Students will see their marks, correct answers and feedback. All written answers must be graded first." confirmLabel="Publish" onCancel={() => setAsk(false)}
      onConfirm={async () => { setAsk(false); setBusy(true); const r = await publishResults(testId); setBusy(false); if (r.ok) { toast.push('Results published and students notified', 'success'); router.refresh(); } else toast.push(r.error ?? 'Failed', 'error'); }} /></>);
}
export function TestCode({ testId, code }: { testId: string; code: string }) {
  const [c, setC] = useState(code); const toast = useToast(); const [busy, setBusy] = useState(false);
  return <div className="flex flex-wrap items-center gap-2"><span className="muted text-sm">Access code</span><code className="rounded bg-slate-500/20 px-2 py-1 text-base tracking-widest">{c}</code><CopyButton text={c} />
    <button className="btn btn-ghost" disabled={busy} onClick={async () => { setBusy(true); const r = await regenerateTestCode(testId); setBusy(false); if (r.ok && r.code) { setC(r.code); toast.push('New code generated. The old code no longer works.', 'success'); } else toast.push(r.error ?? 'Failed', 'error'); }}><RefreshCw size={14} />New code</button></div>;
}
