import { LoaderCircle } from 'lucide-react';

/** Shown for the short moment in which the stored session is restored. */
export function AuthGate() {
  return (
    <div className="flex min-h-[40dvh] items-center justify-center" role="status">
      <LoaderCircle className="size-8 animate-spin text-accent-bright" aria-hidden="true" />
      <span className="sr-only">Checking your session</span>
    </div>
  );
}
