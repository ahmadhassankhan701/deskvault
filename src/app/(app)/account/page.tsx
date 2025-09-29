"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  RefreshCw,
  Plus,
  Edit2,
  Trash2,
  X,
  AlertTriangle,
  Loader,
} from "lucide-react";
import { Expense } from "@/lib/types"; // Importing the Expense type

// --- Local Type Definitions ---

/**
 * Defines the structure of the data used in the Expense form.
 * The 'amount' is stored as a string during input for stability.
 */
type ExpenseFormData = {
  date: string;
  category: Expense["category"];
  description: string;
  amount: string;
};

// Initial state for the form
const initialFormData: ExpenseFormData = {
  date: new Date().toISOString().substring(0, 10), // YYYY-MM-DD
  category: "other",
  description: "",
  amount: "0",
};

// Available Expense Categories (derived from Expense type for safety)
const CATEGORIES: Expense["category"][] = [
  "rent",
  "salaries",
  "utilities",
  "other",
];

// --- Helper Functions ---

/**
 * Formats a date string into a readable format.
 */
const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

/**
 * Formats a number to currency string.
 */
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-QA", {
    style: "currency",
    currency: "QAR",
  }).format(amount);
};

/**
 * Custom hook to manage modal visibility and form data for CRUD operations.
 */
const useExpenseModal = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentExpense, setCurrentExpense] = useState<Expense | null>(null);
  const [formData, setFormData] = useState<ExpenseFormData>(initialFormData);

  const openNew = () => {
    setCurrentExpense(null);
    setFormData(initialFormData);
    setIsModalOpen(true);
  };

  const openEdit = (expense: Expense) => {
    setCurrentExpense(expense);
    setFormData({
      date: expense.date.substring(0, 10),
      category: expense.category,
      description: expense.description,
      amount: expense.amount.toString(),
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentExpense(null);
    setFormData(initialFormData);
  };

  return {
    isModalOpen,
    currentExpense,
    formData,
    setFormData,
    openNew,
    openEdit,
    closeModal,
  };
};

// --- Extracted Components for Stability ---

interface ExpenseFormProps {
  formData: ExpenseFormData;
  setFormData: React.Dispatch<React.SetStateAction<ExpenseFormData>>;
  handleSave: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  loading: boolean;
  currentExpense: Expense | null;
  closeModal: () => void;
}

/**
 * Extracted form content to prevent focus loss issues caused by parent re-renders.
 */
const ExpenseForm: React.FC<ExpenseFormProps> = ({
  formData,
  setFormData,
  handleSave,
  loading,
  currentExpense,
  closeModal,
}) => {
  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Date
        </label>
        <input
          type="date"
          value={formData.date}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData({ ...formData, date: e.target.value })
          }
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Category
        </label>
        <select
          value={formData.category}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            setFormData({
              ...formData,
              category: e.target.value as Expense["category"],
            })
          }
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <input
          type="text"
          value={formData.description}
          // This is a simple string update and should now maintain focus reliably.
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData({ ...formData, description: e.target.value })
          }
          required
          placeholder="E.g., Monthly electricity bill"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Amount (QAR)
        </label>
        <input
          type="text"
          inputMode="decimal"
          value={formData.amount}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value;
            // Regex to allow empty string, digits, and a single decimal point
            if (value === "" || /^\d*\.?\d*$/.test(value)) {
              // Updating with a string value prevents focus loss.
              setFormData({ ...formData, amount: value });
            }
          }}
          required
          placeholder="0.00"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={closeModal}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition duration-150"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 transition duration-150 flex items-center justify-center"
          disabled={loading}
        >
          {loading && <Loader className="w-4 h-4 mr-2 animate-spin" />}
          {currentExpense ? "Update Expense" : "Add Expense"}
        </button>
      </div>
    </form>
  );
};

interface ModalProps {
  children: React.ReactNode;
  isModalOpen: boolean;
  currentExpense: Expense | null;
  closeModal: () => void;
}

/**
 * Extracted Modal component for general use (Add/Edit).
 */
const Modal: React.FC<ModalProps> = ({
  children,
  isModalOpen,
  currentExpense,
  closeModal,
}) =>
  isModalOpen ? (
    <div
      className="fixed inset-0 bg-gray-900 bg-opacity-70 flex items-center justify-center z-50 p-4"
      onClick={closeModal}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 sm:p-8 relative"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
      >
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          {currentExpense ? "Edit Expense" : "Add New Expense"}
        </h2>
        <button
          onClick={closeModal}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-6 h-6" />
        </button>
        {children}
      </div>
    </div>
  ) : null;

