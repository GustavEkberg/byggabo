'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { getDownloadUrlAction } from '@/lib/core/file/get-download-url-action';
import { cn } from '@/lib/utils';

type Props = {
  fileUrl: string;
  children: React.ReactNode;
  className?: string;
};

/**
 * A link component that fetches a signed URL before opening the file.
 * Use this for any S3 files that require authentication.
 */
export function FileLink({ fileUrl, children, className }: Props) {
  const [loading, setLoading] = useState(false);

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

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={cn('text-primary hover:underline cursor-pointer disabled:opacity-50', className)}
    >
      {loading ? 'Loading...' : children}
    </button>
  );
}
