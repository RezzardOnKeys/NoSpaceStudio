import { Compass } from 'lucide-react';
import { Link } from 'react-router';

import { buttonStyles } from '@/components/ui/button-styles';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { paths } from '@/routes/paths';

export function NotFoundPage() {
  useDocumentTitle('Page not found');

  return (
    <div className="flex min-h-[50dvh] items-center justify-center">
      <EmptyState
        icon={<Compass />}
        title="This page does not exist"
        description="The link may be outdated or mistyped. Head back to the store and try again from there."
        action={
          <Link to={paths.store} className={buttonStyles()}>
            Back to store
          </Link>
        }
      />
    </div>
  );
}
