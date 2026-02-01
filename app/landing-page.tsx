'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import {
  FolderKanban,
  ClipboardList,
  Wallet,
  Users,
  MenuIcon,
  ChevronRight,
  FileText,
  Receipt,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogCloseButton
} from '@/components/ui/dialog';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { sendRequestAccessAction } from '@/lib/core/contact/send-request-access-action';

// Mock project data for demo (single featured project with financial details)
type MockProject = {
  name: string;
  section: string;
  sectionColor: string;
  description: string;
  quoteRangeMin: number;
  quoteRangeMax: number;
  pendingQuotes: number;
  costItemsTotal: number;
  invoicesTotal: number;
  quotationCount: number;
  costItemCount: number;
  invoiceCount: number;
  lastActivity: string;
};

const MOCK_PROJECT_SE: MockProject = {
  name: 'Köksrenovering',
  section: 'Kök',
  sectionColor: '#f97316',
  description: 'Helrenovering av köket med nya vitvaror',
  quoteRangeMin: 125000,
  quoteRangeMax: 175000,
  pendingQuotes: 3,
  costItemsTotal: 67500,
  invoicesTotal: 22500,
  quotationCount: 5,
  costItemCount: 8,
  invoiceCount: 2,
  lastActivity: '2 tim sedan'
};

const MOCK_PROJECT_EU: MockProject = {
  name: 'Kitchen Remodel',
  section: 'Kitchen',
  sectionColor: '#f97316',
  description: 'Full kitchen renovation with new appliances',
  quoteRangeMin: 12500,
  quoteRangeMax: 17500,
  pendingQuotes: 3,
  costItemsTotal: 6750,
  invoicesTotal: 2250,
  quotationCount: 5,
  costItemCount: 8,
  invoiceCount: 2,
  lastActivity: '2h ago'
};

// Mock contact data for hover cards
type MockContact = {
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  website?: string;
};

const MOCK_CONTACTS_SE: Record<string, MockContact> = {
  'Johan Snickare': {
    name: 'Johan Snickare',
    company: 'Snickeri AB',
    email: 'johan@snickeriab.se',
    phone: '070-123 45 67',
    website: 'snickeriab.se'
  },
  'Peter Trädgård': {
    name: 'Peter Trädgård',
    company: 'Trädgård & Design',
    email: 'peter@tradgard-design.se',
    phone: '070-234 56 78'
  },
  'Maria Rör': {
    name: 'Maria Rör',
    company: 'Rörjouren',
    email: 'maria@rorjouren.se',
    phone: '070-345 67 89',
    website: 'rorjouren.se'
  }
};

const MOCK_CONTACTS_EU: Record<string, MockContact> = {
  'Mike Carpenter': {
    name: 'Mike Carpenter',
    company: 'Cabinet Co.',
    email: 'mike@cabinetco.com',
    phone: '+44 7700 900123',
    website: 'cabinetco.com'
  },
  'Tom Landscaper': {
    name: 'Tom Landscaper',
    company: 'Landscape Pro',
    email: 'tom@landscapepro.com',
    phone: '+44 7700 900456'
  },
  'Lisa Plumber': {
    name: 'Lisa Plumber',
    company: 'PlumbRight',
    email: 'lisa@plumbright.com',
    phone: '+44 7700 900789',
    website: 'plumbright.com'
  }
};

// Mock event log data
type MockEvent = {
  id: string;
  type: 'quotation' | 'expense' | 'comment' | 'invoice';
  project: string;
  description: string;
  amount?: number;
  date: string;
  user: string;
  mentionedContact?: string;
};

