import { Compass } from 'lucide-react';
import { Link } from 'react-router';

import { buttonStyles } from '@/components/ui/button-styles';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { paths } from '@/routes/paths';

export function NotFoundPage() {
  useDocumentTitle('Page not found');

  return (
    <main className="flex min-h-dvh items-center justify-center">
      <EmptyState
        icon={<Compass />}
        title="This page does not exist"
        description="The link may be outdated or mistyped. Head back home and try again from there."
        action={
          <Link to={paths.home} className={buttonStyles()}>
            Back to home
          </Link>
        }
      />
    </main>
  );
}
