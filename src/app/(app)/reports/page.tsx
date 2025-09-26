"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Pie, PieChart, ResponsiveContainer, XAxis, YAxis, Line, LineChart } from "recharts";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useData } from "@/context/data-context";
import { TrendingUp, TrendingDown, Wallet, ArrowUp, ArrowDown } from "lucide-react";
import { startOfWeek, startOfMonth, parseISO, format } from "date-fns";

type Timeframe = "weekly" | "monthly" | "all";

export default function ReportsPage() {
  const [timeframe, setTimeframe] = useState<Timeframe>("monthly");
  const { transactions, expenses, products } = useData();

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

    const productMap = new Map(products.map(p => [p.id, p]));

    const totalRevenue = filteredTransactions
      .filter((t) => t.type === "sale")
      .reduce((sum, t) => sum + t.totalAmount, 0);

    const totalCostOfGoods = filteredTransactions
      .filter((t) => t.type === "sale")
      .reduce((sum, t) => {
        const product = productMap.get(t.productId);
        const cost = product ? product.price * t.quantity : 0;
        return sum + cost;
      }, 0);
      
    const operationalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

    const totalExpenses = totalCostOfGoods + operationalExpenses;
    const netProfit = totalRevenue - totalExpenses;
    
    // --- Monthly Sales & Purchases Chart Data ---
    const monthlyAggregates: { [key: string]: { sales: number; profit: number } } = {};
    transactions.forEach((t) => {
      const month = format(parseISO(t.date), 'MMM yy');
      if (!monthlyAggregates[month]) {
        monthlyAggregates[month] = { sales: 0, profit: 0 };
      }
      if (t.type === "sale") {
        monthlyAggregates[month].sales += t.totalAmount;
        const product = productMap.get(t.productId);
        const cost = product ? product.price * t.quantity : 0;
        monthlyAggregates[month].profit += t.totalAmount - cost;
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

    const salesTrend = filteredTransactions
        .filter(t => t.type === 'sale')
        .sort((a,b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
        .map(t => ({ date: format(parseISO(t.date), 'dd MMM'), revenue: t.totalAmount }));

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      monthlyChartData,
      expenseChartData,
      salesTrend,
      totalCostOfGoods,
      operationalExpenses
    };
  }, [timeframe, transactions, expenses, products]);

  const barChartConfig = {
    sales: { label: "Sales", color: "hsl(var(--chart-1))" },
    profit: { label: "Profit", color: "hsl(var(--chart-2))" },
  } satisfies ChartConfig;
  
  const pieChartConfig = {
    rent: { label: "Rent", color: "hsl(var(--chart-1))" },
    salaries: { label: "Salaries", color: "hsl(var(--chart-2))" },
    utilities: { label: "Utilities", color: "hsl(var(--chart-3))" },
    stock: { label: "Stock", color: "hsl(var(--chart-4))" },
    other: { label: "Other", color: "hsl(var(--chart-5))" },
  } satisfies ChartConfig;

  const Trend = ({ value }: { value: number }) => {
    const isPositive = value >= 0;
    return (
      <div className={`flex items-center text-xs font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
        {Math.abs(value).toFixed(1)}% vs last period
      </div>
    );
  };

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h1 className="text-2xl font-bold tracking-tight">Product overview</h1>
            <Tabs value={timeframe} onValueChange={(value) => setTimeframe(value as Timeframe)}>
                <TabsList>
                    <TabsTrigger value="weekly">Weekly</TabsTrigger>
                    <TabsTrigger value="monthly">Monthly</TabsTrigger>
                    <TabsTrigger value="all">All Time</TabsTrigger>
                </TabsList>
            </Tabs>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-between">
                      <div>
                        <div className="text-4xl font-bold">${(chartData.totalRevenue / 1000).toFixed(1)}k</div>
                        <Trend value={25.3} />
                      </div>
                      <ChartContainer config={{}} className="h-16 w-24">
                          <LineChart data={chartData.salesTrend} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
                              <Line type="monotone" dataKey="revenue" stroke="hsl(var(--accent))" strokeWidth={2} dot={false}/>
                          </LineChart>
                      </ChartContainer>
                  </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">Net Profit</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-end justify-between">
                        <div>
                            <div className={`text-4xl font-bold ${chartData.netProfit >= 0 ? 'text-foreground' : 'text-destructive'}`}>${(chartData.netProfit / 1000).toFixed(1)}k</div>
                            <Trend value={chartData.netProfit >= 0 ? 12.1 : -5.2} />
                        </div>
                        <ChartContainer config={{}} className="h-16 w-24">
                            <LineChart data={chartData.salesTrend} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
                                <Line type="monotone" dataKey="revenue" stroke={chartData.netProfit >= 0 ? "hsl(var(--accent))" : "hsl(var(--destructive))"} strokeWidth={2} dot={false}/>
                            </LineChart>
                        </ChartContainer>
                    </div>
                </CardContent>
            </Card>
            <Card className="lg:col-span-1">
                 <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
                </CardHeader>
                <CardContent>
                   <div className="flex items-end justify-between">
                        <div>
                            <div className="text-4xl font-bold text-foreground">${(chartData.totalExpenses / 1000).toFixed(1)}k</div>
                             <Trend value={-8.1} />
                        </div>
                        <ChartContainer config={{}} className="h-16 w-24">
                            <LineChart data={chartData.salesTrend} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
                                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false}/>
                            </LineChart>
                        </ChartContainer>
                    </div>
                </CardContent>
            </Card>
            
            <Card className="lg:col-span-2">
                <CardHeader>
                <CardTitle>Sales & Profit Overview</CardTitle>
                <CardDescription>Monthly overview of sales vs profit.</CardDescription>
                </CardHeader>
                <CardContent>
                <ChartContainer config={barChartConfig} className="h-[250px] w-full">
                    <BarChart accessibilityLayer data={chartData.monthlyChartData}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} />
                    <YAxis tickFormatter={(value) => `$${value / 1000}k`} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="sales" fill="var(--color-sales)" radius={4} />
                    <Bar dataKey="profit" fill="var(--color-profit)" radius={4} />
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
