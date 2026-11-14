import { Markdown } from '@/components/ui/Markdown';
import { Notice } from '@/components/ui/Notice';
import { getLegalText, type LegalKind } from '@/features/legal/legal-texts';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

interface LegalPageProps {
  kind: LegalKind;
}

/** Imprint and privacy policy. The texts are in legal/ at the repository root. */
export function LegalPage({ kind }: LegalPageProps) {
  const { title, file, markdown, isIncomplete } = getLegalText(kind);
  useDocumentTitle(title);

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-3xl font-bold">{title}</h1>

      {isIncomplete && (
        <Notice variant="warning" title="Not complete yet">
          Some details are still missing (marked with TODO). They must be filled in before the site
          goes public, in {file} and src/config/brand.ts.
        </Notice>
      )}

      <Markdown>{markdown}</Markdown>
    </article>
  );
}
