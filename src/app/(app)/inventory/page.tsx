"use client";
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  RefreshCw,
  Plus,
  Edit2,
  Trash2,
  X,
  AlertTriangle,
  Loader,
  Package,
  Zap,
  DollarSign,
  Repeat,
  Info,
  ChevronDown,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@radix-ui/react-dropdown-menu";

// --- TYPE DEFINITIONS (Based on provided APIs and context) ---

/** Partner type (Placeholder structure, assuming this is fetched from /api/partners) */
export type Partner = {
  id: string;
  type: "individual" | "shop";
  name: string;
  phone: string;
  shop_name?: string | null;
  created_at: string;
};

/** Product type from /api/products */
export type Product = {
  id: string;
  type: "individual" | "sku";
  name: string;
  category: string;
  price: number; // Current selling/lending price
  stock: number;
  imei?: string | null;
  created_at: string;
  partnerId?: string | null; // Vendor/Supplier association
};

/** Transaction type from /api/transactions (Aliased columns are used for naming) */
export type Transaction = {
  id: string;
  productId: string; // Mapped from product_id
  type: "purchase" | "sale";
  quantity: number;
  price: number; // Unit price at time of transaction
  totalAmount: number; // Mapped from total_amount
  date: string; // ISO date string
  party: string; // Buyer/Partner Name (mapped from snapshot_partner_name or party)
  partnerId: string; // Mapped from partner_id
  created_at: string;
  productName?: string; // Client-side enhancement
};

/** Form data structure for adding/editing a Product */
type ProductFormData = {
  name: string;
  category: string;
  price: number;
  stock: number;
  type: Product["type"];
  imei: string; // Used only if type is 'individual'
  partnerId: string; // Optional field for vendor association
};

/** Form data structure for recording a Transaction */
type TransactionFormData = {
  type: Transaction["type"];
  quantity: number;
  partnerId: string;
  partyName: string; // Name for the transaction record
  partyPhone?: string;
  partyShop?: string | null;
  date: string;
  price: Transaction["price"];
};

// --- CONSTANTS ---

const INVENTORY_CATEGORIES: string[] = [
  "Input Devices: (Keyboards, Mice, Stylus Pens, Gaming Controllers)",
  "Audio & Sound: (Headphones, Earbuds, Microphones, Bluetooth Speakers)",
  "Cables & Adapters: (USB-C, Lightning, HDMI, DisplayPort, Hubs, Dongles)",
  "Charging & Power: (Wall Chargers, Power Banks, Wireless Chargers, Surge Protectors)",
  "Storage: (External Hard Drives/SSDs, USB Flash Drives, SD/MicroSD Cards)",
  "Mobile Protection: (Phone Cases, Screen Protectors, Camera Lens Protectors)",
  "Computer Peripherals: (Webcams, Monitors, Stands, Mouse Pads, Lighting)",
  "Carry & Protection: (Laptop Sleeves, Bags, Tablet Cases)",
  "Networking: (Wi-Fi Extenders, Routers, Ethernet Cables)",
  "Tools & Maintenance: (Cleaning Kits, Repair Tools, Cable Management)",
];

const initialProductFormData: ProductFormData = {
  name: "",
  category: INVENTORY_CATEGORIES[0],
  price: 0,
  stock: 1,
  type: "sku",
  imei: "",
  partnerId: "",
};

const initialTransactionFormData: TransactionFormData = {
  type: "purchase",
  quantity: 1,
  price: 0,
  partnerId: "",
  partyName: "",
  partyPhone: "",
  partyShop: "",
  date: new Date().toISOString().substring(0, 10), // Today's date YYYY-MM-DD
};

// --- Helper Components & Functions ---