interface DeleteConfirmationModalProps {
  isModalOpen: boolean;
  closeModal: () => void;
  handleConfirm: () => Promise<void>;
  loading: boolean;
}

/**
 * Custom modal for confirming deletion, replacing window.confirm().
 */
const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isModalOpen,
  closeModal,
  handleConfirm,
  loading,
}) =>
  isModalOpen ? (
    <div
      className="fixed inset-0 bg-gray-900 bg-opacity-70 flex items-center justify-center z-50 p-4"
      onClick={closeModal}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 relative"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
      >
        <h2 className="text-xl font-bold text-red-600 mb-4 flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2" /> Confirm Deletion
        </h2>
        <button
          onClick={closeModal}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-6 h-6" />
        </button>

        <p className="text-gray-700 mb-6">
          Are you sure you want to permanently delete this expense? This action
          cannot be undone.
        </p>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={closeModal}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition duration-150"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg shadow-md hover:bg-red-700 transition duration-150 flex items-center justify-center"
            disabled={loading}
          >
            {loading && <Loader className="w-4 h-4 mr-2 animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  ) : null;

// --- Main Component ---
export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10); // rows per page
  const [total, setTotal] = useState(0);

  // State for Delete Confirmation Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [expenseToDeleteId, setExpenseToDeleteId] = useState<string | null>(
    null
  );

  const {
    isModalOpen,
    currentExpense,
    formData,
    setFormData,
    openNew,
    openEdit,
    closeModal,
  } = useExpenseModal();

  // Helper function to close the delete modal
  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setExpenseToDeleteId(null);
  };

  // Reset message after a few seconds
  useEffect(() => {
    if (message || error) {
      const timer = setTimeout(() => {
        setMessage("");
        setError("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message, error]);

  /**
   * Fetches all non-deleted expenses from the API.
   */
  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/expenses?q=${encodeURIComponent(
          query
        )}&page=${page}&limit=${limit}`
      );
      const result = await response.json();

      if (result.success) {
        setExpenses(result.data.expenses);
        setTotal(result.data.total);
      } else {
        setError(result.message || "Failed to fetch expenses.");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Network error or API failure.");
    } finally {
      setLoading(false);
    }
  }, [query, page, limit]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  /**
   * Handles form submission for both adding and editing expenses.
   */
  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    // Parse amount string to number for validation and API
    const amountValue = parseFloat(formData.amount);

    // Client-side validation: Check fields and parsed amount
    if (
      !formData.category ||
      !formData.description ||
      amountValue <= 0 ||
      isNaN(amountValue) ||
      !formData.date
    ) {
      setError(
        "Please ensure all fields are filled correctly, including a valid amount greater than zero."
      );
      setLoading(false);
      return;
    }

    try {
      const isEditing = !!currentExpense;
      const method = isEditing ? "PUT" : "POST";
      const url = isEditing
        ? `/api/expenses?id=${currentExpense.id}`
        : "/api/expenses";

      const response = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          // Ensure date is stored as an ISO string
          date: new Date(formData.date).toISOString(),
          amount: amountValue, // Send the PARSED number to the API
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage(`Expense ${isEditing ? "updated" : "added"} successfully!`);
        closeModal();
        fetchExpenses(); // Refresh the list
      } else {
        setError(
          result.message || `Failed to ${isEditing ? "update" : "add"} expense.`
        );
      }
    } catch (err) {
      console.error("Save error:", err);
      setError("Network error during save operation.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Opens the confirmation modal when the delete button is clicked.
   */
  const handleDeleteClick = (id: string) => {
    setExpenseToDeleteId(id);
    setIsDeleteModalOpen(true);
  };

  /**
   * Executes the soft-delete of an expense after user confirmation.
   */
  const executeDelete = async () => {
    if (!expenseToDeleteId) return;

    const id = expenseToDeleteId;
    closeDeleteModal(); // Close modal immediately

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/expenses?id=${id}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (result.success) {
        setMessage("Expense deleted successfully.");
        fetchExpenses();
      } else {
        setError(result.message || "Failed to delete expense.");
      }
    } catch (err) {
      console.error("Delete error:", err);
      setError("Network error during delete operation.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Calculate total expenses for display.
   */
  const totalExpenses = useMemo(() => {
    return expenses.reduce((sum, exp) => sum + exp.amount, 0);
  }, [expenses]);

  return (
    <div className="min-h-screen p-4 sm:p-8 font-sans">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-gray-200 mb-6">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-3 sm:mb-0">
          Expense Tracker
        </h1>
        <div className="flex space-x-3">
          <button
            onClick={fetchExpenses}
            disabled={loading}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-100 transition duration-150 disabled:opacity-50"
          >
            {loading ? (
              <Loader className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Refresh
          </button>
          <button
            onClick={openNew}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg shadow-md hover:bg-green-700 transition duration-150"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Expense
          </button>
        </div>
      </header>

      {/* Notifications */}
      {error && (
        <div className="p-3 mb-4 rounded-lg bg-red-100 text-red-700 flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2" />
          <strong>Error:</strong> {error}
        </div>
      )}
      {message && (
        <div className="p-3 mb-4 rounded-lg bg-blue-100 text-blue-700">
          {message}
        </div>
      )}

      {/* Summary Card */}
      <div className="bg-white p-6 rounded-xl shadow-lg mb-8 border-t-4 border-blue-500">
        <p className="text-sm font-medium text-gray-500">
          Total Expenses Tracked
        </p>
        <p className="text-4xl font-extrabold text-gray-900 mt-1">
          {formatCurrency(totalExpenses)}
        </p>
      </div>

      {/* Expenses List (Table for Desktop, Cards for Mobile) */}
      <div className="flex justify-between align-center">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          Recent Expenses
        </h2>
        <div className="mb-4 flex items-center space-x-2 relative w-full max-w-sm">
          <input
            type="text"
            placeholder="Search by description..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1); // reset page on new search
            }}
            className="border p-2 w-full pr-10 rounded-lg" // add pr-10 to make space for icon
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setPage(1); // reset page on clear
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>
      </div>
      {loading && expenses.length === 0 && (
        <div className="text-center p-10 text-gray-500 flex justify-center items-center">
          <Loader className="w-6 h-6 mr-2 animate-spin" /> Loading Expenses...
        </div>
      )}

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-xl shadow-lg overflow-x-auto">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {expenses.length > 0 ? (
              expenses.map((expense: Expense) => (
                <tr
                  key={expense.id}
                  className="hover:bg-gray-50 transition duration-100"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(expense.date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {expense.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">
                      {expense.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-red-600">
                    {formatCurrency(expense.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button
                      onClick={() => openEdit(expense)}
                      className="text-blue-600 hover:text-blue-900 p-1 rounded-full hover:bg-blue-100 transition"
                      title="Edit Expense"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(expense.id)}
                      className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-100 transition"
                      title="Delete Expense"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No expenses recorded yet. Start by adding a new expense!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {expenses.length > 0 ? (
          expenses.map((expense: Expense) => (
            <div
              key={expense.id}
              className="bg-white p-4 rounded-xl shadow-md border-l-4 border-blue-500"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800">
                  {expense.category}
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => openEdit(expense)}
                    className="text-blue-600 hover:text-blue-900 p-1 rounded-full hover:bg-blue-100 transition"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(expense.id)}
                    className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-100 transition"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-lg font-bold text-red-600 mb-1">
                {formatCurrency(expense.amount)}
              </p>
              <p className="text-gray-900 font-medium mb-1">
                {expense.description}
              </p>
              <p className="text-xs text-gray-500">
                Date: {formatDate(expense.date)}
              </p>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-gray-500 bg-white rounded-xl shadow-md">
            No expenses recorded yet.
          </div>
        )}
      </div>
      <div className="flex justify-between items-center mt-4">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="px-3 py-1 text-sm rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
        >
          Previous
        </button>
        <span className="text-sm text-gray-600">
          Page {page} of {Math.ceil(total / limit) || 1}
        </span>
        <button
          onClick={() =>
            setPage((p) => (p < Math.ceil(total / limit) ? p + 1 : p))
          }
          disabled={page >= Math.ceil(total / limit)}
          className="px-3 py-1 text-sm rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
        >
          Next
        </button>
      </div>

      {/* Expense Modal (Add/Edit) */}
      <Modal
        isModalOpen={isModalOpen}
        currentExpense={currentExpense}
        closeModal={closeModal}
      >
        <ExpenseForm
          formData={formData}
          setFormData={setFormData}
          handleSave={handleSave}
          loading={loading}
          currentExpense={currentExpense}
          closeModal={closeModal}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isModalOpen={isDeleteModalOpen}
        closeModal={closeDeleteModal}
        handleConfirm={executeDelete}
        loading={loading}
      />
    </div>
  );
}
