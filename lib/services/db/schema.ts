import { pgTable, text, boolean, decimal } from 'drizzle-orm/pg-core';
import { timestamp as pgTimestamp } from 'drizzle-orm/pg-core';

// Use timestamptz (with timezone) for all timestamps
const timestamp = (name: string) => pgTimestamp(name, { withTimezone: true });
import { defineRelations } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

////////////////////////////////////////////////////////////////////////
// PROPERTY - Multi-user household/property grouping
////////////////////////////////////////////////////////////////////////
export const property = pgTable('property', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text('name').notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date())
});

export type Property = typeof property.$inferSelect;
export type InsertProperty = typeof property.$inferInsert;

////////////////////////////////////////////////////////////////////////
// PROPERTY SECTION - Categories for projects (kitchen, garden, etc.)
////////////////////////////////////////////////////////////////////////
export const propertySection = pgTable('propertySection', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  propertyId: text('propertyId')
    .notNull()
    .references(() => property.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  icon: text('icon').notNull(), // lucide icon name e.g. 'cooking-pot'
  color: text('color').notNull(), // hex color e.g. #3b82f6
  sortOrder: text('sortOrder').notNull().default('0'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date())
});

export type PropertySection = typeof propertySection.$inferSelect;
export type InsertPropertySection = typeof propertySection.$inferInsert;

////////////////////////////////////////////////////////////////////////
// CONTACT CATEGORY - Categories for contacts (carpenter, plumber, etc.)
////////////////////////////////////////////////////////////////////////
export const contactCategory = pgTable('contactCategory', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  propertyId: text('propertyId')
    .notNull()
    .references(() => property.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  icon: text('icon').notNull(), // lucide icon name e.g. 'hammer'
  color: text('color').notNull(), // hex color e.g. #3b82f6
  sortOrder: text('sortOrder').notNull().default('0'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date())
});

export type ContactCategory = typeof contactCategory.$inferSelect;
export type InsertContactCategory = typeof contactCategory.$inferInsert;

////////////////////////////////////////////////////////////////////////
// AUTH - Better-auth expects singular model names
////////////////////////////////////////////////////////////////////////
export const user = pgTable('user', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),

  // Better Auth
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),

  role: text('role', {
    enum: ['USER', 'ADMIN']
  })
    .notNull()
    .default('USER'),

  // Property membership
  propertyId: text('propertyId').references(() => property.id, { onDelete: 'set null' }),

  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date())
});
export type User = typeof user.$inferSelect;
export type InsertUser = typeof user.$inferInsert;

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' })
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date())
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date())
});

////////////////////////////////////////////////////////////////////////
// BYGGABO DOMAIN - Project management tables
////////////////////////////////////////////////////////////////////////

export const project = pgTable('project', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text('name').notNull(),
  description: text('description'),
  status: text('status', { enum: ['ACTIVE', 'ARCHIVED'] })
    .notNull()
    .default('ACTIVE'),
  propertyId: text('propertyId')
    .notNull()
    .references(() => property.id, { onDelete: 'cascade' }),
  sectionId: text('sectionId').references(() => propertySection.id, { onDelete: 'set null' }),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date())
});

export type Project = typeof project.$inferSelect;
export type InsertProject = typeof project.$inferInsert;

export const contact = pgTable('contact', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  propertyId: text('propertyId')
    .notNull()
    .references(() => property.id, { onDelete: 'cascade' }),
  categoryId: text('categoryId').references(() => contactCategory.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  description: text('description'),
  website: text('website'),
  email: text('email'),
  phone: text('phone'),
  company: text('company'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date())
});

export type Contact = typeof contact.$inferSelect;
export type InsertContact = typeof contact.$inferInsert;

export const costItem = pgTable('costItem', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  projectId: text('projectId')
    .notNull()
    .references(() => project.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  date: timestamp('date').notNull().defaultNow(),
  receiptFileUrl: text('receiptFileUrl'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date())
});

export type CostItem = typeof costItem.$inferSelect;
export type InsertCostItem = typeof costItem.$inferInsert;

