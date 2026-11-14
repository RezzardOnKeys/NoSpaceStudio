import type { BadgeVariant } from '@/components/ui/Badge';
import type { NewsType } from '@/types/models';

export const NEWS_TYPE_LABELS: Record<NewsType, string> = {
  game_update: 'Game update',
  launcher_update: 'Launcher update',
  announcement: 'Announcement',
};

export const NEWS_TYPE_BADGES: Record<NewsType, BadgeVariant> = {
  game_update: 'accent',
  launcher_update: 'success',
  announcement: 'warning',
};
