import { AuthForm } from '@/components/AuthForm';
import { forgotPassword } from '../actions';
export default function Forgot() {
  return (<><h1 className="font-display mb-5 text-2xl font-extrabold">Reset your password</h1>
    <AuthForm action={forgotPassword} label="Send reset link"><label className="block text-sm font-medium">Email<input className="input mt-1" name="email" type="email" required /></label></AuthForm></>);
}
