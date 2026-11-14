import type { LucideIcon } from 'lucide-react';

import { Card } from '@/components/ui/Card';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
}

export function StatCard({ icon: Icon, label, value }: StatCardProps) {
  return (
    <Card className="flex items-center gap-4">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-bright">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="flex min-w-0 flex-col">
        <span className="text-sm text-fg-subtle">{label}</span>
        <span className="truncate text-xl font-semibold">{value}</span>
      </div>
    </Card>
  );
}
