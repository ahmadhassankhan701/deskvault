"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, startOfToday } from "date-fns";
import {
  Calendar as CalendarIcon,
  PlusCircle,
  MoreHorizontal,
} from "lucide-react";

// Import the Expense type from the API route for consistency
import { Expense } from "@/lib/types";
// import { useData } from "@/context/data-context"; // Removed

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const expenseSchema = z.object({
  category: z.enum(["rent", "salaries", "utilities", "stock", "other"]),
  description: z.string().min(1, "Description is required."),
  amount: z.coerce.number().min(0.01, "Amount must be positive."),
  date: z.date(),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

export default function AccountPage() {
  // const { expenses, addExpense } = useData(); // Removed
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [needsRefresh, setNeedsRefresh] = useState(true);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  const { toast } = useToast();

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      category: "other",
      description: "",
      amount: 0,
      date: startOfToday(),
    },
  });

  // --- API Fetch Function ---
  const fetchExpenses = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/expenses");
      if (!response.ok) {
        throw new Error("Failed to fetch expenses.");
      }
      const data = await response.json();
      setExpenses(data.expenses || []);
    } catch (error) {
      console.error("Fetch error:", error);
      toast({
        title: "Error",
        description: "Could not load expenses data from the server.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setNeedsRefresh(false);
    }
  }, [toast]);

  // --- Load Expenses Effect ---
  useEffect(() => {
    if (needsRefresh) {
      fetchExpenses();
    }
  }, [fetchExpenses, needsRefresh]);

  // --- Form Reset Effect (for editing) ---
  useEffect(() => {
    if (editingExpense) {
      form.reset({
        category: editingExpense.category,
        description: editingExpense.description,
        amount: editingExpense.amount,
        // Convert ISO string back to Date object for the form
        date: new Date(editingExpense.date),
      });
    } else {
      form.reset({
        category: "other",
        description: "",
        amount: 0,
        date: startOfToday(),
      });
    }
  }, [editingExpense, form]);

  // --- API Submit Handler ---
  async function onSubmit(values: ExpenseFormValues) {
    const isEditing = !!editingExpense;

    const url = isEditing
      ? `/api/expenses?id=${editingExpense!.id}`
      : "/api/expenses";

    const method = isEditing ? "PUT" : "POST";

    try {
      const payload = {
        ...values,
        // Convert Date object to ISO string for API payload
        date: values.date.toISOString(),
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          throw new Error(
            errorData.message ||
              `Failed to ${isEditing ? "update" : "add"} expense.`
          );
        } else {
          // Handle unexpected non-JSON response (e.g., HTML error page)
          const errorText = await response.text();
          console.error("Non-JSON Server Error Response:", errorText);
          throw new Error(
            `Server error: Status ${response.status}. Check server logs.`
          );
        }
      }

      toast({
        title: isEditing ? "Expense Updated" : "Expense Added",
        description: `Successfully logged ${values.description}.`,
      });
      setNeedsRefresh(true); // Trigger list refresh
    } catch (error) {
      console.error("Submit error:", error);
      toast({
        title: isEditing ? "Update Failed" : "Addition Failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsDialogOpen(false);
      setEditingExpense(null);
    }
  }

  // --- Delete Handlers ---

  const handleDelete = (expense: Expense) => {
    setExpenseToDelete(expense);
    setIsDeleteAlertOpen(true);
  };

  const confirmDelete = async () => {
    if (!expenseToDelete) return;

    try {
      const response = await fetch(`/api/expenses?id=${expenseToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete expense.");
      }

      toast({
        title: "Expense Deleted",
        description: `${expenseToDelete.description} has been removed.`,
      });
      setNeedsRefresh(true); // Request a refresh of the list
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Deletion Failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsDeleteAlertOpen(false);
      setExpenseToDelete(null);
    }
  };

  const handleAddNew = () => {
    setEditingExpense(null);
    form.reset({
      category: "other",
      description: "",
      amount: 0,
      date: startOfToday(),
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6 p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Financial Account</h1>
        <Button onClick={handleAddNew} size="sm">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Expense
        </Button>
      </div>

      <Card className="shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle>Expenses Log</CardTitle>
          <CardDescription>Track your operational expenses.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-blue-500 font-medium">
              Loading expenses...
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No expenses logged yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Date</TableHead>
                    <TableHead className="w-[120px]">Category</TableHead>
                    <TableHead className="min-w-[200px]">Description</TableHead>
                    <TableHead className="text-right w-[100px]">
                      Amount
                    </TableHead>
                    <TableHead className="w-16">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow
                      key={expense.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <TableCell>
                        {format(new Date(expense.date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="capitalize font-medium text-sm text-gray-700">
                        {expense.category}
                      </TableCell>
                      <TableCell>{expense.description}</TableCell>
                      <TableCell className="text-right font-semibold text-red-600">
                        -${expense.amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleEdit(expense)}
                            >
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(expense)}
                              className="text-red-600 focus:text-red-700"
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(isOpen) => {
          setIsDialogOpen(isOpen);
          if (!isOpen) {
            setEditingExpense(null);
            form.reset();
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingExpense ? "Edit Expense" : "Add New Expense"}
            </DialogTitle>
            <DialogDescription>
              {editingExpense
                ? "Update the details for this expense."
                : "Enter the details of the new expense."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an expense category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="rent">Rent</SelectItem>
                        <SelectItem value="salaries">Salaries</SelectItem>
                        <SelectItem value="utilities">Utilities</SelectItem>
                        <SelectItem value="stock">
                          Stock (Cost of Goods)
                        </SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., Office electricity bill"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount ($)</FormLabel>
                    <FormControl>
                      {/* Ensure input value is treated as string for uncontrolled component, but type is number for form validation */}
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="150.00"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value))
                        }
                        value={field.value === 0 ? "" : field.value} // Clear 0 on first click
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Expense Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > startOfToday() ||
                            date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting
                    ? "Saving..."
                    : editingExpense
                    ? "Save Changes"
                    : "Add Expense"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete the expense: "
              <span className="font-semibold">
                {expenseToDelete?.description}
              </span>
              " logged on{" "}
              {expenseToDelete?.date
                ? format(new Date(expenseToDelete.date), "PPP")
                : "this date"}
              . Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setExpenseToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
