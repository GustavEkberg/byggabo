'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { seedDefaultContactCategoriesAction } from '@/lib/core/contact-category/seed-default-categories-action';

export function SeedCategoriesButton() {
  const [pending, setPending] = useState(false);

  const handleClick = async () => {
    setPending(true);
    const result = await seedDefaultContactCategoriesAction();
    setPending(false);

    if (result._tag === 'Error') {
      toast.error(result.message);
      return;
    }

    if (result.created > 0) {
      toast.success(`Added ${result.created} default categories`);
    } else {
      toast.info('Categories already exist');
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={pending}>
      <Sparkles className="h-4 w-4 mr-1" />
      {pending ? 'Adding...' : 'Add Defaults'}
    </Button>
  );
}
