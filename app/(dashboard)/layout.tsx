import Link from 'next/link';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <nav className="container mx-auto px-4 py-3 flex items-center gap-6">
          <Link href="/projects" className="font-semibold text-lg">
            Byggabo
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/projects" className="text-muted-foreground hover:text-foreground">
              Projects
            </Link>
            <Link href="/contacts" className="text-muted-foreground hover:text-foreground">
              Contacts
            </Link>
          </div>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
