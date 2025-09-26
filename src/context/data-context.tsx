"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import {
  products as initialProducts,
  transactions as initialTransactions,
  partners as initialPartners,
  expenses as initialExpenses,
} from "@/lib/data";
import type { Product, Transaction, Partner, Expense } from "@/lib/types";

interface DataContextType {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  partners: Partner[];
  setPartners: React.Dispatch<React.SetStateAction<Partner[]>>;
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, "id">) => void;
  addPartner: (partner: Omit<Partner, "id">) => void;
  addProduct: (product: Omit<Product, "id">) => void;
  addTransaction: (transaction: Omit<Transaction, "id">) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [partners, setPartners] = useState<Partner[]>(initialPartners);
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);

  const addExpense = (expense: Omit<Expense, "id">) => {
    const newExpense = { ...expense, id: `exp-${Date.now()}` };
    setExpenses((prev) => [newExpense, ...prev]);
  };
  
  const addPartner = (partner: Omit<Partner, "id">) => {
    const newPartner = { ...partner, id: `partner-${Date.now()}` };
    setPartners(prev => [newPartner, ...prev]);
    return newPartner;
  }
  
  const addProduct = (product: Omit<Product, "id">) => {
    const newProduct = { ...product, id: `prod-${Date.now()}` };
    setProducts(prev => [newProduct, ...prev]);
    return newProduct;
  }
  
  const addTransaction = (transaction: Omit<Transaction, "id">) => {
    const newTransaction = { ...transaction, id: `txn-${Date.now()}` };
    setTransactions(prev => [newTransaction, ...prev]);
    return newTransaction;
  }

  return (
    <DataContext.Provider
      value={{
        products,
        setProducts,
        transactions,
        setTransactions,
        partners,
        setPartners,
        expenses,
        addExpense,
        addPartner,
        addProduct,
        addTransaction,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}
