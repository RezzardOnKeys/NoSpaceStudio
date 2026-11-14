import { Lock, Mail, MailCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useLocation } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Notice } from '@/components/ui/Notice';
import { brand } from '@/config/brand';
import { describeAuthError } from '@/features/auth/auth-errors';
import { AuthCard } from '@/features/auth/AuthCard';
import { useSignUp } from '@/features/auth/queries';
import { TextLink } from '@/features/auth/TextLink';
import { MINIMUM_AGE, normalizeUsername, PASSWORD_MIN_LENGTH } from '@/features/auth/username';
import { UsernameField } from '@/features/auth/UsernameField';
import { useUsernameCheck } from '@/features/auth/useUsernameCheck';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { paths } from '@/routes/paths';

export function SignUpPage() {
  useDocumentTitle('Create account');
  const location = useLocation();
  const signUp = useSignUp();
  const [username, setUsername] = useState('');
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const usernameCheck = useUsernameCheck(username);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setUsernameTouched(true);
    if (usernameCheck.error || usernameCheck.status === 'checking') return;
    signUp.mutate({ email: email.trim(), password, username });
  }

  if (signUp.data?.needsEmailConfirmation) {
    return (
      <AuthCard title="Check your inbox">
        <EmptyState
          className="px-0 py-2"
          icon={<MailCheck />}
          title="Confirm your email address"
          description={`We sent a link to ${email.trim()}. Open it to activate your account. Nothing there? Look in the spam folder.`}
          action={<TextLink to={paths.signIn}>Back to sign in</TextLink>}
        />
      </AuthCard>
    );
  }

  // A taken name is always worth showing; format problems wait until the field was left.
  const usernameError =
    usernameTouched || usernameCheck.status === 'taken' ? usernameCheck.error : undefined;

  return (
    <AuthCard
      title="Create your account"
      description={`${brand.slogan} Free, with no ads and no payments.`}
      footer={
        <>
          Already have an account?{' '}
          <TextLink to={paths.signIn} state={location.state}>
            Sign in
          </TextLink>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {signUp.isError && <Notice variant="danger">{describeAuthError(signUp.error)}</Notice>}
        <UsernameField
          value={username}
          onChange={(value) => setUsername(normalizeUsername(value))}
          onBlur={() => setUsernameTouched(true)}
          status={usernameCheck.status}
          error={usernameError}
        />
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
          autoComplete="new-password"
          minLength={PASSWORD_MIN_LENGTH}
          required
          icon={<Lock />}
          hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
        />
        <Checkbox
          name="age"
          required
          label={
            <>
              I am at least {MINIMUM_AGE} years old and have read the{' '}
              <TextLink to={paths.privacy} target="_blank">
                privacy policy
              </TextLink>
              .
            </>
          }
        />
        <Button type="submit" size="lg" fullWidth loading={signUp.isPending}>
          Create account
        </Button>
      </form>
    </AuthCard>
  );
}
