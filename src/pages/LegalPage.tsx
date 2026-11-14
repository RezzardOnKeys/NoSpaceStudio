import { TriangleAlert } from 'lucide-react';

import { Card } from '@/components/ui/Card';
import { brand } from '@/config/brand';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

const CONTENT = {
  imprint: {
    title: 'Imprint',
    todos: [
      'Name and postal address of the person or company responsible',
      'Contact details: email address and a second fast way to get in touch',
      'Further details required by law, depending on the legal form',
    ],
  },
  privacy: {
    title: 'Privacy policy',
    todos: [
      'Who is responsible for data processing, and how to reach them',
      'Which data is collected: account (email, username), playtime, friendships, avatar',
      'Service providers: Supabase (database, sign-in), Cloudflare (hosting)',
      'Legal basis, storage period and the rights of users (access, deletion, ...)',
    ],
  },
} as const;

interface LegalPageProps {
  kind: keyof typeof CONTENT;
}

/**
 * Placeholder for the legal pages. It deliberately contains no legal text:
 * that has to be written for the real operator before going public.
 */
export function LegalPage({ kind }: LegalPageProps) {
  const { title, todos } = CONTENT[kind];
  useDocumentTitle(title);

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-3xl font-bold">{title}</h1>

      <Card className="flex gap-4 border-warning/40 bg-warning-soft">
        <TriangleAlert className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden="true" />
        <div className="flex flex-col gap-1">
          <h2 className="font-semibold">Placeholder</h2>
          <p className="text-sm text-fg-muted">
            This page does not contain a real legal text yet. It must be completed before{' '}
            {brand.name} is made available to the public.
          </p>
        </div>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">TODO: what belongs here</h2>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-fg-muted">
          {todos.map((todo) => (
            <li key={todo}>{todo}</li>
          ))}
        </ul>
      </section>

      <p className="text-fg-muted">
        Questions in the meantime?{' '}
        <a
          href={`mailto:${brand.contactEmail}`}
          className="rounded text-accent-bright underline underline-offset-4"
        >
          {brand.contactEmail}
        </a>
      </p>
    </article>
  );
}
