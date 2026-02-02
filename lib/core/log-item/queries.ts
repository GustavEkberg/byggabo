import { Effect } from 'effect';
import { getSessionWithProperty } from '@/lib/services/auth/get-session';
import { Db } from '@/lib/services/db/live-layer';
import * as schema from '@/lib/services/db/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { NotFoundError } from '@/lib/core/errors';

/** Mention in a log item */
export type LogItemMentionInfo = {
  contactId: string;
  contactName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  contactCompany: string | null;
};

/** Attachment in a log item */
export type LogItemAttachmentInfo = {
  id: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
};

/** Log item with creator info */
export type LogItemWithUser = {
  id: string;
  projectId: string;
  type: 'COST_ITEM' | 'QUOTATION' | 'INVOICE' | 'COMMENT';
  referenceId: string | null;
  description: string;
  amount: string | null;
  createdAt: Date;
  createdBy: { id: string; name: string } | null;
  mentions: LogItemMentionInfo[];
  attachments: LogItemAttachmentInfo[];
};

/** Log item with project and creator info (for dashboard) */
export type LogItemWithProjectAndUser = LogItemWithUser & {
  project: { id: string; name: string };
};

/**
 * Get all log items for a project (timeline) with user info.
 * Verifies project belongs to user's property.
 */
export const getLogItems = (projectId: string) =>
  Effect.gen(function* () {
    const { propertyId } = yield* getSessionWithProperty();
    const db = yield* Db;

    // Verify project belongs to property
    const [project] = yield* db
      .select({ id: schema.project.id })
      .from(schema.project)
      .where(and(eq(schema.project.id, projectId), eq(schema.project.propertyId, propertyId)))
      .limit(1);

    if (!project) {
      return yield* new NotFoundError({
        message: 'Project not found',
        entity: 'project',
        id: projectId
      });
    }

    const rows = yield* db
      .select({
        id: schema.logItem.id,
        projectId: schema.logItem.projectId,
        type: schema.logItem.type,
        referenceId: schema.logItem.referenceId,
        description: schema.logItem.description,
        amount: schema.logItem.amount,
        createdAt: schema.logItem.createdAt,
        createdById: schema.logItem.createdById,
        userName: schema.user.name
      })
      .from(schema.logItem)
      .leftJoin(schema.user, eq(schema.logItem.createdById, schema.user.id))
      .where(eq(schema.logItem.projectId, projectId))
      .orderBy(desc(schema.logItem.createdAt));

    // Fetch mentions for all log items
    const logItemIds = rows.map(r => r.id);
    const mentionRows =
      logItemIds.length > 0
        ? yield* db
            .select({
              logItemId: schema.logItemMention.logItemId,
              contactId: schema.logItemMention.contactId,
              contactName: schema.contact.name,
              contactEmail: schema.contact.email,
              contactPhone: schema.contact.phone,
              contactCompany: schema.contact.company
            })
            .from(schema.logItemMention)
            .innerJoin(schema.contact, eq(schema.logItemMention.contactId, schema.contact.id))
            .where(inArray(schema.logItemMention.logItemId, logItemIds))
        : [];

    // Group mentions by log item
    const mentionsByLogItem = new Map<string, LogItemMentionInfo[]>();
    for (const m of mentionRows) {
      const existing = mentionsByLogItem.get(m.logItemId) ?? [];
      existing.push({
        contactId: m.contactId,
        contactName: m.contactName,
        contactEmail: m.contactEmail,
        contactPhone: m.contactPhone,
        contactCompany: m.contactCompany
      });
      mentionsByLogItem.set(m.logItemId, existing);
    }

    // Fetch attachments for all log items
    const attachmentRows =
      logItemIds.length > 0
        ? yield* db
            .select({
              id: schema.logItemAttachment.id,
              logItemId: schema.logItemAttachment.logItemId,
              fileUrl: schema.logItemAttachment.fileUrl,
              fileName: schema.logItemAttachment.fileName,
              fileType: schema.logItemAttachment.fileType
            })
            .from(schema.logItemAttachment)
            .where(inArray(schema.logItemAttachment.logItemId, logItemIds))
        : [];

    // Group attachments by log item
    const attachmentsByLogItem = new Map<string, LogItemAttachmentInfo[]>();
    for (const a of attachmentRows) {
      const existing = attachmentsByLogItem.get(a.logItemId) ?? [];
      existing.push({
        id: a.id,
        fileUrl: a.fileUrl,
        fileName: a.fileName,
        fileType: a.fileType
      });
      attachmentsByLogItem.set(a.logItemId, existing);
    }

    const logItems: LogItemWithUser[] = rows.map(row => ({
      id: row.id,
      projectId: row.projectId,
      type: row.type,
      referenceId: row.referenceId,
      description: row.description,
      amount: row.amount,
      createdAt: row.createdAt,
      createdBy: row.createdById ? { id: row.createdById, name: row.userName ?? 'Unknown' } : null,
      mentions: mentionsByLogItem.get(row.id) ?? [],
      attachments: attachmentsByLogItem.get(row.id) ?? []
    }));

    return logItems;
  }).pipe(Effect.withSpan('LogItem.getAll'));

