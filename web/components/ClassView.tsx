import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BookOpen } from 'lucide-react';
import { PageTitle } from './ui';
import { LeaderboardPanel } from './LeaderboardPanel';
import { LiveRefresh } from './LiveRefresh';
import { AnnouncementForm, JoinCode, Members } from './ClassTools';
import { requireUser } from '@/lib/auth';
import { studentTestStatus, STATUS_LABEL } from '@/lib/testStatus';

export async function ClassView({ classId, teacher }: { classId: string; teacher: boolean }) {
  if (!/^[0-9a-f-]{36}$/i.test(classId)) notFound();
  const { supabase } = await requireUser(teacher ? 'teacher' : 'student');
  const { data: classes } = await supabase.rpc('my_classes'); const c = (classes ?? []).find((x: any) => x.id === classId); if (!c) notFound();
  const [{ data: members }, { data: notes }, { data: ann }, { data: asg }, { data: st }] = await Promise.all([supabase.rpc('class_members_list', { p_class: classId }), supabase.rpc('class_shared_notes', { p_class: classId }),
    supabase.from('announcements').select('id,title,body,created_at').eq('class_id', classId).order('created_at', { ascending: false }).limit(10), supabase.from('test_assignments').select('test_id').eq('class_id', classId), supabase.rpc('my_test_statuses')]);
  const ids = (asg ?? []).map((a: any) => a.test_id); const { data: tests } = ids.length ? await supabase.from('teacher_tests').select('id,title,opens_at,closes_at,results_published,status,access_code').in('id', ids).neq('status', 'draft') : { data: [] as any[] };
  const flags = new Map((st ?? []).map((s: any) => [s.test_id, s]));
  return (<>
    <LiveRefresh name={'class-' + classId} tables={['announcements', 'note_shares', 'teacher_tests', 'test_assignments']} />
    <PageTitle icon={<BookOpen size={22} />} sub={c.description ?? (teacher ? undefined : `Teacher: ${c.teacher_name}`)}>{c.name}</PageTitle>
    {teacher && c.join_code && <div className="card mb-4"><JoinCode classId={classId} code={c.join_code} /><p className="muted mt-2 text-xs">Students can also join through an invitation link from the <Link className="underline" href="/invite">Invite page</Link>.</p></div>}
    <h2 className="font-display mb-2 mt-6 font-bold">Announcements</h2>{teacher && <AnnouncementForm classId={classId} />}
    {(ann ?? []).length ? <ul className="space-y-2">{ann!.map((a: any) => <li key={a.id} className="card !p-4"><p className="font-semibold">{a.title}</p><p className="muted whitespace-pre-wrap text-sm">{a.body}</p><p className="muted mt-1 text-xs">{new Date(a.created_at).toLocaleString()}</p></li>)}</ul> : <p className="muted text-sm">No announcements yet.</p>}
    <h2 className="font-display mb-2 mt-8 font-bold">Tests</h2>
    {(tests ?? []).length ? <ul className="space-y-2">{tests!.map((t: any) => <li key={t.id} className="card flex flex-wrap items-center justify-between gap-2 !p-4"><span className="font-semibold">{t.title}</span>
      {teacher ? <Link className="btn btn-ghost" href={`/teacher/tests/${t.id}`}>Open</Link> : <span className="badge">{STATUS_LABEL[studentTestStatus(t, flags.get(t.id) as any)]}</span>}</li>)}</ul> : <p className="muted text-sm">No tests assigned to this class yet.</p>}
    <h2 className="font-display mb-2 mt-8 font-bold">Study material</h2>
    {(notes ?? []).length ? <ul className="space-y-2">{notes!.map((n: any) => <li key={n.id} className="card !p-3"><Link className="font-semibold underline" href={`/notes/${n.id}`}>{n.title || 'Untitled'}</Link><span className="muted text-sm"> · {n.permission === 'edit' ? 'can edit' : 'view only'}</span></li>)}</ul>
      : <p className="muted text-sm">{teacher ? 'Share a note with this class: open a note → Share → Classes.' : 'Your teacher hasn’t shared material yet.'}</p>}
    <h2 className="font-display mb-2 mt-8 font-bold">Members ({(members ?? []).length})</h2><Members classId={classId} initial={(members ?? []) as any} canManage={teacher} />
    <h2 className="font-display mb-2 mt-8 font-bold">Class leaderboard</h2><LeaderboardPanel scope="class" scopeId={classId} tests={(tests ?? []).filter((t: any) => t.results_published)} />
  </>);
}
