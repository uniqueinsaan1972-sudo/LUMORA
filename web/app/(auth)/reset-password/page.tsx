import { AuthForm } from '@/components/AuthForm';
import { resetPassword } from '../actions';
export default function Reset() {
  return (<><h1 className="font-display mb-5 text-2xl font-extrabold">Choose a new password</h1>
    <AuthForm action={resetPassword} label="Update password"><label className="block text-sm font-medium">New password<input className="input mt-1" name="password" type="password" minLength={10} required /></label></AuthForm></>);
}
