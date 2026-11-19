'use client';
import { useState } from 'react';
import { Trophy } from 'lucide-react';
import { LeaderboardPanel } from '@/components/LeaderboardPanel';
import { Empty } from '@/components/ui';
type O = { scope: 'class' | 'group'; id: string; name: string };
export function LeaderboardChooser({ options, testsByScope }: { options: O[]; testsByScope: Record<string, { id: string; title: string }[]> }) {
  const [sel, setSel] = useState(options[0]?.id ?? ''); const o = options.find((x) => x.id === sel);
  if (!options.length) return <Empty icon={<Trophy size={26} />}>Join a class or a group to see its leaderboard.</Empty>;
  return (<><select className="input mb-4 !w-auto min-w-60" value={sel} onChange={(e) => setSel(e.target.value)} aria-label="Class or group">{options.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
    {o && <LeaderboardPanel key={o.id} scope={o.scope} scopeId={o.id} tests={testsByScope[o.id] ?? []} />}</>);
}