const MOCK_EVENTS_SE: MockEvent[] = [
  {
    id: '1',
    type: 'quotation',
    project: 'Köksrenovering',
    description: 'Offert från @Johan Snickare',
    amount: 45000,
    date: '2026-01-28',
    user: 'Erik',
    mentionedContact: 'Johan Snickare'
  },
  {
    id: '2',
    type: 'expense',
    project: 'Badrumsrenovering',
    description: 'Kakel och klinker',
    amount: 12500,
    date: '2026-01-27',
    user: 'Anna'
  },
  {
    id: '3',
    type: 'comment',
    project: 'Köksrenovering',
    description: 'Pratade med @Johan Snickare, montering påbörjas imorgon',
    date: '2026-01-27',
    user: 'Erik',
    mentionedContact: 'Johan Snickare'
  },
  {
    id: '4',
    type: 'invoice',
    project: 'Altan & uteplats',
    description: 'Faktura från @Peter Trädgård',
    amount: 8500,
    date: '2026-01-26',
    user: 'Anna',
    mentionedContact: 'Peter Trädgård'
  },
  {
    id: '5',
    type: 'quotation',
    project: 'Badrumsrenovering',
    description: 'Offert från @Maria Rör',
    amount: 28000,
    date: '2026-01-25',
    user: 'Erik',
    mentionedContact: 'Maria Rör'
  },
  {
    id: '6',
    type: 'expense',
    project: 'Köksrenovering',
    description: 'Vitvaror - kyl och frys',
    amount: 18900,
    date: '2026-01-24',
    user: 'Anna'
  },
  {
    id: '7',
    type: 'comment',
    project: 'Altan & uteplats',
    description: 'Väntar på bra väder enligt @Peter Trädgård',
    date: '2026-01-24',
    user: 'Erik',
    mentionedContact: 'Peter Trädgård'
  },
  {
    id: '8',
    type: 'expense',
    project: 'Badrumsrenovering',
    description: 'Duschvägg och armatur',
    amount: 7200,
    date: '2026-01-23',
    user: 'Anna'
  },
  {
    id: '9',
    type: 'quotation',
    project: 'Köksrenovering',
    description: 'Offert från Elektriker Direkt',
    amount: 15000,
    date: '2026-01-22',
    user: 'Erik'
  },
  {
    id: '10',
    type: 'invoice',
    project: 'Köksrenovering',
    description: 'Delbetalning till snickare',
    amount: 22500,
    date: '2026-01-21',
    user: 'Anna'
  },
  {
    id: '11',
    type: 'comment',
    project: 'Badrumsrenovering',
    description: '@Maria Rör slutför installationen på fredag',
    date: '2026-01-20',
    user: 'Erik',
    mentionedContact: 'Maria Rör'
  },
  {
    id: '12',
    type: 'expense',
    project: 'Altan & uteplats',
    description: 'Trädäck och skruv',
    amount: 4200,
    date: '2026-01-19',
    user: 'Anna'
  }
];

const MOCK_EVENTS_EU: MockEvent[] = [
  {
    id: '1',
    type: 'quotation',
    project: 'Kitchen Remodel',
    description: 'Quote from @Mike Carpenter',
    amount: 4500,
    date: '2026-01-28',
    user: 'James',
    mentionedContact: 'Mike Carpenter'
  },
  {
    id: '2',
    type: 'expense',
    project: 'Bathroom Update',
    description: 'Tiles and grout',
    amount: 1250,
    date: '2026-01-27',
    user: 'Sarah'
  },
  {
    id: '3',
    type: 'comment',
    project: 'Kitchen Remodel',
    description: 'Spoke with @Mike Carpenter, installation starts tomorrow',
    date: '2026-01-27',
    user: 'James',
    mentionedContact: 'Mike Carpenter'
  },
  {
    id: '4',
    type: 'invoice',
    project: 'Garden & Patio',
    description: 'Invoice from @Tom Landscaper',
    amount: 850,
    date: '2026-01-26',
    user: 'Sarah',
    mentionedContact: 'Tom Landscaper'
  },
  {
    id: '5',
    type: 'quotation',
    project: 'Bathroom Update',
    description: 'Quote from @Lisa Plumber',
    amount: 2800,
    date: '2026-01-25',
    user: 'James',
    mentionedContact: 'Lisa Plumber'
  },
  {
    id: '6',
    type: 'expense',
    project: 'Kitchen Remodel',
    description: 'Appliances - fridge & freezer',
    amount: 1890,
    date: '2026-01-24',
    user: 'Sarah'
  },
  {
    id: '7',
    type: 'comment',
    project: 'Garden & Patio',
    description: 'Waiting for good weather per @Tom Landscaper',
    date: '2026-01-24',
    user: 'James',
    mentionedContact: 'Tom Landscaper'
  },
  {
    id: '8',
    type: 'expense',
    project: 'Bathroom Update',
    description: 'Shower screen and fixtures',
    amount: 720,
    date: '2026-01-23',
    user: 'Sarah'
  },
  {
    id: '9',
    type: 'quotation',
    project: 'Kitchen Remodel',
    description: 'Quote from ElectriFix',
    amount: 1500,
    date: '2026-01-22',
    user: 'James'
  },
  {
    id: '10',
    type: 'invoice',
    project: 'Kitchen Remodel',
    description: 'Partial payment to carpenter',
    amount: 2250,
    date: '2026-01-21',
    user: 'Sarah'
  },
  {
    id: '11',
    type: 'comment',
    project: 'Bathroom Update',
    description: '@Lisa Plumber finishing install on Friday',
    date: '2026-01-20',
    user: 'James',
    mentionedContact: 'Lisa Plumber'
  },
  {
    id: '12',
    type: 'expense',
    project: 'Garden & Patio',
    description: 'Decking and screws',
    amount: 420,
    date: '2026-01-19',
    user: 'Sarah'
  }
];

