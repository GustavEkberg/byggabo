'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MenuIcon, LogOutIcon, FolderIcon, UsersIcon, SettingsIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { authClient } from '@/lib/services/auth/auth-client';

export function Header() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/projects' ? pathname.startsWith('/projects') : pathname.startsWith(href);

  const handleLogout = () => {
    authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = '/';
        }
      }
    });
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/projects" className="text-lg font-semibold tracking-tight">
          Byggabo
        </Link>

        <div className="flex items-center gap-4">
          {/* Desktop nav */}
          <nav className="hidden items-center gap-6 sm:flex">
            <Link
              href="/projects"
              className={`text-sm transition-colors ${
                isActive('/projects')
                  ? 'text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Projects
            </Link>
            <Link
              href="/contacts"
              className={`text-sm transition-colors ${
                isActive('/contacts')
                  ? 'text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Contacts
            </Link>
          </nav>

          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="Menu" />}>
              <MenuIcon className="size-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {/* Mobile only */}
              <DropdownMenuItem render={<Link href="/projects" />} className="sm:hidden">
                <FolderIcon />
                Projects
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/contacts" />} className="sm:hidden">
                <UsersIcon />
                Contacts
              </DropdownMenuItem>
              <DropdownMenuSeparator className="sm:hidden" />
              <DropdownMenuItem render={<Link href="/settings" />}>
                <SettingsIcon />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} variant="destructive">
                <LogOutIcon />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
