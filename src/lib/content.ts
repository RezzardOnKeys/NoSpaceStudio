import { ContentError } from './errors';

/**
 * Helpers for reading the content files in the repository (game manifests
 * and news posts). Each reader checks one field and, when it is wrong,
 * throws a ContentError that names the file and the field.
 */

export type ContentRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is ContentRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readText(file: string, record: ContentRecord, key: string): string {
  const value = record[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ContentError(file, `"${key}" is missing or empty.`);
  }
  return value.trim();
}

export function readOptionalText(file: string, record: ContentRecord, key: string): string | null {
  const value = record[key];
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new ContentError(file, `"${key}" must be text.`);
  return value.trim();
}

export function readTextList(file: string, record: ContentRecord, key: string): string[] {
  const value = record[key];
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new ContentError(file, `"${key}" must be a list of texts, e.g. ["Arcade", "Puzzle"].`);
  }
  return value as string[];
}

export function readChoice<T extends string>(
  file: string,
  record: ContentRecord,
  key: string,
  choices: readonly T[],
): T {
  const value = record[key];
  const match = choices.find((choice) => choice === value);
  if (!match) {
    throw new ContentError(file, `"${key}" must be one of: ${choices.join(', ')}.`);
  }
  return match;
}

/** A whole number within a range; `fallback` when the field is missing. */
export function readInteger(
  file: string,
  record: ContentRecord,
  key: string,
  { min, max, fallback }: { min: number; max: number; fallback: number },
): number {
  const value = record[key];
  if (value === undefined) return fallback;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    throw new ContentError(file, `"${key}" must be a whole number from ${min} to ${max}.`);
  }
  return value;
}

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Reads a date like "2026-11-20" and returns it as an ISO date string. */
export function readDate(file: string, record: ContentRecord, key: string): string {
  const text = readText(file, record, key);
  // Noon keeps a plain day on the same calendar day in every time zone.
  const date = new Date(DAY_PATTERN.test(text) ? `${text}T12:00:00` : text);
  if (Number.isNaN(date.getTime())) {
    throw new ContentError(file, `"${key}" must be a date like 2026-11-20.`);
  }
  return date.toISOString();
}

/** "/games/star-dodger/game.json" -> "star-dodger"; "/news/hello.md" -> "hello". */
export function folderName(path: string): string {
  return path.split('/').at(-2) ?? '';
}

export function fileName(path: string): string {
  return (path.split('/').at(-1) ?? '').replace(/\.[^.]+$/, '');
}