function getRandomSample<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function MentionBadge({ contact }: { contact: MockContact }) {
  return (
    <HoverCard>
      <HoverCardTrigger className="text-primary font-medium underline decoration-dotted cursor-pointer">
        @{contact.name}
      </HoverCardTrigger>
      <HoverCardContent side="top" align="start">
        <div className="space-y-1">
          <p className="font-medium">{contact.name}</p>
          {contact.company && <p className="text-sm text-muted-foreground">{contact.company}</p>}
          {contact.email && (
            <p className="text-sm">
              <span className="text-primary">{contact.email}</span>
            </p>
          )}
          {contact.phone && (
            <p className="text-sm">
              <span className="text-primary">{contact.phone}</span>
            </p>
          )}
          {contact.website && (
            <p className="text-sm">
              <span className="text-primary">{contact.website}</span>
            </p>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

function renderWithMention(
  text: string,
  contactName: string,
  contacts: Record<string, MockContact>
): React.ReactNode {
  const mentionText = `@${contactName}`;
  const index = text.indexOf(mentionText);
  if (index === -1) return text;

  const contact = contacts[contactName];
  if (!contact) return text;

  return (
    <>
      {text.slice(0, index)}
      <MentionBadge contact={contact} />
      {text.slice(index + mentionText.length)}
    </>
  );
}

const EVENT_TYPE_LABELS = {
  quotation: 'Quote',
  expense: 'Cost',
  comment: 'Comment',
  invoice: 'Invoice'
};

type AnimatedEventLogProps = {
  events: MockEvent[];
  contacts: Record<string, MockContact>;
  currency: 'SEK' | 'EUR';
};

function AnimatedEventLog({ events, contacts, currency }: AnimatedEventLogProps) {
  const [displayedEvents, setDisplayedEvents] = useState<Array<MockEvent & { isNew?: boolean }>>(
    () => getRandomSample(events, 7)
  );

  const addRandomEvent = useCallback(() => {
    const availableEvents = events.filter(e => !displayedEvents.some(d => d.id === e.id));

    if (availableEvents.length === 0) {
      setDisplayedEvents(getRandomSample(events, 7));
      return;
    }

    const randomIndex = Math.floor(Math.random() * availableEvents.length);
    const newEvent = { ...availableEvents[randomIndex], isNew: true };

    setDisplayedEvents(prev => {
      // New event always goes to top, push others down, keep max 7
      const updated = [newEvent, ...prev.slice(0, 6)];
      setTimeout(() => {
        setDisplayedEvents(current =>
          current.map(e => (e.id === newEvent.id ? { ...e, isNew: false } : e))
        );
      }, 600);
      return updated;
    });
  }, [events, displayedEvents]);

  useEffect(() => {
    const interval = setInterval(
      () => {
        addRandomEvent();
      },
      3000 + Math.random() * 2000
    );

    return () => clearInterval(interval);
  }, [addRandomEvent]);

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="p-4 border-b">
        <h3 className="font-semibold">Timeline</h3>
        <p className="text-sm text-muted-foreground">Recent activity</p>
      </div>
      <div className="divide-y">
        <AnimatePresence mode="popLayout" initial={false}>
          {displayedEvents.map(event => (
            <motion.div
              key={event.id}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                layout: { duration: 0.2 },
                opacity: { duration: 0.15 }
              }}
              className="flex gap-3 p-4"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                {event.type === 'quotation' && <FileText className="size-4" />}
                {event.type === 'expense' && <Receipt className="size-4" />}
                {event.type === 'comment' && <MessageSquare className="size-4" />}
                {event.type === 'invoice' && <Wallet className="size-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-sm min-w-0">
                    <span className="font-medium truncate">{event.project}</span>
                    <span className="text-muted-foreground/50">&middot;</span>
                    <span className="text-muted-foreground">{EVENT_TYPE_LABELS[event.type]}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {event.user} &middot; {event.date}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <p className="text-sm text-muted-foreground truncate overflow-visible">
                    {event.mentionedContact
                      ? renderWithMention(event.description, event.mentionedContact, contacts)
                      : event.description}
                  </p>
                  {event.amount !== undefined && (
                    <span
                      className={`flex-shrink-0 font-mono text-sm ${
                        event.type === 'expense'
                          ? 'text-red-600 dark:text-red-400'
                          : event.type === 'invoice'
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-blue-600 dark:text-blue-400'
                      }`}
                    >
                      {formatCurrency(
                        event.type === 'expense' ? -event.amount : event.amount,
                        currency
                      )}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

const FEATURES = [
  {
    icon: FolderKanban,
    title: 'Multiple Projects',
    description:
      'Track renovations across different areas of your home. Kitchen, bathroom, garden - all in one place.'
  },
  {
    icon: ClipboardList,
    title: 'Event Timeline',
    description:
      'Log everything that happens. Quotes received, work completed, expenses added - nothing gets lost.'
  },
  {
    icon: Wallet,
    title: 'Quotes & Expenses',
    description:
      'Compare quotes from contractors. Track every expense with receipts. Stay on budget.'
  },
  {
    icon: Users,
    title: 'Contacts',
    description:
      'Keep your contractors organized. Carpenters, plumbers, electricians - all their details in one place.'
  }
];

const STEPS = [
  {
    step: '1',
    title: 'Create a project',
    description:
      'Start a project for each renovation area - kitchen, bathroom, garden, or any part of your home.'
  },
  {
    step: '2',
    title: 'Add quotes & expenses',
    description:
      'Request quotes from contractors, compare them, and log all expenses as they happen.'
  },
  {
    step: '3',
    title: 'Track everything',
    description:
      'See your budget, spending history, and project timeline at a glance. Always know where you stand.'
  }
];

function formatCurrency(amount: number, currency: 'SEK' | 'EUR') {
  if (currency === 'SEK') {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      maximumFractionDigits: 0
    }).format(amount);
  }
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  }).format(amount);
}

function ContactModal() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [resultMessage, setResultMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) return;

    setStatus('loading');
    const result = await sendRequestAccessAction({ name, email, message });

    if (result.success) {
      setStatus('success');
      setResultMessage(result.message);
      setName('');
      setEmail('');
      setMessage('');
      setTimeout(() => {
        setOpen(false);
      }, 1500);
    } else {
      setStatus('error');
      setResultMessage(result.message);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setStatus('idle');
      setResultMessage('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button size="lg" />}>Request access</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request access</DialogTitle>
          <DialogDescription>
            Tell me a bit about yourself and your renovation project.
          </DialogDescription>
        </DialogHeader>

        {status === 'success' ? (
          <div className="py-4 text-center">
            <p className="text-green-600 dark:text-green-400">{resultMessage}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <label htmlFor="name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                disabled={status === 'loading'}
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={status === 'loading'}
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="message" className="text-sm font-medium">
                Message
              </label>
              <Textarea
                id="message"
                placeholder="Tell me about your renovation plans..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                required
                disabled={status === 'loading'}
                rows={4}
              />
            </div>
            {status === 'error' && (
              <p className="text-sm text-red-600 dark:text-red-400">{resultMessage}</p>
            )}
            <DialogFooter>
              <DialogCloseButton type="button">Cancel</DialogCloseButton>
              <Button type="submit" disabled={status === 'loading'}>
                {status === 'loading' ? 'Sending...' : 'Send message'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="inline-flex items-center text-lg font-semibold tracking-tight">
          <span
            className="-translate-y-0.5 mr-0.5 text-2xl leading-none"
            style={{ WebkitTextStroke: '1.5px currentColor' }}
          >
            &#8962;
          </span>
          Byggabo
        </Link>

        <div className="flex items-center gap-4">
          {/* Desktop nav */}
          <div className="hidden items-center gap-6 sm:flex">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground">
              Features
            </a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground">
              How it works
            </a>
            <Button variant="outline" size="sm" render={<Link href="/login" />}>
              Log in
            </Button>
          </div>

          {/* Mobile dropdown menu */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon" aria-label="Menu" />}
              className="sm:hidden"
            >
              <MenuIcon className="size-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem render={<a href="#features" />}>Features</DropdownMenuItem>
              <DropdownMenuItem render={<a href="#how-it-works" />}>How it works</DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/login" />}>Log in</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>
    </header>
  );
}

function DemoProjectCard({ project, currency }: { project: MockProject; currency: 'SEK' | 'EUR' }) {
  const actual = project.costItemsTotal + project.invoicesTotal;

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      {/* Project Header */}
      <div className="p-5 border-b">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div
                className="size-8 rounded-lg flex items-center justify-center text-white text-sm"
                style={{ backgroundColor: project.sectionColor }}
              >
                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-semibold">{project.name}</h2>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{project.section}</p>
            <p className="text-muted-foreground mt-1 text-sm">{project.description}</p>
          </div>
          <span className="text-sm text-muted-foreground shrink-0">{project.lastActivity}</span>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="p-5">
        <h3 className="text-lg font-medium mb-4">Budget Overview</h3>
        <div className="space-y-4">
          {/* Quote Range */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              Quote Range{' '}
              <span className="text-muted-foreground/60">({project.pendingQuotes} pending)</span>
            </span>
            <span className="font-medium">
              {formatCurrency(project.quoteRangeMin, currency)} –{' '}
              {formatCurrency(project.quoteRangeMax, currency)}
            </span>
          </div>

          {/* Actual */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Actual</span>
            <span className="font-medium">{formatCurrency(actual, currency)}</span>
          </div>

          {/* Breakdown */}
          <div className="border-t pt-4 mt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Cost items</span>
              <span>{formatCurrency(project.costItemsTotal, currency)}</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Invoices (paid)</span>
              <span>{formatCurrency(project.invoicesTotal, currency)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Activity counts */}
      <div className="px-5 py-3 border-t bg-muted/30 flex items-center gap-4 text-xs text-muted-foreground">
        <span>{project.quotationCount} quotations</span>
        <span>{project.costItemCount} cost items</span>
        <span>{project.invoiceCount} invoices</span>
      </div>
    </div>
  );
}

type LandingPageProps = {
  isSweden?: boolean;
};

export function LandingPage({ isSweden = false }: LandingPageProps) {
  const currency = isSweden ? 'SEK' : 'EUR';
  const project = isSweden ? MOCK_PROJECT_SE : MOCK_PROJECT_EU;
  const events = isSweden ? MOCK_EVENTS_SE : MOCK_EVENTS_EU;
  const contacts = isSweden ? MOCK_CONTACTS_SE : MOCK_CONTACTS_EU;

  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero */}
      <section className="relative flex min-h-[calc(100dvh-3.5rem)] items-center px-4 py-12">
        <div className="mx-auto w-full max-w-6xl">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
            {/* Left: Text */}
            <div className="flex flex-col justify-center text-center lg:text-left">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                Home renovation.
                <br />
                Under control.
              </h1>
              <p className="mt-4 text-base text-muted-foreground sm:text-lg lg:text-xl">
                Track your projects from first quote to final invoice.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <ContactModal />
                <Button variant="outline" size="lg" render={<a href="#features" />}>
                  Learn more
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>

            {/* Right: Demo project */}
            <div className="flex items-center justify-center">
              <div className="w-full max-w-md">
                <DemoProjectCard project={project} currency={currency} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Event Log Demo */}
      <section className="px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Keep track of everything
            </h2>
            <p className="mt-3 text-muted-foreground">
              Every quote, expense, and update logged automatically
            </p>
          </div>

          <AnimatedEventLog events={events} contacts={contacts} currency={currency} />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-4 py-16 sm:py-24 bg-muted/30">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Everything you need to manage renovations
            </h2>
            <p className="mt-3 text-muted-foreground">
              From first quote to final payment - track it all in one place.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(feature => (
              <div
                key={feature.title}
                className="rounded-xl border bg-card p-6 transition-shadow hover:shadow-md"
              >
                <feature.icon className="mb-4 size-8 text-primary" />
                <h3 className="mb-2 font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">How it works</h2>
            <p className="mt-3 text-muted-foreground">
              Get started in minutes. Stay organized for months.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {STEPS.map(step => (
              <div key={step.step} className="text-center">
                <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground text-lg font-semibold">
                  {step.step}
                </div>
                <h3 className="mb-2 font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Interested in Byggabo?
          </h2>
          <p className="mt-2 text-muted-foreground">Drop me a message and I&apos;ll let you in.</p>
          <div className="mt-4 flex justify-center">
            <ContactModal />
          </div>
          <p className="mt-6 text-xs text-muted-foreground/60">
            It&apos;s free. If you love it, buy me a fika later.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-4 py-8">
        <div className="mx-auto max-w-6xl text-center text-sm text-muted-foreground">Byggabo</div>
      </footer>
    </div>
  );
}
