'use client';

import { InvoiceRow } from './invoice-row';

type InvoiceWithQuotation = {
  id: string;
  projectId: string;
  quotationId: string | null;
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
};

type Props = {
  invoices: InvoiceWithQuotation[];
};

export function InvoiceList({ invoices }: Props) {
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
      </div>

      {invoices.length === 0 ? (
        <div className="p-6 text-center text-muted-foreground text-sm">
          No invoices yet. Convert an accepted quotation to create an invoice.
        </div>
      ) : (
        <div className="divide-y">
          {invoices.map(invoice => (
            <InvoiceRow key={invoice.id} invoice={invoice} />
          ))}
        </div>
      )}
    </div>
  );
}
