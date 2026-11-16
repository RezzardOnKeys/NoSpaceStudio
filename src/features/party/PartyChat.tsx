import { MessageCircle, SendHorizontal } from 'lucide-react';
import { useLayoutEffect, useRef, useState, type FormEvent } from 'react';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import { ListSkeleton } from '@/components/ui/ListSkeleton';
import { useAuth } from '@/features/auth/auth-context';
import { cn } from '@/lib/cn';
import { describeLoadError } from '@/lib/errors';
import { formatTime } from '@/lib/format';
import type { PartyMessage } from '@/types/models';

import { PARTY_MESSAGE_MAX_LENGTH } from './api';
import { usePartyMessages, useSendPartyMessage } from './queries';

/** Messages from the same person within this time are shown as one block. */
const GROUP_GAP_MS = 5 * 60_000;

/** The list follows new messages only while it is scrolled (nearly) to the end. */
const STICK_TO_END_PX = 48;

/** The character counter appears once a message gets close to the limit. */
const COUNTER_FROM = PARTY_MESSAGE_MAX_LENGTH - 100;

const FORMER_MEMBER = 'Former member';

function startsGroup(message: PartyMessage, previous: PartyMessage | undefined): boolean {
  if (!previous) return true;
  if (previous.author?.id !== message.author?.id) return true;
  return (
    new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime() > GROUP_GAP_MS
  );
}

interface MessageRowProps {
  message: PartyMessage;
  isOwn: boolean;
  showHeader: boolean;
}

function MessageRow({ message, isOwn, showHeader }: MessageRowProps) {
  const name = message.author?.username ?? FORMER_MEMBER;

  return (
    <li className={cn('flex gap-3 px-1', showHeader && 'mt-3 first:mt-0')}>
      {showHeader ? (
        <Avatar username={name} src={message.author?.avatarUrl} size="sm" />
      ) : (
        <span className="w-8 shrink-0" aria-hidden="true" />
      )}
      <div className="min-w-0 flex-1">
        {showHeader && (
          <p className="flex items-baseline gap-2">
            <span className={cn('text-sm font-semibold', isOwn && 'text-accent-bright')}>
              {name}
            </span>
            <time dateTime={message.createdAt} className="text-xs text-fg-subtle">
              {formatTime(message.createdAt)}
            </time>
          </p>
        )}
        <p className="text-sm [overflow-wrap:anywhere] whitespace-pre-wrap text-fg">
          {/* Without a header, screen readers still hear who wrote it. */}
          {!showHeader && <span className="sr-only">{name}: </span>}
          {message.body}
        </p>
      </div>
    </li>
  );
}

interface PartyChatProps {
  partyId: string;
}

/**
 * Text chat for the members of a party. Shown only on the Party page.
 * Everybody reads the messages written since they joined; when the party
 * ends, its messages are deleted (0010_party_chat.sql).
 */
export function PartyChat({ partyId }: PartyChatProps) {
  const { userId } = useAuth();
  const { data: messages, isError, error, refetch } = usePartyMessages(partyId);
  const sendMessage = useSendPartyMessage(partyId);
  const [draft, setDraft] = useState('');

  const listRef = useRef<HTMLDivElement>(null);
  const stickToEnd = useRef(true);
  const lastId = messages?.at(-1)?.id;

  // Jump to the newest message when one arrives, unless the user scrolled
  // up to read older ones.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (list && stickToEnd.current) list.scrollTop = list.scrollHeight;
  }, [lastId]);

  const handleScroll = () => {
    const list = listRef.current;
    if (!list) return;
    stickToEnd.current = list.scrollHeight - list.scrollTop - list.clientHeight < STICK_TO_END_PX;
  };

  const trimmed = draft.trim();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!trimmed || sendMessage.isPending) return;
    // Your own message should always be visible after sending.
    stickToEnd.current = true;
    sendMessage.mutate(trimmed, { onSuccess: () => setDraft('') });
  };

  let content;
  // Messages already on screen stay there if a later refresh fails; the
  // error is shown only when there is nothing to show yet.
  if (!messages) {
    content = isError ? (
      <ErrorState
        title="We could not load the chat"
        description={describeLoadError(error)}
        onRetry={() => void refetch()}
      />
    ) : (
      <ListSkeleton rows={3} />
    );
  } else if (messages.length === 0) {
    content = (
      <EmptyState
        icon={<MessageCircle />}
        title="No messages yet"
        description="Say hi to your party. Only members see the chat, and it is deleted when the party ends."
        className="py-8"
      />
    );
  } else {
    content = (
      <ol className="flex flex-col gap-1">
        {messages.map((message, index) => (
          <MessageRow
            key={message.id}
            message={message}
            isOwn={message.author?.id === userId}
            showHeader={startsGroup(message, messages[index - 1])}
          />
        ))}
      </ol>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={listRef}
        onScroll={handleScroll}
        role="log"
        aria-label="Party chat messages"
        aria-live="polite"
        tabIndex={0}
        className="h-80 overflow-y-auto rounded-xl border border-line bg-surface p-3 focus-visible:ring-4 focus-visible:ring-accent-soft focus-visible:outline-none"
      >
        {content}
      </div>

      <form onSubmit={handleSubmit} className="flex items-start gap-2">
        <Input
          label="Message"
          hideLabel
          placeholder="Write to your party…"
          autoComplete="off"
          maxLength={PARTY_MESSAGE_MAX_LENGTH}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          hint={
            draft.length >= COUNTER_FROM
              ? `${draft.length} / ${PARTY_MESSAGE_MAX_LENGTH}`
              : undefined
          }
          className="flex-1"
        />
        <Button
          type="submit"
          icon={<SendHorizontal className="size-4" aria-hidden="true" />}
          loading={sendMessage.isPending}
          disabled={!trimmed}
        >
          Send
        </Button>
      </form>
    </div>
  );
}
