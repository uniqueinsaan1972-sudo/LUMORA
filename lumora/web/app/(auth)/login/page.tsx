import Link from 'next/link';
import { AuthForm } from '@/components/AuthForm';
import { login } from '../actions';
export default function Login() {
  return (<><h1 className="font-display mb-5 text-2xl font-extrabold">Welcome back</h1>
    <AuthForm action={login} label="Log in">
      <label className="block text-sm font-medium">Email<input className="input mt-1" name="email" type="email" autoComplete="email" required /></label>
      <label className="block text-sm font-medium">Password<input className="input mt-1" name="password" type="password" autoComplete="current-password" required /></label>
    </AuthForm>
    <p className="muted mt-4 text-sm"><Link className="underline" href="/forgot-password">Forgot password?</Link> · <Link className="underline" href="/register">Create account</Link></p></>);
}
