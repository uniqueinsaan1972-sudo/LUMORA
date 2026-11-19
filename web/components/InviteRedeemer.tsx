'use client';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './Toast';
import { redeemPendingInvite } from '@/app/invite/actions';
export function InviteRedeemer() {
  const done = useRef(false); const toast = useToast(); const router = useRouter();
  useEffect(() => { if (done.current) return; done.current = true;
    redeemPendingInvite().then((r) => { if (r.ok) { toast.push(r.kind === 'class' ? 'You joined the class from your invitation.' : r.kind === 'group' ? 'You joined the group from your invitation.' : 'Invitation accepted — check Friends for a request.', 'success'); router.refresh(); } else if (r.error || r.kind === null) toast.push('That invitation is no longer valid.', 'error'); });
  }, [toast, router]);
  return null;
}
