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
 * Financial summary showing quote range, committed, and actual spending.
 *
 * - Quote Range: min–max of PENDING quotations (for decision-making)
 * - Committed: sum of ACCEPTED quotations (locked-in budget)
 * - Actual: sum of cost items + invoices
 */
export function FinancialSummary({ costItems, quotations, invoices }: Props) {
  // Calculate quote range from pending quotations
  const pendingQuotations = quotations.filter(q => q.status === 'PENDING');
  const hasPending = pendingQuotations.length > 0;
  const pendingAmounts = pendingQuotations.map(q => parseFloat(q.amount));
  const quoteRangeMin = hasPending ? Math.min(...pendingAmounts) : 0;
  const quoteRangeMax = hasPending ? Math.max(...pendingAmounts) : 0;

  // Calculate committed total (sum of accepted quotations)
  const committed = quotations
    .filter(q => q.status === 'ACCEPTED')
    .reduce((sum, q) => sum + parseFloat(q.amount), 0);

  // Calculate actual total (sum of cost items + invoices)
  const costItemsTotal = costItems.reduce((sum, c) => sum + parseFloat(c.amount), 0);
  const invoicesTotal = invoices.reduce((sum, i) => sum + parseFloat(i.amount), 0);
  const actual = costItemsTotal + invoicesTotal;

  // Determine if over budget (only relevant if there's committed budget)
  const isOverBudget = actual > committed && committed > 0;

  // Format quote range display
  const formatQuoteRange = () => {
    if (quoteRangeMin === quoteRangeMax) {
      return formatSEK(quoteRangeMin);
    }
    return `${formatSEK(quoteRangeMin)} – ${formatSEK(quoteRangeMax)}`;
  };

  return (
    <div className="rounded-xl border bg-card p-6">
      <h2 className="text-lg font-medium mb-4">Budget Overview</h2>

      <div className="space-y-4">
        {/* Quote Range - only shown if pending quotations exist */}
        {hasPending && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              Quote Range{' '}
              <span className="text-muted-foreground/60">({pendingQuotations.length} pending)</span>
            </span>
            <span className="font-medium">{formatQuoteRange()}</span>
          </div>
        )}

        {/* Committed */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Committed</span>
          <span className="font-medium">{formatSEK(committed)}</span>
        </div>

        {/* Actual */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Actual</span>
          <span className={isOverBudget ? 'font-medium text-red-500' : 'font-medium'}>
            {formatSEK(actual)}
          </span>
        </div>

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
      </div>
    </div>
  );
}
