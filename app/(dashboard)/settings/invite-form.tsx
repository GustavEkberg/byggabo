'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoaderCircleIcon, SendIcon } from 'lucide-react';
import { useState, useTransition, type FormEvent } from 'react';
import { toast } from 'sonner';
import { createInviteAction } from '@/lib/core/property-invite/create-invite-action';

export function InviteForm() {
  const [email, setEmail] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    startTransition(async () => {
      const result = await createInviteAction({ email: email.trim() });

      if (result._tag === 'Error') {
        toast.error(result.message);
        return;
      }

      toast.success(`Invitation sent to ${email}`);
      setEmail('');
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        type="email"
        placeholder="Enter email address"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
        className="flex-1"
      />
      <Button type="submit" disabled={isPending}>
        {isPending ? (
          <LoaderCircleIcon className="size-4 animate-spin" />
        ) : (
          <SendIcon className="size-4" />
        )}
        <span className="sr-only sm:not-sr-only sm:ml-2">Send invite</span>
      </Button>
    </form>
  );
}
