'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import type { LogItemWithProjectAndUser, LogItemMentionInfo } from '@/lib/core/log-item/queries';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ContactHoverCard } from '@/components/ui/contact-hover-card';
import { updateLogItemAction } from '@/lib/core/log-item/update-log-item-action';

/** Render description with @mentions as hover cards */
function renderDescriptionWithMentions(
  description: string,
  mentions: LogItemMentionInfo[]
): React.ReactNode {
  if (mentions.length === 0) {
    return description;
  }

  // Find all @Name occurrences using known contact names
  type Match = { index: number; length: number; mention: LogItemMentionInfo };
  const matches: Match[] = [];

  for (const mention of mentions) {
    const searchStr = `@${mention.contactName}`;
    let pos = 0;
    while ((pos = description.indexOf(searchStr, pos)) !== -1) {
      matches.push({
        index: pos,
        length: searchStr.length,
        mention
      });
      pos += searchStr.length;
    }
  }

  if (matches.length === 0) {
    return description;
  }

  // Sort by position
  matches.sort((a, b) => a.index - b.index);

  // Build parts
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  for (const match of matches) {
    // Skip overlapping matches
    if (match.index < lastIndex) continue;

    // Add text before the mention
    if (match.index > lastIndex) {
      parts.push(description.slice(lastIndex, match.index));
    }

    const m = match.mention;

    parts.push(
      <ContactHoverCard
        key={`${m.contactId}-${match.index}`}
        contact={{
          name: m.contactName,
          email: m.contactEmail,
          phone: m.contactPhone,
          company: m.contactCompany
        }}
      >
        @{m.contactName}
      </ContactHoverCard>
    );

    lastIndex = match.index + match.length;
  }

  // Add remaining text
  if (lastIndex < description.length) {
    parts.push(description.slice(lastIndex));
  }

  return parts;
}

type Props = {
  logItems: LogItemWithProjectAndUser[];
  currentUserId: string;
};

const LOG_TYPES = ['COST_ITEM', 'QUOTATION', 'INVOICE', 'COMMENT'] as const;
type LogType = (typeof LOG_TYPES)[number];

function getTypeIcon(type: LogType) {
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

function getTypeLabel(type: LogType) {
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

export function DashboardTimeline({ logItems, currentUserId }: Props) {
  const [filter, setFilter] = useState<LogType | 'ALL'>('ALL');
  const [pending, setPending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editDate, setEditDate] = useState('');

  const filteredItems = filter === 'ALL' ? logItems : logItems.filter(item => item.type === filter);

  const startEditing = (item: LogItemWithProjectAndUser) => {
    setEditingId(item.id);
    setEditDescription(item.description);
    setEditDate(item.createdAt.toISOString().split('T')[0]);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditDescription('');
    setEditDate('');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !editDescription.trim()) return;

    setPending(true);
    const result = await updateLogItemAction({
      logItemId: editingId,
      description: editDescription.trim(),
      createdAt: new Date(editDate)
    });
    setPending(false);

    if (result._tag === 'Error') {
      toast.error(result.message);
      return;
    }

    toast.success('Updated');
    cancelEditing();
  };

  const canEdit = (item: LogItemWithProjectAndUser) => item.createdBy?.id === currentUserId;

  return (
    <div className="border rounded-lg bg-card">
      <div className="p-4 border-b">
        <div>
          <h2 className="font-semibold">Recent Activity</h2>
          <p className="text-sm text-muted-foreground">
            {filteredItems.length} event{filteredItems.length !== 1 ? 's' : ''}
            {filter !== 'ALL' && ` (${getTypeLabel(filter)})`}
          </p>
        </div>

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
              onClick={() => setFilter(type)}
            >
              {getTypeLabel(type)}
            </Button>
          ))}
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="p-6 text-center text-muted-foreground text-sm">
          {filter === 'ALL'
            ? 'No recent activity across projects.'
            : `No ${getTypeLabel(filter)?.toLowerCase()} events.`}
        </div>
      ) : (
        <div className="divide-y max-h-96 overflow-y-auto">
          {filteredItems.map(item => (
            <div key={item.id} className="flex gap-3 p-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                {getTypeIcon(item.type)}
              </div>
              {editingId === item.id ? (
                <form onSubmit={handleUpdate} className="flex-1 space-y-2">
                  <Textarea
                    value={editDescription}
                    onChange={e => setEditDescription(e.target.value)}
                    maxLength={2000}
                    rows={2}
                  />
                  <Input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} />
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={cancelEditing}
                      disabled={pending}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" disabled={pending || !editDescription.trim()}>
                      {pending ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <Link
                      href={`/projects/${item.projectId}`}
                      className="font-medium hover:underline"
                    >
                      {item.project.name}
                    </Link>
                    <span className="mx-1.5 text-muted-foreground/50">&middot;</span>
                    <span className="text-muted-foreground">{getTypeLabel(item.type)}</span>
                    {item.createdBy && (
                      <>
                        <span className="mx-1.5 text-muted-foreground/50">&middot;</span>
                        <span className="text-muted-foreground">{item.createdBy.name}</span>
                      </>
                    )}
                    <span className="mx-1.5 text-muted-foreground/50">&middot;</span>
                    <span className="text-muted-foreground">
                      {item.createdAt.toLocaleDateString('sv-SE')}
                    </span>
                    {canEdit(item) && (
                      <button
                        type="button"
                        onClick={() => startEditing(item)}
                        className="ml-2 text-muted-foreground hover:text-foreground"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                          <path d="m15 5 4 4" />
                        </svg>
                      </button>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-2">
                    {renderDescriptionWithMentions(item.description, item.mentions)}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
