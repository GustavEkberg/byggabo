CREATE TABLE "account" (
	"id" text PRIMARY KEY,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp,
	"refreshTokenExpiresAt" timestamp,
	"scope" text,
	"password" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact" (
	"id" text PRIMARY KEY,
	"userId" text NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"company" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "costItem" (
	"id" text PRIMARY KEY,
	"projectId" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"amount" numeric(10,2) NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"receiptFileUrl" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice" (
	"id" text PRIMARY KEY,
	"projectId" text NOT NULL,
	"quotationId" text,
	"contactId" text,
	"description" text NOT NULL,
	"amount" numeric(10,2) NOT NULL,
	"invoiceDate" timestamp DEFAULT now() NOT NULL,
	"isPaid" boolean DEFAULT false NOT NULL,
	"fileUrl" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "logItem" (
	"id" text PRIMARY KEY,
	"projectId" text NOT NULL,
	"type" text NOT NULL,
	"referenceId" text,
	"description" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"userId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotation" (
	"id" text PRIMARY KEY,
	"projectId" text NOT NULL,
	"contactId" text,
	"description" text NOT NULL,
	"amount" numeric(10,2) NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"receivedDate" timestamp DEFAULT now() NOT NULL,
	"fileUrl" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY,
	"expiresAt" timestamp NOT NULL,
	"token" text NOT NULL UNIQUE,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text DEFAULT 'USER' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "contact" ADD CONSTRAINT "contact_userId_user_id_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "costItem" ADD CONSTRAINT "costItem_projectId_project_id_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_projectId_project_id_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_quotationId_quotation_id_fkey" FOREIGN KEY ("quotationId") REFERENCES "quotation"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_contactId_contact_id_fkey" FOREIGN KEY ("contactId") REFERENCES "contact"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "logItem" ADD CONSTRAINT "logItem_projectId_project_id_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_userId_user_id_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "quotation" ADD CONSTRAINT "quotation_projectId_project_id_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "quotation" ADD CONSTRAINT "quotation_contactId_contact_id_fkey" FOREIGN KEY ("contactId") REFERENCES "contact"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE;