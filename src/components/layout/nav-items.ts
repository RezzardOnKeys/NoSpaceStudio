import { Library, Newspaper, Store, Users, type LucideIcon } from 'lucide-react';

import { paths } from '@/routes/paths';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

export const mainNavItems: NavItem[] = [
  { label: 'Store', to: paths.store, icon: Store },
  { label: 'Library', to: paths.library, icon: Library },
  { label: 'Friends', to: paths.friends, icon: Users },
  { label: 'News', to: paths.news, icon: Newspaper },
];
