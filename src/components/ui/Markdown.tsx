import ReactMarkdown, { type Components } from 'react-markdown';

import { cn } from '@/lib/cn';

const components: Components = {
  // Links in user-written content always open in a new tab.
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
};

interface MarkdownProps {
  children: string;
  className?: string;
}

/** Renders Markdown safely: raw HTML inside the text is never executed. */
export function Markdown({ children, className }: MarkdownProps) {
  return (
    <div className={cn('markdown', className)}>
      <ReactMarkdown components={components}>{children}</ReactMarkdown>
    </div>
  );
}
