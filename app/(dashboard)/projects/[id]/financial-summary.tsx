import { formatSEK } from '@/lib/utils';
import type { CostItem, Invoice, Quotation } from '@/lib/services/db/schema';

type QuotationWithContact = Quotation & {
  contact: { id: string; name: string; company: string | null } | null;
};

type InvoiceWithQuotation = Invoice & {
  quotation: { id: string; description: string; contactId: string | null } | null;
};

type Props = {
  costItems: CostItem[];
  quotations: QuotationWithContact[];
  invoices: InvoiceWithQuotation[];
};

/**
 * Financial summary showing estimated vs actual spending.
 *
 * - Estimated: sum of ACCEPTED quotations
 * - Actual: sum of cost items + invoices
 * - Progress bar shows actual/estimated ratio
 * - Green when under budget, red when over
 */
export function FinancialSummary({ costItems, quotations, invoices }: Props) {
  // Calculate estimated total (sum of accepted quotations)
  const estimated = quotations
    .filter(q => q.status === 'ACCEPTED')
    .reduce((sum, q) => sum + parseFloat(q.amount), 0);

  // Calculate actual total (sum of cost items + invoices)
  const costItemsTotal = costItems.reduce((sum, c) => sum + parseFloat(c.amount), 0);
  const invoicesTotal = invoices.reduce((sum, i) => sum + parseFloat(i.amount), 0);
  const actual = costItemsTotal + invoicesTotal;

  // Calculate percentage (capped at 100% for display, but we show actual value)
  const percentage = estimated > 0 ? (actual / estimated) * 100 : 0;
  const displayPercentage = Math.min(percentage, 100);

  // Determine if over budget
  const isOverBudget = actual > estimated && estimated > 0;
  const hasEstimate = estimated > 0;

  // Calculate remaining or overspent
  const difference = estimated - actual;

  return (
    <div className="rounded-xl border bg-card p-6">
      <h2 className="text-lg font-medium mb-4">Budget Overview</h2>

      <div className="space-y-4">
        {/* Estimated */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Estimated</span>
          <span className="font-medium">{formatSEK(estimated)}</span>
        </div>

        {/* Actual */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Actual</span>
          <span className={isOverBudget ? 'font-medium text-red-500' : 'font-medium'}>
            {formatSEK(actual)}
          </span>
        </div>

        {/* Progress bar */}
        {hasEstimate && (
          <div className="space-y-2">
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  isOverBudget ? 'bg-red-500' : 'bg-green-500'
                }`}
                style={{ width: `${displayPercentage}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{percentage.toFixed(0)}% used</span>
              <span className={isOverBudget ? 'text-red-500' : 'text-green-600'}>
                {isOverBudget
                  ? `Over by ${formatSEK(Math.abs(difference))}`
                  : `${formatSEK(difference)} remaining`}
              </span>
            </div>
          </div>
        )}

        {/* Breakdown */}
        <div className="border-t pt-4 mt-4 space-y-2 text-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Cost items</span>
            <span>{formatSEK(costItemsTotal)}</span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Invoices</span>
            <span>{formatSEK(invoicesTotal)}</span>
          </div>
        </div>

        {/* No estimate warning */}
        {!hasEstimate && actual > 0 && (
          <p className="text-sm text-muted-foreground">
            No accepted quotations yet. Accept a quotation to set your budget estimate.
          </p>
        )}
      </div>
    </div>
  );
}
