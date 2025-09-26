
import {
  Users,
  LayoutDashboard,
  Package,
  DollarSign,
  LogOut,
} from 'lucide-react';

import { DeskVaultIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarFooter,
  SidebarProvider,
} from '@/components/ui/sidebar';
import { NavLink } from '@/components/nav-link';
import { DataProvider } from '@/context/data-context';
import { Separator } from '@/components/ui/separator';
import withAuth from '@/components/with-auth';
import { AuthProvider, useAuth } from '@/context/auth-context';


function AppLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const { logout } = useAuth();
  return (
    <DataProvider>
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <Sidebar>
            <SidebarHeader>
              <div className="flex items-center gap-3 p-2">
                <DeskVaultIcon className="h-8 w-8 text-foreground" />
                <h1 className="text-xl font-semibold text-foreground">
                  DeskVault
                </h1>
              </div>
            </SidebarHeader>
            <SidebarContent>
              <SidebarMenu className="mt-20 px-4 space-y-2">
                <SidebarMenuItem>
                  <NavLink href="/reports">
                    <LayoutDashboard />
                    Reports
                  </NavLink>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <NavLink href="/inventory">
                    <Package />
                    Inventory
                  </NavLink>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <NavLink href="/partners">
                    <Users />
                    Partners
                  </NavLink>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <NavLink href="/account">
                    <DollarSign />
                    Account
                  </NavLink>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarContent>
            <SidebarFooter>
                <Separator className='mb-2' />
              <Button variant="ghost" className="w-full justify-start" onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </SidebarFooter>
          </Sidebar>
          <div className="flex flex-1 flex-col">
            <header className="sticky top-0 z-30 flex h-auto items-center justify-between border-b bg-background px-4 py-4 sm:px-6 sm:hidden">
              <div className="flex items-center gap-3">
                <DeskVaultIcon className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-headline font-semibold text-foreground">
                  DeskVault
                </h1>
              </div>
              <Button variant="outline" onClick={logout}>
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
      </SidebarProvider>
    </DataProvider>
  );
}


const AppLayout = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>
    <AppLayoutContent>{children}</AppLayoutContent>
  </AuthProvider>
);

export default withAuth(AppLayout);
