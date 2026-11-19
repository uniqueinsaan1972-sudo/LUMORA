import Link from 'next/link';
import { RegisterForm } from '@/components/RegisterForm';
export default function Register() {
  return (<><h1 className="font-display mb-1 text-2xl font-extrabold">Create your LUMORA account</h1><p className="muted mb-5 text-sm">Where Learning Meets Possibility.</p><RegisterForm />
    <p className="muted mt-5 text-sm">Already registered? <Link className="underline" href="/login">Log in</Link></p></>);
}
