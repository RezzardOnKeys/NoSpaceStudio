import { ShieldCheck } from 'lucide-react';

import { EmptyState } from '@/components/ui/EmptyState';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

/** Placeholder until the admin panel for games and news is built. */
export function AdminPage() {
  useDocumentTitle('Admin');

  return (
    <EmptyState
      icon={<ShieldCheck />}
      title="The admin panel is not built yet"
      description="Managing games and news posts arrives in a later phase. Until then, the catalogue comes from mock data."
    />
  );
}
