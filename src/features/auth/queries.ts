import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-keys';
import { fetchCurrentUser } from '@/mocks/api';

export function useCurrentUser() {
  return useQuery({ queryKey: queryKeys.currentUser, queryFn: fetchCurrentUser });
}