/**
 * Get recent log items across all projects for the property (dashboard timeline).
 */
export const getRecentLogItems = (limit = 20) =>
  Effect.gen(function* () {
    const { propertyId } = yield* getSessionWithProperty();
    const db = yield* Db;

    // Get all project IDs for the property
    const projects = yield* db
      .select({ id: schema.project.id, name: schema.project.name })
      .from(schema.project)
      .where(and(eq(schema.project.propertyId, propertyId), eq(schema.project.status, 'ACTIVE')));

    if (projects.length === 0) {
      const empty: LogItemWithProjectAndUser[] = [];
      return empty;
    }

    const projectIds = projects.map(p => p.id);
    const projectMap = new Map(projects.map(p => [p.id, p]));

    const rows = yield* db
      .select({
        id: schema.logItem.id,
        projectId: schema.logItem.projectId,
        type: schema.logItem.type,
        referenceId: schema.logItem.referenceId,
        description: schema.logItem.description,
        amount: schema.logItem.amount,
        createdAt: schema.logItem.createdAt,
        createdById: schema.logItem.createdById,
        userName: schema.user.name
      })
      .from(schema.logItem)
      .leftJoin(schema.user, eq(schema.logItem.createdById, schema.user.id))
      .where(inArray(schema.logItem.projectId, projectIds))
      .orderBy(desc(schema.logItem.createdAt))
      .limit(limit);

    // Fetch mentions for all log items
    const logItemIds = rows.map(r => r.id);
    const mentionRows =
      logItemIds.length > 0
        ? yield* db
            .select({
              logItemId: schema.logItemMention.logItemId,
              contactId: schema.logItemMention.contactId,
              contactName: schema.contact.name,
              contactEmail: schema.contact.email,
              contactPhone: schema.contact.phone,
              contactCompany: schema.contact.company
            })
            .from(schema.logItemMention)
            .innerJoin(schema.contact, eq(schema.logItemMention.contactId, schema.contact.id))
            .where(inArray(schema.logItemMention.logItemId, logItemIds))
        : [];

    // Group mentions by log item
    const mentionsByLogItem = new Map<string, LogItemMentionInfo[]>();
    for (const m of mentionRows) {
      const existing = mentionsByLogItem.get(m.logItemId) ?? [];
      existing.push({
        contactId: m.contactId,
        contactName: m.contactName,
        contactEmail: m.contactEmail,
        contactPhone: m.contactPhone,
        contactCompany: m.contactCompany
      });
      mentionsByLogItem.set(m.logItemId, existing);
    }

    // Fetch attachments for all log items
    const attachmentRows =
      logItemIds.length > 0
        ? yield* db
            .select({
              id: schema.logItemAttachment.id,
              logItemId: schema.logItemAttachment.logItemId,
              fileUrl: schema.logItemAttachment.fileUrl,
              fileName: schema.logItemAttachment.fileName,
              fileType: schema.logItemAttachment.fileType
            })
            .from(schema.logItemAttachment)
            .where(inArray(schema.logItemAttachment.logItemId, logItemIds))
        : [];

    // Group attachments by log item
    const attachmentsByLogItem = new Map<string, LogItemAttachmentInfo[]>();
    for (const a of attachmentRows) {
      const existing = attachmentsByLogItem.get(a.logItemId) ?? [];
      existing.push({
        id: a.id,
        fileUrl: a.fileUrl,
        fileName: a.fileName,
        fileType: a.fileType
      });
      attachmentsByLogItem.set(a.logItemId, existing);
    }

    const logItems: LogItemWithProjectAndUser[] = rows.map(row => {
      const project = projectMap.get(row.projectId);
      return {
        id: row.id,
        projectId: row.projectId,
        type: row.type,
        referenceId: row.referenceId,
        description: row.description,
        amount: row.amount,
        createdAt: row.createdAt,
        createdBy: row.createdById
          ? { id: row.createdById, name: row.userName ?? 'Unknown' }
          : null,
        mentions: mentionsByLogItem.get(row.id) ?? [],
        attachments: attachmentsByLogItem.get(row.id) ?? [],
        project: { id: row.projectId, name: project?.name ?? 'Unknown' }
      };
    });

    return logItems;
  }).pipe(Effect.withSpan('LogItem.getRecent'));
