'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import type { LogItem } from '@/lib/services/db/schema';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { addCommentAction } from '@/lib/core/log-item/add-comment-action';

type Props = {
  projectId: string;
  logItems: LogItem[];
};

const LOG_TYPES = ['COST_ITEM', 'QUOTATION', 'INVOICE', 'COMMENT'] as const;
type LogType = (typeof LOG_TYPES)[number];

function getTypeIcon(type: LogItem['type']) {
  switch (type) {
    case 'COST_ITEM':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" x2="12" y1="2" y2="22" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      );
    case 'QUOTATION':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
          <path d="M14 2v4a2 2 0 0 0 2 2h4" />
        </svg>
      );
    case 'INVOICE':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect width="20" height="14" x="2" y="5" rx="2" />
          <line x1="2" x2="22" y1="10" y2="10" />
        </svg>
      );
    case 'COMMENT':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );
  }
}

function getTypeLabel(type: LogItem['type']) {
  switch (type) {
    case 'COST_ITEM':
      return 'Cost';
    case 'QUOTATION':
      return 'Quotation';
    case 'INVOICE':
      return 'Invoice';
    case 'COMMENT':
      return 'Comment';
  }
}

function isLogType(value: string): value is LogType {
  return (
    value === 'COST_ITEM' || value === 'QUOTATION' || value === 'INVOICE' || value === 'COMMENT'
  );
}

export function Timeline({ projectId, logItems }: Props) {
  const [filter, setFilter] = useState<LogType | 'ALL'>('ALL');
  const [showAddComment, setShowAddComment] = useState(false);
  const [comment, setComment] = useState('');
  const [pending, setPending] = useState(false);

  const filteredItems = filter === 'ALL' ? logItems : logItems.filter(item => item.type === filter);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    setPending(true);
    const result = await addCommentAction({
      projectId,
      description: comment.trim()
    });
    setPending(false);

    if (result._tag === 'Error') {
      toast.error(result.message);
      return;
    }

    toast.success('Comment added');
    setComment('');
    setShowAddComment(false);
  };

  return (
    <div className="border rounded-lg bg-card">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold">Timeline</h2>
            <p className="text-sm text-muted-foreground">
              {filteredItems.length} event{filteredItems.length !== 1 ? 's' : ''}
              {filter !== 'ALL' && ` (${getTypeLabel(filter)})`}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowAddComment(!showAddComment)}>
            {showAddComment ? 'Cancel' : 'Add Comment'}
          </Button>
        </div>

        {showAddComment && (
          <form onSubmit={handleAddComment} className="mt-4 space-y-2">
            <Textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Add a note or comment..."
              maxLength={2000}
              rows={2}
            />
            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={pending || !comment.trim()}>
                {pending ? 'Adding...' : 'Add'}
              </Button>
            </div>
          </form>
        )}

        <div className="mt-3 flex flex-wrap gap-1">
          <Button
            size="sm"
            variant={filter === 'ALL' ? 'default' : 'outline'}
            onClick={() => setFilter('ALL')}
          >
            All
          </Button>
          {LOG_TYPES.map(type => (
            <Button
              key={type}
              size="sm"
              variant={filter === type ? 'default' : 'outline'}
              onClick={() => {
                if (isLogType(type)) {
                  setFilter(type);
                }
              }}
            >
              {getTypeLabel(type)}
            </Button>
          ))}
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="p-6 text-center text-muted-foreground text-sm">
          {filter === 'ALL'
            ? 'No activity yet. Add costs, quotations, or invoices.'
            : `No ${getTypeLabel(filter).toLowerCase()} events.`}
        </div>
      ) : (
        <div className="divide-y max-h-96 overflow-y-auto">
          {filteredItems.map(item => (
            <div key={item.id} className="flex gap-3 p-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                {getTypeIcon(item.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <span className="font-medium">{getTypeLabel(item.type)}</span>
                  <span className="mx-1.5 text-muted-foreground/50">&middot;</span>
                  <span className="text-muted-foreground">
                    {item.createdAt.toLocaleDateString('sv-SE')}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
