import { ClassView } from '@/components/ClassView';
export default function TeacherClass({ params }: { params: { id: string } }) { return <ClassView classId={params.id} teacher />; }
