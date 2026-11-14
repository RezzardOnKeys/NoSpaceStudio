import type { ReactNode } from 'react';

import { Card } from '@/components/ui/Card';

interface AuthCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  /** Line below the card content, e.g. the link to the other account page. */
  footer?: ReactNode;
}

export function AuthCard({ title, description, children, footer }: AuthCardProps) {
  return (
    <Card className="flex flex-col gap-6 p-6 sm:p-8">
      <header className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && <p className="text-sm text-fg-muted">{description}</p>}
      </header>
      {children}
      {footer && <p className="text-center text-sm text-fg-muted">{footer}</p>}
    </Card>
  );
}
