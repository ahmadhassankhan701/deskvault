"use client";

import { format } from "date-fns";
import { transactions, products } from "@/lib/data";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { TransactionType } from "@/lib/types";

export function TransactionsTab() {
  const getProductById = (id: string) => products.find((p) => p.id === id);

  const getTransactionTypeBadge = (type: TransactionType) => {
    switch (type) {
      case "sale":
        return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Sale</Badge>;
      case "purchase":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Purchase</Badge>;
      case "borrow-in":
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">Borrow (In)</Badge>;
      case "lend-out":
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">Lend (Out)</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transactions</CardTitle>
        <CardDescription>
          A log of all inventory movements.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Party</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead className="text-right">Total Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => {
              const product = getProductById(transaction.productId);
              return (
                <TableRow key={transaction.id}>
                  <TableCell>
                    {format(new Date(transaction.date), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    {getTransactionTypeBadge(transaction.type)}
                  </TableCell>
                  <TableCell className="font-medium">{product?.name}</TableCell>
                  <TableCell>{transaction.party}</TableCell>
                  <TableCell>{transaction.quantity}</TableCell>
                  <TableCell className="text-right">
                    ${transaction.totalAmount.toFixed(2)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
