'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import type { LogItemWithUser, LogItemMentionInfo } from '@/lib/core/log-item/queries';
import type { Contact } from '@/lib/services/db/schema';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MentionInput } from '@/components/ui/mention-input';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { ContactHoverCard } from '@/components/ui/contact-hover-card';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { addCommentAction } from '@/lib/core/log-item/add-comment-action';
import { updateLogItemAction } from '@/lib/core/log-item/update-log-item-action';
import { deleteLogItemAction } from '@/lib/core/log-item/delete-log-item-action';

type ContactSuggestion = Pick<Contact, 'id' | 'name' | 'company'>;

/** Format date as relative time if recent, otherwise as date */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;

  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return `Today ${date.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday ${date.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}`;
  }

  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return date.toLocaleDateString('sv-SE');
}

/** Extended log item with optional project info for dashboard view */
export type TimelineItem = LogItemWithUser & {
  project?: { id: string; name: string };
};

type Props = {
  /** Project ID for adding comments (required if allowAddComment) */
  projectId?: string;
  /** Log items to display */
  logItems: TimelineItem[];
  /** Current user ID for edit permissions */
  currentUserId: string;
  /** Contacts for @mention suggestions */
  contacts?: ContactSuggestion[];
  /** Title shown in header */
  title?: string;
  /** Subtitle shown in header */
  subtitle?: string;
  /** Whether to show "Add Comment" button */
  allowAddComment?: boolean;
  /** Whether to show project name (for dashboard view) */
  showProjectName?: boolean;
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

function isLogType(value: string): value is LogType {
  return (
    value === 'COST_ITEM' || value === 'QUOTATION' || value === 'INVOICE' || value === 'COMMENT'
  );
}

/** Render description with @mentions as hover cards */
function renderDescriptionWithMentions(
  description: string,
  mentions: LogItemMentionInfo[]
): React.ReactNode {
  if (mentions.length === 0) {
    return description;
  }

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

  matches.sort((a, b) => a.index - b.index);

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  for (const match of matches) {
    if (match.index < lastIndex) continue;

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

  if (lastIndex < description.length) {
    parts.push(description.slice(lastIndex));
  }

  return parts;
}

export function Timeline({
  projectId,
  logItems,
  currentUserId,
  contacts = [],
  title = 'Timeline',
  subtitle,
  allowAddComment = false,
  showProjectName = false
}: Props) {
  const [filter, setFilter] = useState<LogType | 'ALL'>('ALL');
  const [showAddComment, setShowAddComment] = useState(false);
  const [comment, setComment] = useState('');
  const [mentionedContactIds, setMentionedContactIds] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editDate, setEditDate] = useState<Date | undefined>(undefined);

  const filteredItems = filter === 'ALL' ? logItems : logItems.filter(item => item.type === filter);

  const contactSuggestions = contacts.map(c => ({
    id: c.id,
    name: c.name,
    subtitle: c.company ?? undefined
  }));

  const handleMentionsChange = useCallback((ids: string[]) => {
    setMentionedContactIds(ids);
  }, []);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || !projectId) return;

    setPending(true);
    const result = await addCommentAction({
      projectId,
      description: comment.trim(),
      mentionedContactIds: mentionedContactIds.length > 0 ? mentionedContactIds : undefined
    });
    setPending(false);

    if (result._tag === 'Error') {
      toast.error(result.message);
      return;
    }

    toast.success('Comment added');
    setComment('');
    setMentionedContactIds([]);
    setShowAddComment(false);
  };

  const startEditing = (item: TimelineItem) => {
    setEditingId(item.id);
    setEditDescription(item.description);
    setEditDate(item.createdAt);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditDescription('');
    setEditDate(undefined);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !editDescription.trim() || !editDate) return;

    setPending(true);
    const result = await updateLogItemAction({
      logItemId: editingId,
      description: editDescription.trim(),
      createdAt: editDate.toISOString()
    });
    setPending(false);

    if (result._tag === 'Error') {
      toast.error(result.message);
      return;
    }

    toast.success('Updated');
    cancelEditing();
  };

  const handleDelete = async (logItemId: string) => {
    if (!confirm('Delete this item?')) return;

    setPending(true);
    const result = await deleteLogItemAction({ logItemId });
    setPending(false);

    if (result._tag === 'Error') {
      toast.error(result.message);
      return;
    }

    toast.success('Deleted');
  };

  const canEdit = (item: TimelineItem) => item.createdBy?.id === currentUserId;

  const displaySubtitle =
    subtitle ??
    `${filteredItems.length} event${filteredItems.length !== 1 ? 's' : ''}${filter !== 'ALL' ? ` (${getTypeLabel(filter)})` : ''}`;

  return (
    <div className="border rounded-lg bg-card">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground">{displaySubtitle}</p>
          </div>
          {allowAddComment && projectId && (
            <Button size="sm" variant="outline" onClick={() => setShowAddComment(!showAddComment)}>
              {showAddComment ? 'Cancel' : 'Add Comment'}
            </Button>
          )}
        </div>

        {showAddComment && projectId && (
          <form onSubmit={handleAddComment} className="mt-4 space-y-2">
            <MentionInput
              value={comment}
              onChange={setComment}
              onMentionsChange={handleMentionsChange}
              suggestions={contactSuggestions}
              placeholder="Add a note or comment... Use @ to mention contacts"
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
            ? 'No activity yet.'
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
                  <DateTimePicker value={editDate} onChange={setEditDate} />
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
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-sm min-w-0">
                      {showProjectName && item.project && (
                        <>
                          <Link
                            href={`/projects/${item.projectId}`}
                            className="font-medium hover:underline truncate"
                          >
                            {item.project.name}
                          </Link>
                          <span className="text-muted-foreground/50">&middot;</span>
                        </>
                      )}
                      <span className={showProjectName ? 'text-muted-foreground' : 'font-medium'}>
                        {getTypeLabel(item.type)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {item.createdBy && `${item.createdBy.name} · `}
                        {formatRelativeTime(item.createdAt)}
                      </span>
                      {canEdit(item) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger className="p-1 -m-1 text-muted-foreground hover:text-foreground rounded">
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
                              <circle cx="12" cy="12" r="1" />
                              <circle cx="12" cy="5" r="1" />
                              <circle cx="12" cy="19" r="1" />
                            </svg>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => startEditing(item)}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => handleDelete(item.id)}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                  <p
                    className={`text-sm text-muted-foreground mt-1 whitespace-pre-wrap ${showProjectName ? 'line-clamp-2' : ''}`}
                  >
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
