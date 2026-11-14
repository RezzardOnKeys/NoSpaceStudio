import { Mail, MailCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Notice } from '@/components/ui/Notice';
import { describeAuthError } from '@/features/auth/auth-errors';
import { AuthCard } from '@/features/auth/AuthCard';
import { useRequestPasswordReset } from '@/features/auth/queries';
import { TextLink } from '@/features/auth/TextLink';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { paths } from '@/routes/paths';

export function ForgotPasswordPage() {
  useDocumentTitle('Forgot password');
  const request = useRequestPasswordReset();
  const [email, setEmail] = useState('');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    request.mutate(email.trim());
  }

  if (request.isSuccess) {
    return (
      <AuthCard title="Check your inbox">
        <EmptyState
          className="px-0 py-2"
          icon={<MailCheck />}
          title="Reset link sent"
          description={`If an account exists for ${email.trim()}, a link to choose a new password is on its way. Nothing there? Look in the spam folder.`}
          action={<TextLink to={paths.signIn}>Back to sign in</TextLink>}
        />
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Forgot your password?"
      description="Enter your email address and we will send you a link to choose a new one."
      footer={<TextLink to={paths.signIn}>Back to sign in</TextLink>}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {request.isError && <Notice variant="danger">{describeAuthError(request.error)}</Notice>}
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
        <Button type="submit" size="lg" fullWidth loading={request.isPending}>
          Send reset link
        </Button>
      </form>
    </AuthCard>
  );
}
