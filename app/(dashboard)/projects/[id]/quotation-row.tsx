'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import type { Contact } from '@/lib/services/db/schema';
import { updateQuotationAction } from '@/lib/core/quotation/update-quotation-action';
import { convertToInvoiceAction } from '@/lib/core/invoice/convert-to-invoice-action';
import { EditQuotationDialog } from './edit-quotation-dialog';
import { Button } from '@/components/ui/button';
import { FileLink } from '@/components/ui/file-link';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

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

type Props = {
  quotation: QuotationWithContact;
  contacts: Contact[];
  hasInvoice: boolean;
};

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  ACCEPTED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800'
} as const;

const statusLabels = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected'
} as const;

export function QuotationRow({ quotation, contacts, hasInvoice }: Props) {
  const [updating, setUpdating] = useState(false);
  const [converting, setConverting] = useState(false);

  const handleStatusChange = async (newStatus: 'PENDING' | 'ACCEPTED' | 'REJECTED') => {
    if (newStatus === quotation.status) return;

    setUpdating(true);
    const result = await updateQuotationAction({
      quotationId: quotation.id,
      status: newStatus
    });
    setUpdating(false);

    if (result._tag === 'Error') {
      toast.error(result.message);
      return;
    }

    toast.success(`Quotation ${statusLabels[newStatus].toLowerCase()}`);
  };

  const handleConvertToInvoice = async () => {
    setConverting(true);
    const result = await convertToInvoiceAction({
      quotationId: quotation.id
    });
    setConverting(false);

    if (result._tag === 'Error') {
      toast.error(result.message);
      return;
    }

    toast.success('Invoice created from quotation');
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{quotation.description}</span>
            {quotation.fileUrl && (
              <FileLink fileUrl={quotation.fileUrl} className="text-xs flex-shrink-0">
                PDF
              </FileLink>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            {quotation.contact && (
              <span className="text-sm text-muted-foreground truncate">
                {quotation.contact.company ?? quotation.contact.name}
              </span>
            )}
            <span className="text-xs text-muted-foreground/60 flex-shrink-0">
              {quotation.receivedDate.toLocaleDateString('sv-SE')}
            </span>
          </div>
        </div>

        <span className="font-semibold tabular-nums flex-shrink-0">
          {parseFloat(quotation.amount).toLocaleString('sv-SE')} kr
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Select
          value={quotation.status}
          onValueChange={value => {
            if (value === 'PENDING' || value === 'ACCEPTED' || value === 'REJECTED') {
              handleStatusChange(value);
            }
          }}
          disabled={updating}
        >
          <SelectTrigger
            size="sm"
            className={`text-xs h-7 w-auto gap-1 rounded-full border-0 ${statusColors[quotation.status]}`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="ACCEPTED">Accepted</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>

        {quotation.status === 'ACCEPTED' && !hasInvoice && (
          <Button
            variant="outline"
            size="xs"
            onClick={handleConvertToInvoice}
            disabled={converting}
          >
            {converting ? 'Creating...' : 'To Invoice'}
          </Button>
        )}

        {hasInvoice && (
          <span className="text-xs text-muted-foreground px-2 py-1 bg-blue-50 rounded-full">
            Invoiced
          </span>
        )}

        <EditQuotationDialog quotation={quotation} contacts={contacts} />
      </div>
    </div>
  );
}