/** Formats currency */
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-QA", {
    style: "currency",
    currency: "QAR",
  }).format(amount);
};
/** Custom Modal Component */
interface ModalProps {
  children: React.ReactNode;
  isOpen: boolean;
  title: string;
  onClose: () => void;
  className?: string;
  footer?: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({
  children,
  isOpen,
  title,
  onClose,
  className = "",
  footer,
}) =>
  isOpen ? (
    <div
      className="fixed inset-0 bg-gray-900 bg-opacity-70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        // 1. CONTAINER: Use flex-col to stack children vertically.
        // 2. Removed max-h-[90vh] and overflow-y-auto from here.
        className={`bg-white rounded-xl shadow-2xl w-full max-w-xl relative flex flex-col max-h-[90vh] ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* -------------------- 1. FIXED HEADER -------------------- */}
        <div className="p-6 pb-3 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
            aria-label="Close modal"
          >
            {/* Assuming 'X' is a component/icon (e.g., from lucide-react or similar) */}
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
        </div>

        {/* -------------------- 2. SCROLLABLE CONTENT -------------------- */}
        <div
          // 3. CONTENT: This takes up all available space and enables vertical scrolling.
          className="p-6 py-4 overflow-y-auto flex-grow"
        >
          {children}
        </div>

        {/* -------------------- 3. FIXED FOOTER -------------------- */}
        {/* Ensure 'footer' is not just a button but the content you want fixed */}
        <div className="p-6 pt-3 border-t border-gray-200 sticky bottom-0 bg-white z-10">
          {footer}
        </div>
      </div>
    </div>
  ) : null;

/** Custom Error/Message Alert Component */
interface AlertProps {
  message: string;
  isError: boolean;
}
const Alert: React.FC<AlertProps> = ({ message, isError }) => (
  <div
    className={`p-3 mb-4 rounded-lg flex items-center shadow-sm ${
      isError
        ? "bg-red-100 text-red-700 border border-red-200"
        : "bg-blue-100 text-blue-700 border border-blue-200"
    }`}
  >
    {isError ? (
      <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0" />
    ) : (
      <Info className="w-5 h-5 mr-2 flex-shrink-0" />
    )}
    {message}
  </div>
);

// --- Component: ActionDropdown (FIXED) ---
interface ActionDropdownProps {
  product: Product;
  openProductModal: (product: Product) => void;
  openTransactionModal: (product: Product, type: Transaction["type"]) => void;
  handleDeleteClick: (product: Product) => void;
}

const ActionDropdown: React.FC<ActionDropdownProps> = ({
  product,
  openProductModal,
  openTransactionModal,
  handleDeleteClick,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const isIndividual = product.type === "individual";
  const isOutOfStock = product.stock === 0;

  const dropdownRef = useRef<HTMLDivElement>(null);

  // FIX: Robust "Click Outside" handler to prevent flickering
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // If the dropdown is open and the clicked element is not inside the dropdown container
      if (
        isOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    // Cleanup the event listener on component unmount
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]); // Only rerun effect when isOpen changes

  // Define actions available in the dropdown
  const actions = [
    {
      id: "edit",
      label: "Edit Details",
      icon: Edit2,
      onClick: () => {
        openProductModal(product);
        setIsOpen(false); // Close dropdown after action
      },
      className: "text-blue-600 hover:bg-blue-50",
    },
    {
      id: "sale",
      label: "Stock Out (Sale)",
      icon: DollarSign,
      onClick: () => {
        openTransactionModal(product, "sale");
        setIsOpen(false); // Close dropdown after action
      },
      disabled: isOutOfStock,
      className: "text-red-600 hover:bg-red-50 disabled:text-gray-400",
    },
    {
      id: "delete",
      label: "Delete Product",
      icon: Trash2,
      onClick: () => {
        handleDeleteClick(product);
        setIsOpen(false); // Close dropdown after action
      },
      className:
        "text-gray-700 hover:bg-gray-100 border-t border-gray-100 mt-2 pt-2",
    },
  ];

  return (
    // Attach the ref here
    <div className="relative inline-block text-left z-10" ref={dropdownRef}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="relative z-10 p-2 rounded hover:bg-gray-100 transition">
            <MoreVertical className="h-5 w-5 text-gray-600" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="top" // default (can omit)
          align="end" // align to right of trigger
          alignOffset={-5}
          className="mt-2 w-48 rounded-md shadow-lg bg-gray-200 bg-opacity-100 ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
          sideOffset={8}
        >
          <div className="py-2 space-y-2">
            {actions.map((action) => (
              <DropdownMenuItem
                key={action.id}
                onClick={action.onClick}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 cursor-pointer transition outline-none"
                role="menuitem"
              >
                <action.icon className="w-4 h-4 mr-3 text-gray-500" />
                {action.label}
              </DropdownMenuItem>
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
// --- Component: ConfirmDeleteModal ---

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  productName: string;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}

const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  productName,
  onClose,
  onConfirm,
  loading,
}) => (
  <Modal
    isOpen={isOpen}
    title={`Confirm Deletion of ${productName}`}
    onClose={onClose}
    className="max-w-md"
  >
    <div className="space-y-4">
      <p className="text-gray-700">
        You are about to delete the product:
        <span className="font-semibold text-red-600 block mt-1">
          {productName}
        </span>
      </p>
      <p className="text-sm text-red-600 font-medium flex items-start p-3 bg-red-50 rounded-lg border border-red-200">
        <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0" />
        WARNING: This action is irreversible and will delete ALL related sales,
        lend-out, and return transactions for this product!
      </p>
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition duration-150"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg shadow-md hover:bg-red-700 transition duration-150 flex items-center justify-center"
          disabled={loading}
        >
          {loading && <Loader className="w-4 h-4 mr-2 animate-spin" />}
          Yes, Delete Product
        </button>
      </div>
    </div>
  </Modal>
);

// --- Component: MovementsLog ---

interface MovementsLogProps {
  transactions: Transaction[];
  products: Product[];
  loading: boolean;
  openReceiptModal: (transaction: any, productName: string) => void;
}

const MovementsLog: React.FC<MovementsLogProps> = ({
  transactions,
  products,
  loading,
  openReceiptModal,
}) => {
  // Map product names to IDs for display
  const productMap = useMemo(() => {
    return products.reduce(
      (acc, p) => ({ ...acc, [p.id]: p.name }),
      {} as Record<string, string>
    );
  }, [products]);

  const getStatusStyle = (type: Transaction["type"]) => {
    switch (type) {
      case "sale":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  return (
    <div className="pt-4">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">
        All Inventory Movements
      </h3>
      {loading && transactions.length === 0 ? (
        <div className="text-center p-8 text-gray-500">
          <Loader className="w-6 h-6 animate-spin mx-auto mb-2" />
          Loading transactions...
        </div>
      ) : transactions.length === 0 ? (
        <div className="p-6 text-center bg-gray-50 rounded-lg border border-gray-200">
          No movements recorded yet.
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((t) => (
            <div
              key={t.id}
              className="p-4 bg-white rounded-xl shadow-sm border border-gray-100 flex justify-between items-center transition hover:shadow-md"
            >
              <div className="flex flex-col space-y-1">
                <p className="text-lg font-bold text-gray-900">
                  {t.quantity} x{" "}
                  <span className="text-blue-600">
                    {productMap[t.productId] || "Product Deleted"}
                  </span>
                </p>
                <p className="text-sm text-gray-600">
                  {t.party || "Unknown"} |{" "}
                  {new Date(t.date).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <div className="flex gap-2 items-center justify-end">
                  <button
                    onClick={() => openReceiptModal(t, productMap[t.productId])}
                    // Added 'flex items-center' to the button for proper alignment of the icon and text
                    className={`flex items-center space-x-1 p-1 text-blue-500 hover:text-blue-600 rounded-full border`}
                    aria-label="View Receipt" // Updated ARIA label for clarity
                  >
                    {/* Receipt Icon */}
                    <svg
                      width="20px"
                      height="20px"
                      viewBox="0 0 24 24"
                      id="receipt"
                      xmlns="http://www.w3.org/2000/svg"
                      className="icon multi-color"
                    >
                      {/* Corrected: Replaced <title style="..."> with a standard <title> tag and placed styles in the path or removed them */}
                      <title>receipt</title>

                      <path
                        id="tertiary-fill"
                        d="M17,13H3v5a3,3,0,0,0,3,3H17Z"
                        // Corrected: Inline CSS style attributes are converted to JSX camelCase style objects
                        style={{ fill: "#b7b7b7", strokeWidth: 2 }}
                      ></path>

                      <path
                        id="secondary-fill"
                        d="M21,17v1a3,3,0,0,1-3,3H6a3,3,0,0,0,3-3V17a1,1,0,0,1,1-1H20A1,1,0,0,1,21,17Z"
                        // Corrected: Inline CSS style attributes are converted to JSX camelCase style objects
                        style={{ fill: "rgb(44, 169, 188)", strokeWidth: 2 }}
                      ></path>

                      <path
                        id="primary-stroke"
                        d="M6,21H5.84A3.13,3.13,0,0,1,3,17.83V3L7,5l3-2,3,2,4-2V16m3,0H10a1,1,0,0,0-1,1v1a3,3,0,0,1-3,3H18a3,3,0,0,0,3-3V17A1,1,0,0,0,20,16ZM8,10h4"
                        // Corrected: Inline CSS style attributes are converted to JSX camelCase style objects
                        style={{
                          fill: "none",
                          stroke: "rgb(0, 0, 0)",
                          strokeLinecap: "round", // Changed stroke-linecap to camelCase
                          strokeLinejoin: "round", // Changed stroke-linejoin to camelCase
                          strokeWidth: 2,
                        }}
                      ></path>
                    </svg>
                  </button>
                  <span
                    className={`inline-block px-2 py-1 text-xs font-medium rounded-full border ${getStatusStyle(
                      t.type
                    )}`}
                  >
                    {t.type.charAt(0).toUpperCase() + t.type.slice(1)}
                  </span>
                </div>
                <p className="text-base font-bold mt-1">
                  {formatCurrency(t.totalAmount)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Main Component ---
export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]); // Assuming partners API exists
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);

  const totalPages = Math.ceil(total / limit);

  // Tab State
  const [activeTab, setActiveTab] = useState<"active" | "movements">("active");

  // Product Modal State
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [productFormData, setProductFormData] = useState<ProductFormData>(
    initialProductFormData
  );

  // Transaction Modal State
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionProduct, setTransactionProduct] = useState<Product | null>(
    null
  );
  const [transactionFormData, setTransactionFormData] =
    useState<TransactionFormData>(initialTransactionFormData);

  // Delete Confirmation State
  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] =
    useState(false);
  const [productToDeleteId, setProductToDeleteId] = useState<string | null>(
    null
  );

  // --- Data Fetching ---

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res =
        activeTab === "active"
          ? await fetch(
              `/api/products?q=${encodeURIComponent(
                search
              )}&page=${page}&limit=${limit}`
            )
          : await fetch(
              `/api/transactions?q=${encodeURIComponent(
                search
              )}&page=${page}&limit=${limit}`
            );
      const data = await res.json();
      if (res.ok) {
        activeTab === "active"
          ? setProducts(data.products || [])
          : setTransactions(data.transactions || []);
        setTotal(data.total);
      } else {
        setError(data.message || "Failed to fetch products.");
      }
    } catch (err) {
      setError("Network error fetching products.");
    }
  }, [activeTab, page, search]);

  const fetchPartners = useCallback(async () => {
    // NOTE: Assuming this API returns Partners data
    try {
      const response = await fetch("/api/partners");
      const result = await response.json();
      if (response.ok) {
        setPartners(result.partners || []);
      }
    } catch (err) {
      console.error("Failed to fetch partners:", err);
      // NOTE: Failing partner fetch shouldn't block the app, so only logging error.
    }
  }, []);

  const refreshAllData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchData(), fetchPartners()]);
    setLoading(false);
  }, [fetchData]);

  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  // Reset message/error after a delay
  useEffect(() => {
    if (message || error) {
      const timer = setTimeout(() => {
        setMessage("");
        setError("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message, error]);

  // --- Product CRUD Handlers ---

  const openProductModal = (product: Product | null = null) => {
    setCurrentProduct(product);
    setProductFormData(
      product
        ? {
            name: product.name,
            category: product.category,
            price: product.price,
            stock: product.stock,
            type: product.type,
            imei: product.imei || "",
            partnerId: product.partnerId || "", // Reset or set based on product if needed
          }
        : initialProductFormData
    );
    setIsProductModalOpen(true);
  };

  const closeProductModal = () => {
    setIsProductModalOpen(false);
    setCurrentProduct(null);
    setProductFormData(initialProductFormData);
  };
  const openReceiptModal = (transaction: any, productName: string) => {
    console.log(productName);
    const data = { ...transaction, productName: productName || "Unknown" };
    setSelectedReceipt(data);
    setIsReceiptModalOpen(true);
  };

  const closeReceiptModal = () => {
    setIsReceiptModalOpen(false);
    setSelectedReceipt(null);
  };
  const handleDeleteClick = (product: Product) => {
    setProductToDeleteId(product.id);
    setIsConfirmDeleteModalOpen(true);
  };

  const handleProductSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const isEditing = !!currentProduct;
    const url = isEditing
      ? `/api/products?id=${currentProduct.id}`
      : "/api/products";
    const urlTr = "/api/transactions";

    const method = isEditing ? "PUT" : "POST";

    // Basic validation and type conversion
    const priceValue = parseFloat(productFormData.price.toString());
    let stockValue = parseInt(productFormData.stock.toString(), 10);
    const isIndividual = productFormData.type === "individual";

    if (isIndividual) {
      stockValue = 1; // Force stock to 1 for individual products
    }

    if (
      isNaN(priceValue) ||
      isNaN(stockValue) ||
      priceValue < 1 ||
      stockValue < 1
    ) {
      setError(
        "Price and Stock must be valid non-negative numbers and greater than 0."
      );
      setLoading(false);
      return;
    }

    try {
      const payload = {
        ...productFormData,
        price: priceValue,
        stock: stockValue,
        imei: productFormData.imei,
      };
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (response.ok) {
        // 2. POST the Transaction
        const transactionPayload = {
          productId: result.id,
          type: "purchase",
          quantity: stockValue,
          price: priceValue,
          imei: productFormData.imei,
          totalAmount: priceValue * stockValue,
          date: new Date().toISOString(),
          party: transactionFormData.partyName,
          partyPhone: transactionFormData.partyPhone,
          partyShop: transactionFormData.partyShop,
          partnerId: productFormData.partnerId, // Use a placeholder if not a partner transaction
        };
        const responseTr = await fetch(urlTr, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(transactionPayload),
        });
        if (responseTr.ok) {
          setMessage(
            `Product and transaction ${
              isEditing ? "updated" : "added"
            } successfully.`
          );
          closeProductModal();
          fetchData(); // Refresh data
        } else {
          setError(
            result.message ||
              `Failed to ${isEditing ? "update" : "add"} transaction.`
          );
        }
      } else {
        setError(
          result.message || `Failed to ${isEditing ? "update" : "add"} product.`
        );
      }
    } catch (err) {
      setError("Network error during product save.");
    } finally {
      setLoading(false);
    }
  };

  // -------------------------
  // Delete Confirmation Logic
  // -------------------------

  const handleConfirmDelete = async () => {
    if (!productToDeleteId) return;

    setLoading(true);
    setError("");
    setIsConfirmDeleteModalOpen(false); // Close modal immediately

    try {
      const response = await fetch(`/api/products?id=${productToDeleteId}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (response.ok) {
        setMessage("Product and related transactions deleted successfully.");
        refreshAllData(); // Refresh both products and transactions
      } else {
        setError(result.message || "Failed to delete product.");
      }
    } catch (err) {
      setError("Network error during product deletion.");
    } finally {
      setLoading(false);
      setProductToDeleteId(null);
    }
  };

