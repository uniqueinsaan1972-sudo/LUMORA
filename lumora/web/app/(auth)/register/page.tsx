import Link from 'next/link';
import { AuthForm } from '@/components/AuthForm';
import { register } from '../actions';
export default function Register() {
  return (<><h1 className="font-display mb-5 text-2xl font-extrabold">Create your LUMORA account</h1>
    <AuthForm action={register} label="Sign up">
      <label className="block text-sm font-medium">Display name<input className="input mt-1" name="display_name" required maxLength={80} /></label>
      <label className="block text-sm font-medium">Email<input className="input mt-1" name="email" type="email" autoComplete="email" required /></label>
      <label className="block text-sm font-medium">Password (10+ characters)<input className="input mt-1" name="password" type="password" autoComplete="new-password" minLength={10} required /></label>
      <label className="block text-sm font-medium">Teacher invite code <span className="muted">(optional — teachers only)</span><input className="input mt-1" name="teacher_code" autoComplete="off" /></label>
    </AuthForm>
    <p className="muted mt-4 text-sm">Already registered? <Link className="underline" href="/login">Log in</Link></p></>);
}
