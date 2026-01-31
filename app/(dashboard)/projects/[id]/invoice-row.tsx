'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { updateInvoiceAction } from '@/lib/core/invoice/update-invoice-action';
import { EditInvoiceDialog } from './edit-invoice-dialog';

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
  invoice: InvoiceWithQuotation;
};

export function InvoiceRow({ invoice }: Props) {
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
            <a
              href={invoice.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline"
            >
              PDF
            </a>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
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
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={invoice.isPaid}
            onChange={e => handlePaidChange(e.target.checked)}
            disabled={updating}
            className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
          />
          <span
            className={`text-xs px-2 py-1 rounded-full ${
              invoice.isPaid ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}
          >
            {invoice.isPaid ? 'Paid' : 'Unpaid'}
          </span>
        </label>

        <EditInvoiceDialog invoice={invoice} />
      </div>
    </div>
  );
}