export const quotation = pgTable('quotation', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  projectId: text('projectId')
    .notNull()
    .references(() => project.id, { onDelete: 'cascade' }),
  contactId: text('contactId').references(() => contact.id, { onDelete: 'set null' }),
  description: text('description').notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  status: text('status', { enum: ['PENDING', 'ACCEPTED', 'REJECTED'] })
    .notNull()
    .default('PENDING'),
  receivedDate: timestamp('receivedDate').notNull().defaultNow(),
  fileUrl: text('fileUrl'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date())
});

export type Quotation = typeof quotation.$inferSelect;
export type InsertQuotation = typeof quotation.$inferInsert;

export const invoice = pgTable('invoice', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  projectId: text('projectId')
    .notNull()
    .references(() => project.id, { onDelete: 'cascade' }),
  quotationId: text('quotationId').references(() => quotation.id, { onDelete: 'set null' }),
  contactId: text('contactId').references(() => contact.id, { onDelete: 'set null' }),
  description: text('description').notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  invoiceDate: timestamp('invoiceDate').notNull().defaultNow(),
  isPaid: boolean('isPaid').notNull().default(false),
  fileUrl: text('fileUrl'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date())
});

export type Invoice = typeof invoice.$inferSelect;
export type InsertInvoice = typeof invoice.$inferInsert;

export const logItem = pgTable('logItem', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  projectId: text('projectId')
    .notNull()
    .references(() => project.id, { onDelete: 'cascade' }),
  createdById: text('createdById').references(() => user.id, { onDelete: 'set null' }),
  type: text('type', {
    enum: ['COST_ITEM', 'QUOTATION', 'INVOICE', 'COMMENT']
  }).notNull(),
  referenceId: text('referenceId'),
  description: text('description').notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow()
});

export type LogItem = typeof logItem.$inferSelect;
export type InsertLogItem = typeof logItem.$inferInsert;

////////////////////////////////////////////////////////////////////////
// LOG ITEM MENTION - Track @mentions of contacts in comments
////////////////////////////////////////////////////////////////////////
export const logItemMention = pgTable('logItemMention', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  logItemId: text('logItemId')
    .notNull()
    .references(() => logItem.id, { onDelete: 'cascade' }),
  contactId: text('contactId')
    .notNull()
    .references(() => contact.id, { onDelete: 'cascade' })
});

export type LogItemMention = typeof logItemMention.$inferSelect;
export type InsertLogItemMention = typeof logItemMention.$inferInsert;

////////////////////////////////////////////////////////////////////////
// PROJECT CONTACT - Link contacts to projects
////////////////////////////////////////////////////////////////////////
export const projectContact = pgTable('projectContact', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  projectId: text('projectId')
    .notNull()
    .references(() => project.id, { onDelete: 'cascade' }),
  contactId: text('contactId')
    .notNull()
    .references(() => contact.id, { onDelete: 'cascade' }),
  createdAt: timestamp('createdAt').notNull().defaultNow()
});

export type ProjectContact = typeof projectContact.$inferSelect;
export type InsertProjectContact = typeof projectContact.$inferInsert;

////////////////////////////////////////////////////////////////////////
// PROPERTY INVITE - Invite new users to join a property
////////////////////////////////////////////////////////////////////////
export const propertyInvite = pgTable('propertyInvite', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  propertyId: text('propertyId')
    .notNull()
    .references(() => property.id, { onDelete: 'cascade' }),
  invitedById: text('invitedById')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expiresAt').notNull(),
  acceptedAt: timestamp('acceptedAt'),
  createdAt: timestamp('createdAt').notNull().defaultNow()
});

export type PropertyInvite = typeof propertyInvite.$inferSelect;
export type InsertPropertyInvite = typeof propertyInvite.$inferInsert;

