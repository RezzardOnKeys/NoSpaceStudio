import { ArrowLeft, Check, Play, Search, Trash2, Users } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';

import { Logo } from '@/components/brand/Logo';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/toast-context';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { paths } from '@/routes/paths';

const swatches = [
  { name: 'canvas', className: 'bg-canvas' },
  { name: 'surface', className: 'bg-surface' },
  { name: 'surface-raised', className: 'bg-surface-raised' },
  { name: 'surface-overlay', className: 'bg-surface-overlay' },
  { name: 'accent', className: 'bg-accent' },
  { name: 'accent-strong', className: 'bg-accent-strong' },
  { name: 'accent-bright', className: 'bg-accent-bright' },
  { name: 'success', className: 'bg-success' },
  { name: 'warning', className: 'bg-warning' },
  { name: 'danger', className: 'bg-danger' },
  { name: 'info', className: 'bg-info' },
] as const;

interface SectionProps {
  title: string;
  children: ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xs font-semibold tracking-widest text-fg-subtle uppercase">{title}</h2>
      {children}
    </section>
  );
}

/** Living reference of all base components. Reachable at /dev/ui. */
export function UiKitPage() {
  useDocumentTitle('UI components');
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [username, setUsername] = useState('');

  const usernameError =
    username.length > 0 && !/^[a-z0-9_]{3,20}$/i.test(username)
      ? 'Use 3–20 characters: letters, numbers or underscores.'
      : undefined;

  function simulateSave() {
    setSaving(true);
    window.setTimeout(() => {
      setSaving(false);
      toast({ title: 'Changes saved', variant: 'success' });
    }, 1200);
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-12 px-6 py-10">
      <header className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Logo />
          <Link
            to={paths.store}
            className="inline-flex items-center gap-1.5 rounded-md text-sm text-fg-muted transition-colors hover:text-fg"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to store
          </Link>
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">UI components</h1>
          <p className="max-w-2xl text-fg-muted">
            The building blocks every page is made of. If something looks off here, fix it here and
            the whole app follows.
          </p>
        </div>
      </header>

      <Section title="Colours">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {swatches.map((swatch) => (
            <li key={swatch.name} className="flex flex-col gap-2">
              <div className={`h-14 rounded-lg border border-line ${swatch.className}`} />
              <span className="font-mono text-xs text-fg-muted">{swatch.name}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Typography">
        <Card className="flex flex-col gap-3">
          <p className="text-4xl font-bold tracking-tight">Play instantly</p>
          <p className="text-2xl font-semibold tracking-tight">Section heading</p>
          <p className="text-fg">Body text in the default colour for the main content.</p>
          <p className="text-sm text-fg-muted">Muted text for secondary information.</p>
          <p className="text-xs text-fg-subtle">Subtle text for timestamps and metadata.</p>
        </Card>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button icon={<Play className="size-4 fill-current" aria-hidden="true" />}>Play</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger" icon={<Trash2 className="size-4" aria-hidden="true" />}>
            Remove
          </Button>
          <Button disabled>Disabled</Button>
          <Button loading={saving} onClick={simulateSave}>
            {saving ? 'Saving…' : 'Save with loading state'}
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>
      </Section>

      <Section title="Inputs">
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="Username"
            placeholder="pixel_pilot"
            autoComplete="off"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            error={usernameError}
            hint="3–20 characters. Letters, numbers and underscores."
            trailing={
              username.length > 0 && !usernameError ? (
                <Check className="text-success" aria-label="Looks good" />
              ) : undefined
            }
          />
          <Input
            label="Search games"
            hideLabel
            type="search"
            placeholder="Search games"
            icon={<Search />}
          />
          <Input
            label="Email"
            type="email"
            defaultValue="not-an-email"
            error="Enter a valid email address, like name@example.com."
          />
          <Input label="Disabled" placeholder="Not editable" disabled />
        </div>
      </Section>

      <Section title="Badges">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Arcade</Badge>
          <Badge>Puzzle</Badge>
          <Badge variant="outline">HTML5</Badge>
          <Badge variant="outline">Unity</Badge>
          <Badge variant="outline">Godot</Badge>
          <Badge variant="accent">Featured</Badge>
          <Badge variant="success">Published</Badge>
          <Badge variant="warning">Draft</Badge>
          <Badge variant="danger">Hidden</Badge>
        </div>
      </Section>

      <Section title="Cards and skeletons">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="flex flex-col gap-2">
            <h3 className="font-semibold">Static card</h3>
            <p className="text-sm text-fg-muted">A raised surface that groups related content.</p>
          </Card>
          <Card interactive className="flex flex-col gap-2">
            <h3 className="font-semibold">Interactive card</h3>
            <p className="text-sm text-fg-muted">
              Lifts slightly on hover to signal it is clickable.
            </p>
          </Card>
          <Card flush className="overflow-hidden" aria-busy="true" aria-label="Loading game">
            <Skeleton className="aspect-video w-full rounded-none" />
            <div className="flex flex-col gap-2 p-4">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </Card>
        </div>
      </Section>

      <Section title="Modal and toasts">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={() => setModalOpen(true)}>
            Open modal
          </Button>
          <Button
            variant="secondary"
            onClick={() => toast({ title: 'Friend request sent', variant: 'success' })}
          >
            Success toast
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              toast({
                title: 'Could not save your changes',
                description: 'Check your internet connection and try again.',
                variant: 'error',
              })
            }
          >
            Error toast
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              toast({ title: 'A new version is available', description: 'Reload to update.' })
            }
          >
            Info toast
          </Button>
        </div>
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Remove friend?"
          description="You will no longer see each other's playtime. You can send a new request at any time."
          size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => setModalOpen(false)}>
                Remove
              </Button>
            </>
          }
        />
      </Section>

      <Section title="Empty state">
        <Card flush>
          <EmptyState
            icon={<Users />}
            title="No friends yet"
            description="Add someone by username to compare playtime and see what they are playing."
            action={<Button variant="secondary">Find friends</Button>}
          />
        </Card>
      </Section>
    </main>
  );
}
