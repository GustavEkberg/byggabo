'use client';

import { Button } from '@/components/ui/button';
import { LogOutIcon } from 'lucide-react';
import { authClient } from '@/lib/services/auth/auth-client';

export const NoPropertyMessage = () => {
  const handleLogout = () => {
    authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = '/';
        }
      }
    });
  };

  return (
    <>
      <span className="text-5xl font-semibold tracking-tight">
        <span className="mr-0.5 text-6xl" style={{ WebkitTextStroke: '2px currentColor' }}>
          ⌂
        </span>
        Byggabo
      </span>
      <div className="w-full space-y-4 text-center">
        <p className="text-muted-foreground text-sm">
          Your account is not associated with any property. Ask the property owner to invite you.
        </p>
        <Button variant="outline" className="w-full" onClick={handleLogout}>
          <LogOutIcon className="size-4" />
          Log out
        </Button>
      </div>
    </>
  );
};
