import { useEffect } from 'react';

import { brand } from '@/config/brand';

/** Sets the browser tab title to "<page> · <brand>". */
export function useDocumentTitle(pageTitle: string): void {
  useEffect(() => {
    document.title = `${pageTitle} · ${brand.name}`;
  }, [pageTitle]);
}