////////////////////////////////////////////////////////////////////////
// RELATIONS - Drizzle v1.0 RQB v2 API
////////////////////////////////////////////////////////////////////////
export const relations = defineRelations(
  {
    property,
    propertySection,
    contactCategory,
    propertyInvite,
    user,
    session,
    account,
    verification,
    project,
    contact,
    projectContact,
    costItem,
    quotation,
    invoice,
    logItem
  },
  r => ({
    property: {
      members: r.many.user({
        from: r.property.id,
        to: r.user.propertyId
      }),
      sections: r.many.propertySection({
        from: r.property.id,
        to: r.propertySection.propertyId
      }),
      projects: r.many.project({
        from: r.property.id,
        to: r.project.propertyId
      }),
      contacts: r.many.contact({
        from: r.property.id,
        to: r.contact.propertyId
      }),
      invites: r.many.propertyInvite({
        from: r.property.id,
        to: r.propertyInvite.propertyId
      }),
      contactCategories: r.many.contactCategory({
        from: r.property.id,
        to: r.contactCategory.propertyId
      })
    },
    propertySection: {
      property: r.one.property({
        from: r.propertySection.propertyId,
        to: r.property.id,
        optional: false
      }),
      projects: r.many.project({
        from: r.propertySection.id,
        to: r.project.sectionId
      })
    },
    contactCategory: {
      property: r.one.property({
        from: r.contactCategory.propertyId,
        to: r.property.id,
        optional: false
      }),
      contacts: r.many.contact({
        from: r.contactCategory.id,
        to: r.contact.categoryId
      })
    },
    propertyInvite: {
      property: r.one.property({
        from: r.propertyInvite.propertyId,
        to: r.property.id,
        optional: false
      }),
      invitedBy: r.one.user({
        from: r.propertyInvite.invitedById,
        to: r.user.id,
        optional: false
      })
    },
    user: {
      property: r.one.property({
        from: r.user.propertyId,
        to: r.property.id,
        optional: true
      })
    },
    project: {
      property: r.one.property({
        from: r.project.propertyId,
        to: r.property.id,
        optional: false
      }),
      section: r.one.propertySection({
        from: r.project.sectionId,
        to: r.propertySection.id,
        optional: true
      }),
      costItems: r.many.costItem({
        from: r.project.id,
        to: r.costItem.projectId
      }),
      quotations: r.many.quotation({
        from: r.project.id,
        to: r.quotation.projectId
      }),
      invoices: r.many.invoice({
        from: r.project.id,
        to: r.invoice.projectId
      }),
      logItems: r.many.logItem({
        from: r.project.id,
        to: r.logItem.projectId
      }),
      projectContacts: r.many.projectContact({
        from: r.project.id,
        to: r.projectContact.projectId
      })
    },
    contact: {
      property: r.one.property({
        from: r.contact.propertyId,
        to: r.property.id,
        optional: false
      }),
      category: r.one.contactCategory({
        from: r.contact.categoryId,
        to: r.contactCategory.id,
        optional: true
      }),
      quotations: r.many.quotation({
        from: r.contact.id,
        to: r.quotation.contactId
      }),
      invoices: r.many.invoice({
        from: r.contact.id,
        to: r.invoice.contactId
      }),
      projectContacts: r.many.projectContact({
        from: r.contact.id,
        to: r.projectContact.contactId
      })
    },
    projectContact: {
      project: r.one.project({
        from: r.projectContact.projectId,
        to: r.project.id,
        optional: false
      }),
      contact: r.one.contact({
        from: r.projectContact.contactId,
        to: r.contact.id,
        optional: false
      })
    },
    costItem: {
      project: r.one.project({
        from: r.costItem.projectId,
        to: r.project.id,
        optional: false
      })
    },
    quotation: {
      project: r.one.project({
        from: r.quotation.projectId,
        to: r.project.id,
        optional: false
      }),
      contact: r.one.contact({
        from: r.quotation.contactId,
        to: r.contact.id,
        optional: true
      }),
      invoice: r.one.invoice({
        from: r.quotation.id,
        to: r.invoice.quotationId,
        optional: true
      })
    },
    invoice: {
      project: r.one.project({
        from: r.invoice.projectId,
        to: r.project.id,
        optional: false
      }),
      quotation: r.one.quotation({
        from: r.invoice.quotationId,
        to: r.quotation.id,
        optional: true
      }),
      contact: r.one.contact({
        from: r.invoice.contactId,
        to: r.contact.id,
        optional: true
      })
    },
    logItem: {
      project: r.one.project({
        from: r.logItem.projectId,
        to: r.project.id,
        optional: false
      })
    }
  })
);
