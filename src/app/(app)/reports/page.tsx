"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, startOfWeek, startOfMonth } from "date-fns";

type Transaction = {
  id: string;
  type: "purchase" | "sale" | "lend-out" | "return";
  totalAmount: number;
  date: string;
};

type Expense = {
  id: string;
  amount: number;
  date: string;
  category: string;
};

const ReportsPage = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [activeTab, setActiveTab] = useState<"week" | "month" | "all">("week");

  // ✅ Date parsing helper
  const parseDate = (dateStr: string) => {
    return new Date(dateStr.replace(" ", "T"));
  };

  // ✅ Load transactions (sales only)
  useEffect(() => {
    const fetchTransactions = async () => {
      const res = await fetch("/api/transactions");
      const json = await res.json();
      setTransactions(
        (json.transactions || []).filter((t: Transaction) => t.type === "sale")
      );
    };
    fetchTransactions();
  }, []);

  // ✅ Load expenses
  useEffect(() => {
    const fetchExpenses = async () => {
      // After fetching from /api/expenses
      const result = await fetch("/api/expenses");
      const json = await result.json();

      if (json.success) {
        const expensesArray = json.data.expenses; // <-- extract the array
        setExpenses(expensesArray || []);
      }
    };
    fetchExpenses();
  }, []);

  // ✅ Filter data based on tab
  const filterByTab = <T extends { date: string }>(data: T[]) => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);

    if (activeTab === "week") {
      return data.filter((d) => parseDate(d.date) >= weekStart);
    }
    if (activeTab === "month") {
      return data.filter((d) => parseDate(d.date) >= monthStart);
    }
    return data;
  };

  const filteredSales = filterByTab(transactions);
  const filteredExpenses = filterByTab(expenses);

  // ✅ Totals
  const totalSales = filteredSales.reduce((sum, t) => sum + t.totalAmount, 0);
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalProfit = totalSales - totalExpenses;

  // ✅ Chart data
  const chartData = [
    { name: "Sales", amount: totalSales },
    { name: "Expenses", amount: totalExpenses },
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Reports</h1>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="week">This Week</TabsTrigger>
          <TabsTrigger value="month">This Month</TabsTrigger>
          <TabsTrigger value="all">All Time</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Totals */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold">Total Sales</h2>
            <p className="text-xl font-bold text-green-600">
              {totalSales.toFixed(2)} QAR
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold">Total Expenses</h2>
            <p className="text-xl font-bold text-red-600">
              {totalExpenses.toFixed(2)} QAR
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold">Total Profit</h2>
            <p
              className={`text-xl font-bold ${
                totalProfit >= 0 ? "text-green-700" : "text-red-700"
              }`}
            >
              {totalProfit.toFixed(2)} QAR
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold mb-4">Sales vs Expenses</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip
                formatter={(value: number) => `${value.toFixed(2)} QAR`}
              />
              <Bar dataKey="amount" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Transactions List (Sales Only) */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <h2 className="text-lg font-semibold">Sales Transactions</h2>
          {filteredSales.length === 0 ? (
            <p className="text-gray-500">No sales found.</p>
          ) : (
            <ul className="divide-y">
              {filteredSales.map((t) => (
                <li key={t.id} className="py-2 flex justify-between">
                  <span>{format(parseDate(t.date), "dd MMM yyyy")}</span>
                  <span className="font-medium text-green-600">
                    {t.totalAmount.toFixed(2)} QAR
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsPage;
