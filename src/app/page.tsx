import { ArrowLeftRight, LayoutDashboard, Package, DollarSign } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DeskVaultIcon } from '@/components/icons';
import { ReportsTab } from '@/components/reports-tab';
import { InventoryTab } from '@/components/inventory-tab';
import { TransactionsTab } from '@/components/transactions-tab';
import { ExpensesTab } from '@/components/expenses-tab';

export default function Home() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-30 flex h-auto items-center gap-4 border-b bg-background px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <DeskVaultIcon className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-headline font-semibold text-foreground">
            DeskVault
          </h1>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-4 md:gap-8">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
            <TabsTrigger value="dashboard" className="py-2">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="inventory" className="py-2">
              <Package className="mr-2 h-4 w-4" />
              Inventory
            </TabsTrigger>
            <TabsTrigger value="transactions" className="py-2">
              <ArrowLeftRight className="mr-2 h-4 w-4" />
              Transactions
            </TabsTrigger>
            <TabsTrigger value="expenses" className="py-2">
              <DollarSign className="mr-2 h-4 w-4" />
              Expenses
            </TabsTrigger>
          </TabsList>
          <TabsContent value="dashboard" className="mt-4">
            <ReportsTab />
          </TabsContent>
          <TabsContent value="inventory" className="mt-4">
            <InventoryTab />
          </TabsContent>
          <TabsContent value="transactions" className="mt-4">
            <TransactionsTab />
          </TabsContent>
          <TabsContent value="expenses" className="mt-4">
            <ExpensesTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
