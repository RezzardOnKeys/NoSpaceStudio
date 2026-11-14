import { brand } from '@/config/brand';

import imprint from '../../../legal/imprint.md?raw';
import privacy from '../../../legal/privacy.md?raw';

/*
 * The legal texts live as Markdown files in legal/ at the repository root,
 * so they can be edited without touching code. {{brand}} and {{email}} are
 * filled in from src/config/brand.ts.
 */

export type LegalKind = 'imprint' | 'privacy';

const TEXTS: Record<LegalKind, { title: string; file: string; markdown: string }> = {
  imprint: { title: 'Imprint', file: 'legal/imprint.md', markdown: imprint },
  privacy: { title: 'Privacy policy', file: 'legal/privacy.md', markdown: privacy },
};

/** The contact address in brand.ts is still the example from the template. */
const EMAIL_MISSING = brand.contactEmail.endsWith('@example.com');

export interface LegalText {
  title: string;
  /** Where to edit the text. */
  file: string;
  markdown: string;
  /** True while a [TODO: ...] or the example email is left. */
  isIncomplete: boolean;
}

export function getLegalText(kind: LegalKind): LegalText {
  const { title, file, markdown } = TEXTS[kind];
  const email = EMAIL_MISSING
    ? '[TODO: contact email in src/config/brand.ts]'
    : `[${brand.contactEmail}](mailto:${brand.contactEmail})`;

  return {
    title,
    file,
    markdown: markdown.replaceAll('{{brand}}', brand.name).replaceAll('{{email}}', email),
    isIncomplete: EMAIL_MISSING || markdown.includes('[TODO'),
  };
}
