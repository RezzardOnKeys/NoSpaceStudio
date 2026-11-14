import { ImagePlus } from 'lucide-react';
import { useRef, useState, type ChangeEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Notice } from '@/components/ui/Notice';
import { useToast } from '@/components/ui/toast-context';
import { ACCEPTED_IMAGE_TYPES, ImageError, toSquareImage } from '@/lib/image';

import { describeAvatarError } from './api';
import { useUploadAvatar } from './queries';

interface PreparedImage {
  blob: Blob;
  /** Temporary link to the blob, for the preview. */
  previewUrl: string;
}

/**
 * "Add profile picture": pick a file, check the preview, confirm. Shown only
 * while the user has no picture, because it can be set just once.
 */
export function AvatarPicker() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [prepared, setPrepared] = useState<PreparedImage | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const upload = useUploadAvatar();
  const { toast } = useToast();

  function close() {
    if (prepared) URL.revokeObjectURL(prepared.previewUrl);
    setPrepared(null);
    upload.reset();
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Allows picking the same file again after cancelling.
    event.target.value = '';
    if (!file) return;

    setIsPreparing(true);
    try {
      const blob = await toSquareImage(file);
      setPrepared({ blob, previewUrl: URL.createObjectURL(blob) });
    } catch (error) {
      toast({
        title: 'This picture does not work',
        description: error instanceof ImageError ? error.message : 'Try another picture.',
        variant: 'error',
      });
    } finally {
      setIsPreparing(false);
    }
  }

  function confirm() {
    if (!prepared) return;
    upload.mutate(prepared.blob, {
      onSuccess: () => {
        toast({ title: 'Profile picture saved', variant: 'success' });
        close();
      },
    });
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => void handleFile(event)}
      />
      <Button
        variant="secondary"
        size="sm"
        icon={<ImagePlus className="size-4" aria-hidden="true" />}
        loading={isPreparing}
        onClick={() => inputRef.current?.click()}
        className="self-start"
      >
        Add profile picture
      </Button>

      <Modal
        open={prepared !== null}
        onClose={close}
        title="Use this profile picture?"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={close} disabled={upload.isPending}>
              Cancel
            </Button>
            <Button loading={upload.isPending} onClick={confirm}>
              Use this picture
            </Button>
          </>
        }
      >
        <div className="flex flex-col items-center gap-5">
          {prepared && (
            <img
              src={prepared.previewUrl}
              alt="Preview of your new profile picture"
              className="size-40 rounded-full object-cover"
            />
          )}
          <Notice variant="danger" className="w-full">
            You can choose your profile picture only once. It cannot be changed or removed later.
          </Notice>
          {upload.isError && (
            <p className="text-sm text-danger">{describeAvatarError(upload.error)}</p>
          )}
        </div>
      </Modal>
    </>
  );
}
