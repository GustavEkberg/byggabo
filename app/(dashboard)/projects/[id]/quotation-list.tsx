'use client';

import type { Contact } from '@/lib/services/db/schema';
import { QuotationRow } from './quotation-row';
import { CreateQuotationDialog } from './create-quotation-dialog';

type QuotationWithContact = {
  id: string;
  projectId: string;
  contactId: string | null;
  description: string;
  amount: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  receivedDate: Date;
  fileUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  contact: {
    id: string;
    name: string;
    company: string | null;
  } | null;
};

type InvoiceWithQuotation = {
  quotationId: string | null;
};

type Props = {
  projectId: string;
  quotations: QuotationWithContact[];
  invoices: InvoiceWithQuotation[];
  contacts: Contact[];
};

export function QuotationList({ projectId, quotations, invoices, contacts }: Props) {
  const acceptedTotal = quotations
    .filter(q => q.status === 'ACCEPTED')
    .reduce((sum, q) => sum + parseFloat(q.amount), 0);

  // Set of quotation IDs that already have invoices
  const quotationsWithInvoice = new Set(
    invoices.filter(inv => inv.quotationId !== null).map(inv => inv.quotationId)
  );

  return (
    <div className="border rounded-lg bg-card">
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h2 className="font-semibold">Quotations</h2>
          <p className="text-sm text-muted-foreground">
            {quotations.length} quotation{quotations.length !== 1 ? 's' : ''} &middot;{' '}
            {acceptedTotal.toLocaleString('sv-SE')} kr accepted
          </p>
        </div>
        <CreateQuotationDialog projectId={projectId} contacts={contacts} />
      </div>

      {quotations.length === 0 ? (
        <div className="p-6 text-center text-muted-foreground text-sm">
          No quotations yet. Add your first quotation from a contractor.
        </div>
      ) : (
        <div className="divide-y">
          {quotations.map(quotation => (
            <QuotationRow
              key={quotation.id}
              quotation={quotation}
              contacts={contacts}
              hasInvoice={quotationsWithInvoice.has(quotation.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
