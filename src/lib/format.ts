const dateFormatter = new Intl.DateTimeFormat('en', { dateStyle: 'medium' });
const timeFormatter = new Intl.DateTimeFormat('en', { timeStyle: 'short' });
const relativeFormatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

/** 4350 -> "1h 12m", 300 -> "5m", 20 -> "under 1m". */
export function formatPlaytime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 1) return 'under 1m';
  const hours = Math.floor(minutes / 60);
  if (hours < 1) return `${minutes}m`;
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

/** 75 -> "01:15", 3675 -> "1:01:15". Used for the running session timer. */
export function formatTimer(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** "Nov 14, 2026" */
export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

/** "2:05 PM" */
export function formatTime(iso: string): string {
  return timeFormatter.format(new Date(iso));
}

const RELATIVE_STEPS: { unit: Intl.RelativeTimeFormatUnit; seconds: number }[] = [
  { unit: 'year', seconds: 31_536_000 },
  { unit: 'month', seconds: 2_592_000 },
  { unit: 'week', seconds: 604_800 },
  { unit: 'day', seconds: 86_400 },
  { unit: 'hour', seconds: 3_600 },
  { unit: 'minute', seconds: 60 },
];

/** "3 days ago", "yesterday", "just now" */
export function formatRelative(iso: string, now: Date = new Date()): string {
  const diffSeconds = Math.round((new Date(iso).getTime() - now.getTime()) / 1000);
  const step = RELATIVE_STEPS.find(({ seconds }) => Math.abs(diffSeconds) >= seconds);
  if (!step) return 'just now';
  return relativeFormatter.format(Math.round(diffSeconds / step.seconds), step.unit);
}
