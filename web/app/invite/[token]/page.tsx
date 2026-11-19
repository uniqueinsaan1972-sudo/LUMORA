import { Logo } from '@/components/Logo';
import { acceptInvite } from '../actions';
import { hashToken, validToken } from '@/lib/invite';
import { supabaseServer } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';
export default async function InvitePage({ params }: { params: { token: string } }) {
  let info: { inviter_name: string; kind: string; valid: boolean } | null = null;
  if (validToken(params.token)) { const { data } = await supabaseServer().rpc('invitation_info', { p_hash: hashToken(params.token) }); info = data?.[0] ?? null; }
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10"><div className="mb-6"><Logo /></div>
      <div className="glass card-accent !p-6 text-center">{info?.valid ? (<><h1 className="font-display text-2xl font-extrabold">{info.inviter_name} invited you</h1>
        <p className="muted mt-2">{info.kind === 'class' ? 'to join their class on LUMORA.' : info.kind === 'group' ? 'to join their study group on LUMORA.' : 'to connect on LUMORA — where learning meets possibility.'}</p>
        <form action={acceptInvite.bind(null, params.token)} className="mt-5"><button className="btn w-full !py-3">Accept invitation</button></form><p className="muted mt-3 text-xs">You’ll be asked to log in or create a free account.</p></>)
        : (<><h1 className="font-display text-2xl font-extrabold">Invitation unavailable</h1><p className="muted mt-2">This link has expired, was revoked, or has reached its limit. Ask the sender for a new one.</p></>)}</div></main>
  );
}
