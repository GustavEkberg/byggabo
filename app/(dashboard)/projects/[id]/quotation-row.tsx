'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import type { Contact } from '@/lib/services/db/schema';
import { updateQuotationAction } from '@/lib/core/quotation/update-quotation-action';
import { EditQuotationDialog } from './edit-quotation-dialog';

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

export function QuotationRow({ quotation, contacts }: Props) {
  const [updating, setUpdating] = useState(false);

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

  return (
    <div className="flex items-center justify-between p-4 gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{quotation.description}</span>
          {quotation.fileUrl && (
            <a
              href={quotation.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline"
            >
              PDF
            </a>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          {quotation.contact && (
            <span className="text-sm text-muted-foreground">
              {quotation.contact.company ?? quotation.contact.name}
            </span>
          )}
          <span className="text-xs text-muted-foreground/60">
            {quotation.receivedDate.toLocaleDateString('sv-SE')}
          </span>
        </div>
      </div>

      <div className="text-right">
        <span className="font-semibold tabular-nums">
          {parseFloat(quotation.amount).toLocaleString('sv-SE')} kr
        </span>
      </div>

      <div className="flex items-center gap-2">
        <select
          value={quotation.status}
          onChange={e => {
            const value = e.target.value;
            if (value === 'PENDING' || value === 'ACCEPTED' || value === 'REJECTED') {
              handleStatusChange(value);
            }
          }}
          disabled={updating}
          className={`text-xs px-2 py-1 rounded-full border-0 cursor-pointer ${statusColors[quotation.status]}`}
        >
          <option value="PENDING">Pending</option>
          <option value="ACCEPTED">Accepted</option>
          <option value="REJECTED">Rejected</option>
        </select>

        <EditQuotationDialog quotation={quotation} contacts={contacts} />
      </div>
    </div>
  );
}
