import {
  Users,
  LayoutDashboard,
  Package,
  DollarSign,
  LogOut,
} from 'lucide-react';
import { DeskVaultIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { NavLink } from '@/components/nav-link';
import { DataProvider } from '@/context/data-context';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DataProvider>
      <div className="flex min-h-screen w-full">
        <aside className="hidden w-64 flex-col border-r bg-background p-4 sm:flex">
          <div className="flex items-center gap-3 mb-8">
              <DeskVaultIcon className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-headline font-semibold text-foreground">
                  DeskVault
              </h1>
          </div>
          <nav className="flex flex-col gap-2">
              <NavLink href="/reports">
                  <LayoutDashboard />
                  Reports
              </NavLink>
              <NavLink href="/inventory">
                  <Package />
                  Inventory
              </NavLink>
              <NavLink href="/partners">
                  <Users />
                  Partners
              </NavLink>
              <NavLink href="/account">
                  <DollarSign />
                  Account
              </NavLink>
          </nav>
          <div className="mt-auto">
              <Button variant="outline" className="w-full justify-start">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
              </Button>
          </div>
        </aside>
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-auto items-center justify-between border-b bg-background px-4 py-4 sm:px-6 sm:hidden">
              <div className="flex items-center gap-3">
                  <DeskVaultIcon className="h-8 w-8 text-primary" />
                  <h1 className="text-3xl font-headline font-semibold text-foreground">
                      DeskVault
                  </h1>
              </div>
              <Button variant="outline">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
              </Button>
          </header>
          <main className="flex-1 p-4 sm:p-6">{children}</main>
          <footer className="sm:hidden border-t p-2 bg-background fixed bottom-0 left-0 right-0">
              <nav className="flex justify-around">
                  <NavLink href="/reports" size="sm">
                      <LayoutDashboard />
                      <span className="text-xs">Reports</span>
                  </NavLink>
                  <NavLink href="/inventory" size="sm">
                      <Package />
                      <span className="text-xs">Inventory</span>
                  </NavLink>
                  <NavLink href="/partners" size="sm">
                      <Users />
                      <span className="text-xs">Partners</span>
                  </NavLink>
                  <NavLink href="/account" size="sm">
                      <DollarSign />
                      <span className="text-xs">Account</span>
                  </NavLink>
              </nav>
          </footer>
        </div>
      </div>
    </DataProvider>
  );
}
