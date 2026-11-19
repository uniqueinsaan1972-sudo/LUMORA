import { Skeleton } from '@/components/ui';
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="mb-8 flex items-center gap-4"><Skeleton className="h-12 w-12" /><div className="flex-1 space-y-2"><Skeleton className="h-7 w-1/3" /><Skeleton className="h-4 w-1/2" /></div></div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>
      <Skeleton className="mt-6 h-48" /><div className="mt-6 grid gap-4 md:grid-cols-2"><Skeleton className="h-40" /><Skeleton className="h-40" /></div>
    </div>
  );
}
