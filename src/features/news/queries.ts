import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-keys';
import { fetchNews } from '@/mocks/api';

export function useNews() {
  return useQuery({ queryKey: queryKeys.news, queryFn: fetchNews });
}
