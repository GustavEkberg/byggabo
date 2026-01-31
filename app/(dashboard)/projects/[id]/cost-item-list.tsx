'use client';

import type { CostItem } from '@/lib/services/db/schema';
import { CostItemRow } from './cost-item-row';
import { CreateCostItemDialog } from './create-cost-item-dialog';

type Props = {
  projectId: string;
  costItems: CostItem[];
};

export function CostItemList({ projectId, costItems }: Props) {
  const total = costItems.reduce((sum, item) => sum + parseFloat(item.amount), 0);

  return (
    <div className="border rounded-lg bg-card">
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h2 className="font-semibold">Costs</h2>
          <p className="text-sm text-muted-foreground">
            {costItems.length} item{costItems.length !== 1 ? 's' : ''} &middot;{' '}
            {total.toLocaleString('sv-SE')} kr
          </p>
        </div>
        <CreateCostItemDialog projectId={projectId} />
      </div>

      {costItems.length === 0 ? (
        <div className="p-6 text-center text-muted-foreground text-sm">
          No costs recorded yet. Add your first cost item.
        </div>
      ) : (
        <div className="divide-y">
          {costItems.map(item => (
            <CostItemRow key={item.id} costItem={item} />
          ))}
        </div>
      )}
    </div>
  );
}
