
"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Pie, PieChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { transactions, expenses } from "@/lib/data";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { startOfWeek, startOfMonth, parseISO, format } from "date-fns";

type Timeframe = "weekly" | "monthly" | "all";

export default function ReportsPage() {
  const [timeframe, setTimeframe] = useState<Timeframe>("monthly");

  const chartData = useMemo(() => {
    const now = new Date();
    let startDate: Date;

    if (timeframe === "weekly") {
      startDate = startOfWeek(now);
    } else if (timeframe === "monthly") {
      startDate = startOfMonth(now);
    } else {
      startDate = new Date(0); // For "all time"
    }

    const filteredTransactions = transactions.filter(t => parseISO(t.date) >= startDate);
    const filteredExpenses = expenses.filter(e => parseISO(e.date) >= startDate);

    const totalRevenue = filteredTransactions
      .filter((t) => t.type === "sale")
      .reduce((sum, t) => sum + t.totalAmount, 0);

    const totalPurchases = filteredTransactions
      .filter((t) => t.type === "purchase")
      .reduce((sum, t) => sum + t.totalAmount, 0);
      
    const operationalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

    const totalExpenses = totalPurchases + operationalExpenses;
    const netProfit = totalRevenue - totalExpenses;
    
    // --- Monthly Sales & Purchases Chart Data ---
    const monthlyAggregates: { [key: string]: { sales: number; purchases: number } } = {};
    transactions.forEach((t) => {
      const month = format(parseISO(t.date), 'MMM yy');
      if (!monthlyAggregates[month]) {
        monthlyAggregates[month] = { sales: 0, purchases: 0 };
      }
      if (t.type === "sale") {
        monthlyAggregates[month].sales += t.totalAmount;
      } else if (t.type === "purchase") {
        monthlyAggregates[month].purchases += t.totalAmount;
      }
    });
    const monthlyChartData = Object.entries(monthlyAggregates).map(([month, data]) => ({ month, ...data })).reverse();


    // --- Expense Breakdown Chart Data ---
    const expenseAggregates: { [key: string]: number } = {};
    expenses.forEach((e) => {
      if (!expenseAggregates[e.category]) {
        expenseAggregates[e.category] = 0;
      }
      expenseAggregates[e.category] += e.amount;
    });
    const expenseChartData = Object.entries(expenseAggregates).map(
      ([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value, fill: `var(--color-${name})` })
    );

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      monthlyChartData,
      expenseChartData,
    };
  }, [timeframe]);

  const barChartConfig = {
    sales: { label: "Sales", color: "hsl(var(--chart-1))" },
    purchases: { label: "Purchases", color: "hsl(var(--chart-2))" },
  } satisfies ChartConfig;
  
  const pieChartConfig = {
    rent: { label: "Rent", color: "hsl(var(--chart-1))" },
    salaries: { label: "Salaries", color: "hsl(var(--chart-2))" },
    utilities: { label: "Utilities", color: "hsl(var(--chart-3))" },
    stock: { label: "Stock", color: "hsl(var(--chart-4))" },
    other: { label: "Other", color: "hsl(var(--chart-5))" },
  } satisfies ChartConfig;

  return (
    <div className="space-y-4">
        <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Reports</h1>
            <Tabs value={timeframe} onValueChange={(value) => setTimeframe(value as Timeframe)}>
                <TabsList>
                    <TabsTrigger value="weekly">Weekly</TabsTrigger>
                    <TabsTrigger value="monthly">Monthly</TabsTrigger>
                    <TabsTrigger value="all">All Time</TabsTrigger>
                </TabsList>
            </Tabs>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                <div className="text-2xl font-bold">${chartData.totalRevenue.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">From all sales</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                <div className="text-2xl font-bold">${chartData.totalExpenses.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">Includes purchases and operational costs</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                <Wallet className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                <div className={`text-2xl font-bold ${chartData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>${chartData.netProfit.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">After all expenses</p>
                </CardContent>
            </Card>
            
            <Card className="lg:col-span-2">
                <CardHeader>
                <CardTitle>Sales & Purchases Overview</CardTitle>
                <CardDescription>Monthly overview of sales vs purchases.</CardDescription>
                </CardHeader>
                <CardContent>
                <ChartContainer config={barChartConfig} className="h-[250px] w-full">
                    <BarChart accessibilityLayer data={chartData.monthlyChartData}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} />
                    <YAxis tickFormatter={(value) => `$${value / 1000}k`} />
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
                    <Pie data={chartData.expenseChartData} dataKey="value" nameKey="name" innerRadius={50} strokeWidth={5} />
                    </PieChart>
                </ChartContainer>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}

    