'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { seedDefaultSectionsAction } from '@/lib/core/property-section/seed-default-sections-action';

export function SeedSectionsButton() {
  const [pending, setPending] = useState(false);

  const handleClick = async () => {
    setPending(true);
    const result = await seedDefaultSectionsAction();
    setPending(false);

    if (result._tag === 'Error') {
      toast.error(result.message);
      return;
    }

    if (result.created > 0) {
      toast.success(`Added ${result.created} default sections`);
    } else {
      toast.info('Sections already exist');
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={pending}>
      <Sparkles className="h-4 w-4 mr-1" />
      {pending ? 'Adding...' : 'Add Defaults'}
    </Button>
  );
}
