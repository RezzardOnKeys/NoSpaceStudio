import { Lock, Mail } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useLocation } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Notice } from '@/components/ui/Notice';
import { brand } from '@/config/brand';
import { describeAuthError } from '@/features/auth/auth-errors';
import { AuthCard } from '@/features/auth/AuthCard';
import { useSignIn } from '@/features/auth/queries';
import { TextLink } from '@/features/auth/TextLink';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { paths } from '@/routes/paths';

export function SignInPage() {
  useDocumentTitle('Sign in');
  const location = useLocation();
  const signIn = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    // On success the route wrapper (GuestOnly) moves on to the right page.
    signIn.mutate({ email: email.trim(), password });
  }

  return (
    <AuthCard
      title="Welcome back"
      description={`Sign in to your ${brand.name} account.`}
      footer={
        <>
          New here?{' '}
          <TextLink to={paths.signUp} state={location.state}>
            Create an account
          </TextLink>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {signIn.isError && <Notice variant="danger">{describeAuthError(signIn.error)}</Notice>}
        <Input
          label="Email"
          type="email"
          name="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
          icon={<Mail />}
        />
        <Input
          label="Password"
          type="password"
          name="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
          icon={<Lock />}
        />
        <TextLink to={paths.forgotPassword} className="self-end text-sm">
          Forgot password?
        </TextLink>
        <Button type="submit" size="lg" fullWidth loading={signIn.isPending}>
          Sign in
        </Button>
      </form>
    </AuthCard>
  );
}
