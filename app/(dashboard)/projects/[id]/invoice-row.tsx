'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { updateInvoiceAction } from '@/lib/core/invoice/update-invoice-action';
import { EditInvoiceDialog } from './edit-invoice-dialog';
import { FileLink } from '@/components/ui/file-link';
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

type Props = {
  invoice: InvoiceWithQuotationAndContact;
  contacts: Contact[];
};

export function InvoiceRow({ invoice, contacts }: Props) {
  const [updating, setUpdating] = useState(false);

  const handlePaidChange = async (isPaid: boolean) => {
    if (isPaid === invoice.isPaid) return;

    setUpdating(true);
    const result = await updateInvoiceAction({
      invoiceId: invoice.id,
      isPaid
    });
    setUpdating(false);

    if (result._tag === 'Error') {
      toast.error(result.message);
      return;
    }

    toast.success(isPaid ? 'Invoice marked as paid' : 'Invoice marked as unpaid');
  };

  return (
    <div className="flex items-center justify-between p-4 gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{invoice.description}</span>
          {invoice.fileUrl && (
            <FileLink fileUrl={invoice.fileUrl} className="text-xs">
              PDF
            </FileLink>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          {invoice.contact && (
            <span className="text-xs text-muted-foreground">
              {invoice.contact.company ?? invoice.contact.name}
            </span>
          )}
          <span className="text-xs text-muted-foreground/60">
            {invoice.invoiceDate.toLocaleDateString('sv-SE')}
          </span>
          {invoice.quotation && (
            <span className="text-xs text-muted-foreground">From quotation</span>
          )}
        </div>
      </div>

      <div className="text-right">
        <span className="font-semibold tabular-nums">
          {parseFloat(invoice.amount).toLocaleString('sv-SE')} kr
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={updating}
          className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
            invoice.isPaid
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          } ${updating ? 'opacity-50' : 'cursor-pointer'}`}
          onClick={() => handlePaidChange(!invoice.isPaid)}
        >
          {invoice.isPaid ? 'Paid' : 'Unpaid'}
        </button>

        <EditInvoiceDialog invoice={invoice} contacts={contacts} />
      </div>
    </div>
  );
}
