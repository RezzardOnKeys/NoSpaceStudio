import { Link2Off, Lock } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';

import { Button } from '@/components/ui/Button';
import { buttonStyles } from '@/components/ui/button-styles';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Notice } from '@/components/ui/Notice';
import { useToast } from '@/components/ui/toast-context';
import { useAuth } from '@/features/auth/auth-context';
import { describeAuthError } from '@/features/auth/auth-errors';
import { AuthCard } from '@/features/auth/AuthCard';
import { AuthGate } from '@/features/auth/AuthGate';
import { useUpdatePassword } from '@/features/auth/queries';
import { PASSWORD_MIN_LENGTH } from '@/features/auth/username';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { paths } from '@/routes/paths';

/**
 * Target of the link in the reset email. The link signs the user in, so a
 * session means they may choose a new password here.
 */
export function ResetPasswordPage() {
  useDocumentTitle('Choose a new password');
  const { userId, isLoading } = useAuth();
  const update = useUpdatePassword();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [mismatch, setMismatch] = useState(false);

  if (isLoading) return <AuthGate />;

  if (!userId) {
    return (
      <AuthCard title="Choose a new password">
        <EmptyState
          className="px-0 py-2"
          icon={<Link2Off />}
          title="This link no longer works"
          description="Reset links expire after a while and can only be used once. Request a new one."
          action={
            <Link to={paths.forgotPassword} className={buttonStyles()}>
              Request a new link
            </Link>
          }
        />
      </AuthCard>
    );
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (password !== repeat) {
      setMismatch(true);
      return;
    }
    update.mutate(password, {
      onSuccess: () => {
        toast({ title: 'Password changed', variant: 'success' });
        void navigate(paths.store, { replace: true });
      },
    });
  }

  return (
    <AuthCard title="Choose a new password" description="You stay signed in afterwards.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {update.isError && <Notice variant="danger">{describeAuthError(update.error)}</Notice>}
        <Input
          label="New password"
          type="password"
          name="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          minLength={PASSWORD_MIN_LENGTH}
          required
          icon={<Lock />}
          hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
        />
        <Input
          label="Repeat new password"
          type="password"
          name="repeat-password"
          value={repeat}
          onChange={(event) => {
            setRepeat(event.target.value);
            setMismatch(false);
          }}
          autoComplete="new-password"
          required
          icon={<Lock />}
          error={mismatch ? 'The two passwords are not the same.' : undefined}
        />
        <Button type="submit" size="lg" fullWidth loading={update.isPending}>
          Save new password
        </Button>
      </form>
    </AuthCard>
  );
}
