"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Pie, PieChart, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip } from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart";
import { transactions, expenses } from "@/lib/data";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";

export function ReportsTab() {
  const { totalRevenue, totalPurchases, netProfit, monthlyData, expenseData } =
    useMemo(() => {
      const revenue = transactions
        .filter((t) => t.type === "sale")
        .reduce((sum, t) => sum + t.totalAmount, 0);
      const purchases = transactions
        .filter((t) => t.type === "purchase")
        .reduce((sum, t) => sum + t.totalAmount, 0);
      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

      const monthlyAggregates: { [key: string]: { sales: number; purchases: number } } = {};

      transactions.forEach((t) => {
        const month = new Date(t.date).toLocaleString('default', { month: 'short', year: '2-digit' });
        if (!monthlyAggregates[month]) {
          monthlyAggregates[month] = { sales: 0, purchases: 0 };
        }
        if (t.type === "sale") {
          monthlyAggregates[month].sales += t.totalAmount;
        } else if (t.type === "purchase") {
          monthlyAggregates[month].purchases += t.totalAmount;
        }
      });
      
      const monthlyData = Object.entries(monthlyAggregates).map(([month, data]) => ({ month, ...data })).reverse();


      const expenseAggregates: { [key: string]: number } = {};
      expenses.forEach((e) => {
        if (!expenseAggregates[e.category]) {
          expenseAggregates[e.category] = 0;
        }
        expenseAggregates[e.category] += e.amount;
      });

      const expenseData = Object.entries(expenseAggregates).map(
        ([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value, fill: `var(--color-${name})` })
      );

      return {
        totalRevenue: revenue,
        totalPurchases: purchases,
        netProfit: revenue - totalExpenses,
        monthlyData,
        expenseData
      };
    }, []);

  const barChartConfig = {
    sales: { label: "Sales", color: "hsl(var(--chart-1))" },
    purchases: { label: "Purchases", color: "hsl(var(--chart-2))" },
  } satisfies ChartConfig;
  
  const pieChartConfig = {
    rent: { label: "Rent", color: "hsl(var(--chart-1))" },
    salaries: { label: "Salaries", color: "hsl(var(--chart-2))" },
    utilities: { label: "Utilities", color: "hsl(var(--chart-3))" },
    marketing: { label: "Marketing", color: "hsl(var(--chart-4))" },
    other: { label: "Other", color: "hsl(var(--chart-5))" },
  } satisfies ChartConfig;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">From all sales</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${netProfit.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">After all expenses</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Purchase Spending
          </CardTitle>
          <TrendingDown className="h-4 w-4 text-muted-foreground text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${totalPurchases.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">Total cost of goods</p>
        </CardContent>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Sales & Purchases</CardTitle>
          <CardDescription>Monthly overview of sales vs purchases.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={barChartConfig} className="h-[250px] w-full">
            <BarChart accessibilityLayer data={monthlyData}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="sales" fill="var(--color-sales)" radius={4} />
              <Bar dataKey="purchases" fill="var(--color-purchases)" radius={4} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Expense Breakdown</CardTitle>
          <CardDescription>How your money is being spent.</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-0">
          <ChartContainer config={pieChartConfig} className="mx-auto aspect-square h-full max-h-[250px]">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
              <Pie data={expenseData} dataKey="value" nameKey="name" innerRadius={50} strokeWidth={5} />
            </PieChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
