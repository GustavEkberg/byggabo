'use client';

import { InvoiceRow } from './invoice-row';
import { CreateInvoiceDialog } from './create-invoice-dialog';
import type { Contact } from '@/lib/services/db/schema';

type InvoiceWithQuotationAndContact = {
  id: string;
  projectId: string;
  quotationId: string | null;
  contactId: string | null;
  description: string;
  amount: string;
  invoiceDate: Date;
  isPaid: boolean;
  fileUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  quotation: {
    id: string;
    description: string;
    contactId: string | null;
  } | null;
  contact: {
    id: string;
    name: string;
    company: string | null;
  } | null;
};

type QuotationWithContact = {
  id: string;
  description: string;
  amount: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  contactId: string | null;
  contact: { id: string; name: string } | null;
};

type Props = {
  projectId: string;
  invoices: InvoiceWithQuotationAndContact[];
  quotations: QuotationWithContact[];
  contacts: Contact[];
};

export function InvoiceList({ projectId, invoices, quotations, contacts }: Props) {
  // Find accepted quotations that don't already have an invoice
  const invoicedQuotationIds = new Set(
    invoices.filter(inv => inv.quotationId !== null).map(inv => inv.quotationId)
  );
  const acceptedQuotations = quotations
    .filter(q => q.status === 'ACCEPTED' && !invoicedQuotationIds.has(q.id))
    .map(q => ({ id: q.id, description: q.description, amount: q.amount, contactId: q.contactId }));
  const total = invoices.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
  const paidTotal = invoices
    .filter(inv => inv.isPaid)
    .reduce((sum, inv) => sum + parseFloat(inv.amount), 0);

  return (
    <div className="border rounded-lg bg-card">
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h2 className="font-semibold">Invoices</h2>
          <p className="text-sm text-muted-foreground">
            {invoices.length} invoice{invoices.length !== 1 ? 's' : ''} &middot;{' '}
            {paidTotal.toLocaleString('sv-SE')} / {total.toLocaleString('sv-SE')} kr paid
          </p>
        </div>
        <CreateInvoiceDialog
          projectId={projectId}
          acceptedQuotations={acceptedQuotations}
          contacts={contacts}
        />
      </div>

      {invoices.length === 0 ? (
        <div className="p-6 text-center text-muted-foreground text-sm">
          No invoices yet. Add an invoice or convert an accepted quotation.
        </div>
      ) : (
        <div className="divide-y">
          {invoices.map(invoice => (
            <InvoiceRow key={invoice.id} invoice={invoice} contacts={contacts} />
          ))}
        </div>
      )}
    </div>
  );
}