  const closeConfirmDeleteModal = () => {
    setIsConfirmDeleteModalOpen(false);
    setProductToDeleteId(null);
  };

  // --- Transaction Handlers ---

  const openTransactionModal = (
    product: Product,
    type: Transaction["type"]
  ) => {
    setTransactionProduct(product);

    let defaultPartnerId = "";
    let defaultPartyName = "";

    // If transaction is related to a partner (lend-out, return, purchase), default to the first one available
    if (partners.length > 0) {
      defaultPartnerId = partners[0].id;
      defaultPartyName = type === "purchase" ? partners[0].name : "";
    }

    setTransactionFormData({
      ...initialTransactionFormData,
      type,
      partnerId: defaultPartnerId,
      partyName: defaultPartyName,
      quantity: 1, // Default to 1
    });
    setIsTransactionModalOpen(true);
  };

  const closeTransactionModal = () => {
    setIsTransactionModalOpen(false);
    setTransactionProduct(null);
    setTransactionFormData(initialTransactionFormData);
  };

  // Updates partyName when partnerId changes for transactions involving partners
  useEffect(() => {
    const isPartnerTransaction = transactionFormData.type === "purchase";

    if (transactionProduct && isPartnerTransaction) {
      const selectedPartner = partners.find(
        (p) => p.id === transactionFormData.partnerId
      );
      if (selectedPartner) {
        setTransactionFormData((prev) => ({
          ...prev,
          partyName: selectedPartner.name,
        }));
      }
    }
  }, [
    transactionFormData.partnerId,
    transactionFormData.type,
    partners,
    transactionProduct,
  ]);

