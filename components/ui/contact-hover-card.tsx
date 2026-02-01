'use client';

import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';

type ContactInfo = {
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
};

type Props = {
  contact: ContactInfo;
  children: React.ReactNode;
};

export function ContactHoverCard({ contact, children }: Props) {
  return (
    <HoverCard>
      <HoverCardTrigger className="text-foreground underline decoration-dotted cursor-pointer">
        {children}
      </HoverCardTrigger>
      <HoverCardContent>
        <div className="space-y-1">
          <p className="font-medium">{contact.name}</p>
          {contact.company && <p className="text-sm text-muted-foreground">{contact.company}</p>}
          {contact.email && (
            <p className="text-sm">
              <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
                {contact.email}
              </a>
            </p>
          )}
          {contact.phone && (
            <p className="text-sm">
              <a href={`tel:${contact.phone}`} className="text-primary hover:underline">
                {contact.phone}
              </a>
            </p>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
