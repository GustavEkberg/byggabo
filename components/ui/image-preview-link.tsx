'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { getDownloadUrlAction } from '@/lib/core/file/get-download-url-action';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { cn } from '@/lib/utils';

type Props = {
  fileUrl: string;
  fileName: string;
  children: React.ReactNode;
  className?: string;
};

/**
 * A link component for images that shows a hover preview and opens on click.
 * Fetches signed URL on hover for preview and on click for viewing.
 */
export function ImagePreviewLink({ fileUrl, fileName, children, className }: Props) {
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await getDownloadUrlAction(fileUrl);

    if (result._tag === 'Error') {
      toast.error(result.message);
      setLoading(false);
      return;
    }

    window.open(result.signedUrl, '_blank');
    setLoading(false);
  };

  const handleHoverStart = async () => {
    if (previewUrl || previewLoading) return;

    setPreviewLoading(true);
    const result = await getDownloadUrlAction(fileUrl);

    if (result._tag === 'Success') {
      setPreviewUrl(result.signedUrl);
    }
    setPreviewLoading(false);
  };

  return (
    <HoverCard>
      <HoverCardTrigger
        onClick={handleClick}
        onMouseEnter={handleHoverStart}
        className={cn('text-primary hover:underline cursor-pointer disabled:opacity-50', className)}
      >
        {loading ? 'Loading...' : children}
      </HoverCardTrigger>
      <HoverCardContent side="top" className="p-1 w-auto max-w-64">
        {previewLoading ? (
          <div className="w-48 h-32 flex items-center justify-center text-muted-foreground text-xs">
            Loading preview...
          </div>
        ) : previewUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element -- Dynamic signed URLs can't use next/image */
          <img
            src={previewUrl}
            alt={fileName}
            className="max-w-60 max-h-48 rounded object-contain"
          />
        ) : (
          <div className="w-48 h-32 flex items-center justify-center text-muted-foreground text-xs">
            Preview unavailable
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