  const handleTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!transactionProduct) return;

    setLoading(true);
    setError("");

    const quantity = parseInt(transactionFormData.quantity.toString(), 10);
    const productPrice = transactionFormData.price || transactionProduct.price; // Use form price or fallback to current product price

    if (isNaN(quantity) || quantity <= 0) {
      setError("Quantity must be a positive number.");
      setLoading(false);
      return;
    }

    // Stock check for outgoing transactions
    if (quantity > transactionProduct.stock) {
      setError(
        `Cannot process: Only ${transactionProduct.stock} units are currently in stock.`
      );
      setLoading(false);
      return;
    }

    try {
      // 1. Calculate new stock and total amount
      const newStock = transactionProduct.stock - quantity;
      const totalAmount = productPrice * quantity; // Total amount is calculated based on current price * quantity

      // 2. POST the Transaction
      const transactionPayload = {
        productId: transactionProduct.id,
        type: "sale",
        quantity: quantity,
        price: productPrice,
        imei: transactionProduct.imei,
        totalAmount: totalAmount,
        date: new Date().toISOString(),
        party: transactionFormData.partyName || "Unknown",
        partyPhone: transactionFormData.partyPhone || "",
        partyShop: transactionFormData.partyShop || null,
        partnerId: transactionFormData.partnerId || "CUSTOMER", // Use a placeholder if not a partner transaction
      };

      const transResponse = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transactionPayload),
      });
      const transResult = await transResponse.json();

      if (!transResponse.ok) {
        setError(transResult.message || "Failed to record transaction.");
        setLoading(false);
        return;
      }

      // 3. PUT the updated Product Stock
      const stockUpdatePayload = {
        // Only sending required fields for PUT API
        name: transactionProduct.name,
        category: transactionProduct.category,
        type: transactionProduct.type,
        price: transactionProduct.price,
        stock: newStock,
        imei: transactionProduct.imei,
        partnerId: transactionFormData.partnerId || null,
      };

      const productResponse = await fetch(
        `/api/products?id=${transactionProduct.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(stockUpdatePayload),
        }
      );

      if (!productResponse.ok) {
        console.error(
          "Failed to update product stock after transaction:",
          await productResponse.json()
        );
        setMessage(
          "Transaction recorded, but stock update failed. Please check product record."
        );
      } else {
        setMessage(
          `${
            transactionFormData.type.charAt(0).toUpperCase() +
            transactionFormData.type.slice(1)
          } recorded successfully! Stock updated.`
        );
      }

      closeTransactionModal();
      refreshAllData(); // Refresh both products and transactions
    } catch (err) {
      setError("A network error occurred during the transaction.");
    } finally {
      setLoading(false);
    }
  };

  // --- Render Functions ---
  // Partner selection options
  const partnerOptions = partners.map((p) => ({
    id: p.id,
    name: p.name ? p.name : "",
    shop: p.shop_name ? p.shop_name : "",
    phone: p.phone,
  }));
  if (partnerOptions.length > 0) {
    if (!productFormData.partnerId) {
      setProductFormData({
        ...productFormData,
        partnerId: partnerOptions[0].id,
      });
    }
    if (
      transactionFormData.type === "purchase" &&
      !transactionFormData.partnerId
    ) {
      setTransactionFormData((prev) => ({
        ...prev,
        partnerId: partnerOptions[0].id,
        partyName: partnerOptions[0].name,
        partyPhone: partnerOptions[0].phone,
        partyShop: partnerOptions[0].shop,
      }));
    }
  }
  /** Renders the form for adding/editing a product. */
  const renderProductForm = () => {
    const isIndividual = productFormData.type === "individual";
    return (
      <form onSubmit={handleProductSave} className="space-y-4">
        {/* Name and Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pricing/Tracking Type
            </label>
            <div className="relative">
              <select
                value={productFormData.type}
                onChange={(e) =>
                  setProductFormData({
                    ...productFormData,
                    type: e.target.value as Product["type"],
                    imei: "",
                  })
                }
                disabled={!!currentProduct} // Disable changing type when editing
                required
                className="w-full appearance-none px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="sku">SKU (Stock Keeping Unit)</option>
                <option value="individual">Individual (Tracked by IMEI)</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <div className="relative">
              <select
                value={productFormData.category}
                onChange={(e) =>
                  setProductFormData({
                    ...productFormData,
                    category: e.target.value,
                  })
                }
                required
                className="w-full appearance-none px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white focus:ring-blue-500 focus:border-blue-500"
              >
                {INVENTORY_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Type and Price */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Name
            </label>
            <input
              type="text"
              value={productFormData.name}
              onChange={(e) =>
                setProductFormData({ ...productFormData, name: e.target.value })
              }
              required
              placeholder="E.g., Ultra Fast Charger"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price (QAR)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={productFormData.price}
              onChange={(e) =>
                setProductFormData({
                  ...productFormData,
                  price: parseFloat(e.target.value) || 0,
                })
              }
              required
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Stock and IMEI */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stock Quantity
            </label>
            <input
              type="number"
              min="1"
              value={isIndividual ? 1 : productFormData.stock}
              onChange={(e) =>
                setProductFormData({
                  ...productFormData,
                  stock: parseInt(e.target.value, 10) || 1,
                })
              }
              required
              disabled={isIndividual}
              placeholder="0"
              className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm ${
                isIndividual
                  ? "bg-gray-100 cursor-not-allowed"
                  : "focus:ring-blue-500 focus:border-blue-500"
              }`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              IMEI / Serial Number
            </label>
            <input
              type="text"
              value={productFormData.imei}
              onChange={(e) =>
                setProductFormData({
                  ...productFormData,
                  imei: e.target.value,
                })
              }
              required
              placeholder="Recommended"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        <div>
          <label
            htmlFor="partnerId"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Partner / Party Involved
          </label>
          <div className="relative">
            <select
              id="partnerId"
              value={productFormData.partnerId}
              onChange={(e) => {
                setProductFormData({
                  ...productFormData,
                  partnerId: e.target.value,
                });
                const selectedPartner = partners.find(
                  (p) => p.id === e.target.value
                );
                setTransactionFormData((prev) => ({
                  ...prev,
                  partnerId: e.target.value,
                  partyName: selectedPartner ? selectedPartner.name : "",
                  partyPhone: selectedPartner ? selectedPartner.phone : "",
                  partyShop: selectedPartner ? selectedPartner.shop_name : "",
                }));
              }}
              required
              className="w-full appearance-none px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white focus:ring-blue-500 focus:border-blue-500"
            >
              {partnerOptions.length > 0 ? (
                partnerOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.shop ? `${p.shop}-${p.name}` : p.name}
                  </option>
                ))
              ) : (
                <option value="" disabled>
                  No partners available (Try refreshing)
                </option>
              )}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={closeProductModal}
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
            {currentProduct ? "Update Product" : "Add Product"}
          </button>
        </div>
      </form>
    );
  };

  /** Renders the form for recording a transaction. */
  const renderTransactionForm = () => {
    if (!transactionProduct) return null;

    const { type, quantity, partnerId } = transactionFormData;

    const isSale = type === "sale";
    const isPurchase = type === "purchase";

    const isIndividualProduct = transactionProduct.type === "individual";

    const actionText = isSale ? "Sell" : "Record Stock-In (Purchase)";

    const partnerRequired = isPurchase;
    const isOutgoing = isSale;

    const currentStock = transactionProduct.stock;
    const currentPrice = transactionProduct.price;

    const transactionTypes = [
      {
        type: "sale" as const,
        label: "Sale (Outgoing)",
        icon: DollarSign,
        color: "bg-red-600 hover:bg-red-700",
      },
    ];

    const isQuantityDisabled = isIndividualProduct;
    const maxQuantity = isOutgoing ? currentStock : 9999;

    // If it's an individual item transaction (Lend or Return), force quantity to 1
    if (isQuantityDisabled) {
      transactionFormData.quantity = 1;
    }

    return (
      <form onSubmit={handleTransaction} className="space-y-6">
        {/* Product Summary */}
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="text-xl font-bold text-gray-900">
            {transactionProduct.name}
          </h4>
          {isIndividualProduct && transactionProduct.imei && (
            <p className="text-sm text-gray-500 mt-1">
              IMEI: {transactionProduct.imei}
            </p>
          )}
          <p className="text-sm text-gray-600 mt-1">
            Current Stock:{" "}
            <span
              className={`font-bold ${
                currentStock === 0 ? "text-red-500" : "text-green-600"
              }`}
            >
              {currentStock}
            </span>{" "}
            | Current Price: {formatCurrency(currentPrice)}
          </p>
        </div>

        {/* Transaction Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Movement Type
          </label>
          <div className="grid grid-cols-2 gap-3">
            {transactionTypes.map((t) => (
              <button
                key={t.type}
                type="button"
                className={`p-3 text-center rounded-lg border-2 font-semibold transition ${
                  type === t.type
                    ? `${t.color} text-white border-transparent shadow-lg`
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                <t.icon className="w-5 h-5 mx-auto mb-1" />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Partner Selection (Required for Purchase, Lend Out, Return) */}
        <div className="grid grid-cols-1">
          <div>
            <label
              htmlFor="customerName"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Customer Name
            </label>
            <input
              id="customerName"
              type="text"
              placeholder="E.g., John Doe"
              value={transactionFormData.partyName}
              onChange={(e) =>
                setTransactionFormData({
                  ...transactionFormData,
                  partyName: e.target.value,
                })
              }
              className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500`}
            />
          </div>
          <div>
            <label
              htmlFor="customerPhone"
              className="block text-sm font-medium text-gray-700 mb-1 mt-2"
            >
              Customer Phone
            </label>
            <input
              id="customerPhone"
              type="text"
              placeholder="E.g., +97412345678"
              value={transactionFormData.partyPhone}
              onChange={(e) =>
                setTransactionFormData({
                  ...transactionFormData,
                  partyPhone: e.target.value,
                })
              }
              className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500`}
            />
          </div>
          <div>
            <label
              htmlFor="salePrice"
              className="block text-sm font-medium text-gray-700 mb-1 mt-2"
            >
              Final Sale Price
            </label>
            <input
              id="salePrice"
              type="number"
              placeholder="E.g., 10"
              required
              value={transactionFormData.price}
              onChange={(e) =>
                setTransactionFormData({
                  ...transactionFormData,
                  price: parseFloat(e.target.value) || 0,
                })
              }
              className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500`}
            />
          </div>
        </div>

        {/* Quantity and Date */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="quantity"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Quantity
            </label>
            <input
              id="quantity"
              type="number"
              min={1}
              max={maxQuantity}
              value={quantity}
              onChange={(e) =>
                setTransactionFormData({
                  ...transactionFormData,
                  quantity: parseInt(e.target.value, 10) || 0,
                })
              }
              required
              disabled={isQuantityDisabled}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                isQuantityDisabled ? "bg-gray-100 cursor-not-allowed" : ""
              }`}
            />
            {isQuantityDisabled && (
              <p className="text-xs text-gray-500 mt-1">
                Individual items are tracked one-by-one (Quantity forced to 1).
              </p>
            )}
            {isOutgoing && quantity > currentStock && (
              <p className="text-xs text-red-500 mt-1">
                Warning: Quantity exceeds stock!
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor="date"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Transaction Date
            </label>
            <input
              id="date"
              type="date"
              value={transactionFormData.date}
              onChange={(e) =>
                setTransactionFormData({
                  ...transactionFormData,
                  date: e.target.value,
                })
              }
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Total Amount Summary */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 text-center">
          <p className="text-sm text-blue-700">
            Calculated Total ({quantity} x{" "}
            {formatCurrency(transactionFormData.price)}):
          </p>
          <p className="text-3xl font-extrabold text-blue-900">
            {formatCurrency(transactionFormData.price * quantity)}
          </p>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-4 border-t border-gray-100">
          <button
            type="submit"
            className={`px-6 py-2 text-base font-medium text-white rounded-lg shadow-md transition duration-150 flex items-center justify-center ${
              isOutgoing && quantity > currentStock
                ? "bg-red-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
            disabled={
              loading ||
              (isOutgoing && quantity > currentStock) ||
              (partnerRequired && !partnerId)
            }
          >
            {loading && <Loader className="w-4 h-4 mr-2 animate-spin" />}
            {actionText}
          </button>
        </div>
      </form>
    );
  }; // End of renderTransactionForm

  /** Renders the main table of active products. */
  const renderInventoryTable = () => {
    return (
      <div className="bg-white rounded-xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type / Tracking
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    No products found. Click "Add Product" to create an
                    inventory item.
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  const isIndividual = product.type === "individual";

                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-gray-50 transition"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {product.name}
                        </div>
                        <div className="text-xs text-gray-400">
                          {product.category.split(":")[0]}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            isIndividual
                              ? "bg-blue-100 text-blue-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {product.type.toUpperCase()}
                        </span>
                        {isIndividual && product.imei && (
                          <div className="text-xs text-gray-500 mt-1 truncate max-w-[150px]">
                            IMEI: {product.imei}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(product.price)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span
                          className={`px-3 py-1 inline-flex text-sm leading-5 font-bold rounded-full ${
                            product.stock === 0
                              ? "bg-red-100 text-red-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {product.stock}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {product.stock === 0 ? (
                          <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full font-semibold mr-2">
                            Out of Stock
                          </span>
                        ) : (
                          <ActionDropdown
                            product={product}
                            openProductModal={openProductModal}
                            openTransactionModal={openTransactionModal}
                            handleDeleteClick={handleDeleteClick}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = () => {
    if (!printRef.current) return;

    const printContent = printRef.current.innerHTML;
    const tailwindLink =
      "https://cdnjs.cloudflare.com/ajax/libs/tailwindcss/2.2.19/tailwind.min.css";

    const printWindow = window.open("", "_blank", "width=1000,height=800");

    if (printWindow) {
      printWindow.document.write(`
            <html>
                <head>
                    <title>Transaction Receipt</title>
                    <link rel="stylesheet" href="${tailwindLink}">
                    <style>
                        /* Print-specific styles to ensure proper spacing and scaling */
                        @media print {
                            body {
                                padding: 0 !important;
                                margin: 0 !important;
                                background: white !important;
                                display: block !important;
                            }
                            .receipt {
                                width: 100% !important; 
                                max-width: 100% !important; 
                                margin: 0 !important; 
                                box-shadow: none !important;
                                border: none !important;
                                border-radius: 0 !important;
                                padding: 10px; /* Small paper edge clearance */
                            }

                            /* FIX: Re-establish vertical margin/spacing for block elements */
                            .receipt h2, 
                            .receipt p, 
                            .receipt div:not(.flex) {
                                /* Apply a small bottom margin to simulate Tailwind's space-y */
                                margin-bottom: 0.5rem !important; 
                            }
                            
                            /* Ensure large text elements like titles retain space */
                            .receipt .text-2xl, 
                            .receipt .text-xl {
                                margin-bottom: 1rem !important;
                            }

                            /* Ensure border-t and border-b spacing is preserved */
                            .receipt .border-t, 
                            .receipt .border-b {
                                padding-top: 0.5rem !important;
                                padding-bottom: 0.5rem !important;
                            }

                            /* Optional: If space-y is still collapsing, you may need a more aggressive selector */
                            .receipt > div > div {
                                margin-top: 1rem !important;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="receipt">${printContent}</div>
                </body>
            </html>
        `);

      printWindow.document.close();
      printWindow.focus();

      const printLogic = () => {
        printWindow.print();
        printWindow.close();
      };

      setTimeout(printLogic, 500);
    }
  };
  return (
    <div className="p-4 md:p-8 min-h-screen font-sans">
      {/* Header and Controls */}
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">
            Shop Inventory
          </h1>
          <p className="text-gray-500 mt-1">
            Manage stock, sales, and lent assets with individual (IMEI)
            tracking.
          </p>
        </div>
        <div className="flex space-x-3 mt-4 md:mt-0">
          <button
            onClick={refreshAllData}
            className="p-3 bg-white text-gray-700 border border-gray-300 rounded-xl shadow-sm hover:bg-gray-100 transition disabled:opacity-50"
            disabled={loading}
            title="Refresh All Data"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => openProductModal(null)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white font-semibold rounded-xl shadow-md hover:bg-blue-700 transition disabled:opacity-50"
            disabled={loading}
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Product
          </button>
        </div>
      </header>

      {/* Alerts */}
      {(message || error) && (
        <Alert message={message || error} isError={!!error} />
      )}

      {/* Loading Indicator for general actions */}
      {loading && !isProductModalOpen && !isTransactionModalOpen && (
        <div className="text-center p-4 text-blue-600 font-medium">
          <Loader className="w-6 h-6 animate-spin mx-auto mb-2" />
          Processing data...
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-6">
        {[
          { key: "active", label: "Active Inventory", icon: Package },
          { key: "movements", label: "Transaction Log", icon: Repeat },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key as "active" | "movements");
              setPage(1); // Reset to first page on tab change
            }}
            className={`flex items-center px-4 py-2 text-sm font-semibold transition border-b-2 ${
              activeTab === tab.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <tab.icon className="w-4 h-4 mr-2" />
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex justify-between items-center mb-4">
        <div className="relative w-full max-w-sm">
          <input
            type="text"
            placeholder={`Search by IMEI or Name`}
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
            }}
            // INCREASED right padding (pr-16) to make room for BOTH icons
            className="border p-2 w-full pr-16 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* NEW: Joint Icon Button Container */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center p-1">
            {/* 1. Clear Button (renders only if 'search' has a value) */}
            {searchText && (
              <button
                onClick={() => {
                  setSearchText("");
                  setSearch("");
                  setPage(1); // reset page on clear
                }}
                className="p-1 text-gray-400 hover:text-gray-600"
                aria-label="Clear search"
              >
                {/* 'X' Icon */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
            <button
              onClick={() => {
                // Since search is already triggered by onChange, this click handler
                // can be used to re-run the search, or simply ensure the page is reset.
                setSearch(searchText);
                setPage(1);
              }}
              // Use different color if it's the only visible icon (no search text)
              className={`p-1 ${
                search
                  ? "text-gray-400 hover:text-gray-600"
                  : "text-blue-500 hover:text-blue-600"
              }`}
              aria-label="Search"
            >
              {/* Search Icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>
          </div>
        </div>
        <button
          // onClick={onClick}
          className="flex items-center justify-center space-x-2
                 p-3 rounded-lg bg-white border border-gray-300 text-gray-800 
                 hover:bg-gray-50 hover:border-gray-400 transition duration-150 shadow-sm
                 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          aria-label="Open Barcode Scanner"
        >
          {/* Icon: Barcode Scanner Icon */}
          <svg
            width="20px"
            height="20px"
            viewBox="0 0 512 512"
            version="1.1"
            xmlns="http://www.w3.org/2000/svg"
          >
            <title>bar-code</title>
            <g
              id="Page-1"
              stroke="none"
              strokeWidth="1"
              fill="none"
              fillRule="evenodd"
            >
              <g
                id="drop"
                fill="#000000"
                transform="translate(42.666667, 85.333333)"
              >
                <path
                  d="M42.6666667,1.42108547e-14 L42.6666667,341.333333 L7.10542736e-15,341.333333 L7.10542736e-15,1.42108547e-14 L42.6666667,1.42108547e-14 Z M128,1.42108547e-14 L128,341.333333 L85.3333333,341.333333 L85.3333333,1.42108547e-14 L128,1.42108547e-14 Z M213.333333,1.42108547e-14 L213.333333,341.333333 L170.666667,341.333333 L170.666667,1.42108547e-14 L213.333333,1.42108547e-14 Z M426.666667,1.42108547e-14 L426.666667,341.333333 L384,341.333333 L384,1.42108547e-14 L426.666667,1.42108547e-14 Z M277.333333,1.42108547e-14 L277.333333,341.333333 L256,341.333333 L256,1.42108547e-14 L277.333333,1.42108547e-14 Z M341.333333,1.42108547e-14 L341.333333,341.333333 L320,341.333333 L320,1.42108547e-14 L341.333333,1.42108547e-14 Z"
                  id="Combined-Shape"
                ></path>
              </g>
            </g>
          </svg>

          {/* Text Label */}
          <span className="text-sm font-semibold tracking-wide">
            Scan Barcode
          </span>
        </button>
      </div>
      {/* Tab Content */}
      <div className="pb-8">
        {activeTab === "active" && renderInventoryTable()}
        {activeTab === "movements" && (
          <MovementsLog
            products={products}
            transactions={transactions}
            loading={loading}
            openReceiptModal={openReceiptModal}
          />
        )}
      </div>
      <div className="flex items-center gap-2 mt-4">
        {/* Prev Button */}
        <button
          onClick={() => setPage((p) => Math.max(p - 1, 1))}
          disabled={page === 1}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Prev
        </button>

        {/* Page Numbers */}
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(
            (p) =>
              p === 1 || // always show first
              p === totalPages || // always show last
              (p >= page - 2 && p <= page + 2) // show 2 before and after current page
          )
          .map((p, idx, arr) => (
            <React.Fragment key={p}>
              {/* Ellipsis before hidden pages */}
              {idx > 0 && arr[idx - 1] !== p - 1 && (
                <span className="px-2">...</span>
              )}
              <button
                onClick={() => setPage(p)}
                className={`px-3 py-1 border rounded ${
                  page === p ? "bg-blue-500 text-white" : "bg-white"
                }`}
              >
                {p}
              </button>
            </React.Fragment>
          ))}

        {/* Next Button */}
        <button
          onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
          disabled={page === totalPages}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>

      {/* --- MODALS --- */}

      <Modal
        isOpen={isProductModalOpen}
        onClose={closeProductModal}
        title={currentProduct ? "Edit Product" : "Add New Product"}
      >
        {renderProductForm()}
      </Modal>

      <Modal
        isOpen={isTransactionModalOpen}
        onClose={closeTransactionModal}
        title={`Record Inventory ${transactionFormData.type
          .toUpperCase()
          .replace("-", " ")}`}
      >
        {renderTransactionForm()}
      </Modal>
      <Modal
        isOpen={isReceiptModalOpen}
        onClose={closeReceiptModal}
        title="Transaction Receipt"
        footer={
          <div className="flex-none border-t border-gray-100 bg-white p-4 sticky bottom-0 z-10 print-button-container">
            <button
              onClick={handlePrint}
              className="w-full py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700"
            >
              Print Receipt
            </button>
          </div>
        }
      >
        {selectedReceipt ? (
          <div
            id="receipt"
            className="flex flex-col h-[600px] w-full max-w-md mx-auto bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden"
          >
            {/* Scrollable Content */}
            <div ref={printRef} className="flex-1 p-6 space-y-6">
              {/* Header */}
              <div className="flex justify-between items-start">
                <h2 className="text-lg font-semibold text-gray-800">
                  Payment Receipt
                </h2>
              </div>

              {/* Company & Job Info */}
              <div className="flex justify-between">
                <div>
                  <p className="text-sm text-gray-500">
                    {selectedReceipt.type === "sale" ? "Customer" : "Vendor"}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <div className="w-6 h-6 rounded-lg bg-gray-200 flex items-center justify-center font-bold text-xs">
                      {selectedReceipt.party.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-gray-800 font-medium">
                      {selectedReceipt.party}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="text-gray-800 font-medium">
                    {new Date(selectedReceipt.date).getDate() +
                      "-" +
                      (new Date(selectedReceipt.date).getMonth() + 1) +
                      "-" +
                      new Date(selectedReceipt.date).getFullYear() +
                      " " +
                      new Date(selectedReceipt.date).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              {/* Tags */}
              <div className="flex space-x-2">
                {selectedReceipt.type === "sale" ? (
                  <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-600 font-medium">
                    sale
                  </span>
                ) : (
                  <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-600 font-medium">
                    purchase
                  </span>
                )}
              </div>

              {/* Task Section */}
              <div className="border border-gray-100 rounded-xl p-4">
                <div className="flex justify-between mb-2">
                  <div>
                    <p className="font-medium text-gray-800">
                      {selectedReceipt.quantity +
                        " x " +
                        selectedReceipt.productName}
                    </p>
                    <p className="text-sm text-gray-500">
                      {"serial: " + selectedReceipt.imei}
                    </p>
                  </div>
                  <span className="font-semibold text-gray-700">
                    {selectedReceipt.price} QAR
                  </span>
                </div>
                <div className="border-t mt-3 pt-2 flex justify-between text-green-700 font-semibold">
                  <span>Total</span>
                  <span>{selectedReceipt.price} QAR</span>
                </div>
              </div>

              {/* Summary */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Balance</span>
                  <span className="font-medium">0 QAR</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Discount</span>
                  <span className="font-medium text-red-500">0 QAR</span>
                </div>
                <div className="border-t mt-2 pt-2 flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Grand Total</span>
                  <span className="text-2xl font-bold text-green-600">
                    {selectedReceipt.price} QAR
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p>No data available.</p>
        )}
      </Modal>

      <ConfirmDeleteModal
        isOpen={isConfirmDeleteModalOpen}
        productName={
          products.find((p) => p.id === productToDeleteId)?.name || ""
        }
        onClose={closeConfirmDeleteModal}
        onConfirm={handleConfirmDelete}
        loading={loading}
      />
    </div>
  );
}
