import { ClassView } from '@/components/ClassView';
export default function StudentClass({ params }: { params: { id: string } }) { return <ClassView classId={params.id} teacher={false} />; }
