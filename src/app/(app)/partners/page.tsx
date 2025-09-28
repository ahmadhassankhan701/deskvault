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
  User,
  Store,
} from "lucide-react";

// --- Type Definitions (Mirroring the API) ---

/**
 * Defines the structure of a Partner record from the API.
 */
export type Partner = {
  id: string;
  type: "individual" | "shop";
  name: string;
  phone: string;
  shop_name?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
};

/**
 * Defines the structure of data used in the Partner form.
 */
type PartnerFormData = {
  type: Partner["type"];
  name: string;
  phone: string;
  shop_name: string; // Stored as string in form, set to null/undefined on save if type is 'individual'
};

// Initial state for the form
const initialFormData: PartnerFormData = {
  type: "individual",
  name: "",
  phone: "",
  shop_name: "",
};

// Available Partner Types
const PARTNER_TYPES: Partner["type"][] = ["individual", "shop"];

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
 * Custom hook to manage modal visibility and form data for CRUD operations.
 */
const usePartnerModal = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPartner, setCurrentPartner] = useState<Partner | null>(null);
  const [formData, setFormData] = useState<PartnerFormData>(initialFormData);

  const openNew = () => {
    setCurrentPartner(null);
    setFormData(initialFormData);
    setIsModalOpen(true);
  };

  const openEdit = (partner: Partner) => {
    setCurrentPartner(partner);
    setFormData({
      type: partner.type,
      name: partner.name,
      phone: partner.phone,
      shop_name: partner.shop_name || "",
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentPartner(null);
    setFormData(initialFormData);
  };

  return {
    isModalOpen,
    currentPartner,
    formData,
    setFormData,
    openNew,
    openEdit,
    closeModal,
  };
};

// --- Extracted Components for Modals and Forms ---

interface PartnerFormProps {
  formData: PartnerFormData;
  setFormData: React.Dispatch<React.SetStateAction<PartnerFormData>>;
  handleSave: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  loading: boolean;
  currentPartner: Partner | null;
  closeModal: () => void;
}

/**
 * Form for creating or editing a Partner.
 */
const PartnerForm: React.FC<PartnerFormProps> = ({
  formData,
  setFormData,
  handleSave,
  loading,
  currentPartner,
  closeModal,
}) => {
  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Partner Type
        </label>
        <select
          value={formData.type}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            setFormData({
              ...formData,
              type: e.target.value as Partner["type"],
              shop_name: "",
            })
          }
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        >
          {PARTNER_TYPES.map((type) => (
            <option key={type} value={type}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Contact Name
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          placeholder="E.g., Jane Doe"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Conditional Shop Name Field */}
      {formData.type === "shop" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Shop Name
          </label>
          <input
            type="text"
            value={formData.shop_name}
            onChange={(e) =>
              setFormData({ ...formData, shop_name: e.target.value })
            }
            required
            placeholder="E.g., Gear Lending Co."
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Phone Number
        </label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          required
          placeholder="(555) 555-5555"
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
          {currentPartner ? "Update Partner" : "Add Partner"}
        </button>
      </div>
    </form>
  );
};

interface ModalProps {
  children: React.ReactNode;
  isModalOpen: boolean;
  currentPartner: Partner | null;
  closeModal: () => void;
}

/**
 * Extracted Modal component for general use (Add/Edit).
 */
const Modal: React.FC<ModalProps> = ({
  children,
  isModalOpen,
  currentPartner,
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
          {currentPartner ? "Edit Partner" : "Add New Partner"}
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
  partnerName: string; // Added partner name for better context in the modal
}

/**
 * Custom modal for confirming deletion.
 */
const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isModalOpen,
  closeModal,
  handleConfirm,
  loading,
  partnerName,
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
          Are you sure you want to permanently soft-delete **{partnerName}**?
          This partner will no longer appear in active lists.
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
            Soft Delete
          </button>
        </div>
      </div>
    </div>
  ) : null;

// --- Main Component ---
export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [totalPartners, setTotalPartners] = useState(0);
  // State for Delete Confirmation Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [partnerToDelete, setPartnerToDelete] = useState<Partner | null>(null);

  const {
    isModalOpen,
    currentPartner,
    formData,
    setFormData,
    openNew,
    openEdit,
    closeModal,
  } = usePartnerModal();

  // Helper function to close the delete modal
  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setPartnerToDelete(null);
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
   * Fetches all non-deleted partners from the API.
   */
  const fetchPartners = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        q: searchQuery,
      });
      const response = await fetch(`/api/partners?${params}`);
      const result = await response.json();

      if (response.ok) {
        setPartners(result.partners);
        setTotalPartners(result.total);
      } else {
        setError(result.message || "Failed to fetch partners.");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Network error or API failure.");
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchQuery]);

  // Re-fetch when page, limit, or searchQuery changes
  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  /**
   * Handles form submission for both adding and editing partners.
   */
  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    // Client-side validation
    if (
      !formData.type ||
      !formData.name.trim() ||
      !formData.phone.trim() ||
      (formData.type === "shop" && !formData.shop_name.trim())
    ) {
      setError("Please ensure all required fields are filled.");
      setLoading(false);
      return;
    }

    try {
      const isEditing = !!currentPartner;
      const method = isEditing ? "PUT" : "POST";
      const url = isEditing
        ? `/api/partners?id=${currentPartner.id}`
        : "/api/partners";

      const payload = {
        type: formData.type,
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        // API expects shop_name to be null if type is 'individual'
        shop_name: formData.type === "shop" ? formData.shop_name.trim() : null,
      };

      const response = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(`Partner ${isEditing ? "updated" : "added"} successfully!`);
        closeModal();
        fetchPartners(); // Refresh the list
      } else {
        setError(
          result.message || `Failed to ${isEditing ? "update" : "add"} partner.`
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
  const handleDeleteClick = (partner: Partner) => {
    setPartnerToDelete(partner);
    setIsDeleteModalOpen(true);
  };

  /**
   * Executes the soft-delete of a partner after user confirmation.
   */
  const executeDelete = async () => {
    if (!partnerToDelete) return;

    const id = partnerToDelete.id;
    closeDeleteModal(); // Close modal immediately

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/partners?id=${id}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (response.ok) {
        setMessage("Partner soft-deleted successfully.");
        fetchPartners();
      } else {
        setError(result.message || "Failed to delete partner.");
      }
    } catch (err) {
      console.error("Delete error:", err);
      setError("Network error during delete operation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-8 font-sans">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-gray-200 mb-6">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-3 sm:mb-0">
          Partner Management
        </h1>
        <div className="flex space-x-3">
          <button
            onClick={fetchPartners}
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
            New Partner
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

      {/* Partners List (Table for Desktop, Cards for Mobile) */}
      <div className="flex flex-row justify-between items-center mb-3">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          Active Partners
        </h2>
        <input
          type="text"
          placeholder="Search by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      {loading && partners.length === 0 && (
        <div className="text-center p-10 text-gray-500 flex justify-center items-center">
          <Loader className="w-6 h-6 mr-2 animate-spin" /> Loading Partners...
        </div>
      )}

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-xl shadow-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name / Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Shop Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Phone
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Joined
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {partners.length > 0 ? (
              partners.map((partner: Partner) => (
                <tr
                  key={partner.id}
                  className="hover:bg-gray-50 transition duration-100"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        partner.type === "shop"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-indigo-100 text-indigo-800"
                      }`}
                    >
                      {partner.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <span className="flex items-center">
                      {partner.type === "shop" ? (
                        <Store className="w-4 h-4 mr-2" />
                      ) : (
                        <User className="w-4 h-4 mr-2" />
                      )}
                      {partner.name}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {partner.shop_name || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {partner.phone}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                    {formatDate(partner.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button
                      onClick={() => openEdit(partner)}
                      className="text-blue-600 hover:text-blue-900 p-1 rounded-full hover:bg-blue-100 transition"
                      title="Edit Partner"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(partner)}
                      className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-100 transition"
                      title="Delete Partner"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No active partners found. Add a new partner to get started!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {partners.length > 0 ? (
          partners.map((partner: Partner) => (
            <div
              key={partner.id}
              className="bg-white p-4 rounded-xl shadow-md border-l-4 border-blue-500"
            >
              <div className="flex justify-between items-start mb-2">
                <span
                  className={`px-3 py-1 text-xs font-semibold rounded-full ${
                    partner.type === "shop"
                      ? "bg-purple-100 text-purple-800"
                      : "bg-indigo-100 text-indigo-800"
                  }`}
                >
                  {partner.type}
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => openEdit(partner)}
                    className="text-blue-600 hover:text-blue-900 p-1 rounded-full hover:bg-blue-100 transition"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(partner)}
                    className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-100 transition"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-lg font-bold text-gray-900 mb-1">
                {partner.name}
              </p>
              {partner.shop_name && (
                <p className="text-sm text-gray-600 mb-1">
                  Shop: {partner.shop_name}
                </p>
              )}
              <p className="text-sm text-gray-600 mb-2">
                Phone: {partner.phone}
              </p>
              <p className="text-xs text-gray-500">
                Joined: {formatDate(partner.created_at)}
              </p>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-gray-500 bg-white rounded-xl shadow-md">
            No active partners found.
          </div>
        )}
      </div>
      <div className="flex justify-between items-center space-x-2 mt-3">
        <button
          onClick={() => setPage((p) => Math.max(p - 1, 1))}
          disabled={page === 1}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Prev
        </button>
        <span>
          Page {page} of {Math.ceil(totalPartners / limit)}
        </span>
        <button
          onClick={() =>
            setPage((p) => (p < Math.ceil(totalPartners / limit) ? p + 1 : p))
          }
          disabled={page >= Math.ceil(totalPartners / limit)}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
      {/* Partner Modal (Add/Edit) */}
      <Modal
        isModalOpen={isModalOpen}
        currentPartner={currentPartner}
        closeModal={closeModal}
      >
        <PartnerForm
          formData={formData}
          setFormData={setFormData}
          handleSave={handleSave}
          loading={loading}
          currentPartner={currentPartner}
          closeModal={closeModal}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isModalOpen={isDeleteModalOpen}
        closeModal={closeDeleteModal}
        handleConfirm={executeDelete}
        loading={loading}
        partnerName={partnerToDelete?.name || "this partner"}
      />
    </div>
  );
}
